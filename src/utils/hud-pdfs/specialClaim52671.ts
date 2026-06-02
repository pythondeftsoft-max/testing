// HUD-52671 — Special Claims for Reimbursement (Owner Claim)
import { supabase } from '@/integrations/supabase/client';
import { newDoc, drawHeader, drawFooter, drawSection, drawFieldGrid, downloadDoc, fmtDate, fmtMoney } from './_shared';

export async function generateSpecialClaim52671Pdf(claimId: string, agencyName: string) {
  const { data: claim, error } = await (supabase as any)
    .from('agency_special_claims')
    .select('*')
    .eq('id', claimId)
    .maybeSingle();
  if (error || !claim) throw new Error('Claim not found');

  const [{ data: docs }, { data: landlord }, { data: tenant }] = await Promise.all([
    supabase.from('agency_special_claim_documents').select('file_name, document_type, created_at').eq('claim_id', claimId),
    claim.landlord_id ? supabase.from('profiles').select('full_name, business_name').eq('id', claim.landlord_id).maybeSingle() : Promise.resolve({ data: null }),
    claim.tenant_id ? supabase.from('profiles').select('full_name').eq('id', claim.tenant_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const doc = newDoc();
  drawHeader(doc, {
    formNumber: 'HUD-52671',
    formTitle: 'Special Claim for Reimbursement',
    agencyName,
    subtitle: 'Section 8 Owner Claim',
  });

  let y = 130;
  y = drawSection(doc, 'Claim Summary', y);
  y = drawFieldGrid(doc, [
    ['Claim Type', String(claim.claim_type || '').replace(/_/g, ' ')],
    ['Status', String(claim.status || '').replace(/_/g, ' ')],
    ['Owner / Landlord', (landlord as any)?.business_name || (landlord as any)?.full_name || '—'],
    ['Tenant', (tenant as any)?.full_name || '—'],
    ['Submitted', fmtDate(claim.submitted_date)],
    ['Decision Date', fmtDate(claim.decision_date)],
    ['Move-out', fmtDate(claim.move_out_date)],
    ['Vacancy Period', claim.vacancy_start ? `${fmtDate(claim.vacancy_start)} → ${claim.vacancy_end ? fmtDate(claim.vacancy_end) : 'ongoing'}` : '—'],
  ], y);

  y = drawSection(doc, 'Amounts', y);
  y = drawFieldGrid(doc, [
    ['Claim Amount', fmtMoney(claim.claim_amount)],
    ['Approved Amount', fmtMoney(claim.approved_amount)],
    ['Paid Date', fmtDate(claim.paid_date)],
  ], y);

  if (claim.description) {
    y = drawSection(doc, 'Description', y);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    const wrapped = doc.splitTextToSize(claim.description, 515);
    doc.text(wrapped, 40, y + 4);
    y += wrapped.length * 11 + 12;
  }

  if (claim.denial_reason) {
    y = drawSection(doc, 'Denial Reason', y);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    const wrapped = doc.splitTextToSize(claim.denial_reason, 515);
    doc.text(wrapped, 40, y + 4);
    y += wrapped.length * 11 + 12;
  }

  if (docs && docs.length > 0) {
    y = drawSection(doc, `Supporting Documents (${docs.length})`, y);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    docs.forEach((d: any) => {
      doc.text(`• [${d.document_type}] ${d.file_name}`, 46, y);
      y += 12;
    });
  }

  drawFooter(doc, 'HUD-52671');
  downloadDoc(doc, `HUD-52671_SpecialClaim_${claimId.slice(0, 8)}.pdf`);
}
