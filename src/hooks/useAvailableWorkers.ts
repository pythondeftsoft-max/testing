import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AvailableWorker {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
  role_name?: string;
  territory_id?: string;
  territory_name?: string;
}

export const useAvailableWorkers = () => {
  return useQuery({
    queryKey: ['available-workers'],
    queryFn: async (): Promise<AvailableWorker[]> => {
      const { data, error } = await supabase
        .from('system_admins')
        .select(`
          user_id,
          role_name,
          profiles!inner(
            first_name,
            last_name,
            email,
            territory_id,
            territories(territory_name)
          )
        `)
        .in('role_name', ['super_admin', 'operations_admin', 'matchmaker'])
        .eq('is_active', true)
        .order('profiles(first_name)', { ascending: true });

      if (error) throw error;

      return (data || []).map((worker: any) => ({
        user_id: worker.user_id,
        first_name: worker.profiles.first_name,
        last_name: worker.profiles.last_name,
        email: worker.profiles.email,
        full_name: `${worker.profiles.first_name} ${worker.profiles.last_name}`,
        role_name: worker.role_name,
        territory_id: worker.profiles.territory_id,
        territory_name: worker.profiles.territories?.territory_name,
      }));
    },
  });
};
