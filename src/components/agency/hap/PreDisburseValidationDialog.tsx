import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Issue { landlord_id?: string; landlord_name?: string; reason: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  onProceed: () => void;
}

const PreDisburseValidationDialog: React.FC<Props> = ({ open, onOpenChange, batchId, onProceed }) => {
  const [loading, setLoading] = useState(false);
  const [blockers, setBlockers] = useState<Issue[]>([]);
  const [warnings, setWarnings] = useState<Issue[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setAcknowledged(false);
    supabase.functions.invoke('validate-batch-pre-disburse', { body: { batch_id: batchId } })
      .then(({ data }) => {
        setBlockers(data?.blockers || []);
        setWarnings(data?.warnings || []);
      })
      .finally(() => setLoading(false));
  }, [open, batchId]);

  const canProceed = blockers.length === 0 && (warnings.length === 0 || acknowledged);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Pre-Disburse Validation</DialogTitle>
          <DialogDescription>
            Reviewing batch readiness before money moves. Blockers must be fixed; warnings can be acknowledged.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {blockers.length === 0 && warnings.length === 0 && (
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>All checks passed. Safe to disburse.</AlertDescription>
                </Alert>
              )}

              {blockers.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm flex items-center gap-2 text-destructive mb-2">
                    <ShieldAlert className="w-4 h-4" /> Blockers ({blockers.length})
                  </h4>
                  <div className="space-y-1">
                    {blockers.map((b, i) => (
                      <div key={i} className="text-sm rounded-md border border-destructive/30 bg-destructive/5 p-2">
                        {b.landlord_name && <span className="font-medium">{b.landlord_name}: </span>}
                        {b.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm flex items-center gap-2 text-amber-600 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Warnings ({warnings.length})
                  </h4>
                  <div className="space-y-1">
                    {warnings.map((w, i) => (
                      <div key={i} className="text-sm rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-2">
                        {w.landlord_name && <span className="font-medium">{w.landlord_name}: </span>}
                        {w.reason}
                      </div>
                    ))}
                  </div>
                  {blockers.length === 0 && (
                    <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                      <Checkbox checked={acknowledged} onCheckedChange={v => setAcknowledged(!!v)} />
                      I've reviewed these warnings and want to proceed.
                    </label>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onProceed(); onOpenChange(false); }} disabled={!canProceed || loading}>
            Proceed with Disburse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreDisburseValidationDialog;
