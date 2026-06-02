import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, Plus, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import InitiatePortOutDialog from './InitiatePortOutDialog';
import InitiatePortInDialog from './InitiatePortInDialog';
import PortabilityDetail from './PortabilityDetail';

interface Props { agencyId: string; }

const statusColor: Record<string, string> = {
  initiated: 'bg-yellow-100 text-yellow-800',
  paperwork_sent: 'bg-blue-100 text-blue-800',
  paperwork_received: 'bg-blue-100 text-blue-800',
  searching: 'bg-orange-100 text-orange-800',
  leased: 'bg-green-100 text-green-800',
  absorbed: 'bg-purple-100 text-purple-800',
  billed: 'bg-indigo-100 text-indigo-800',
  returned: 'bg-muted',
  expired: 'bg-red-100 text-red-800',
  cancelled: 'bg-muted',
};

const AgencyPortability: React.FC<Props> = ({ agencyId }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agencyName, setAgencyName] = useState<string>('');
  const [agencyPhaCode, setAgencyPhaCode] = useState<string | null>(null);
  const [portOutOpen, setPortOutOpen] = useState(false);
  const [portInOpen, setPortInOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: rec }, { data: ag }] = await Promise.all([
      supabase.from('agency_portability_requests').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }),
      supabase.from('housing_authorities').select('name, pha_code').eq('id', agencyId).single(),
    ]);
    setRecords(rec || []);
    setAgencyName(ag?.name || '');
    setAgencyPhaCode(ag?.pha_code || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agencyId]);

  const portOuts = records.filter(r => r.request_type === 'port_out');
  const portIns = records.filter(r => r.request_type === 'port_in');
  const activePortOuts = portOuts.filter(r => !['returned', 'expired', 'cancelled', 'leased', 'absorbed'].includes(r.status)).length;
  const activePortIns = portIns.filter(r => !['returned', 'expired', 'cancelled'].includes(r.status)).length;
  const billedPortIns = portIns.filter(r => r.billing_arrangement === 'billed' && ['leased', 'billed'].includes(r.status)).length;

  const renderList = (list: any[], type: 'in' | 'out') => {
    if (list.length === 0) {
      return <Card><CardContent className="py-12 text-center text-muted-foreground">No port-{type === 'in' ? 'in' : 'out'} records yet</CardContent></Card>;
    }
    return (
      <div className="space-y-2">
        {list.map(r => {
          const daysRemaining = r.search_expiration_date && ['initiated', 'paperwork_sent', 'paperwork_received', 'searching'].includes(r.status)
            ? Math.ceil((new Date(r.search_expiration_date).getTime() - Date.now()) / 86400000) : null;
          return (
            <Card key={r.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedId(r.id)}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium truncate">{r.contact_name || 'Unnamed'}</span>
                    <Badge className={statusColor[r.status]}>{r.status}</Badge>
                    {r.billing_arrangement && <Badge variant="outline">{r.billing_arrangement}</Badge>}
                    {daysRemaining !== null && daysRemaining < 14 && (
                      <Badge variant={daysRemaining < 0 ? 'destructive' : 'secondary'}>
                        <AlertCircle className="w-3 h-3 mr-1" />{daysRemaining < 0 ? 'Search expired' : `${daysRemaining}d left`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {type === 'out' ? `→ ${r.receiving_pha_name || 'Unknown PHA'}` : `← ${r.initial_pha_name || 'Unknown PHA'}`}
                    {r.bedroom_size ? ` · ${r.bedroom_size}BR` : ''}
                    {r.hap_amount ? ` · $${Number(r.hap_amount).toFixed(0)}/mo` : ''}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Portability</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPortInOpen(true)}><ArrowLeft className="w-4 h-4 mr-1" />Receive Port-In</Button>
          <Button onClick={() => setPortOutOpen(true)}><Plus className="w-4 h-4 mr-1" />Initiate Port-Out</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Port-Outs</p><p className="text-2xl font-bold">{activePortOuts}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Port-Ins</p><p className="text-2xl font-bold">{activePortIns}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Billed Port-Ins</p><p className="text-2xl font-bold">{billedPortIns}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="port_out">
        <TabsList>
          <TabsTrigger value="port_out">Port-Out ({portOuts.length})</TabsTrigger>
          <TabsTrigger value="port_in">Port-In ({portIns.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="port_out">{renderList(portOuts, 'out')}</TabsContent>
        <TabsContent value="port_in">{renderList(portIns, 'in')}</TabsContent>
      </Tabs>

      <InitiatePortOutDialog open={portOutOpen} onOpenChange={setPortOutOpen} agencyId={agencyId} agencyName={agencyName} agencyPhaCode={agencyPhaCode} onCreated={load} />
      <InitiatePortInDialog open={portInOpen} onOpenChange={setPortInOpen} agencyId={agencyId} agencyName={agencyName} agencyPhaCode={agencyPhaCode} onCreated={load} />
      {selectedId && <PortabilityDetail portabilityId={selectedId} open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)} onUpdated={load} />}
    </div>
  );
};

export default AgencyPortability;
