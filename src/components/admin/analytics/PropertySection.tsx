import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComprehensiveMetrics } from '@/hooks/useComprehensiveAdminMetrics';
import { Building, Home, Briefcase } from 'lucide-react';

interface PropertySectionProps {
  metrics: ComprehensiveMetrics;
}

export const PropertySection = ({ metrics }: PropertySectionProps) => {
  const statusData = Object.entries(metrics.properties.by_status || {});
  const typeData = Object.entries(metrics.properties.by_type || {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="h-5 w-5" />
            Properties Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Properties</span>
            <span className="text-2xl font-bold">{metrics.properties.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Average Rent</span>
            <span className="font-semibold">${Math.round(metrics.properties.average_rent).toLocaleString()}</span>
          </div>
          {statusData.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">By Status</p>
              {statusData.map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Property Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {typeData.length > 0 ? (
            typeData.map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No type data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Portfolios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Portfolios</span>
            <span className="text-2xl font-bold">{metrics.portfolios.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Portfolio Assets</span>
            <span className="font-semibold">{metrics.portfolios.total_assets}</span>
          </div>
          {metrics.portfolios.avg_properties && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Props/Portfolio</span>
              <span className="font-semibold">{Math.round(metrics.portfolios.avg_properties)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
