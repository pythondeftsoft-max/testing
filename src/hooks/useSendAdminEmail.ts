import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendAdminEmailParams {
  templateSlug: string;
  recipientEmail: string;
  contextVariables: Record<string, string>;
}

export const useSendAdminEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateSlug, recipientEmail, contextVariables }: SendAdminEmailParams) => {
      const { data, error } = await supabase.functions.invoke('send-admin-email', {
        body: {
          templateSlug,
          recipientEmail,
          contextVariables
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Email sent successfully", {
        description: `Email has been sent and logged with ID: ${data.emailId}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['email-queue'] });
      queryClient.invalidateQueries({ queryKey: ['email-stats'] });
    },
    onError: (error: any) => {
      toast.error("Failed to send email", {
        description: error.message || "An error occurred while sending the email",
      });
    },
  });
};
