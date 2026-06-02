import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import ModernDonutChart from './ModernDonutChart';
import ModernAreaChart from './ModernAreaChart';
import { PieChart, TrendingUp, BarChart3 } from 'lucide-react';

interface PropertyOverviewChartsProps {
  properties: any[];
  analytics?: any;
}

const PropertyOverviewCharts: React.FC<PropertyOverviewChartsProps> = ({
  properties,
  analytics
}) => {
  // Property Status Distribution Data
  const statusDistribution = React.useMemo(() => {
    const statusCounts = properties.reduce((acc, property) => {
      const status = property.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusColorMap: Record<string, string> = {
      'available': 'hsl(142 76% 36%)',    // Green for available
      'vacant': 'hsl(48 96% 53%)',        // Yellow for vacant  
      'occupied': 'hsl(221 83% 53%)',     // Blue for occupied
      'maintenance': 'hsl(0 84% 60%)',    // Red for maintenance
      'unknown': 'hsl(var(--muted-foreground))'
    };

    const total = properties.length;
    const statusLabels: Record<string, string> = {
      'available': 'Available',
      'vacant': 'Vacant',
      'occupied': 'Occupied', 
      'maintenance': 'Maintenance',
      'unknown': 'Unknown'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1),
      value: count as number,
      color: statusColorMap[status] || 'hsl(var(--muted-foreground))',
      total: total
    }));
  }, [properties]);

  // Revenue Trend Data (mock data for demo)
  const revenueTrendData = React.useMemo(() => {
    if (!analytics) return [];
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      name: month,
      value: analytics.totalRevenue * (0.85 + Math.random() * 0.3), // Simulated variance
      trend: index > 0 ? (Math.random() - 0.5) * 10 : 0
    }));
  }, [analytics]);

  // Occupancy Rate Trend
  const occupancyTrendData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseOccupancy = analytics?.occupancyRate || 85;
    
    return months.map((month, index) => ({
      name: month,
      value: Math.max(75, Math.min(100, baseOccupancy + (Math.random() - 0.5) * 15))
    }));
  }, [analytics]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
      {/* Property Status Distribution */}
      <CardEnhanced variant="subtle">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Property Status Distribution
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-4">
            <ModernDonutChart 
              data={statusDistribution}
              height={250}
              centerMetric={{
                value: properties.length.toString(),
                label: "Active Properties"
              }}
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate">
                    {item.name}: <span className="font-medium text-foreground">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Revenue Trend */}
      {analytics && (
        <CardEnhanced variant="subtle">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Trend (6M)
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <ModernAreaChart
              data={revenueTrendData}
              height={200}
              color="hsl(var(--primary))"
              dataKey="value"
            />
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Occupancy Rate Trend */}
      {analytics && (
        <CardEnhanced variant="subtle">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Occupancy Rate Trend
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <ModernAreaChart
              data={occupancyTrendData}
              height={200}
              color="hsl(var(--secondary))"
              dataKey="value"
            />
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};

export default PropertyOverviewCharts;