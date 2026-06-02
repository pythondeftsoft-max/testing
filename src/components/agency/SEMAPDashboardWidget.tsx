import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useSEMAPIndicators } from '@/hooks/useSEMAPIndicators';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  onNavigateToSEMAP?: () => void;
}

const SEMAPDashboardWidget: React.FC<Props> = ({ agencyId, onNavigateToSEMAP }) => {
  const currentYear = new Date().getFullYear();
  const period = `${currentYear - 1}-${currentYear}`;
  const { indicators, loading, totalScore, totalMax, overallPct, passing } = useSEMAPIndicators(agencyId, period);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-semap', {
        body: { agency_id: agencyId, reporting_period: period },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`SEMAP recalculated: ${data.percentage}%`);
      // Reload the page to refresh indicators
      window.location.reload();
    } catch (err: any) {
      toast.error('Recalculation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  const atRisk = indicators.filter(i => i.maxPoints > 0 && (i.score / i.maxPoints) < 0.6);
  const designation = overallPct >= 90 ? 'High Performer' : overallPct >= 60 ? 'Standard' : 'Troubled';
  const designationVariant: 'default' | 'secondary' | 'destructive' =
    overallPct >= 90 ? 'default' : overallPct >= 60 ? 'secondary' : 'destructive';

  return (
    <Card className={!passing ? 'border-destructive/40' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> SEMAP Scorecard
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Calculating...' : 'Recalculate'}
            </Button>
            <Badge variant={designationVariant} className="text-sm">
              {overallPct}% — {designation}
            </Badge>
            {onNavigateToSEMAP && (
              <Button variant="ghost" size="sm" onClick={onNavigateToSEMAP}>
                Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Critical Alert */}
        {!passing && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">
              Overall score is below 60%. Immediate attention required on {atRisk.length} indicator{atRisk.length !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

        {/* Compact Indicator Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {indicators.map(ind => {
            const pct = ind.maxPoints > 0 ? ind.score / ind.maxPoints : 0;
            const color = pct >= 0.8 ? 'text-green-600' : pct >= 0.6 ? 'text-amber-600' : 'text-destructive';
            const bgColor = pct >= 0.8 ? 'bg-green-50 dark:bg-green-950/30' : pct >= 0.6 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/30';
            const borderColor = pct >= 0.8 ? 'border-green-200 dark:border-green-800' : pct >= 0.6 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800';

            return (
              <div
                key={ind.number}
                className={`p-2 rounded-lg border text-center ${bgColor} ${borderColor}`}
                title={`${ind.name}: ${ind.score}/${ind.maxPoints}`}
              >
                <p className="text-xs text-muted-foreground font-medium">#{ind.number}</p>
                <p className={`text-lg font-bold ${color}`}>{ind.score}</p>
                <p className="text-xs text-muted-foreground">/{ind.maxPoints}</p>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
          <span className="text-muted-foreground">Total: {totalScore}/{totalMax}</span>
          <div className="flex items-center gap-2">
            {atRisk.length > 0 ? (
              <span className="text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {atRisk.length} at risk
              </span>
            ) : (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> All indicators healthy
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SEMAPDashboardWidget;
