
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSendTestDigest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { data, error } = await supabase.functions.invoke('process-asset-digest-reminders', {
        body: { dryRun: true, testReminderId: reminderId },
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, reminderId) => {
      toast({
        title: "Test digest preview generated",
        description: data.message || "Digest preview has been generated successfully",
      });
      
      // Invalidate email logs to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['reminder-email-logs', reminderId] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate test digest",
        description: error.message || "An error occurred while generating the digest preview",
        variant: "destructive",
      });
    },
  });
};
