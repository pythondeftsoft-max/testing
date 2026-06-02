import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  batchId: string;
  agencyId: string;
}

const actionColor: Record<string, string> = {
  insert: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  delete: 'bg-destructive/10 text-destructive',
};

const HapAuditDrawer: React.FC<Props> = ({ batchId, agencyId }) => {
  const [open, setOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['hap-audit', batchId],
    enabled: open,
    queryFn: async () => {
      // Fetch batch entries + items + disbursements for this batch
      const [batchRows, itemRows, disbRows] = await Promise.all([
        (supabase as any).from('hap_audit_log').select('*').eq('agency_id', agencyId).eq('entity_type', 'batch').eq('entity_id', batchId),
        (supabase as any).from('hap_audit_log').select('*').eq('agency_id', agencyId).eq('entity_type', 'batch_item'),
        (supabase as any).from('hap_audit_log').select('*').eq('agency_id', agencyId).eq('entity_type', 'disbursement'),
      ]);
      const all: any[] = [
        ...(batchRows.data || []),
        ...((itemRows.data || []) as any[]).filter(r => r.before?.batch_id === batchId || r.after?.batch_id === batchId),
        ...((disbRows.data || []) as any[]).filter(r => r.before?.batch_id === batchId || r.after?.batch_id === batchId),
      ];
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return all;
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <ScrollText className="w-4 h-4 mr-1" /> Audit trail
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>HAP Audit Trail</SheetTitle>
          <SheetDescription>
            Every insert, update, and deletion on this batch and its lines.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No audit entries yet.</p>
          ) : (
            data.map((row: any) => (
              <div key={row.id} className="border rounded-md p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge className={actionColor[row.action]}>{row.action}</Badge>
                    <span className="font-medium">{row.entity_type}</span>
                    <span className="text-muted-foreground font-mono">{String(row.entity_id).slice(0, 8)}…</span>
                  </div>
                  <span className="text-muted-foreground">{format(new Date(row.created_at), 'MMM d, h:mm a')}</span>
                </div>
                {row.actor_user_id && (
                  <p className="text-muted-foreground">by <span className="font-mono">{String(row.actor_user_id).slice(0, 8)}…</span></p>
                )}
                {row.changed_fields && row.changed_fields.length > 0 && (
                  <p className="mt-1"><span className="text-muted-foreground">Changed:</span> {row.changed_fields.filter((f: string) => !['updated_at','created_at'].includes(f)).join(', ')}</p>
                )}
                {row.action === 'update' && row.before && row.after && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted-foreground">Diff</summary>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <pre className="bg-destructive/5 p-1 rounded overflow-auto max-h-40">{JSON.stringify(row.before, null, 1)}</pre>
                      <pre className="bg-primary/5 p-1 rounded overflow-auto max-h-40">{JSON.stringify(row.after, null, 1)}</pre>
                    </div>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HapAuditDrawer;
