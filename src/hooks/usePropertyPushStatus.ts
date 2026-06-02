import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PushStatus = 'push_sent' | 'interested' | 'denied' | 'landlord_review' | 'primary_applicant';

interface PropertyPush {
  id: string;
  property_id: string;
  tenant_id: string;
  status: PushStatus;
  pushed_at: string;
  expires_at: string;
  tenant_name?: string;
  property_address?: string;
}

interface UsePropertyPushStatusResult {
  activePush: PropertyPush | null;
  loading: boolean;
  error: string | null;
  hasActivePush: boolean;
  refetch: () => Promise<void>;
}

// Check if a property has an active push (not denied, not expired)
export const usePropertyPushStatus = (propertyId?: string): UsePropertyPushStatusResult => {
  const [activePush, setActivePush] = useState<PropertyPush | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivePush = async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('property_pushes')
        .select(`
          id,
          property_id,
          tenant_id,
          status,
          pushed_at,
          expires_at
        `)
        .eq('property_id', propertyId)
        .neq('status', 'denied')
        .gte('expires_at', new Date().toISOString())
        .order('pushed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setActivePush(data as PropertyPush | null);
    } catch (err: any) {
      console.error('Error fetching property push status:', err);
      setError(err.message || 'Failed to fetch push status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePush();
  }, [propertyId]);

  return {
    activePush,
    loading,
    error,
    hasActivePush: !!activePush,
    refetch: fetchActivePush,
  };
};

// Get all active pushes for a property (for display on pipeline cards)
export const usePropertyPushesForProperty = (propertyId?: string) => {
  const [pushes, setPushes] = useState<PropertyPush[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPushes = async () => {
      if (!propertyId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('property_pushes')
          .select(`
            id,
            property_id,
            tenant_id,
            status,
            pushed_at,
            expires_at
          `)
          .eq('property_id', propertyId)
          .neq('status', 'denied')
          .gte('expires_at', new Date().toISOString())
          .order('pushed_at', { ascending: false });

        if (error) throw error;
        setPushes((data || []) as PropertyPush[]);
      } catch (err) {
        console.error('Error fetching property pushes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPushes();
  }, [propertyId]);

  return { pushes, loading };
};

// Get all pushes for a tenant (for display on pipeline cards)
export const usePropertyPushesForTenant = (tenantId?: string) => {
  const [pushes, setPushes] = useState<PropertyPush[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPushes = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('property_pushes')
          .select(`
            id,
            property_id,
            tenant_id,
            status,
            pushed_at,
            expires_at
          `)
          .eq('tenant_id', tenantId)
          .neq('status', 'denied')
          .gte('expires_at', new Date().toISOString())
          .order('pushed_at', { ascending: false });

        if (error) throw error;
        setPushes((data || []) as PropertyPush[]);
      } catch (err) {
        console.error('Error fetching tenant pushes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPushes();
  }, [tenantId]);

  return { pushes, loading };
};
