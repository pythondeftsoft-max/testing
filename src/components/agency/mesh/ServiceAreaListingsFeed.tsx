import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, DollarSign } from 'lucide-react';
import { useServiceAreaListings } from '@/hooks/useMarketplacePulse';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Props {
  agencyCity: string | null;
  agencyState: string | null;
}

/**
 * Read-only feed of new on-market units in the agency's service area.
 * Helps caseworkers see what inventory exists for their voucher holders.
 * Does NOT change marketplace listing flow.
 */
const ServiceAreaListingsFeed: React.FC<Props> = ({ agencyCity, agencyState }) => {
  const { data, isLoading } = useServiceAreaListings(agencyCity, agencyState);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          New Listings — Service Area
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {agencyCity ? `${agencyCity}, ${agencyState}` : agencyState || 'All'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No new on-market listings in your service area.
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {data.map((u) => (
              <div
                key={u.id}
                className="flex items-start gap-3 py-2 px-2 rounded hover:bg-accent/50 border-b last:border-0 border-border/40"
              >
                <Home className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.address}
                    {u.unitNumber ? ` · #${u.unitNumber}` : ''}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {u.city && <span>{u.city}</span>}
                    {u.bedrooms !== null && <span>· {u.bedrooms}BR</span>}
                    {u.monthlyRent !== null && (
                      <span className="flex items-center gap-0.5">
                        · <DollarSign className="h-3 w-3" />{formatCurrency(u.monthlyRent)}
                      </span>
                    )}
                    {u.acceptsHcv && <Badge variant="success" className="text-[10px] py-0">HCV</Badge>}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                  {formatDate(u.listedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceAreaListingsFeed;
