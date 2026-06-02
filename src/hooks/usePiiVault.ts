import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VaultAction = 'store' | 'reveal' | 'verify_match';

export interface VaultRequest {
  action: VaultAction;
  table: string;
  field: string;
  row_id: string;
  plaintext?: string;
  reason?: string;
}

export interface VaultResponse {
  success: boolean;
  error?: string;
  plaintext?: string | null;
  last4?: string | null;
  match?: boolean;
}

export function usePiiVault() {
  const [loading, setLoading] = useState(false);

  const call = async (req: VaultRequest): Promise<VaultResponse> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pii-vault', { body: req });
      if (error) return { success: false, error: error.message };
      return data as VaultResponse;
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'vault error' };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    store: (table: string, field: string, row_id: string, plaintext: string, reason?: string) =>
      call({ action: 'store', table, field, row_id, plaintext, reason }),
    reveal: (table: string, field: string, row_id: string, reason: string) =>
      call({ action: 'reveal', table, field, row_id, reason }),
    verifyMatch: (table: string, field: string, row_id: string, plaintext: string) =>
      call({ action: 'verify_match', table, field, row_id, plaintext }),
  };
}
