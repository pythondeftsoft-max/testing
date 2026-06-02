
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getImportSession, getImportResults, getUserImportSessions } from '@/services/propertyImportApi';
import { supabase } from '@/integrations/supabase/client';
import { PROPERTY_IMPORT_KEYS } from '@/lib/queryKeys';

export const useImportSession = (sessionId?: string) => {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: PROPERTY_IMPORT_KEYS.session(sessionId!),
    queryFn: () => getImportSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: () => {
      // Stop polling when session is completed or failed
      const currentData = queryClient.getQueryData(PROPERTY_IMPORT_KEYS.session(sessionId!)) as any;
      return currentData?.status === 'processing' ? 2000 : false;
    }
  });

  const resultsQuery = useQuery({
    queryKey: PROPERTY_IMPORT_KEYS.results(sessionId!),
    queryFn: () => getImportResults(sessionId!),
    enabled: !!sessionId && sessionQuery.data?.status === 'completed'
  });

  // Set up real-time subscription for session updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('import-session-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'property_import_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Import session updated:', payload);
          queryClient.invalidateQueries({ 
            queryKey: PROPERTY_IMPORT_KEYS.session(sessionId) 
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'property_import_results',
          filter: `import_session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Import result added:', payload);
          queryClient.invalidateQueries({ 
            queryKey: PROPERTY_IMPORT_KEYS.results(sessionId) 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  return {
    session: sessionQuery.data,
    results: resultsQuery.data,
    isLoadingSession: sessionQuery.isLoading,
    isLoadingResults: resultsQuery.isLoading,
    sessionError: sessionQuery.error,
    resultsError: resultsQuery.error,
    isCompleted: sessionQuery.data?.status === 'completed',
    isFailed: sessionQuery.data?.status === 'failed',
    isProcessing: sessionQuery.data?.status === 'processing'
  };
};

export const useImportSessions = () => {
  return useQuery({
    queryKey: PROPERTY_IMPORT_KEYS.sessions,
    queryFn: getUserImportSessions
  });
};
