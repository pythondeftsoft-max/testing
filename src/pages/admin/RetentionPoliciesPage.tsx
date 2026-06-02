import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function RetentionPoliciesPage() {
  const { data: isAdmin, isLoading: chk } = useAdminCheck();
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, { retention_years?: number; auto_purge?: boolean }>>({});

  const { data: policies, isLoading } = useQuery({
    queryKey: ['retention-policies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('data_retention_policies' as any).select('*').order('record_type');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!isAdmin,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from('data_retention_policies' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Policy updated'); qc.invalidateQueries({ queryKey: ['retention-policies'] }); setEdits({}); },
    onError: (e: any) => toast.error(e.message),
  });

  if (chk || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Records Retention Policies</h1>
        <p className="text-muted-foreground">HUD 24 CFR §908 mandates 3-year retention for most files. Auto-purge runs daily.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Active Policies</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record Type</TableHead>
                <TableHead>Retention (yrs)</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Legal Basis</TableHead>
                <TableHead>Auto-Purge</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies?.map(p => {
                const e = edits[p.id] || {};
                const years = e.retention_years ?? p.retention_years;
                const autoP = e.auto_purge ?? p.auto_purge;
                const dirty = e.retention_years !== undefined || e.auto_purge !== undefined;
                return (
                  <TableRow key={p.id}>
                    <TableCell><div className="font-medium">{p.display_name}</div><div className="text-xs text-muted-foreground">{p.record_type}</div></TableCell>
                    <TableCell><Input type="number" min={1} max={50} value={years} className="w-20" onChange={ev => setEdits(s => ({ ...s, [p.id]: { ...s[p.id], retention_years: parseInt(ev.target.value) || 1 } }))} /></TableCell>
                    <TableCell><Badge variant="outline">{p.purge_strategy}</Badge></TableCell>
                    <TableCell className="text-xs">{p.legal_basis}</TableCell>
                    <TableCell><Switch checked={autoP} onCheckedChange={v => setEdits(s => ({ ...s, [p.id]: { ...s[p.id], auto_purge: v } }))} /></TableCell>
                    <TableCell>{dirty && <Button size="sm" onClick={() => update.mutate({ id: p.id, patch: e })}>Save</Button>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
