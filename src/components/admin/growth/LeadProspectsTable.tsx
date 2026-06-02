import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Users } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-info/10 text-info',
  contacted: 'bg-warning/10 text-warning',
  signed_up: 'bg-success/10 text-success',
  converted: 'bg-primary/10 text-primary',
};

export const LeadProspectsTable = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ['lead-prospects', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('lead_prospects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === 'contacted') updates.contacted_at = new Date().toISOString();

    await supabase.from('lead_prospects').update(updates).eq('id', id);
    refetch();
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const statusCounts = leads?.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lead Prospects
            </CardTitle>
            <CardDescription>Track imported leads through the conversion funnel</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="signed_up">Signed Up</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {statusFilter === 'all' && leads && leads.length > 0 && (
          <div className="flex gap-2 mt-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} variant="outline" className={STATUS_COLORS[status] || ''}>
                {status}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
        ) : (
          <div className="rounded-md border overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.first_name} {lead.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.email || '—'}</TableCell>
                    <TableCell className="text-sm">{lead.phone || '—'}</TableCell>
                    <TableCell className="text-sm">{lead.city ? `${lead.city}, ${lead.state || ''}` : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[lead.status] || ''}`}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(lead.created_at)}</TableCell>
                    <TableCell>
                      <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="signed_up">Signed Up</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {(!leads || leads.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No leads found. Import some from the "Lead Import" tab.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          Showing {leads?.length || 0} leads
        </div>
      </CardContent>
    </Card>
  );
};
