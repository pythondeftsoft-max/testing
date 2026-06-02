import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationConfiguration {
  id: string;
  notification_type: string;
  user_type: 'tenant' | 'landlord';
  custom_link: string | null;
  custom_trigger: string | null;
  custom_category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotificationConfigurations = () => {
  return useQuery({
    queryKey: ['notification-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_configurations')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as NotificationConfiguration[];
    },
  });
};

export const useSaveNotificationConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      notification_type: string;
      user_type: 'tenant' | 'landlord';
      custom_link?: string;
      custom_trigger?: string;
      custom_category?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      const { data, error } = await supabase
        .from('notification_configurations')
        .upsert({
          notification_type: config.notification_type,
          user_type: config.user_type,
          custom_link: config.custom_link || null,
          custom_trigger: config.custom_trigger || null,
          custom_category: config.custom_category || null,
          updated_by: userId,
          created_by: userId,
        }, {
          onConflict: 'notification_type,user_type'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Configuration saved successfully!");
      queryClient.invalidateQueries({ queryKey: ['notification-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['notification-type-analytics'] });
    },
    onError: (error: any) => {
      toast.error("Failed to save configuration", {
        description: error.message,
      });
    },
  });
};

export const useDeleteNotificationConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      notification_type: string;
      user_type: 'tenant' | 'landlord';
    }) => {
      const { error } = await supabase
        .from('notification_configurations')
        .delete()
        .eq('notification_type', params.notification_type)
        .eq('user_type', params.user_type);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuration reset to default");
      queryClient.invalidateQueries({ queryKey: ['notification-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['notification-type-analytics'] });
    },
    onError: (error: any) => {
      toast.error("Failed to reset configuration", {
        description: error.message,
      });
    },
  });
};
