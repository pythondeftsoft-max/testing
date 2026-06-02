import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TERRITORY_KEYS } from '@/lib/queryKeys';
import { useToast } from '@/hooks/use-toast';

export interface TerritoryWorker {
  id: string;
  worker_id: string;
  full_name: string;
  email: string;
  is_primary: boolean;
  assigned_at: string;
}

export interface Territory {
  id: string;
  country: string;
  territory_type: string;
  territory_name: string;
  region_code: string | null;
  postal_ranges: string | null;
  default_worker_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  workers?: TerritoryWorker[];
}

export interface CreateTerritoryInput {
  country: string;
  territoryType: string;
  territoryName: string;
  regionCode?: string;
  postalRanges?: string;
  defaultWorker?: string;
  isActive: boolean;
}

// Fetch all territories
export const useTerritories = () => {
  return useQuery({
    queryKey: TERRITORY_KEYS.list(),
    queryFn: async (): Promise<Territory[]> => {
      const { data, error } = await supabase
        .from('territories')
        .select(`
          *,
          territory_workers(
            id,
            worker_id,
            assigned_at,
            is_primary,
            profiles(
              first_name,
              last_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((territory: any) => ({
        ...territory,
        workers: (territory.territory_workers || []).map((tw: any) => ({
          id: tw.id,
          worker_id: tw.worker_id,
          full_name: tw.profiles 
            ? `${tw.profiles.first_name} ${tw.profiles.last_name}`
            : 'Unknown Worker',
          email: tw.profiles?.email || '',
          is_primary: tw.is_primary,
          assigned_at: tw.assigned_at,
        })),
      }));
    },
  });
};

// Create territory mutation
export const useCreateTerritory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTerritoryInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('territories')
        .insert([{
          country: input.country,
          territory_type: input.territoryType,
          territory_name: input.territoryName,
          region_code: input.regionCode || null,
          postal_ranges: input.postalRanges || null,
          default_worker_id: input.defaultWorker || null,
          is_active: input.isActive,
          created_by: userData?.user?.id || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TERRITORY_KEYS.all });
      toast({
        title: "Territory Created",
        description: `${data.territory_name} has been created successfully.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Territory",
        description: error.message || "Failed to create territory. Please try again.",
        variant: "destructive"
      });
    }
  });
};

// Update territory mutation
export const useUpdateTerritory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateTerritoryInput> }) => {
      const updateData: any = {};
      
      if (updates.country) updateData.country = updates.country;
      if (updates.territoryType) updateData.territory_type = updates.territoryType;
      if (updates.territoryName) updateData.territory_name = updates.territoryName;
      if (updates.regionCode !== undefined) updateData.region_code = updates.regionCode || null;
      if (updates.postalRanges !== undefined) updateData.postal_ranges = updates.postalRanges || null;
      if (updates.defaultWorker !== undefined) updateData.default_worker_id = updates.defaultWorker || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('territories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TERRITORY_KEYS.all });
      toast({
        title: "Territory Updated",
        description: "Territory has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Territory",
        description: error.message || "Failed to update territory.",
        variant: "destructive"
      });
    }
  });
};

// Delete territory mutation
export const useDeleteTerritory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('territories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TERRITORY_KEYS.all });
      toast({
        title: "Territory Deleted",
        description: "Territory has been deleted successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Territory",
        description: error.message || "Failed to delete territory.",
        variant: "destructive"
      });
    }
  });
};
