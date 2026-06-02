import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight, TrendingUp, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Opportunity, useOpportunityInsights } from '@/hooks/useOpportunityInsights';
import { FinderTenant } from '@/hooks/usePropertyFinder';
import { TenantFilters } from './TenantFilterBar';

interface OpportunityInsightsStripProps {
  tenants: FinderTenant[];
  onApplyFilter: (next: Partial<TenantFilters>) => void;
}

const severityClasses: Record<Opportunity['severity'], string> = {
  green: 'border-green-200 bg-green-50/50',
  amber: 'border-amber-200 bg-amber-50/50',
  blue: 'border-blue-200 bg-blue-50/50',
  red: 'border-red-200 bg-red-50/50',
};

const iconBySeverity: Record<Opportunity['severity'], React.ComponentType<{ className?: string }>> = {
  green: TrendingUp,
  amber: Clock,
  blue: Sparkles,
  red: Clock,
};

export const OpportunityInsightsStrip: React.FC<OpportunityInsightsStripProps> = ({
  tenants,
  onApplyFilter,
}) => {
  const opportunities = useOpportunityInsights(tenants);

  if (opportunities.length === 0) return null;

  const handleClick = (opp: Opportunity) => {
    if (opp.filter) {
      onApplyFilter(opp.filter);
    } else if (opp.kind === 'stale') {
      onApplyFilter({ pushed: 'expired_no_response' });
    } else if (opp.kind === 'fresh') {
      onApplyFilter({ pushed: 'never' });
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-medium">Opportunities to work right now</h3>
        <span className="text-xs text-muted-foreground">
          · ranked by ready pair count
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {opportunities.map((opp) => {
          const Icon = iconBySeverity[opp.severity];
          return (
            <Card key={opp.id} className={cn('border-2', severityClasses[opp.severity])}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate" title={opp.title}>
                      {opp.title}
                    </p>
                    <p
                      className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2"
                      title={opp.subtitle}
                    >
                      {opp.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] font-medium text-foreground/70">{opp.metric}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => handleClick(opp)}
                  >
                    {opp.cta}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
