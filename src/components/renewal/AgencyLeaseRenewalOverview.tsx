import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRenewalIntelligence, RenewalRow } from '@/hooks/renewal/useRenewalIntelligence';
import { Calendar, AlertCircle, Clock, CheckCircle2, Activity } from 'lucide-react';
import RenewalPipelineFunnel from './RenewalPipelineFunnel';

interface Props {
  agencyId: string;
}

const riskColor = { low: 'secondary', medium: 'default', high: 'destructive' } as const;

const AgencyLeaseRenewalOverview: React.FC<Props> = ({ agencyId }) => {
  const { data: rows = [], isLoading } = useRenewalIntelligence(agencyId);
  const [bucket, setBucket] = useState<string>('expiring_30');

  const buckets = {
    expiring_30: rows.filter(r => r.bucket === 'expiring_30'),
    expiring_60: rows.filter(r => r.bucket === 'expiring_60'),
    expiring_90: rows.filter(r => r.bucket === 'expiring_90'),
    in_flight: rows.filter(r => r.bucket === 'in_flight'),
    stalled: rows.filter(r => r.bucket === 'stalled'),
    completed: rows.filter(r => r.bucket === 'completed'),
  };

  const renderRow = (r: RenewalRow) => (
    <div key={r.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/30">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{r.property_address || 'No address'}</p>
        <p className="text-xs text-muted-foreground">
          {r.current_lease_end ? `Expires ${new Date(r.current_lease_end).toLocaleDateString()}` : 'No expiry'}
          {r.days_until_expiry !== null && ` · ${r.days_until_expiry}d remaining`}
          {' · '}Last activity {r.days_since_activity}d ago
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{r.status || 'no status'}</Badge>
        <Badge variant={riskColor[r.risk_band]} className="text-xs">
          {r.risk_band} risk · {r.risk_score}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-xs text-muted-foreground">≤ 30 days</p></div>
          <p className="text-2xl font-bold">{buckets.expiring_30.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" />
            <p className="text-xs text-muted-foreground">31-60 days</p></div>
          <p className="text-2xl font-bold">{buckets.expiring_60.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />
            <p className="text-xs text-muted-foreground">61-90 days</p></div>
          <p className="text-2xl font-bold">{buckets.expiring_90.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2"><Activity className="w-4 h-4" />
            <p className="text-xs text-muted-foreground">In Flight</p></div>
          <p className="text-2xl font-bold">{buckets.in_flight.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-xs text-muted-foreground">Stalled</p></div>
          <p className="text-2xl font-bold text-destructive">{buckets.stalled.length}</p>
        </CardContent></Card>
      </div>

      <RenewalPipelineFunnel rows={rows} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Renewals by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={bucket} onValueChange={setBucket}>
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="expiring_30">≤30 ({buckets.expiring_30.length})</TabsTrigger>
              <TabsTrigger value="expiring_60">31-60 ({buckets.expiring_60.length})</TabsTrigger>
              <TabsTrigger value="expiring_90">61-90 ({buckets.expiring_90.length})</TabsTrigger>
              <TabsTrigger value="in_flight">In Flight ({buckets.in_flight.length})</TabsTrigger>
              <TabsTrigger value="stalled">Stalled ({buckets.stalled.length})</TabsTrigger>
              <TabsTrigger value="completed">Done ({buckets.completed.length})</TabsTrigger>
            </TabsList>
            {Object.entries(buckets).map(([k, list]) => (
              <TabsContent key={k} value={k} className="space-y-2 mt-3">
                {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
                {!isLoading && list.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    No renewals in this bucket
                  </div>
                )}
                {list.map(renderRow)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        Read-only intelligence view. Risk scores derived in real-time from existing renewal data.
        No modifications are made to lease records.
      </p>
    </div>
  );
};

export default AgencyLeaseRenewalOverview;
