import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AssetReminderPreference {
  id: string;
  asset_id: string;
  user_id: string;
  portfolio_id?: string;
  is_enabled: boolean;
  frequency: 'quarterly' | 'semi-annual' | 'annual';
  last_financial_update?: string;
  next_reminder_date?: string;
  reminder_count: number;
  created_at: string;
  updated_at: string;
  // New email-related fields
  email_enabled?: boolean;
  delivery_channel?: 'in_app' | 'email' | 'both';
  preferred_send_hour?: number;
  timezone?: string;
  digest_interval?: 'immediate' | 'daily' | 'weekly';
  digest_day_of_week?: number;
  mute_until?: string;
  last_email_sent_at?: string;
}

export const useAssetReminderPreferences = (assetId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['asset-reminder-preferences', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_reminder_preferences')
        .select('*')
        .eq('asset_id', assetId)
        .maybeSingle();

      if (error) throw error;
      return data as AssetReminderPreference | null;
    },
    enabled: !!assetId,
  });

  const createOrUpdatePreferences = useMutation({
    mutationFn: async (preferences: Partial<AssetReminderPreference>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const upsertData = {
        asset_id: assetId,
        user_id: user.id,
        ...preferences,
      };

      const { data, error } = await supabase
        .from('asset_reminder_preferences')
        .upsert(upsertData, { onConflict: 'asset_id,user_id' })
        .select()
        .single();

      if (error) throw error;
      return data as AssetReminderPreference;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['asset-reminder-preferences', assetId], data);
      toast({
        title: "Reminder preferences updated",
        description: "Your financial update reminders have been saved.",
      });
    },
    onError: (error) => {
      console.error('Error updating reminder preferences:', error);
      toast({
        title: "Error updating preferences",
        description: "Failed to save reminder preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: createOrUpdatePreferences.mutate,
    isUpdating: createOrUpdatePreferences.isPending,
  };
};