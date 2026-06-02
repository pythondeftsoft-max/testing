
import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Image as ImageIcon, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';
import { retryStorageOperation, isDuplicateKeyError, generateUniqueFileName } from '@/lib/storageUtils';

interface UnitImageUploadProps {
  unitId: string;
  unitNumber: string;
  userId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  amenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
}

const BATCH_SIZE = 3; // Reduced from 5 to prevent connection exhaustion
const BATCH_DELAY_MS = 500; // Delay between batches
const SEQUENTIAL_THRESHOLD = 10; // Switch to sequential mode above this

const UnitImageUpload = ({ 
  unitId, 
  unitNumber, 
  userId, 
  images, 
  onImagesChange,
  amenities,
  onAmenitiesChange
}: UnitImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [newAmenity, setNewAmenity] = useState('');
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

  // Upload with storage timeout utility and duplicate key retry
  const uploadWithRetry = async (file: File, fileName: string, fileExt: string): Promise<string> => {
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

          return publicUrl;
        },
        `Upload ${currentFileName}`
      );

      if (result.error) {
        // If duplicate key error, regenerate filename and retry once
        if (isDuplicateKeyError(result.error)) {
          console.warn('Duplicate key detected, regenerating filename...');
          const newFileName = generateUniqueFileName(userId, fileExt, `units/${unitId}`);
          const retryResult = await retryStorageOperation(
            async () => {
              const { error: retryError } = await supabase.storage
                .from('property-images')
                .upload(newFileName, file);
              if (retryError) throw retryError;
              const { data: { publicUrl } } = supabase.storage
                .from('property-images')
                .getPublicUrl(newFileName);
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

  const uploadMultipleImages = useCallback(async (files: File[]) => {
    setUploading(true);
    const totalFiles = files.length;
    const uploadedUrls: string[] = [];
    const failedFiles: string[] = [];
    
    try {
      // For large uploads, use sequential mode to reduce connection pressure
      if (totalFiles > SEQUENTIAL_THRESHOLD) {
        for (let i = 0; i < totalFiles; i++) {
          setUploadProgress(`Uploading ${i + 1} of ${totalFiles}...`);
          const file = files[i];
          try {
            const compressed = await compressImage(file);
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = generateUniqueFileName(userId, fileExt, `units/${unitId}`);
            const url = await uploadWithRetry(compressed, fileName, fileExt);
            uploadedUrls.push(url);
          } catch (fileError: any) {
            console.error(`Failed to upload ${file.name}:`, fileError);
            failedFiles.push(file.name);
            // Continue with next file instead of aborting
          }
          // Small delay between sequential uploads
          if (i < totalFiles - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } else {
        // Process in smaller batches with delays
        for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
          const batch = files.slice(i, Math.min(i + BATCH_SIZE, totalFiles));
          const batchEnd = Math.min(i + BATCH_SIZE, totalFiles);
          setUploadProgress(`Uploading ${i + 1}-${batchEnd} of ${totalFiles}...`);
          
          // Compress (if needed) and upload batch in parallel with Promise.allSettled
          const batchPromises = batch.map(async (file) => {
            const compressed = await compressImage(file);
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = generateUniqueFileName(userId, fileExt, `units/${unitId}`);
            return { url: await uploadWithRetry(compressed, fileName, fileExt), fileName: file.name };
          });
          
          const batchSettled = await Promise.allSettled(batchPromises);
          
          // Process results - collect successes and failures
          batchSettled.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              uploadedUrls.push(result.value.url);
            } else {
              console.error(`Failed to upload ${batch[idx].name}:`, result.reason);
              failedFiles.push(batch[idx].name);
            }
          });
          
          // Add delay between batches to allow connection recovery
          if (i + BATCH_SIZE < totalFiles) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }
      }

      // Handle results - partial success is still success
      if (uploadedUrls.length > 0) {
        const newImages = [...images, ...uploadedUrls];
        onImagesChange(newImages);

        if (failedFiles.length > 0) {
          toast({
            title: `Uploaded ${uploadedUrls.length} of ${totalFiles} images`,
            description: `Failed: ${failedFiles.slice(0, 3).join(', ')}${failedFiles.length > 3 ? ` and ${failedFiles.length - 3} more` : ''}. You can retry these.`,
          });
        } else {
          toast({
            title: "Unit images uploaded successfully!",
            description: `${totalFiles} image${totalFiles > 1 ? 's' : ''} added to Unit ${unitNumber}.`,
          });
        }
      } else {
        // All failed
        toast({
          title: "Upload failed",
          description: "All images failed to upload. Please try again with fewer images or check your connection.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error in upload process:', error);
      
      // Even if there was an error, save any successful uploads
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
  }, [userId, unitId, unitNumber, images, onImagesChange, toast]);

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

  const removeImage = (indexToRemove: number) => {
    const newImages = images.filter((_, index) => index !== indexToRemove);
    onImagesChange(newImages);
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !amenities.includes(newAmenity.trim())) {
      onAmenitiesChange([...amenities, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const removeAmenity = (indexToRemove: number) => {
    const newAmenities = amenities.filter((_, index) => index !== indexToRemove);
    onAmenitiesChange(newAmenities);
  };

  return (
    <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
      <h6 className="font-medium text-sm">Unit {unitNumber} - Images & Amenities</h6>
      
      {/* Image Upload */}
      <div>
        <Label htmlFor={`unit-${unitId}-images`} className="text-sm">Unit Images</Label>
        <div className="mt-2">
          <Input
            id={`unit-${unitId}-images`}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="cursor-pointer text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload images specific to this unit (max 10MB each, auto-compressed).
          </p>
        </div>
      </div>

      {/* Display Unit Images */}
      {images.length > 0 && (
        <div>
          <Label className="text-sm">Unit Images ({images.length})</Label>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
            {images.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Unit ${unitNumber} image ${index + 1}`}
                  className="w-full h-20 object-cover rounded border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 p-0"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unit Amenities */}
      <div>
        <Label className="text-sm">Unit-Specific Amenities</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            placeholder="e.g., Balcony, In-unit Laundry"
            className="text-sm"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
          />
          <Button type="button" onClick={addAmenity} size="sm" variant="outline">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {amenities.map((amenity, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {amenity}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                  onClick={() => removeAmenity(index)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Upload className="h-3 w-3 animate-spin" />
          {uploadProgress || 'Uploading unit images...'}
        </div>
      )}
    </div>
  );
};

export default UnitImageUpload;
