import { supabase } from '@/integrations/supabase/client';

interface SignedUploadUrl {
  path: string;
  token: string;
  publicUrl: string;
}

interface GetSignedUrlsResponse {
  urls: SignedUploadUrl[];
}

/**
 * Get multiple signed upload URLs in a single edge function call.
 * This reduces database connections from N (one per file) to 1.
 */
export async function getSignedUploadUrls(
  fileExtensions: string[],
  propertyId?: string,
  bucket?: string
): Promise<{ data: SignedUploadUrl[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<GetSignedUrlsResponse>('get-upload-urls', {
      body: { propertyId, fileExtensions, bucket }
    });

    if (error) {
      console.error('Failed to get signed upload URLs:', error);
      return { data: null, error: new Error(error.message || 'Failed to get upload URLs') };
    }

    if (!data?.urls) {
      return { data: null, error: new Error('Invalid response from upload URL service') };
    }

    return { data: data.urls, error: null };
  } catch (err: any) {
    console.error('Error calling get-upload-urls:', err);
    return { data: null, error: err };
  }
}

/**
 * Upload a file directly to S3 using a signed URL.
 * This bypasses the database connection pool entirely.
 */
export async function uploadToSignedUrl(
  file: File,
  path: string,
  token: string,
  bucket: string = 'property-images'
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(path, token, file, {
        upsert: false
      });

    if (error) {
      console.error(`Signed upload failed for ${path}:`, error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error(`Error in signed upload for ${path}:`, err);
    return { success: false, error: err };
  }
}

/**
 * Verify that an uploaded file is accessible via HEAD request.
 */
export async function verifyUploadedFile(publicUrl: string): Promise<boolean> {
  try {
    const response = await fetch(publicUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Upload multiple files using signed URLs with full parallelism.
 * Returns array of successful public URLs and list of failed file names.
 */
export async function uploadFilesWithSignedUrls(
  files: File[],
  propertyId?: string,
  onProgress?: (message: string) => void
): Promise<{ 
  uploadedUrls: string[]; 
  failedFiles: string[];
  usedFallback: boolean;
}> {
  const uploadedUrls: string[] = [];
  const failedFiles: string[] = [];

  // Extract file extensions
  const fileExtensions = files.map(f => f.name.split('.').pop() || 'jpg');

  onProgress?.('Preparing upload...');

  // Get all signed URLs in a single call (1 DB operation)
  const { data: signedUrls, error: urlError } = await getSignedUploadUrls(fileExtensions, propertyId);

  if (urlError || !signedUrls) {
    console.error('Failed to get signed URLs, will need fallback:', urlError);
    // Return empty results - caller should use fallback
    return { 
      uploadedUrls: [], 
      failedFiles: files.map(f => f.name),
      usedFallback: false 
    };
  }

  onProgress?.(`Uploading ${files.length} images...`);

  // Upload all files in parallel (ZERO DB connections - direct to S3)
  const results = await Promise.allSettled(
    files.map(async (file, idx) => {
      const { path, token, publicUrl } = signedUrls[idx];
      
      const { success, error } = await uploadToSignedUrl(file, path, token);
      
      if (!success) {
        throw new Error(error?.message || `Upload failed for ${file.name}`);
      }
      
      return publicUrl;
    })
  );

  // Process results
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      uploadedUrls.push(result.value);
    } else {
      console.error(`Failed to upload ${files[idx].name}:`, result.reason);
      failedFiles.push(files[idx].name);
    }
  });

  // Verify uploads after a short delay for storage propagation
  if (uploadedUrls.length > 0) {
    onProgress?.('Verifying uploads...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const verifiedUrls: string[] = [];
    const verificationResults = await Promise.allSettled(
      uploadedUrls.map(async (url) => {
        const isValid = await verifyUploadedFile(url);
        if (isValid) {
          return url;
        }
        throw new Error('Verification failed');
      })
    );

    verificationResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        verifiedUrls.push(result.value);
      } else {
        console.warn('Post-upload verification failed for:', uploadedUrls[idx].substring(0, 80));
        failedFiles.push('(verification failed)');
      }
    });

    return { 
      uploadedUrls: verifiedUrls, 
      failedFiles,
      usedFallback: false 
    };
  }

  return { 
    uploadedUrls, 
    failedFiles,
    usedFallback: false 
  };
}
