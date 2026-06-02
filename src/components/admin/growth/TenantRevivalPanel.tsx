import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Send, Users } from 'lucide-react';
import { RevivalMessageComposer } from './RevivalMessageComposer';
import { useToast } from '@/hooks/use-toast';

type InactivityFilter = '14' | '30' | '60' | '90' | 'never';

export const TenantRevivalPanel = () => {
  const { toast } = useToast();
  const [inactivityDays, setInactivityDays] = useState<InactivityFilter>('30');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComposer, setShowComposer] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { data: dormantTenants, isLoading, refetch } = useQuery({
    queryKey: ['dormant-tenants', inactivityDays],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(inactivityDays === 'never' ? '9999' : inactivityDays));

      type DormantTenant = {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        phone: string | null;
        created_at: string;
        pipeline_stage: string | null;
      };

      const query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, created_at, pipeline_stage');
      
      const result = await (query as any)
        .eq('role', 'tenant')
        .lt('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (result.error) throw result.error;
      return (result.data || []) as DormantTenant[];
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!dormantTenants) return;
    if (selectedIds.size === dormantTenants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(dormantTenants.map(t => t.id)));
    }
  };

  const selectedTenants = dormantTenants?.filter(t => selectedIds.has(t.id)) || [];

  const handleSendRevival = async (messageTemplate: string) => {
    const recipients = selectedTenants
      .filter(t => t.phone)
      .map(t => ({
        phone: t.phone!,
        first_name: t.first_name || 'there',
        message_template: messageTemplate,
      }));

    if (recipients.length === 0) {
      toast({ title: 'No valid recipients', description: 'Selected tenants have no phone numbers.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-revival-sms', {
        body: { recipients },
      });

      if (error) throw error;

      toast({
        title: 'Revival SMS sent!',
        description: `Sent to ${data?.sent || 0} of ${recipients.length} recipients.`,
      });
      setShowComposer(false);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({ title: 'Error sending SMS', description: err.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Dormant Tenant Accounts
              </CardTitle>
              <CardDescription>
                Tenants who haven't signed in recently — re-engage them with personalized SMS
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={inactivityDays} onValueChange={(v) => setInactivityDays(v as InactivityFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">Inactive 14+ days</SelectItem>
                  <SelectItem value="30">Inactive 30+ days</SelectItem>
                  <SelectItem value="60">Inactive 60+ days</SelectItem>
                  <SelectItem value="90">Inactive 90+ days</SelectItem>
                  <SelectItem value="never">Never signed in</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg">
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
              <Button size="sm" onClick={() => setShowComposer(true)} disabled={isSending}>
                <Send className="h-4 w-4 mr-2" />
                Send Revival SMS
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading dormant accounts...</div>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={dormantTenants?.length ? selectedIds.size === dormantTenants.length : false}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dormantTenants?.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.first_name} {t.last_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.email || '—'}</TableCell>
                      <TableCell className="text-sm">{t.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">{formatDate(t.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{t.pipeline_stage || 'unknown'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!dormantTenants || dormantTenants.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No dormant tenants found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-2 text-xs text-muted-foreground">
            Showing {dormantTenants?.length || 0} dormant accounts
          </div>
        </CardContent>
      </Card>

      {showComposer && (
        <RevivalMessageComposer
          recipientCount={selectedTenants.filter(t => t.phone).length}
          sampleName={selectedTenants[0]?.first_name || 'there'}
          onSend={handleSendRevival}
          onCancel={() => setShowComposer(false)}
          isSending={isSending}
        />
      )}
    </div>
  );
};
