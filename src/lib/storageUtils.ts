const STORAGE_TIMEOUT = 20000; // 20 seconds - buffer for signed URL fallback

export async function withStorageTimeout<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ data: T | null; error: Error | null; timedOut: boolean }> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), STORAGE_TIMEOUT);
    });

    const data = await Promise.race([operation(), timeoutPromise]);
    return { data, error: null, timedOut: false };
  } catch (error: any) {
    const timedOut = error.message === 'TIMEOUT';
    return {
      data: null,
      error: timedOut
        ? new Error(`${operationName} timed out after ${STORAGE_TIMEOUT / 1000} seconds`)
        : error,
      timedOut
    };
  }
}

export function isDuplicateKeyError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  return msg.includes('duplicate key') || msg.includes('already exists') || msg.includes('the resource already exists');
}

// Detect errors that should trigger retry (including Supabase DatabaseTimeout)
export function isRetriableError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  const errorObj = error as any;
  
  // Check for Supabase DatabaseTimeout (status code 544)
  if (errorObj.code === 'DatabaseTimeout' || errorObj.statusCode === '544' || errorObj.statusCode === 544) {
    return true;
  }
  
  // Check for common retriable error patterns
  return (
    msg.includes('timeout') ||
    msg.includes('database timeout') ||
    msg.includes('connection') ||
    msg.includes('network') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('544')
  );
}

// Detect connection pool exhaustion (429 errors)
export function isConnectionPoolError(error: Error | null): boolean {
  if (!error) return false;
  const errorObj = error as any;
  return (
    errorObj.statusCode === '429' ||
    errorObj.statusCode === 429 ||
    errorObj.error === 'too_many_connections' ||
    error.message?.toLowerCase().includes('too many connections')
  );
}

export function generateUniqueFileName(userId: string, fileExt: string, prefix?: string): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 15);
  const nanoRandom = Math.random().toString(36).substring(2, 9);
  const basePath = prefix ? `${prefix}/${userId}` : userId;
  return `${basePath}/${timestamp}_${randomPart}_${nanoRandom}.${fileExt}`;
}

export async function retryStorageOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 2
): Promise<{ data: T | null; error: Error | null }> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const result = await withStorageTimeout(operation, operationName);
    
    if (result.data) {
      return { data: result.data, error: null };
    }
    
    // Don't retry on connection pool exhaustion - it just makes things worse
    if (isConnectionPoolError(result.error)) {
      console.warn(`${operationName}: Connection pool exhausted, skipping retries`);
      return { data: null, error: result.error };
    }
    
    // Check if error is retriable (includes DatabaseTimeout from Supabase)
    const shouldRetry = result.timedOut || isRetriableError(result.error);
    
    if (!shouldRetry || attempt > maxRetries) {
      return { data: null, error: result.error };
    }
    
    // Faster exponential backoff for quicker recovery
    const baseDelay = isRetriableError(result.error) ? 800 : 500;
    console.log(`${operationName}: Retry attempt ${attempt}/${maxRetries} after ${attempt * baseDelay}ms...`);
    await new Promise(resolve => setTimeout(resolve, attempt * baseDelay));
  }
  
  return { data: null, error: new Error(`${operationName} failed after ${maxRetries} retries`) };
}

export async function retryDatabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  operationName: string,
  maxRetries: number = 2
): Promise<{ data: T | null; error: Error | null }> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await operation();
      
      if (result.error) {
        const error = result.error as any;
        
        // Don't retry on connection pool exhaustion
        if (isConnectionPoolError(error)) {
          console.warn(`${operationName}: Connection pool exhausted`);
          return { data: null, error: new Error(error.message || 'Connection pool exhausted') };
        }
        
        // Check if retriable
        const isRetriable = isRetriableError(error);
        
        if (!isRetriable || attempt > maxRetries) {
          return { data: null, error: new Error(error.message || 'Database error') };
        }
        
        // Exponential backoff
        const delay = attempt * 1000;
        console.log(`${operationName}: Retry ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return { data: result.data, error: null };
    } catch (err: any) {
      // Handle timeout errors
      if (err.message?.includes('timeout') || err.message?.includes('aborted')) {
        if (attempt > maxRetries) {
          return { data: null, error: new Error(`${operationName} timed out`) };
        }
        const delay = attempt * 1000;
        console.log(`${operationName}: Timeout retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return { data: null, error: err };
    }
  }
  
  return { data: null, error: new Error(`${operationName} failed after retries`) };
}
