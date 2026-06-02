import { Button } from '@/components/ui/button';
import { Shuffle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const AutoAssignButton = () => {
  const [isAssigning, setIsAssigning] = useState(false);
  const queryClient = useQueryClient();

  const handleAutoAssign = async () => {
    setIsAssigning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-assign-entities', {
        body: { entityType: 'both' }
      });

      if (error) throw error;

      const result = data as {
        tenantsAssigned: number;
        propertiesAssigned: number;
        workersUsed: string[];
        errors: string[];
      };

      // Force hard refetch to ensure UI updates immediately
      await queryClient.invalidateQueries({ queryKey: ['enhanced-unassigned-queue'] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned-property-units'] });
      await queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      await queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
      await queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      
      // Refetch with force to bypass cache
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['enhanced-unassigned-queue'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['unassigned-property-units'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'], type: 'active' }),
      ]);

      // Show success message
      const assignedCount = result.tenantsAssigned + result.propertiesAssigned;
      if (assignedCount > 0) {
        toast.success(
          `Auto-assigned ${result.tenantsAssigned} tenant(s) and ${result.propertiesAssigned} property(ies) to ${result.workersUsed.length} worker(s)`
        );
      } else {
        toast.info('No unassigned entities found');
      }

      // Show errors if any
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} assignment(s) failed - check logs`);
        console.error('Assignment errors:', result.errors);
      }

    } catch (error: any) {
      console.error('Auto-assign error:', error);
      toast.error(`Auto-assign failed: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Button
      onClick={handleAutoAssign}
      disabled={isAssigning}
      variant="default"
      size="sm"
      className="gap-2"
    >
      {isAssigning ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Assigning...
        </>
      ) : (
        <>
          <Shuffle className="h-4 w-4" />
          Auto-Assign
        </>
      )}
    </Button>
  );
};
