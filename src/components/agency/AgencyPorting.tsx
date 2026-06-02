import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRightLeft, CheckCircle, XCircle, FileText, Gavel } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PortPacketDialog from './porting/PortPacketDialog';
import PortDecisionDialog from './porting/PortDecisionDialog';
import PortBillingPanel from './porting/PortBillingPanel';
import PortDashboardKPIs from './porting/PortDashboardKPIs';

interface AgencyPortingProps {
  agencyId: string;
}

interface PortingRequest {
  id: string;
  from_agency_id: string;
  to_agency_id: string;
  tenant_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  from_agency_name?: string;
  to_agency_name?: string;
  tenant_name?: string;
  packet_id?: string | null;
  packet_decision?: string | null;
  sla_deadline?: string | null;
}

const statusColors: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

const decisionColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  absorbed: 'bg-green-100 text-green-800',
  billed: 'bg-blue-100 text-blue-800',
  denied: 'bg-red-100 text-red-800',
};

const AgencyPorting: React.FC<AgencyPortingProps> = ({ agencyId }) => {
  const [requests, setRequests] = useState<PortingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [packetOpen, setPacketOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<PortingRequest | null>(null);
  const [activePacketId, setActivePacketId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('porting_requests')
      .select('*')
      .or(`from_agency_id.eq.${agencyId},to_agency_id.eq.${agencyId}`)
      .order('created_at', { ascending: false });

    if (data?.length) {
      const agencyIds = [...new Set(data.flatMap((d: any) => [d.from_agency_id, d.to_agency_id]))];
      const tenantIds = data.filter((d: any) => d.tenant_id).map((d: any) => d.tenant_id);
      const requestIds = data.map((d: any) => d.id);

      const [{ data: agencies }, profilesRes, { data: packets }] = await Promise.all([
        supabase.from('housing_authorities').select('id, name').in('id', agencyIds),
        tenantIds.length
          ? supabase.from('profiles').select('id, full_name').in('id', tenantIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('agency_port_packets').select('id, porting_request_id, decision, sla_deadline').in('porting_request_id', requestIds),
      ]);

      const agencyMap: Record<string, string> = {};
      agencies?.forEach((a: any) => { agencyMap[a.id] = a.name; });
      const tenantMap: Record<string, string> = {};
      profilesRes.data?.forEach((p: any) => { tenantMap[p.id] = p.full_name || 'Unknown'; });
      const packetMap: Record<string, any> = {};
      packets?.forEach((p: any) => { packetMap[p.porting_request_id] = p; });

      setRequests(data.map((d: any) => ({
        ...d,
        from_agency_name: agencyMap[d.from_agency_id] || d.from_agency_id.slice(0, 8),
        to_agency_name: agencyMap[d.to_agency_id] || d.to_agency_id.slice(0, 8),
        tenant_name: d.tenant_id ? tenantMap[d.tenant_id] : null,
        packet_id: packetMap[d.id]?.id || null,
        packet_decision: packetMap[d.id]?.decision || null,
        sla_deadline: packetMap[d.id]?.sla_deadline || null,
      })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [agencyId]);

  const updateStatus = async (id: string, status: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from('porting_requests').update({
      status,
      approved_by: status === 'approved' ? user?.id : null,
    } as any).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(`Porting request ${status}`);
    fetchRequests();
  };

  const openPacket = (req: PortingRequest, isIncoming: boolean) => {
    setActiveRequest({ ...req, packet_decision: isIncoming ? 'incoming' : 'outgoing' } as any);
    setPacketOpen(true);
  };

  const openDecision = (packetId: string) => {
    setActivePacketId(packetId);
    setDecisionOpen(true);
  };

  const slaLabel = (sla: string | null | undefined) => {
    if (!sla) return null;
    const days = Math.ceil((new Date(sla).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <Badge variant="destructive" className="text-xs">SLA breached {Math.abs(days)}d ago</Badge>;
    if (days <= 7) return <Badge variant="destructive" className="text-xs">SLA in {days}d</Badge>;
    return <Badge variant="outline" className="text-xs">SLA in {days}d</Badge>;
  };

  const incoming = requests.filter(r => r.to_agency_id === agencyId);
  const outgoing = requests.filter(r => r.from_agency_id === agencyId);

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const renderList = (list: PortingRequest[], isIncoming: boolean) => (
    list.length === 0 ? (
      <Card><CardContent className="py-8 text-center text-muted-foreground">No {isIncoming ? 'incoming' : 'outgoing'} porting requests</CardContent></Card>
    ) : (
      <div className="space-y-3">
        {list.map(r => (
          <Card key={r.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{r.from_agency_name}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{r.to_agency_name}</span>
                    <Badge className={statusColors[r.status] || 'bg-muted'}>{r.status}</Badge>
                    {r.packet_decision && (
                      <Badge className={decisionColors[r.packet_decision] || 'bg-muted'}>{r.packet_decision}</Badge>
                    )}
                    {isIncoming && r.packet_decision === 'pending' && slaLabel(r.sla_deadline)}
                  </div>
                  {r.tenant_name && <p className="text-sm text-muted-foreground">Tenant: {r.tenant_name}</p>}
                  {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openPacket(r, isIncoming)}>
                    <FileText className="w-3.5 h-3.5 mr-1" />{r.packet_id ? 'Edit Packet' : 'Build Packet'}
                  </Button>
                  {isIncoming && r.packet_id && (!r.packet_decision || r.packet_decision === 'pending') && (
                    <Button size="sm" onClick={() => openDecision(r.packet_id!)}>
                      <Gavel className="w-3.5 h-3.5 mr-1" />Decide
                    </Button>
                  )}
                  {isIncoming && r.status === 'requested' && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateStatus(r.id, 'approved')}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus(r.id, 'denied')}>
                        <XCircle className="w-3.5 h-3.5 mr-1" />Deny
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Porting Center</h2>
      <PortDashboardKPIs agencyId={agencyId} />
      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing ({outgoing.length})</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming">{renderList(incoming, true)}</TabsContent>
        <TabsContent value="outgoing">{renderList(outgoing, false)}</TabsContent>
        <TabsContent value="billing"><PortBillingPanel agencyId={agencyId} /></TabsContent>
      </Tabs>

      {activeRequest && (
        <PortPacketDialog
          open={packetOpen}
          onOpenChange={setPacketOpen}
          portingRequestId={activeRequest.id}
          agencyId={agencyId}
          packetType={activeRequest.to_agency_id === agencyId ? 'incoming' : 'outgoing'}
          onSaved={fetchRequests}
        />
      )}
      {activePacketId && (
        <PortDecisionDialog
          open={decisionOpen}
          onOpenChange={setDecisionOpen}
          packetId={activePacketId}
          onSaved={fetchRequests}
        />
      )}
    </div>
  );
};

export default AgencyPorting;
