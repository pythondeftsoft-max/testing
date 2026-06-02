import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchRecord {
  id: string;
  tenant_id: string;
  unit_id: string;
  property_id: string;
  status: string;
  created_at: string;
  lease_signed_date: string | null;
  payment_received_date: string | null;
  move_in_date: string | null;
  tenant_first_name: string;
  tenant_last_name: string;
  tenant_email: string;
  tenant_phone: string | null;
  tenant_housing_status: string | null;
  unit_number: string;
  monthly_rent: number | null;
  property_address: string;
  property_city: string;
  property_state: string;
  landlord_first_name: string | null;
  landlord_last_name: string | null;
  assigned_worker_id: string | null;
}

export const useAllMatches = () => {
  return useQuery({
    queryKey: ["all-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_applications")
        .select(`
          id,
          tenant_id,
          unit_id,
          status,
          created_at,
          lease_signed_date,
          payment_received_date,
          move_in_date,
          tenant:profiles!unit_applications_tenant_id_fkey(
            first_name,
            last_name,
            email,
            phone,
            housing_status,
            assigned_worker_id
          ),
          unit:property_units!unit_applications_unit_id_fkey(
            unit_number,
            monthly_rent,
            property_id,
            property:properties(
              address,
              city,
              state,
              landlord:profiles!properties_owner_id_fkey(
                first_name,
                last_name
              )
            )
          )
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((record: any) => ({
        id: record.id,
        tenant_id: record.tenant_id,
        unit_id: record.unit_id,
        property_id: record.unit?.property_id,
        status: record.status,
        created_at: record.created_at,
        lease_signed_date: record.lease_signed_date,
        payment_received_date: record.payment_received_date,
        move_in_date: record.move_in_date,
        tenant_first_name: record.tenant?.first_name || "",
        tenant_last_name: record.tenant?.last_name || "",
        tenant_email: record.tenant?.email || "",
        tenant_phone: record.tenant?.phone,
        tenant_housing_status: record.tenant?.housing_status,
        unit_number: record.unit?.unit_number || "",
        monthly_rent: record.unit?.monthly_rent,
        property_address: record.unit?.property?.address || "",
        property_city: record.unit?.property?.city || "",
        property_state: record.unit?.property?.state || "",
        landlord_first_name: record.unit?.property?.landlord?.first_name,
        landlord_last_name: record.unit?.property?.landlord?.last_name,
        assigned_worker_id: record.tenant?.assigned_worker_id,
      })) as MatchRecord[];
    },
    staleTime: 60000,
  });
};
