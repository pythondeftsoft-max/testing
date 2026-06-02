import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ConsentsAdminPage() {
  const { data: isAdmin, isLoading: chk } = useAdminCheck();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-consents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hud_privacy_consents' as any).select('*').order('signed_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!isAdmin,
  });

  if (chk || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Privacy Consents</h1>
        <p className="text-muted-foreground">All HUD-9886, EIV, Privacy Act, W-9 release signatures across the platform.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>{data?.length ?? 0} consent records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Signed</TableHead>
              <TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead>IP</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.length ? data.map(c => {
                const expired = new Date(c.expires_at) < new Date();
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{String(c.user_id || c.applicant_id).slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline">{c.consent_type}</Badge></TableCell>
                    <TableCell className="text-xs">{format(new Date(c.signed_at), 'PP')}</TableCell>
                    <TableCell className="text-xs">{format(new Date(c.expires_at), 'PP')}</TableCell>
                    <TableCell>{c.revoked_at ? <Badge variant="destructive">Revoked</Badge> : expired ? <Badge variant="secondary">Expired</Badge> : <Badge>Active</Badge>}</TableCell>
                    <TableCell className="text-xs font-mono">{c.ip_address || '—'}</TableCell>
                  </TableRow>
                );
              }) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No consents recorded.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
