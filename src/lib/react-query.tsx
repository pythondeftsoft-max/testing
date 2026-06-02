import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';

// Create a client
// Schema/database error codes that should NOT be retried
const NON_RETRYABLE_CODES = [
  'PGRST204', // Missing column
  'PGRST301', // Auth errors
  'PGRST203', // Function overload
  '42703',    // Column does not exist
  '22P02',    // Invalid UUID syntax
  '42P01',    // Table does not exist
  '42883',    // Function does not exist
  '23505',    // Duplicate key
];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes for better caching
      gcTime: 30 * 60 * 1000, // 30 minutes cache time
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      refetchOnMount: false, // Don't refetch on every mount
      networkMode: 'always', // Don't wait for network status
      throwOnError: false, // Never let query errors crash the app
      retry: (failureCount, error) => {
        const code = (error as any)?.code;
        // Don't retry on schema/database errors
        if (code && NON_RETRYABLE_CODES.includes(code)) return false;
        // Don't retry on timeout errors
        if ((error as any)?.message?.includes('timeout')) return false;
        // Max 2 retries for other errors
        return failureCount < 2;
      },
      retryDelay: 1000, // Fixed 1 second delay (faster recovery)
    },
  },
});

export const ReactQueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if debug mode is enabled
  const isDebugMode = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).has('debug') || 
    localStorage.getItem('openkey-debug') === 'true'
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDebugMode && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};