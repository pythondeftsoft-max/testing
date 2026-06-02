
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface PropertyLimitData {
  current_count: number;
  free_limit: number;
  billable_units_count: number;
  has_subscription: boolean;
  needs_sub: boolean;
  notification_sent_result: boolean;
}

export const usePropertyLimits = (userId: string | undefined, userType: string | undefined, portfolioId?: string) => {
  const [propertyLimits, setPropertyLimits] = useState<PropertyLimitData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPropertyLimits = async () => {
    if (!userId || userType === 'tenant') return;
    
    // Skip if portfolioId is "everything" - this means viewing all portfolios
    if (portfolioId === 'everything') return;
    
    setLoading(true);
    try {
      // Use portfolio-specific function if portfolioId is provided and valid UUID
      const rpcFunction = portfolioId && portfolioId !== 'everything'
        ? 'check_portfolio_property_limit_with_notifications'
        : 'check_property_limit_with_notifications';
      
      // Explicitly cast to string to ensure correct UUID type
      const rpcParams = portfolioId && portfolioId !== 'everything'
        ? { 
            landlord_id: userId as string, 
            portfolio_id_param: portfolioId as string 
          }
        : { landlord_id: userId as string };

      const { data, error } = await supabase.rpc(rpcFunction, rpcParams);

      if (error) {
        console.error('Error fetching property limits:', error);
        
        // Only show toast once per session to prevent spam
        const errorKey = `property-limits-error-${portfolioId || 'default'}`;
        if (portfolioId !== 'everything' && !sessionStorage.getItem(errorKey)) {
          toast({
            title: "Error",
            description: "Failed to fetch property limits",
            variant: "destructive"
          });
          sessionStorage.setItem(errorKey, 'true');
        }
        return;
      }

      if (data && data.length > 0) {
        const row = data[0] as any;
        // Map to canonical field names (handles both old and new DB column names)
        setPropertyLimits({
          current_count: row.current_count ?? row.current_properties ?? 0,
          free_limit: row.free_limit ?? row.free_tier_limit ?? 10,
          billable_units_count: row.billable_units_count ?? row.billable_units ?? 0,
          has_subscription: row.has_subscription ?? row.has_active_subscription ?? false,
          needs_sub: row.needs_sub ?? row.needs_subscription ?? false,
          notification_sent_result: row.notification_sent_result ?? row.notification_sent ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching property limits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPropertyLimits();
  }, [userId, userType, portfolioId]);

  const checkCanAddProperty = (): boolean => {
    if (!propertyLimits) return true; // Allow if limits not loaded yet
    
    return !propertyLimits.needs_sub;
  };

  const getPropertyLimitMessage = (): string | null => {
    if (!propertyLimits) return null;
    
    if (propertyLimits.needs_sub) {
      return `You've reached your free tier limit of ${propertyLimits.free_limit} properties. Subscribe to Landlord Pro to add unlimited properties.`;
    }
    
    const remaining = propertyLimits.free_limit - propertyLimits.current_count;
    if (remaining <= 2 && remaining > 0) {
      return `You have ${remaining} properties remaining in your free tier. Upgrade to Landlord Pro for unlimited properties.`;
    }
    
    return null;
  };

  const getSubscriptionLink = (): string => {
    return '/landlord-hap';
  };

  return {
    propertyLimits,
    loading,
    fetchPropertyLimits,
    checkCanAddProperty,
    getPropertyLimitMessage,
    getSubscriptionLink,
    refetch: fetchPropertyLimits
  };
};
