// HUD-52517 — Request for Tenancy Approval (RFTA)
import { supabase } from '@/integrations/supabase/client';
import { newDoc, drawHeader, drawFooter, drawSection, drawFieldGrid, downloadDoc, fmtDate, fmtMoney } from './_shared';

export async function generateRfta52517Pdf(rftaId: string, agencyName: string) {
  const { data: rfta, error } = await (supabase as any)
    .from('agency_rfta_packets')
    .select('*')
    .eq('id', rftaId)
    .maybeSingle();
  if (error || !rfta) throw new Error('RFTA packet not found');

  const sb: any = supabase;
  const [{ data: tenant }, { data: property }, { data: unit }] = await Promise.all([
    rfta.tenant_id
      ? sb.from('profiles').select('full_name, email, phone').eq('id', rfta.tenant_id).maybeSingle()
      : Promise.resolve({ data: null }),
    rfta.property_id
      ? sb.from('properties').select('address, city, state, zip_code').eq('id', rfta.property_id).maybeSingle()
      : Promise.resolve({ data: null }),
    rfta.unit_id
      ? sb.from('rental_units').select('unit_number, bedrooms, bathrooms, square_feet').eq('id', rfta.unit_id).maybeSingle().then((r: any) => r.error ? { data: null } : r)
      : Promise.resolve({ data: null }),
  ]);

  const doc = newDoc();
  drawHeader(doc, {
    formNumber: 'HUD-52517',
    formTitle: 'Request for Tenancy Approval',
    agencyName,
    subtitle: 'Housing Choice Voucher Program',
  });

  let y = 130;
  y = drawSection(doc, '1. Tenant Information', y);
  y = drawFieldGrid(doc, [
    ['Tenant Name', (tenant as any)?.full_name || '—'],
    ['Email', (tenant as any)?.email || '—'],
    ['Phone', (tenant as any)?.phone || '—'],
    ['Tenant ID', rfta.tenant_id || '—'],
  ], y);

  y = drawSection(doc, '2. Property / Unit', y);
  y = drawFieldGrid(doc, [
    ['Address', [(property as any)?.address, (property as any)?.city, (property as any)?.state, (property as any)?.zip_code].filter(Boolean).join(', ') || '—'],
    ['Unit #', (unit as any)?.unit_number || '—'],
    ['Bedrooms', String((unit as any)?.bedrooms ?? '—')],
    ['Bathrooms', String((unit as any)?.bathrooms ?? '—')],
    ['Square Feet', String((unit as any)?.square_feet ?? '—')],
  ], y);

  y = drawSection(doc, '3. Proposed Lease Terms', y);
  y = drawFieldGrid(doc, [
    ['Proposed Rent', fmtMoney(rfta.proposed_rent)],
    ['Security Deposit', fmtMoney(rfta.security_deposit)],
    ['Lease Start', fmtDate(rfta.lease_start_date)],
    ['Lease End', fmtDate(rfta.lease_end_date)],
    ['Utilities Included', rfta.utilities_included || '—'],
  ], y);

  y = drawSection(doc, '4. PHA Review', y);
  y = drawFieldGrid(doc, [
    ['Packet Status', String(rfta.status || '').replace(/_/g, ' ')],
    ['Submitted', fmtDate(rfta.submitted_at)],
    ['Reviewed', fmtDate(rfta.reviewed_at)],
    ['Decision Notes', rfta.decision_notes || '—'],
  ], y);

  drawFooter(doc, 'HUD-52517');
  downloadDoc(doc, `HUD-52517_RFTA_${rftaId.slice(0, 8)}.pdf`);
}
