// HUD-52641 — Housing Assistance Payments (HAP) Contract
import { supabase } from '@/integrations/supabase/client';
import { newDoc, drawHeader, drawFooter, drawSection, drawFieldGrid, downloadDoc, fmtDate, fmtMoney } from './_shared';

export async function generateHapContract52641Pdf(contractId: string, agencyName: string) {
  const { data: contract, error } = await (supabase as any)
    .from('agency_hap_contracts')
    .select('*')
    .eq('id', contractId)
    .maybeSingle();
  if (error || !contract) throw new Error('Contract not found');

  const [{ data: tenant }, { data: landlord }] = await Promise.all([
    contract.tenant_id ? supabase.from('profiles').select('full_name, email').eq('id', contract.tenant_id).maybeSingle() : Promise.resolve({ data: null }),
    contract.landlord_id ? supabase.from('profiles').select('full_name, business_name').eq('id', contract.landlord_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const doc = newDoc();
  drawHeader(doc, {
    formNumber: 'HUD-52641',
    formTitle: 'Housing Assistance Payments (HAP) Contract',
    agencyName,
    subtitle: 'Section 8 Tenant-Based Assistance — Housing Choice Voucher',
  });

  let y = 130;
  y = drawSection(doc, '1. Contract Identification', y);
  y = drawFieldGrid(doc, [
    ['Contract Number', contract.contract_number || '—'],
    ['Status', String(contract.status || '').replace(/_/g, ' ')],
    ['Effective Date', fmtDate(contract.effective_date)],
    ['Expiration Date', fmtDate(contract.expiration_date)],
    ['Program Type', contract.program_type || 'HCV'],
  ], y);

  y = drawSection(doc, '2. Parties', y);
  y = drawFieldGrid(doc, [
    ['Owner / Landlord', (landlord as any)?.business_name || (landlord as any)?.full_name || '—'],
    ['Tenant', (tenant as any)?.full_name || '—'],
    ['Tenant Email', (tenant as any)?.email || '—'],
  ], y);

  y = drawSection(doc, '3. Unit', y);
  y = drawFieldGrid(doc, [
    ['Property Address', contract.property_address || '—'],
    ['Bedrooms', contract.bedroom_count != null ? (contract.bedroom_count === 0 ? 'Studio' : `${contract.bedroom_count}`) : '—'],
  ], y);

  y = drawSection(doc, '4. Rent & HAP', y);
  y = drawFieldGrid(doc, [
    ['Gross Rent', fmtMoney(contract.gross_rent)],
    ['Tenant Rent (paid to owner)', fmtMoney(contract.tenant_rent)],
    ['HAP Amount (paid by PHA)', fmtMoney(contract.hap_amount)],
    ['Utility Allowance', fmtMoney(contract.utility_allowance)],
  ], y);

  if (contract.contract_terms) {
    y = drawSection(doc, '5. Terms & Conditions', y);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    const wrapped = doc.splitTextToSize(contract.contract_terms, 515);
    doc.text(wrapped, 40, y + 4);
    y += wrapped.length * 11 + 12;
  }

  // Signature block
  y = drawSection(doc, '6. Signatures', y);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  const sigY = y + 30;
  ['Owner / Landlord', 'Tenant', 'PHA Representative'].forEach((label, i) => {
    const x = 40 + i * 175;
    doc.line(x, sigY, x + 160, sigY);
    doc.text(label, x, sigY + 12);
    doc.text('Date: ___________________', x, sigY + 26);
  });

  drawFooter(doc, 'HUD-52641');
  downloadDoc(doc, `HUD-52641_HAPContract_${contract.contract_number || contractId.slice(0, 8)}.pdf`);
}
