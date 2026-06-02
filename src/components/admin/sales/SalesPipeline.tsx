import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Phone, Building2, Calendar, ChevronRight } from 'lucide-react';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type LeadStatus = 'new' | 'contacted' | 'demo_scheduled' | 'proposal_sent' | 'won' | 'lost';

interface AgencyLead {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  contact_role: string | null;
  agency_name: string;
  agency_state: string | null;
  voucher_count: number | null;
  current_software: string | null;
  message: string | null;
  status: LeadStatus;
  source: string;
  internal_notes: string | null;
  converted_agency_id: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
}

const COLUMNS: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'bg-info/10 border-info/30 text-info' },
  { key: 'contacted', label: 'Contacted', color: 'bg-primary/10 border-primary/30 text-primary' },
  { key: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-warning/10 border-warning/30 text-warning' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: 'bg-accent/10 border-accent/30 text-accent-foreground' },
  { key: 'won', label: 'Won', color: 'bg-success/10 border-success/30 text-success' },
  { key: 'lost', label: 'Lost', color: 'bg-muted border-muted-foreground/20 text-muted-foreground' },
];

export const SalesPipeline: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['agency_leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AgencyLead[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from('agency_leads')
        .update({ status, last_contacted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency_leads'] });
      toast({ title: 'Status updated' });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const stats = React.useMemo(() => {
    if (!leads) return { total: 0, new: 0, active: 0, won: 0 };
    return {
      total: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      active: leads.filter((l) => ['contacted', 'demo_scheduled', 'proposal_sent'].includes(l.status)).length,
      won: leads.filter((l) => l.status === 'won').length,
    };
  }, [leads]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Sales Pipeline</h2>
        <p className="text-muted-foreground">Track agency leads from inquiry to signed contract.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-info">{stats.new}</div>
            <p className="text-sm text-muted-foreground">New (need outreach)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-warning">{stats.active}</div>
            <p className="text-sm text-muted-foreground">Active in Pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-success">{stats.won}</div>
            <p className="text-sm text-muted-foreground">Closed Won</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {COLUMNS.map((col) => {
          const colLeads = leads?.filter((l) => l.status === col.key) || [];
          return (
            <div key={col.key} className="space-y-3">
              <div className={cn('rounded-md px-3 py-2 border text-sm font-medium flex items-center justify-between', col.color)}>
                <span>{col.label}</span>
                <Badge variant="secondary">{colLeads.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {colLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No leads</p>
                )}
                {colLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    className="cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm leading-tight">{lead.agency_name}</div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.contact_name}
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lead.contact_email}</span>
                        </div>
                        {lead.voucher_count != null && (
                          <div>{lead.voucher_count.toLocaleString()} vouchers</div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(lead.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <LeadDetailDrawer
        leadId={selectedLeadId}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
      />
    </div>
  );
};
