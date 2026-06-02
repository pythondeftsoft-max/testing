import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeaseTemplate {
  id: string;
  owner_id: string;
  template_name: string;
  default_term_months: number;
  clauses: string[];
  late_fee_amount: number;
  late_fee_grace_days: number;
  security_deposit_months: number;
  pet_policy: string;
  utilities_included: string[];
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string;
  template_id: string | null;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  signature_status: string;
  landlord_signed_at: string | null;
  tenant_signed_at: string | null;
  termination_reason: string | null;
  termination_date: string | null;
  auto_renew: boolean;
  renewal_term_months: number;
  notes: string | null;
  created_at: string;
}

export function useLeaseManagement(landlordId: string) {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [templates, setTemplates] = useState<LeaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeases = useCallback(async () => {
    if (!landlordId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('tenant_leases')
      .select('*')
      .eq('owner_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Leases fetch:', error.message);
      setLeases([]);
    } else {
      setLeases((data as Lease[]) || []);
    }
    setLoading(false);
  }, [landlordId]);

  const fetchTemplates = useCallback(async () => {
    if (!landlordId) return;
    const { data } = await (supabase as any)
      .from('lease_templates')
      .select('*')
      .eq('owner_id', landlordId)
      .order('template_name');
    setTemplates((data as LeaseTemplate[]) || []);
  }, [landlordId]);

  useEffect(() => {
    fetchLeases();
    fetchTemplates();
  }, [fetchLeases, fetchTemplates]);

  const createLease = async (lease: Partial<Lease>) => {
    const { error } = await (supabase as any).from('tenant_leases').insert({
      ...lease,
      owner_id: landlordId,
      status: 'draft',
      signature_status: 'unsigned',
    });
    if (error) { toast.error('Failed to create lease'); return false; }
    toast.success('Lease created');
    fetchLeases();
    return true;
  };

  const updateLease = async (id: string, updates: Partial<Lease>) => {
    const { error } = await (supabase as any).from('tenant_leases').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update lease'); return; }
    toast.success('Lease updated');
    fetchLeases();
  };

  const signLease = async (id: string, party: 'landlord' | 'tenant') => {
    const updates: Record<string, unknown> = {};
    const lease = leases.find(l => l.id === id);
    if (party === 'landlord') {
      updates.landlord_signed_at = new Date().toISOString();
      updates.signature_status = lease?.tenant_signed_at ? 'fully_executed' : 'landlord_signed';
      if (updates.signature_status === 'fully_executed') updates.status = 'active';
    } else {
      updates.tenant_signed_at = new Date().toISOString();
      updates.signature_status = lease?.landlord_signed_at ? 'fully_executed' : 'tenant_signed';
      if (updates.signature_status === 'fully_executed') updates.status = 'active';
    }
    await updateLease(id, updates as Partial<Lease>);
  };

  const terminateLease = async (id: string, reason: string) => {
    await updateLease(id, {
      status: 'terminated',
      termination_reason: reason,
      termination_date: new Date().toISOString(),
    } as Partial<Lease>);
  };

  const saveTemplate = async (template: Partial<LeaseTemplate>) => {
    if (template.id) {
      const { error } = await (supabase as any).from('lease_templates').update(template).eq('id', template.id);
      if (error) { toast.error('Failed to update template'); return; }
      toast.success('Template updated');
    } else {
      const { error } = await (supabase as any).from('lease_templates').insert({ ...template, owner_id: landlordId });
      if (error) { toast.error('Failed to create template'); return; }
      toast.success('Template created');
    }
    fetchTemplates();
  };

  return {
    leases, templates, loading,
    createLease, updateLease, signLease, terminateLease,
    saveTemplate, refetch: fetchLeases,
  };
}
