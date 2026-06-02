// HUD-52580 — NSPIRE / HQS Inspection Report
import { supabase } from '@/integrations/supabase/client';
import { newDoc, drawHeader, drawFooter, drawSection, drawFieldGrid, downloadDoc, fmtDate } from './_shared';
import autoTable from 'jspdf-autotable';

export async function generateNspire52580Pdf(inspectionId: string, agencyName: string) {
  const { data: insp, error } = await (supabase as any)
    .from('hqs_inspections')
    .select('*')
    .eq('id', inspectionId)
    .maybeSingle();
  if (error || !insp) throw new Error('Inspection not found');

  const [{ data: items }, { data: property }, { data: inspector }] = await Promise.all([
    supabase.from('hqs_inspection_items').select('*').eq('inspection_id', inspectionId).order('category'),
    insp.property_id ? supabase.from('properties').select('address, city, state, zip_code').eq('id', insp.property_id).maybeSingle() : Promise.resolve({ data: null }),
    insp.inspector_id ? supabase.from('profiles').select('full_name').eq('id', insp.inspector_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const doc = newDoc();
  drawHeader(doc, {
    formNumber: 'HUD-52580',
    formTitle: 'Inspection Checklist (NSPIRE)',
    agencyName,
  });

  let y = 130;
  y = drawSection(doc, 'Inspection Details', y);
  y = drawFieldGrid(doc, [
    ['Inspection ID', inspectionId.slice(0, 8) + '…'],
    ['Property', [(property as any)?.address, (property as any)?.city, (property as any)?.state, (property as any)?.zip_code].filter(Boolean).join(', ') || '—'],
    ['Scheduled', fmtDate(insp.scheduled_date)],
    ['Completed', fmtDate(insp.completed_date)],
    ['Status', String(insp.status || '').replace(/_/g, ' ')],
    ['Result', String(insp.result || '—')],
    ['Inspector', (inspector as any)?.full_name || '—'],
    ['Notes', insp.notes || '—'],
  ], y);

  if (items && items.length > 0) {
    y = drawSection(doc, `Inspected Items (${items.length})`, y);
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Item', 'Pass', 'Severity', 'Follow-up', 'Note']],
      body: (items as any[]).map(it => [
        it.category || '—',
        it.item_name || it.code || '—',
        it.passed ? 'Pass' : 'Fail',
        it.severity || '—',
        fmtDate(it.follow_up_date),
        it.note || '',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 40, right: 40 },
    });
  }

  drawFooter(doc, 'HUD-52580');
  downloadDoc(doc, `HUD-52580_NSPIRE_${inspectionId.slice(0, 8)}.pdf`);
}
