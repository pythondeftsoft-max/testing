import { ComprehensiveMetrics } from '@/hooks/useComprehensiveAdminMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle, Clock } from 'lucide-react';

interface RentCollectionHealthCardProps {
  metrics: ComprehensiveMetrics;
}

export const RentCollectionHealthCard = ({ metrics }: RentCollectionHealthCardProps) => {
  const avgDaysLate = metrics.financial.avg_days_late
    ? metrics.financial.avg_days_late.toFixed(1)
    : 'N/A';

  const getHealthColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Rent Collection Health</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Collection Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Collection Rate</p>
            </div>
            <p className={`text-3xl font-bold ${getHealthColor(metrics.financial.collection_rate)}`}>
              {metrics.financial.collection_rate}%
            </p>
          </div>

          {/* On-Time Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">On-Time Payment Rate</p>
            </div>
            <p className={`text-3xl font-bold ${getHealthColor(metrics.financial.on_time_rate)}`}>
              {metrics.financial.on_time_rate}%
            </p>
          </div>

          {/* Late Payments */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-muted-foreground">Late Payments</p>
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {metrics.financial.late_payment_count}
            </p>
            <p className="text-xs text-muted-foreground">
              ${metrics.financial.total_late.toLocaleString()} total
            </p>
          </div>

          {/* Avg Days Late */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Days Late</p>
            </div>
            <p className="text-3xl font-bold">{avgDaysLate}</p>
            <p className="text-xs text-muted-foreground">days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
