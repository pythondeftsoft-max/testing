import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Archive, ArchiveRestore, Camera, FileText } from 'lucide-react';
import { fetchUnitTimeline, setInspectionArchived, type UnitHistoryRow, type UnitInspectionDetail } from '@/hooks/useUnitInspectionHistory';
import { downloadHtmlAsPdf } from '@/utils/htmlToPdfDownload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  unit: UnitHistoryRow;
  includeArchived: boolean;
  open: boolean;
  onClose: () => void;
}

const SEVERITY_COLOR: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  life_threatening: 'destructive',
  severe: 'destructive',
  moderate: 'warning',
  low: 'secondary',
};

const UnitInspectionTimeline: React.FC<Props> = ({ agencyId, unit, includeArchived, open, onClose }) => {
  const [items, setItems] = useState<UnitInspectionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchUnitTimeline(agencyId, unit.unit_key, unit.unit_id, unit.property_id, includeArchived);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, unit.unit_key, includeArchived]);

  const toggleArchive = async (id: string, currentlyArchived: boolean) => {
    const { error } = await setInspectionArchived(id, !currentlyArchived);
    if (error) toast.error('Failed to update archive status');
    else {
      toast.success(currentlyArchived ? 'Inspection restored' : 'Inspection archived');
      load();
    }
  };

  const photoUrl = (path: string) => {
    const { data } = supabase.storage.from('inspection-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const rows = items.map(i => `
        <div style="margin-bottom:18px;padding:10px;border:1px solid #ddd;border-radius:6px;">
          <h3 style="margin:0 0 6px 0;font-size:14px;">
            ${i.inspection_type.replace('_', ' ').toUpperCase()} —
            ${i.completed_date ? new Date(i.completed_date).toLocaleDateString() : (i.scheduled_date ? `Scheduled ${new Date(i.scheduled_date).toLocaleDateString()}` : '—')}
          </h3>
          <div style="font-size:11px;color:#555;margin-bottom:6px;">
            Inspector: ${i.inspector_name} · Status: ${i.status} · Result: ${i.result || '—'}
          </div>
          ${i.notes ? `<div style="font-size:11px;margin:6px 0;"><strong>Notes:</strong> ${i.notes}</div>` : ''}
          ${i.deficiencies.length ? `
            <div style="margin-top:8px;">
              <strong style="font-size:11px;">Deficiencies (${i.deficiencies.length}):</strong>
              <ul style="font-size:10px;margin:4px 0 0 16px;padding:0;">
                ${i.deficiencies.map(d => `<li>[${d.severity}] ${d.nspire_code || ''} — ${d.description}${d.location ? ` (${d.location})` : ''}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('');

      const html = `
        <div style="font-family:Arial,sans-serif;color:#111;padding:24px;">
          <h1 style="font-size:18px;margin:0 0 4px 0;">Unit Inspection History</h1>
          <div style="font-size:12px;color:#444;margin-bottom:4px;">${unit.address}</div>
          <div style="font-size:11px;color:#666;margin-bottom:18px;">
            Total inspections: ${unit.total_inspections} · Generated ${new Date().toLocaleString()}
          </div>
          ${rows || '<p style="font-size:12px;">No inspections in this view.</p>'}
        </div>
      `;
      const safe = unit.address.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
      await downloadHtmlAsPdf(html, `unit_history_${safe}`);
      toast.success('PDF exported');
    } catch (e: any) {
      toast.error('Export failed', { description: e?.message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{unit.address}</SheetTitle>
          <SheetDescription>
            {unit.total_inspections} inspection{unit.total_inspections !== 1 ? 's' : ''} on record
            {unit.chronic_codes.length > 0 && ` · ${unit.chronic_codes.length} chronic code${unit.chronic_codes.length > 1 ? 's' : ''}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex justify-between items-center mt-4 mb-3">
          {unit.chronic_codes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {unit.chronic_codes.map(c => (
                <Badge key={c} variant="destructive" className="font-mono text-xs">{c}</Badge>
              ))}
            </div>
          )}
          <Button size="sm" onClick={exportPdf} disabled={exporting || loading || items.length === 0} className="ml-auto">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
            Export PDF
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">No inspections found for this unit.</p>
        ) : (
          <div className="space-y-3">
            {items.map((i, idx) => (
              <Card key={i.id} className={i.archived_at ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">#{items.length - idx}</span>
                        {i.inspection_type.replace('_', ' ').toUpperCase()}
                        {i.archived_at && <Badge variant="outline" className="text-xs">Archived</Badge>}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {i.completed_date
                          ? `Completed ${new Date(i.completed_date).toLocaleDateString()}`
                          : i.scheduled_date
                            ? `Scheduled ${new Date(i.scheduled_date).toLocaleDateString()}`
                            : '—'}
                        {' · '}{i.inspector_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{i.status.replace('_', ' ')}</Badge>
                      {i.result && (
                        <Badge variant={i.result === 'pass' ? 'success' : i.result === 'fail' ? 'destructive' : 'secondary'} className="text-xs">
                          {i.result}
                        </Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => toggleArchive(i.id, !!i.archived_at)}
                        title={i.archived_at ? 'Restore' : 'Archive'}
                      >
                        {i.archived_at ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {i.notes && <p className="text-xs text-muted-foreground italic">{i.notes}</p>}

                  {i.deficiencies.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Deficiencies ({i.deficiencies.length})
                      </p>
                      <div className="space-y-1">
                        {i.deficiencies.map(d => (
                          <div key={d.id} className="flex items-start gap-2 p-2 rounded bg-muted/40 text-xs">
                            <Badge variant={SEVERITY_COLOR[d.severity] || 'secondary'} className="text-[10px] shrink-0">
                              {d.severity}
                            </Badge>
                            <div className="flex-1">
                              {d.nspire_code && <span className="font-mono text-[10px] mr-1">{d.nspire_code}</span>}
                              {d.description}
                              {d.location && <span className="text-muted-foreground"> · {d.location}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {i.photos.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <Camera className="h-3 w-3" /> Photos ({i.photos.length})
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {i.photos.slice(0, 8).map(p => (
                          <a key={p.id} href={photoUrl(p.file_path)} target="_blank" rel="noreferrer">
                            <img
                              src={photoUrl(p.file_path)}
                              alt={p.caption || 'Inspection photo'}
                              className="w-full h-16 object-cover rounded border"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default UnitInspectionTimeline;
