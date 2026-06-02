import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TabPermission {
  tab_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
}

export function useAgencyPermissions(role: string) {
  const [permissions, setPermissions] = useState<Record<string, TabPermission>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('agency_role_permissions')
        .select('tab_name, can_view, can_edit, can_create, can_delete')
        .eq('role_name', role);

      const map: Record<string, TabPermission> = {};
      (data || []).forEach((p: any) => { map[p.tab_name] = p; });
      setPermissions(map);
      setLoading(false);
    };
    fetch();
  }, [role]);

  const canView = (tab: string) => permissions[tab]?.can_view ?? false;
  const canEdit = (tab: string) => permissions[tab]?.can_edit ?? false;
  const canCreate = (tab: string) => permissions[tab]?.can_create ?? false;

  return { permissions, loading, canView, canEdit, canCreate };
}
