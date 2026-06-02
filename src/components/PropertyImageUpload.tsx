
import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DraggablePropertyImages } from './DraggablePropertyImages';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import imageCompression from 'browser-image-compression';
import { retryStorageOperation, isDuplicateKeyError, generateUniqueFileName, isConnectionPoolError } from '@/lib/storageUtils';
import { uploadFilesWithSignedUrls } from '@/lib/signedUploadUtils';

interface PropertyImageUploadProps {
  propertyId?: string;
  userId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  portfolioId?: string;
  skipPermissionCheck?: boolean;
}

// Fallback settings - only used if signed URLs fail
const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 1500;
const POOL_RECOVERY_DELAY_MS = 3000;

const PropertyImageUpload = ({ propertyId, userId, images, onImagesChange, portfolioId, skipPermissionCheck = false }: PropertyImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const { toast } = useToast();

  // Only compress images larger than 2MB (skip for already-optimized images)
  const compressImage = async (file: File): Promise<File> => {
    if (file.size <= 2 * 1024 * 1024) return file;
    
    const options = {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
    };
    
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.warn('Compression failed, using original:', error);
      return file;
    }
  };

  // Verify that an uploaded file is accessible
  const verifyUpload = async (publicUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Fallback: Upload with storage timeout utility and duplicate key retry
  const uploadWithRetryFallback = async (file: File, fileName: string, fileExt: string): Promise<string> => {
    const attemptUpload = async (currentFileName: string): Promise<string> => {
      const result = await retryStorageOperation(
        async () => {
          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(currentFileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(currentFileName);

          const isValid = await verifyUpload(publicUrl);
          if (!isValid) {
            throw new Error('Upload verification failed - file not accessible');
          }

          return publicUrl;
        },
        `Upload ${currentFileName}`
      );

      if (result.error) {
        if (isDuplicateKeyError(result.error)) {
          console.warn('Duplicate key detected, regenerating filename...');
          const newFileName = generateUniqueFileName(userId, fileExt, propertyId);
          const retryResult = await retryStorageOperation(
            async () => {
              const { error: retryError } = await supabase.storage
                .from('property-images')
                .upload(newFileName, file);
              if (retryError) throw retryError;
              const { data: { publicUrl } } = supabase.storage
                .from('property-images')
                .getPublicUrl(newFileName);
              
              const isValid = await verifyUpload(publicUrl);
              if (!isValid) {
                throw new Error('Retry upload verification failed');
              }
              
              return publicUrl;
            },
            `Retry upload ${newFileName}`
          );
          if (retryResult.error) throw retryResult.error;
          return retryResult.data!;
        }
        throw result.error;
      }
      return result.data!;
    };

    return attemptUpload(fileName);
  };

  // Fallback upload method using direct Supabase storage (more DB connections)
  const uploadWithFallback = async (files: File[]): Promise<{ uploadedUrls: string[]; failedFiles: string[] }> => {
    const totalFiles = files.length;
    const uploadedUrls: string[] = [];
    const failedFiles: string[] = [];
    let connectionPoolStressed = false;
    
    for (let batchStart = 0; batchStart < totalFiles; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalFiles);
      const batch = files.slice(batchStart, batchEnd);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);
      
      if (connectionPoolStressed) {
        setUploadProgress(`Waiting for database... (batch ${batchNum}/${totalBatches})`);
        await new Promise(resolve => setTimeout(resolve, POOL_RECOVERY_DELAY_MS));
        connectionPoolStressed = false;
      }
      
      setUploadProgress(`Uploading ${batchStart + 1}-${batchEnd} of ${totalFiles} (fallback)...`);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (file) => {
          const compressed = await compressImage(file);
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = generateUniqueFileName(userId, fileExt, propertyId);
          return uploadWithRetryFallback(compressed, fileName, fileExt);
        })
      );
      
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          uploadedUrls.push(result.value);
        } else {
          const file = batch[idx];
          console.error(`Failed to upload ${file.name}:`, result.reason);
          
          if (isConnectionPoolError(result.reason)) {
            connectionPoolStressed = true;
          }
          
          failedFiles.push(file.name);
        }
      });
      
      if (batchEnd < totalFiles) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    return { uploadedUrls, failedFiles };
  };

  const uploadMultipleImages = useCallback(async (files: File[]) => {
    setUploading(true);
    const totalFiles = files.length;
    let uploadedUrls: string[] = [];
    let failedFiles: string[] = [];
    
    try {
      // Step 1: Compress all files first
      setUploadProgress('Compressing images...');
      const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
      
      // Step 2: Try signed URL upload (fast, low DB connections)
      setUploadProgress('Preparing upload...');
      const signedResult = await uploadFilesWithSignedUrls(
        compressedFiles,
        propertyId,
        setUploadProgress
      );
      
      uploadedUrls = signedResult.uploadedUrls;
      failedFiles = signedResult.failedFiles;
      
      // Step 3: If signed URLs completely failed, use fallback
      if (uploadedUrls.length === 0 && failedFiles.length === totalFiles) {
        console.warn('Signed URL upload failed for all files, using fallback method');
        setUploadProgress('Using backup upload method...');
        
        const fallbackResult = await uploadWithFallback(compressedFiles);
        uploadedUrls = fallbackResult.uploadedUrls;
        failedFiles = fallbackResult.failedFiles;
      }

      // Step 4: Handle results
      if (uploadedUrls.length > 0) {
        setUploadProgress('Finalizing...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newImages = [...images, ...uploadedUrls];
        onImagesChange(newImages);

        if (failedFiles.length > 0) {
          toast({
            title: `Uploaded ${uploadedUrls.length} of ${totalFiles} images`,
            description: `Failed: ${failedFiles.slice(0, 3).join(', ')}${failedFiles.length > 3 ? ` and ${failedFiles.length - 3} more` : ''}. You can retry these.`,
          });
        } else {
          toast({
            title: "Images uploaded successfully!",
            description: `${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} have been added to your property.`,
          });
        }
      } else {
        toast({
          title: "Upload failed",
          description: "All images failed to upload. Please try again with fewer images or check your connection.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error in upload process:', error);
      
      if (uploadedUrls.length > 0) {
        const newImages = [...images, ...uploadedUrls];
        onImagesChange(newImages);
        toast({
          title: `Saved ${uploadedUrls.length} images before error`,
          description: `Some images were saved. Error: ${error.message}`,
        });
      } else {
        toast({
          title: "Error uploading images",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }, [userId, propertyId, images, onImagesChange, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const validFiles: File[] = [];
      const oversizedFiles: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          oversizedFiles.push(file.name);
        } else {
          validFiles.push(file);
        }
      }
      
      if (oversizedFiles.length > 0) {
        toast({
          title: "Some files are too large",
          description: `Please select images smaller than 10MB. Large files: ${oversizedFiles.join(', ')}`,
          variant: "destructive",
        });
      }
      
      if (validFiles.length > 0) {
        uploadMultipleImages(validFiles);
      }
      
      event.target.value = '';
    }
  };

  const handleImagesReorder = (reorderedImages: string[]) => {
    onImagesChange(reorderedImages);
  };

  const handleImageRemove = (indexToRemove: number) => {
    const newImages = images.filter((_, index) => index !== indexToRemove);
    onImagesChange(newImages);
  };

  const uploadUI = (
    <div>
      <Label htmlFor="property-images">Upload Property Images</Label>
      <div className="mt-2">
        <Input
          id="property-images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          className="cursor-pointer"
        />
        <p className="text-sm text-gray-500 mt-1">
          Upload multiple high-quality images of your property (max 10MB each, auto-compressed). Hold Ctrl/Cmd to select multiple files.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {!skipPermissionCheck ? (
        <PermissionGuard 
          object="portfolio.properties" 
          action={propertyId ? "edit" : "create"}
          scope="portfolio" 
          portfolioId={portfolioId}
          fallback={
            <div>
              <Label>Property Images</Label>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have permission to upload images to this portfolio.
              </p>
            </div>
          }
        >
          {uploadUI}
        </PermissionGuard>
      ) : (
        uploadUI
      )}

      <DraggablePropertyImages
        images={images}
        onImagesReorder={handleImagesReorder}
        onImageRemove={handleImageRemove}
      />

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Upload className="h-4 w-4 animate-spin" />
          {uploadProgress || 'Uploading images...'}
        </div>
      )}
    </div>
  );
};

export default PropertyImageUpload;
