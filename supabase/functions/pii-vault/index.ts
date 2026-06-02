// pii-vault: single proxy for storing/revealing/verifying encrypted PII
// All actions audit to public.pii_access_log
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Whitelist of (table, field) tuples we allow encryption against.
// Each entry maps to: { encryptedCol, last4Col, ownerCheck, role }
type FieldSpec = {
  encryptedCol: string;
  last4Col?: string;
  yearCol?: string; // for DOB
  pkCol?: string; // default 'id'
  // who can store/reveal: 'self' | 'admin' | 'agency_staff' | 'landlord_self'
  storeRoles: string[];
  revealRoles: string[];
};

const SCHEMA: Record<string, Record<string, FieldSpec>> = {
  tax_profiles: {
    tax_id_number: {
      encryptedCol: 'tax_id_number_encrypted',
      last4Col: 'tax_id_last4',
      storeRoles: ['self', 'admin'],
      revealRoles: ['self', 'admin'],
    },
  },
  landlord_payout_profiles: {
    account_number: {
      encryptedCol: 'account_number_encrypted',
      last4Col: 'account_last4',
      storeRoles: ['landlord_self', 'admin'],
      revealRoles: ['landlord_self', 'admin'],
    },
    routing_number: {
      encryptedCol: 'routing_number_encrypted',
      last4Col: 'routing_last4',
      storeRoles: ['landlord_self', 'admin'],
      revealRoles: ['landlord_self', 'admin'],
    },
  },
  hap_payee_configs: {
    routing_number: {
      encryptedCol: 'routing_number_encrypted',
      last4Col: 'routing_last4',
      storeRoles: ['agency_staff', 'admin'],
      revealRoles: ['agency_staff', 'admin'],
    },
  },
  agency_nacha_settings: {
    originator_account_number: {
      encryptedCol: 'originator_account_number_encrypted',
      last4Col: 'originator_account_last4',
      storeRoles: ['agency_staff', 'admin'],
      revealRoles: ['agency_staff', 'admin'],
    },
    odfi_routing_number: {
      encryptedCol: 'odfi_routing_number_encrypted',
      last4Col: 'odfi_routing_last4',
      storeRoles: ['agency_staff', 'admin'],
      revealRoles: ['agency_staff', 'admin'],
    },
  },
  voucher_applications: {
    date_of_birth: {
      encryptedCol: 'dob_encrypted',
      yearCol: 'dob_year',
      storeRoles: ['agency_staff', 'admin'],
      revealRoles: ['agency_staff', 'admin'],
    },
  },
  portfolio_tax_profiles: {
    ein: {
      encryptedCol: 'ein_encrypted',
      last4Col: 'ein_last4',
      storeRoles: ['self', 'admin'],
      revealRoles: ['self', 'admin'],
    },
  },
  maintenance_vendors: {
    license_number: {
      encryptedCol: 'license_number_encrypted',
      last4Col: 'license_number_last4',
      storeRoles: ['admin'],
      revealRoles: ['admin'],
    },
  },
};

function last4(s: string): string | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9A-Za-z]/g, '');
  return cleaned.length >= 4 ? cleaned.slice(-4) : null;
}

async function logAccess(svc: any, entry: Record<string, any>) {
  try {
    await svc.from('pii_access_log').insert(entry);
  } catch (e) {
    console.error('audit log insert failed', e);
  }
}

