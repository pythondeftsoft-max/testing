
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProcessPortfolioEventParams {
  eventType: 'rent_payment' | 'lease_signing' | 'maintenance_completion' | 'lease_renewal' | 'property_inspection';
  portfolioId: string;
  propertyId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export const usePortfolioEvents = () => {
  const { toast } = useToast();

  const processEvent = useMutation({
    mutationFn: async (params: ProcessPortfolioEventParams) => {
      const { data, error } = await supabase.functions.invoke('process-portfolio-events', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast({
        title: "Event Processed",
        description: result.message || `Successfully processed event and awarded ${result.pointsAwarded} points`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process portfolio event",
        variant: "destructive",
      });
    },
  });

  return {
    processEvent,
  };
};
