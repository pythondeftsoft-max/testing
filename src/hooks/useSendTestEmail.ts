import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSendTestEmail = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { data, error } = await supabase.functions.invoke('process-asset-reminders', {
        body: { dryRun: true },
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, reminderId) => {
      toast({
        title: "Test email sent successfully",
        description: data.message || "Test email has been queued for delivery",
      });
      
      // Invalidate email logs to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['reminder-email-logs', reminderId] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send test email",
        description: error.message || "An error occurred while sending the test email",
        variant: "destructive",
      });
    },
  });
};