async function resolveActorRole(svc: any, userId: string, table: string, rowId: string): Promise<string[]> {
  // Returns the set of role tags this actor satisfies for this row.
  const tags: string[] = [];

  // admin?
  const { data: isAdmin } = await svc.rpc('is_admin', { _user_id: userId });
  if (isAdmin) tags.push('admin');

  // agency staff?
  const { data: staff } = await svc.from('agency_staff').select('id').eq('user_id', userId).limit(1);
  if (staff && staff.length > 0) tags.push('agency_staff');

  // self / landlord_self based on the row
  try {
    const { data: row } = await svc.from(table).select('user_id').eq('id', rowId).maybeSingle();
    if (row?.user_id === userId) {
      tags.push('self');
      tags.push('landlord_self');
    }
  } catch (_) { /* not all tables have user_id */ }

  return tags;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action, table, field, row_id, plaintext, reason } = body ?? {};

    if (!action || !table || !field || !row_id) {
      return new Response(JSON.stringify({ success: false, error: 'missing required fields' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const spec = SCHEMA[table]?.[field];
    if (!spec) {
      return new Response(JSON.stringify({ success: false, error: 'field not vault-managed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const actorTags = await resolveActorRole(svc, user.id, table, row_id);
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null;
    const ua = req.headers.get('user-agent') ?? null;

    const auditBase = {
      actor_user_id: user.id,
      actor_role: actorTags.join(','),
      target_table: table,
      target_row_id: String(row_id),
      field,
      ip,
      user_agent: ua,
    };

    const context = `${table}.${field}`;

    if (action === 'store') {
      if (!spec.storeRoles.some(r => actorTags.includes(r))) {
        return new Response(JSON.stringify({ success: false, error: 'forbidden' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (typeof plaintext !== 'string' || plaintext.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'plaintext required' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Encrypt via SECURITY DEFINER fn (service_role can call it)
      const { data: encData, error: encErr } = await svc.rpc('encrypt_pii', { plaintext, context });
      if (encErr) throw encErr;

      const update: Record<string, any> = { [spec.encryptedCol]: encData };
      if (spec.last4Col) update[spec.last4Col] = last4(plaintext);
      if (spec.yearCol) {
        // expect plaintext like 'YYYY-MM-DD'
        const y = parseInt(plaintext.slice(0, 4), 10);
        if (!Number.isNaN(y) && y > 1900 && y < 2100) update[spec.yearCol] = y;
      }

      const { error: upErr } = await svc.from(table).update(update).eq('id', row_id);
      if (upErr) throw upErr;

      await logAccess(svc, { ...auditBase, action: 'store', reason: reason ?? null });
      return new Response(JSON.stringify({ success: true, last4: spec.last4Col ? update[spec.last4Col] : null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'reveal') {
      if (!spec.revealRoles.some(r => actorTags.includes(r))) {
        return new Response(JSON.stringify({ success: false, error: 'forbidden' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!reason || reason.length < 5) {
        return new Response(JSON.stringify({ success: false, error: 'reveal requires reason (min 5 chars)' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: rowData, error: rowErr } = await svc.from(table)
        .select(spec.encryptedCol).eq('id', row_id).maybeSingle();
      if (rowErr) throw rowErr;
      const ct = rowData?.[spec.encryptedCol];
      if (!ct) {
        return new Response(JSON.stringify({ success: true, plaintext: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: ptData, error: ptErr } = await svc.rpc('decrypt_pii', { ciphertext: ct, context });
      if (ptErr) throw ptErr;

      await logAccess(svc, { ...auditBase, action: 'reveal', reason });
      return new Response(JSON.stringify({ success: true, plaintext: ptData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'verify_match') {
      if (!spec.revealRoles.some(r => actorTags.includes(r))) {
        return new Response(JSON.stringify({ success: false, error: 'forbidden' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (typeof plaintext !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'plaintext required' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: rowData } = await svc.from(table).select(spec.encryptedCol).eq('id', row_id).maybeSingle();
      const ct = rowData?.[spec.encryptedCol];
      if (!ct) {
        return new Response(JSON.stringify({ success: true, match: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: ptData } = await svc.rpc('decrypt_pii', { ciphertext: ct, context });
      const match = ptData === plaintext;
      await logAccess(svc, { ...auditBase, action: 'verify', reason: reason ?? 'verify_match' });
      return new Response(JSON.stringify({ success: true, match }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'unknown action' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('pii-vault error', err);
    return new Response(JSON.stringify({ success: false, error: err.message ?? String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
