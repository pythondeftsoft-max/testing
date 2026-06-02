import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CollectionActivity {
  id: string;
  amount: number;
  date: string;
  source: 'stripe' | 'hap_tracked' | 'tenant_tracked' | 'manual';
  propertyAddress?: string;
  unitNumber?: string;
  tenantName?: string;
}

interface CollectionActivityListProps {
  recentPayments: CollectionActivity[];
  loading?: boolean;
}

const getSourceBadge = (source: CollectionActivity['source']) => {
  switch (source) {
    case 'stripe':
      return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Stripe</Badge>;
    case 'hap_tracked':
      return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/20">HAP Tracked</Badge>;
    case 'tenant_tracked':
      return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 hover:bg-purple-500/20">Tenant Tracked</Badge>;
    case 'manual':
      return <Badge variant="secondary">Manual</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export const CollectionActivityList = ({
  recentPayments,
  loading,
}: CollectionActivityListProps) => {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Collection Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64" />
      </Card>
    );
  }

  if (!recentPayments.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Collection Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No collection activity for this period
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Collection Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-2">
            {recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground w-16 shrink-0">
                    {format(new Date(payment.date), 'MMM d')}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                      {payment.tenantName || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {payment.propertyAddress}
                      {payment.unitNumber && ` · Unit ${payment.unitNumber}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="font-medium text-right">
                    ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {getSourceBadge(payment.source)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
