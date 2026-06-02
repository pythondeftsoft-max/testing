import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgencyLandlordUnit {
  id: string;
  agency_landlord_id: string;
  property_id: string;
  unit_id: string | null;
  created_at: string;
  property?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
  unit?: {
    id: string;
    unit_number: string;
    monthly_rent: number | null;
  };
}

export interface AgencyLandlord {
  id: string;
  agency_id: string;
  landlord_id: string | null;
  landlord_email: string;
  landlord_name: string;
  w9_status: string;
  payment_method: string;
  onboarding_status: string;
  properties_count: number;
  notes: string | null;
  requirements_notes: string | null;
  w9_required: boolean;
  additional_docs_required: string[] | null;
  pay_ready?: boolean;
  pay_hold_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Joined PHA info
  agency?: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
  };
  // Enrolled units
  units?: AgencyLandlordUnit[];
}

export function useAgencyLandlords(agencyId: string) {
  const [landlords, setLandlords] = useState<AgencyLandlord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_landlords')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) toast.error('Failed to load landlord registry');
    setLandlords((data as unknown as AgencyLandlord[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addLandlord = async (name: string, email: string) => {
    const { error } = await supabase.from('agency_landlords').insert({
      agency_id: agencyId,
      landlord_name: name,
      landlord_email: email,
    });
    if (error) {
      if (error.code === '23505') toast.error('Landlord already registered');
      else toast.error('Failed to add landlord');
      return;
    }
    toast.success('Landlord added');
    fetch();
  };

  const updateLandlord = async (id: string, updates: Partial<AgencyLandlord>) => {
    const { error } = await supabase.from('agency_landlords').update(updates as any).eq('id', id);
    if (error) { toast.error('Failed to update landlord'); return; }
    toast.success('Landlord updated');
    fetch();
  };

  return { landlords, loading, refetch: fetch, addLandlord, updateLandlord };
}

/** Fetch landlord registrations for a specific user (landlord-side, joins PHA info + units) */
export function useLandlordRegistrations(userId: string | undefined, email: string | undefined) {
  const [registrations, setRegistrations] = useState<AgencyLandlord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Fetch registrations with joined housing authority info
    const { data, error } = await supabase
      .from('agency_landlords')
      .select(`
        *,
        agency:housing_authorities!agency_landlords_agency_id_fkey(
          id, name, city, state, phone, email
        )
      `)
      .or(`landlord_id.eq.${userId}${email ? `,landlord_email.eq.${email}` : ''}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load registrations:', error);
      setRegistrations([]);
      setLoading(false);
      return;
    }

    const regs = (data as unknown as AgencyLandlord[]) || [];

    // Fetch enrolled units for each registration
    if (regs.length > 0) {
      const regIds = regs.map(r => r.id);
      const { data: unitsData } = await supabase
        .from('agency_landlord_units')
        .select(`
          *,
          property:properties!agency_landlord_units_property_id_fkey(id, name, address, city, state),
          unit:property_units!agency_landlord_units_unit_id_fkey(id, unit_number, monthly_rent)
        `)
        .in('agency_landlord_id', regIds);

      const unitsByReg: Record<string, AgencyLandlordUnit[]> = {};
      (unitsData as unknown as AgencyLandlordUnit[] || []).forEach(u => {
        if (!unitsByReg[u.agency_landlord_id]) unitsByReg[u.agency_landlord_id] = [];
        unitsByReg[u.agency_landlord_id].push(u);
      });

      regs.forEach(r => { r.units = unitsByReg[r.id] || []; });
    }

    setRegistrations(regs);
    setLoading(false);
  }, [userId, email]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  return { registrations, loading, refetch: fetchRegistrations };
}
