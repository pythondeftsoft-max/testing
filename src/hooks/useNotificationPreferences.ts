import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  digest_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertNotificationPreferenceData {
  notification_type: string;
  in_app_enabled?: boolean;
  email_enabled?: boolean;
  digest_mode?: boolean;
}

export const NOTIFICATION_PREFERENCES_KEYS = {
  all: ['notification-preferences'] as const,
  userPreferences: (userId: string) => [...NOTIFICATION_PREFERENCES_KEYS.all, 'user', userId] as const,
};

export const useNotificationPreferences = (userId?: string) => {
  return useQuery({
    queryKey: NOTIFICATION_PREFERENCES_KEYS.userPreferences(userId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('notification_type', { ascending: true });

      if (error) {
        console.error('Error fetching notification preferences:', error);
        throw error;
      }

      return data as NotificationPreference[];
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
  });
};

export const useUpsertNotificationPreference = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (preferenceData: UpsertNotificationPreferenceData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferenceData,
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting notification preference:', error);
        throw error;
      }

      return data as NotificationPreference;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: NOTIFICATION_PREFERENCES_KEYS.userPreferences(data.user_id) 
      });
      toast({
        title: 'Preferences Updated',
        description: `Notification preferences for ${data.notification_type} updated successfully`,
      });
    },
    onError: (error) => {
      console.error('Failed to update notification preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });
};