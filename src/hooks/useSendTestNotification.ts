import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendTestNotificationParams {
  notificationType: string;
  userType: 'tenant' | 'landlord';
  notificationData: {
    title: string;
    description: string;
    type: 'success' | 'info' | 'warning' | 'error';
    priority?: string;
  };
  link: string;
  category: string;
}

export const useSendTestNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendTestNotificationParams) => {
      const { data, error } = await supabase.functions.invoke('send-test-notification', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Test notification sent! 🎉", {
        description: data.message,
        action: {
          label: "View as " + (data.sentTo.includes('tenant') ? 'Tenant' : 'Landlord'),
          onClick: () => window.open(data.sentTo.includes('tenant') ? '/dashboard' : '/landlord/dashboard', '_blank')
        },
      });
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      toast.error("Failed to send test notification", {
        description: error.message || "An error occurred while sending the test notification",
      });
    },
  });
};
