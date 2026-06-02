import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Wrench, Clock, DollarSign, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';
import { MaintenanceEfficiency } from '@/hooks/useLandlordAnalytics';
import EnhancedMetricCard from '@/components/EnhancedMetricCard';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';

interface MaintenanceEfficiencyPanelProps {
  data: MaintenanceEfficiency | null;
  loading: boolean;
}

const MaintenanceEfficiencyPanel = ({ data, loading }: MaintenanceEfficiencyPanelProps) => {

  if (loading) {
    return (
      <CardEnhanced variant="command" className="command-card animate-fade-in-up">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-openkey-blue" />
            Maintenance & Ops Efficiency
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openkey-blue"></div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (!data) {
    return (
      <CardEnhanced variant="command" className="command-card animate-fade-in-up">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-openkey-blue" />
            Maintenance & Ops Efficiency
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-center py-8 text-muted-foreground">
            No maintenance data available
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="command" className="command-card animate-fade-in-up">
      <CardEnhancedHeader>
        <div className="flex items-center justify-between">
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-openkey-blue" />
            Maintenance & Ops Efficiency
          </CardEnhancedTitle>
          <div className="text-sm text-muted-foreground">Happy tenants stay longer & costs stay lower</div>
        </div>
      </CardEnhancedHeader>

      <CardEnhancedContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Open Requests */}
          <EnhancedMetricCard
            title="Open Requests"
            value={data.open_requests_count}
            icon={data.open_requests_count === 0 ? CheckCircle : AlertCircle}
            iconColor={data.open_requests_count > 5 ? "text-destructive" : data.open_requests_count > 0 ? "text-warning" : "text-success"}
            subtitle={data.open_requests_count === 0 ? 'All caught up!' : 'need attention'}
            percentage={data.open_requests_count > 0 ? -data.open_requests_count : 0}
            isPositive={data.open_requests_count === 0}
            showAsSuccess={data.open_requests_count === 0}
          />

          {/* Average Request Age */}
          <EnhancedMetricCard
            title="Avg. Request Age"
            value={Math.round(data.avg_request_age_days)}
            icon={Clock}
            iconColor={data.avg_request_age_days > 10 ? "text-destructive" : data.avg_request_age_days > 5 ? "text-warning" : "text-success"}
            subtitle="days average age"
            percentage={data.avg_request_age_days > 5 ? -(data.avg_request_age_days - 5) : (5 - data.avg_request_age_days)}
            isPositive={data.avg_request_age_days <= 5}
            showAsSuccess={data.avg_request_age_days <= 5}
          />

          {/* Resolution Time */}
          <EnhancedMetricCard
            title="Avg. Resolution Time"
            value={Math.round(data.avg_resolution_days)}
            icon={Wrench}
            iconColor={data.avg_resolution_days > 7 ? "text-destructive" : data.avg_resolution_days > 3 ? "text-warning" : "text-success"}
            subtitle="days to completion"
            percentage={data.avg_resolution_days > 3 ? -(data.avg_resolution_days - 3) : (3 - data.avg_resolution_days)}
            isPositive={data.avg_resolution_days <= 3}
            showAsSuccess={data.avg_resolution_days <= 3}
          />

          {/* Cost per Unit */}
          <EnhancedMetricCard
            title="Cost per Unit"
            value={formatCurrency(data.maintenance_cost_per_unit)}
            icon={data.maintenance_cost_per_unit <= 100 ? TrendingDown : DollarSign}
            iconColor={data.maintenance_cost_per_unit > 200 ? "text-destructive" : data.maintenance_cost_per_unit > 100 ? "text-warning" : "text-success"}
            subtitle="maintenance spend"
            percentage={data.maintenance_cost_per_unit > 100 ? -(data.maintenance_cost_per_unit - 100) / 10 : (100 - data.maintenance_cost_per_unit) / 10}
            isPositive={data.maintenance_cost_per_unit <= 100}
            showAsSuccess={data.maintenance_cost_per_unit <= 100}
          />
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardEnhanced 
            variant={data.avg_resolution_days <= 3 ? "subtle" : "outlined"}
            className={`${data.avg_resolution_days <= 3 ? 'card-hover-gold' : ''}`}
          >
            <CardEnhancedContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${data.avg_resolution_days <= 3 ? 'text-success' : 'text-warning'}`}>
                    {data.avg_resolution_days <= 3 ? 'Excellent Response Time!' : 'Room for Improvement'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.avg_resolution_days <= 3 
                      ? 'Your quick response keeps tenants happy' 
                      : 'Consider streamlining your maintenance process'
                    }
                  </p>
                </div>
                <Badge variant={data.avg_resolution_days <= 3 ? "success" : "warning"} className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {data.avg_resolution_days <= 3 ? 'Efficient' : 'Optimize'}
                </Badge>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>

          <CardEnhanced 
            variant={data.maintenance_cost_per_unit <= 100 ? "subtle" : "outlined"}
            className={`${data.maintenance_cost_per_unit <= 100 ? 'card-hover-gold' : ''}`}
          >
            <CardEnhancedContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${data.maintenance_cost_per_unit <= 100 ? 'text-success' : 'text-secondary'}`}>
                    {data.maintenance_cost_per_unit <= 100 ? 'Cost Efficient' : 'Monitor Costs'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.maintenance_cost_per_unit <= 100 
                      ? 'Maintenance costs are well controlled' 
                      : 'Track expenses to identify patterns'
                    }
                  </p>
                </div>
                <Badge variant={data.maintenance_cost_per_unit <= 100 ? "success" : "secondary"} className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {data.maintenance_cost_per_unit <= 100 ? 'Controlled' : 'Monitor'}
                </Badge>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default MaintenanceEfficiencyPanel;