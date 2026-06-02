import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  onParsed?: () => void;
}

interface ErrorRow {
  id: string;
  record_id: string | null;
  error_code: string;
  error_message: string;
  fixed_at: string | null;
}

export default function PicResponseDialog({ open, onOpenChange, submissionId, onParsed }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingErrors(true);
    (supabase as any)
      .from('agency_pic_record_errors')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => {
        setErrors(data || []);
        setLoadingErrors(false);
      });
  }, [open, submissionId]);

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    const text = await file.text();
    const { data, error } = await supabase.functions.invoke('parse-pic-response', {
      body: { submission_id: submissionId, file_text: text },
    });
    setParsing(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Parse failed');
      return;
    }
    toast.success(`Parsed ${data.total} rows: ${data.accepted} accepted, ${data.errors} errors`);
    onParsed?.();
    // reload errors
    const { data: errs } = await (supabase as any)
      .from('agency_pic_record_errors').select('*').eq('submission_id', submissionId);
    setErrors(errs || []);
    setFile(null);
  };

  const markFixed = async (id: string) => {
    await (supabase as any)
      .from('agency_pic_record_errors')
      .update({ fixed_at: new Date().toISOString() })
      .eq('id', id);
    setErrors(errors.map(e => e.id === id ? { ...e, fixed_at: new Date().toISOString() } : e));
  };

  const errorsByCode = errors.reduce((acc: Record<string, ErrorRow[]>, e) => {
    (acc[e.error_code] ||= []).push(e);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>HUD PIC Response</DialogTitle>
          <DialogDescription>Upload the response CSV from HUD WASS to auto-populate per-record errors.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Expected columns: <code>record_id, error_code, error_message</code>. Rows with empty error_code count as accepted.
            </AlertDescription>
          </Alert>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Response file</Label>
              <Input type="file" accept=".csv,.txt" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleParse} disabled={!file || parsing}>
              {parsing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Parse
            </Button>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Errors by code</h4>
            {loadingErrors ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : errors.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> No errors recorded.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {Object.entries(errorsByCode).map(([code, list]) => (
                  <div key={code} className="border rounded-md p-2">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="destructive" className="font-mono">{code}</Badge>
                      <span className="text-xs text-muted-foreground">{list.length} record(s)</span>
                    </div>
                    <div className="space-y-1">
                      {list.slice(0, 5).map(e => (
                        <div key={e.id} className="flex items-center justify-between text-xs">
                          <span className="font-mono">{e.record_id?.slice(0, 12) || '—'}: {e.error_message}</span>
                          {e.fixed_at ? (
                            <Badge variant="outline" className="text-xs">Fixed</Badge>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => markFixed(e.id)}>Mark fixed</Button>
                          )}
                        </div>
                      ))}
                      {list.length > 5 && <p className="text-xs text-muted-foreground">…{list.length - 5} more</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
