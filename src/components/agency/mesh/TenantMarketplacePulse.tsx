import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Home, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTenantMarketplacePulse } from '@/hooks/useMarketplacePulse';
import { formatDate } from '@/lib/utils';

interface Props {
  tenantUserId: string;
}

/**
 * Read-only marketplace pulse widget for tenant detail drawers.
 * Surfaces what's happening on the OpenKey marketplace side for this tenant
 * so caseworkers have visibility without entering the placement loop.
 */
const TenantMarketplacePulse: React.FC<Props> = ({ tenantUserId }) => {
  const { data, isLoading } = useTenantMarketplacePulse(tenantUserId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-16 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const statusVariant =
    data.searchStatus === 'placed' ? 'success'
    : data.searchStatus === 'active' ? 'default'
    : data.searchStatus === 'stale' ? 'warning'
    : 'secondary';

  const statusLabel =
    data.searchStatus === 'placed' ? 'Placed'
    : data.searchStatus === 'active' ? 'Actively shopping'
    : data.searchStatus === 'stale' ? 'Stale — needs check-in'
    : 'No activity';

  const statusIcon =
    data.searchStatus === 'placed' ? <CheckCircle2 className="h-3.5 w-3.5" />
    : data.searchStatus === 'stale' ? <AlertCircle className="h-3.5 w-3.5" />
    : <Activity className="h-3.5 w-3.5" />;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Marketplace Activity
          <span className="text-xs font-normal text-muted-foreground ml-auto">read-only</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant as any} className="gap-1">
            {statusIcon}
            {statusLabel}
          </Badge>
          {data.activeMatches > 0 && (
            <span className="text-xs text-muted-foreground">
              {data.activeMatches} active match{data.activeMatches === 1 ? '' : 'es'}
            </span>
          )}
        </div>

        {data.lastApplicationAt && (
          <div className="flex items-start gap-2 text-xs">
            <Home className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-foreground">
                Last application: {data.lastApplicationProperty || 'a unit'}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {formatDate(data.lastApplicationAt)}
                {data.daysSinceLastActivity !== null && ` (${data.daysSinceLastActivity}d ago)`}
              </p>
            </div>
          </div>
        )}

        {!data.lastApplicationAt && !data.hasLease && (
          <p className="text-xs text-muted-foreground">
            No marketplace applications yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantMarketplacePulse;
