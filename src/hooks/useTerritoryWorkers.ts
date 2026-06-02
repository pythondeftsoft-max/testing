import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TERRITORY_KEYS } from '@/lib/queryKeys';
import { useToast } from '@/hooks/use-toast';

export interface TerritoryWorker {
  id: string;
  territory_id: string;
  worker_id: string;
  assigned_at: string;
  assigned_by: string | null;
  is_primary: boolean;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Fetch workers for a specific territory
export const useTerritoryWorkers = (territoryId: string) => {
  return useQuery({
    queryKey: TERRITORY_KEYS.workers(territoryId),
    queryFn: async (): Promise<TerritoryWorker[]> => {
      const { data, error } = await supabase
        .from('territory_workers')
        .select(`
          id,
          territory_id,
          worker_id,
          assigned_at,
          assigned_by,
          is_primary,
          profiles(
            first_name,
            last_name,
            email
          )
        `)
        .eq('territory_id', territoryId)
        .order('is_primary', { ascending: false })
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        territory_id: item.territory_id,
        worker_id: item.worker_id,
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by,
        is_primary: item.is_primary,
        first_name: item.profiles?.first_name || '',
        last_name: item.profiles?.last_name || '',
        email: item.profiles?.email || '',
        full_name: item.profiles 
          ? `${item.profiles.first_name} ${item.profiles.last_name}`
          : 'Unknown Worker',
      }));
    },
    enabled: !!territoryId,
  });
};

// Add a worker to a territory
export const useAddTerritoryWorker = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ territoryId, workerId }: { territoryId: string; workerId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('territory_workers')
        .insert([{
          territory_id: territoryId,
          worker_id: workerId,
          assigned_by: userData?.user?.id || null,
          is_primary: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Check if this is the only worker - if so, set as default
      const { data: workers } = await supabase
        .from('territory_workers')
        .select('id')
        .eq('territory_id', data.territory_id);
      
      if (workers?.length === 1) {
        await supabase
          .from('territories')
          .update({ default_worker_id: data.worker_id })
          .eq('id', data.territory_id);
      }
      
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: TERRITORY_KEYS.all }),
        queryClient.refetchQueries({ queryKey: TERRITORY_KEYS.workers(data.territory_id) }),
      ]);
      
      toast({
        title: "Worker Added",
        description: "Worker has been assigned to this territory.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Adding Worker",
        description: error.message || "Failed to add worker to territory.",
        variant: "destructive",
      });
    },
  });
};

// Remove a worker from a territory
export const useRemoveTerritoryWorker = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ territoryId, workerId }: { territoryId: string; workerId: string }) => {
      const { error } = await supabase
        .from('territory_workers')
        .delete()
        .eq('territory_id', territoryId)
        .eq('worker_id', workerId);

      if (error) throw error;
      return { territoryId, workerId };
    },
    onSuccess: async (data) => {
      // Check remaining workers and update default_worker_id
      const { data: remainingWorkers } = await supabase
        .from('territory_workers')
        .select('worker_id')
        .eq('territory_id', data.territoryId)
        .limit(1);
      
      // Update default_worker_id to first remaining worker or null
      await supabase
        .from('territories')
        .update({ 
          default_worker_id: remainingWorkers?.[0]?.worker_id || null 
        })
        .eq('id', data.territoryId);
      
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: TERRITORY_KEYS.all }),
        queryClient.refetchQueries({ queryKey: TERRITORY_KEYS.workers(data.territoryId) }),
      ]);
      
      toast({
        title: "Worker Removed",
        description: "Worker has been removed from this territory.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Removing Worker",
        description: error.message || "Failed to remove worker from territory.",
        variant: "destructive",
      });
    },
  });
};
