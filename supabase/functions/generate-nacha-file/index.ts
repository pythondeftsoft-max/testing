// Generate a NACHA ACH file for a HAP batch.
// Reads ODFI + originator account from agency_nacha_settings (vault when present),
// resolves landlord routing/account from hap_payee_configs (vault when present)
// or landlord_payout_profiles. Writes to agency_nacha_files and returns file content.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// ===== NACHA generator (ported from src/utils/nachaGenerator.ts) =====
interface NachaSettings {
  odfi_routing_number: string;
  odfi_name: string;
  originator_company_name: string;
  originator_company_id: string;
  immediate_destination?: string | null;
  immediate_origin?: string | null;
  service_class_code: string;
  sec_code: string;
  last_file_id_modifier?: string | null;
}
interface NachaEntry {
  receiver_routing_number: string;
  receiver_account_number: string;
  amount_cents: number;
  receiver_name: string;
  receiver_id?: string;
  account_type?: 'checking' | 'savings';
}
const padR = (s: string | number, n: number) => String(s ?? '').slice(0, n).padEnd(n, ' ');
const padL = (s: string | number, n: number) => String(s ?? '').slice(0, n).padStart(n, '0');
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');
const alphaNum = (s: string) => (s || '').replace(/[^A-Za-z0-9 .,&\-/]/g, '').toUpperCase();
const yymmdd = (d: Date) => `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
function nextFileIdModifier(prev?: string | null): string {
  const seq = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const idx = prev ? seq.indexOf(prev) : -1;
  return seq[(idx + 1) % seq.length];
}
function entryHash(entries: NachaEntry[]): string {
  const sum = entries.reduce((acc, e) => acc + (parseInt(onlyDigits(e.receiver_routing_number).slice(0, 8), 10) || 0), 0);
  return padL(String(sum % 10_000_000_000), 10);
}
function generateNachaFile(settings: NachaSettings, entries: NachaEntry[], effectiveDate: Date) {
  if (!settings.odfi_routing_number || onlyDigits(settings.odfi_routing_number).length !== 9) throw new Error('Invalid ODFI routing number');
  if (entries.length === 0) throw new Error('No entries');
  const now = new Date();
  const fileIdModifier = nextFileIdModifier(settings.last_file_id_modifier);
  const immediateDest = padL(onlyDigits(settings.immediate_destination || settings.odfi_routing_number), 9);
  const immediateOrigin = (settings.immediate_origin || settings.originator_company_id || '').padEnd(10, ' ').slice(0, 10);
  const odfiAba8 = onlyDigits(settings.odfi_routing_number).slice(0, 8);
  const effYYMMDD = yymmdd(effectiveDate);
  const fileHeader = '1' + '01' + ' ' + immediateDest + immediateOrigin + yymmdd(now) + hhmm(now) + fileIdModifier + '094' + '10' + '1' + padR(settings.odfi_name, 23) + padR(settings.originator_company_name, 23) + padR('', 8);
  const batchNumber = '0000001';
  const batchHeader = '5' + settings.service_class_code + padR(alphaNum(settings.originator_company_name), 16) + padR('', 20) + padR(settings.originator_company_id, 10) + padR(settings.sec_code, 3) + padR('HAP PMT', 10) + padR('', 6) + effYYMMDD + '   ' + '1' + odfiAba8 + batchNumber;
  const entryLines: string[] = [];
  let totalCreditCents = 0;
  entries.forEach((e, i) => {
    const aba = padL(onlyDigits(e.receiver_routing_number), 9);
    const amount = Math.max(0, Math.round(e.amount_cents));
    totalCreditCents += amount;
    const traceSeq = padL(String(i + 1), 7);
    const txnCode = e.account_type === 'savings' ? '32' : '22';
    entryLines.push('6' + txnCode + aba.slice(0, 8) + aba.slice(8, 9) + padR(e.receiver_account_number, 17) + padL(String(amount), 10) + padR(e.receiver_id || '', 15) + padR(alphaNum(e.receiver_name), 22) + '  ' + '0' + odfiAba8 + traceSeq);
  });
  const hash = entryHash(entries);
  const batchControl = '8' + settings.service_class_code + padL(String(entries.length), 6) + hash + padL('0', 12) + padL(String(totalCreditCents), 12) + padR(settings.originator_company_id, 10) + padR('', 19) + padR('', 6) + odfiAba8 + batchNumber;
  const dataRecords = [fileHeader, batchHeader, ...entryLines, batchControl];
  const blockCount = Math.ceil((dataRecords.length + 1) / 10);
  const fileControl = '9' + padL('1', 6) + padL(String(blockCount), 6) + padL(String(entries.length), 8) + hash + padL('0', 12) + padL(String(totalCreditCents), 12) + padR('', 39);
  const allRecords = [...dataRecords, fileControl];
  const recordsToPad = (10 - (allRecords.length % 10)) % 10;
  for (let i = 0; i < recordsToPad; i++) allRecords.push('9'.repeat(94));
  return { fileContent: allRecords.join('\n') + '\n', totalEntries: entries.length, totalCreditCents, fileIdModifier, effectiveEntryDate: effYYMMDD };
}

// ===== Server =====
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ success: false, error: 'unauthorized' });

    const { batch_id, effective_date } = await req.json();
    if (!batch_id) return json({ success: false, error: 'batch_id required' });

    const { data: batch, error: batchErr } = await svc
      .from('hap_payment_batches')
      .select('id, agency_id, batch_number, status')
      .eq('id', batch_id)
      .maybeSingle();
    if (batchErr || !batch) return json({ success: false, error: 'batch not found' });

    // Authz: caller must be agency staff (or admin)
    const { data: isAdmin } = await svc.rpc('is_admin', { _user_id: user.id });
    const { data: isStaff } = await svc.rpc('is_agency_staff', { _user_id: user.id, _agency_id: batch.agency_id });
    if (!isAdmin && !isStaff) return json({ success: false, error: 'forbidden' });

    // Settings
    const { data: settings } = await svc
      .from('agency_nacha_settings')
      .select('*')
      .eq('agency_id', batch.agency_id)
      .maybeSingle();
    if (!settings || !settings.is_active) return json({ success: false, error: 'NACHA not configured/active for this agency' });

    // Reveal ODFI routing + originator account from vault if encrypted, else use plaintext columns
    async function revealField(table: string, field: string, encryptedCol: string, plaintextCol: string, rowId: string, plaintextRow: any) {
      if (plaintextRow?.[encryptedCol]) {
        const { data } = await svc.rpc('decrypt_pii', {
          ciphertext: plaintextRow[encryptedCol],
          context: `${table}.${field}`,
        });
        return data as string | null;
      }
      return plaintextRow?.[plaintextCol] ?? null;
    }
    const odfiRouting = await revealField('agency_nacha_settings', 'odfi_routing_number', 'odfi_routing_number_encrypted', 'odfi_routing_number', settings.id, settings);
    const originatorAccount = await revealField('agency_nacha_settings', 'originator_account_number', 'originator_account_number_encrypted', 'originator_account_number', settings.id, settings);

    if (!odfiRouting || onlyDigits(odfiRouting).length !== 9) {
      return json({ success: false, error: 'ODFI routing number missing or invalid' });
    }

    // Batch items (paginate)
    const items: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await svc
        .from('hap_batch_items')
        .select('id, batch_id, landlord_id, tenant_id, net_payment, status')
        .eq('batch_id', batch_id)
        .range(from, from + 999);
      if (error) return json({ success: false, error: error.message });
      if (!data || data.length === 0) break;
      items.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }

    // Aggregate by landlord (exclude excluded)
    const grouped = new Map<string, number>();
    for (const it of items) {
      if (it.status === 'excluded' || !it.landlord_id) continue;
      grouped.set(it.landlord_id, (grouped.get(it.landlord_id) || 0) + Math.round((Number(it.net_payment) || 0) * 100));
    }
    const landlordIds = Array.from(grouped.keys());
    if (landlordIds.length === 0) return json({ success: false, error: 'no payable items in batch' });

    // Resolve landlord names
    const { data: profiles } = await svc.from('profiles').select('id, full_name, business_name').in('id', landlordIds);
    const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

    // Resolve bank info: prefer hap_payee_configs (vault), fall back to landlord_payout_profiles
    const bankRows: NachaEntry[] = [];
    const missing: string[] = [];
    for (const lid of landlordIds) {
      let routing: string | null = null;
      let account: string | null = null;
      let acctType: 'checking' | 'savings' = 'checking';

      const { data: payee } = await svc
        .from('hap_payee_configs')
        .select('id, routing_number, routing_number_encrypted, account_number_encrypted, account_type')
        .or(`tenant_id.eq.${lid},payee_name.ilike.%`)
        .limit(1)
        .maybeSingle();

      if (payee) {
        if (payee.routing_number_encrypted) {
          const { data } = await svc.rpc('decrypt_pii', { ciphertext: payee.routing_number_encrypted, context: 'hap_payee_configs.routing_number' });
          routing = data as string;
        } else if (payee.routing_number) {
          routing = payee.routing_number;
        }
        if (payee.account_number_encrypted) {
          const { data } = await svc.rpc('decrypt_pii', { ciphertext: payee.account_number_encrypted, context: 'hap_payee_configs.account_number' });
          account = data as string;
        }
        if (payee.account_type === 'savings') acctType = 'savings';
      }

      if (!routing || !account) {
        const { data: payout } = await svc
          .from('landlord_payout_profiles')
          .select('routing_number_encrypted, account_number_encrypted, account_type')
          .eq('landlord_id', lid)
          .maybeSingle();
        if (payout) {
          if (!routing && payout.routing_number_encrypted) {
            const { data } = await svc.rpc('decrypt_pii', { ciphertext: payout.routing_number_encrypted, context: 'landlord_payout_profiles.routing_number' });
            routing = data as string;
          }
          if (!account && payout.account_number_encrypted) {
            const { data } = await svc.rpc('decrypt_pii', { ciphertext: payout.account_number_encrypted, context: 'landlord_payout_profiles.account_number' });
            account = data as string;
          }
          if (payout.account_type === 'savings') acctType = 'savings';
        }
      }

      if (!routing || onlyDigits(routing).length !== 9 || !account) {
        missing.push(lid);
        continue;
      }

      const prof = profileMap.get(lid);
      bankRows.push({
        receiver_routing_number: routing,
        receiver_account_number: account,
        amount_cents: grouped.get(lid)!,
        receiver_name: prof?.business_name || prof?.full_name || lid.slice(0, 8),
        receiver_id: lid.slice(0, 15),
        account_type: acctType,
      });
    }

    if (missing.length > 0 && bankRows.length === 0) {
      return json({ success: false, error: `All landlords missing bank info: ${missing.length}` });
    }

    const effDate = effective_date ? new Date(effective_date + 'T12:00:00') : new Date(Date.now() + 86400000);
    const result = generateNachaFile(
      {
        odfi_routing_number: odfiRouting,
        odfi_name: settings.odfi_name || '',
        originator_company_name: settings.originator_company_name || '',
        originator_company_id: settings.originator_company_id || '',
        immediate_destination: settings.immediate_destination,
        immediate_origin: settings.immediate_origin,
        service_class_code: settings.service_class_code,
        sec_code: settings.sec_code,
        last_file_id_modifier: settings.last_file_id_modifier,
      },
      bankRows,
      effDate,
    );

    const fileName = `NACHA-${batch.batch_number}-${result.effectiveEntryDate}-${result.fileIdModifier}${settings.test_mode ? '-TEST' : ''}.ach`;

    const { error: insErr, data: archived } = await svc
      .from('agency_nacha_files')
      .insert({
        agency_id: batch.agency_id,
        batch_id: batch.id,
        file_name: fileName,
        file_content: result.fileContent,
        total_entries: result.totalEntries,
        total_credit_amount: result.totalCreditCents / 100,
        effective_entry_date: effDate.toISOString().slice(0, 10),
        file_id_modifier: result.fileIdModifier,
        generated_by: user.id,
        status: settings.test_mode ? 'generated' : 'downloaded',
        notes: settings.test_mode ? 'TEST MODE — do not submit to bank' : null,
      })
      .select('id')
      .maybeSingle();
    if (insErr) return json({ success: false, error: insErr.message });

    await svc.from('agency_nacha_settings').update({ last_file_id_modifier: result.fileIdModifier }).eq('agency_id', batch.agency_id);

    // Audit log entry for vault-backed reveal
    try {
      await svc.from('pii_access_log').insert({
        actor_user_id: user.id,
        actor_role: isAdmin ? 'admin' : 'agency_staff',
        target_table: 'agency_nacha_settings',
        target_row_id: settings.id,
        field: 'odfi+account',
        action: 'reveal',
        reason: `NACHA generation for batch ${batch.batch_number}`,
      });
    } catch (_) { /* non-blocking */ }

    return json({
      success: true,
      file_name: fileName,
      file_content: result.fileContent,
      total_entries: result.totalEntries,
      total_credit_cents: result.totalCreditCents,
      file_id: archived?.id ?? null,
      missing_landlords: missing,
    });
  } catch (err: any) {
    console.error('generate-nacha-file error', err);
    return json({ success: false, error: err.message ?? String(err) });
  }
});
