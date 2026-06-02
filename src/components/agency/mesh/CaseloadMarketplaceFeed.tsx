import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Home, FileText, AlertTriangle, Filter } from 'lucide-react';
import { useCaseloadMarketplaceFeed, type CaseloadFeedEvent } from '@/hooks/useMarketplacePulse';
import { formatDate } from '@/lib/utils';

interface Props {
  agencyId: string;
  staffId: string;
}

/**
 * Read-only feed of marketplace activity for the caseworker's assigned tenants.
 * Caseworker stays in their lane (paperwork). This is informational only.
 */
const CaseloadMarketplaceFeed: React.FC<Props> = ({ agencyId, staffId }) => {
  const { data: events, isLoading } = useCaseloadMarketplaceFeed(staffId, agencyId);
  const [filter, setFilter] = useState<'all' | CaseloadFeedEvent['type']>('all');

  const filtered = (events || []).filter((e) => filter === 'all' || e.type === filter);

  const iconFor = (type: CaseloadFeedEvent['type']) => {
    switch (type) {
      case 'lease_signed': return <Home className="h-4 w-4 text-green-600" />;
      case 'application': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'stale_searcher': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
  };

  const badgeFor = (type: CaseloadFeedEvent['type']) => {
    switch (type) {
      case 'lease_signed': return <Badge variant="success" className="text-[10px]">Lease</Badge>;
      case 'application': return <Badge variant="secondary" className="text-[10px]">Applied</Badge>;
      case 'stale_searcher': return <Badge variant="warning" className="text-[10px]">Stale</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Marketplace Pulse — My Caseload
            <span className="text-xs font-normal text-muted-foreground">read-only</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            {(['all', 'application', 'lease_signed', 'stale_searcher'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'ghost'}
                className="h-6 px-2 text-[10px]"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'lease_signed' ? 'Leases' : f === 'application' ? 'Applied' : 'Stale'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No recent marketplace activity for your caseload.
          </p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 py-2 px-2 rounded hover:bg-accent/50 border-b last:border-0 border-border/40"
              >
                <div className="mt-0.5 shrink-0">{iconFor(e.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{e.tenantName}</span>
                    {badgeFor(e.type)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{e.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                  {e.occurredAt && new Date(e.occurredAt).getFullYear() > 1971
                    ? formatDate(e.occurredAt)
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CaseloadMarketplaceFeed;
