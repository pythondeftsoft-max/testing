import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendPropertyMatchParams {
  tenantId: string;
  templateSlug: string;
  propertyContext: {
    property_address: string;
    property_rent: string;
    property_url: string;
  };
}

export const useSendPropertyMatch = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, templateSlug, propertyContext }: SendPropertyMatchParams) => {
      const { data, error } = await supabase.functions.invoke('send-property-match-email', {
        body: {
          tenantId,
          templateSlug, 
          propertyContext
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Email queued successfully",
        description: "Property match email has been added to the queue",
      });
      
      queryClient.invalidateQueries({ queryKey: ['email-queue'] });
      queryClient.invalidateQueries({ queryKey: ['email-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred while queueing the email",
        variant: "destructive",
      });
    },
  });
};