import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackupOperation {
  action: 'create_backup' | 'restore_backup' | 'list_backups' | 'cleanup_old_backups';
  backup_type?: 'full' | 'incremental';
  backup_scope?: 'database' | 'storage' | 'configs';
  backup_id?: string;
}

export const useBackupManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const executeBackupOperation = async (operation: BackupOperation) => {
    try {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: operation
      });

      if (error) {
        throw new Error(error.message || 'Backup operation failed');
      }

      return data;
    } catch (error) {
      console.error('Backup operation error:', error);
      throw error;
    }
  };

  const createBackup = useMutation({
    mutationFn: ({ backup_type, backup_scope }: { backup_type?: string; backup_scope?: string }) =>
      executeBackupOperation({
        action: 'create_backup',
        backup_type: backup_type as 'full' | 'incremental',
        backup_scope: backup_scope as 'database' | 'storage' | 'configs'
      }),
    onSuccess: (data) => {
      toast({
        title: "Backup Initiated",
        description: data.message || "Backup process has been started successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (error: any) => {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to initiate backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const restoreBackup = useMutation({
    mutationFn: (backup_id: string) =>
      executeBackupOperation({
        action: 'restore_backup',
        backup_id
      }),
    onSuccess: (data) => {
      toast({
        title: "Restore Completed",
        description: data.message || "Data has been restored successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: backups, isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: () => executeBackupOperation({ action: 'list_backups' }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const cleanupOldBackups = useMutation({
    mutationFn: () => executeBackupOperation({ action: 'cleanup_old_backups' }),
    onSuccess: (data) => {
      toast({
        title: "Cleanup Completed",
        description: data.message || "Old backups have been cleaned up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to cleanup old backups. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    createBackup,
    restoreBackup,
    cleanupOldBackups,
    backups: backups?.backups || [],
    backupsLoading,
    refetchBackups,
    isCreating: createBackup.isPending,
    isRestoring: restoreBackup.isPending,
    isCleaning: cleanupOldBackups.isPending,
  };
};