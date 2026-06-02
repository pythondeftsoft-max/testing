import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface PropertyData {
  id: string;
  address: string;
  monthlyRent: number;
  occupancyRate: number;
  profitMargin: number;
  maintenanceScore: number;
  status: 'occupied' | 'available' | 'maintenance';
}

interface PropertyHeatMapProps {
  properties: PropertyData[];
  metric: 'profitMargin' | 'occupancyRate' | 'maintenanceScore';
  onPropertyClick?: (propertyId: string) => void;
}

const PropertyHeatMap = ({ properties, metric = 'profitMargin', onPropertyClick }: PropertyHeatMapProps) => {
  const getMetricValue = (property: PropertyData) => {
    switch (metric) {
      case 'profitMargin':
        return property.profitMargin;
      case 'occupancyRate':
        return property.occupancyRate;
      case 'maintenanceScore':
        return property.maintenanceScore;
      default:
        return 0;
    }
  };

  const getMetricColor = (value: number) => {
    if (metric === 'maintenanceScore') {
      // Lower maintenance score is better (green), higher is worse (red)
      if (value <= 20) return 'bg-success/20 border-success/40 text-success-foreground';
      if (value <= 50) return 'bg-warning/20 border-warning/40 text-warning-foreground';
      return 'bg-destructive/20 border-destructive/40 text-destructive-foreground';
    } else {
      // Higher values are better for profit margin and occupancy rate
      if (value >= 80) return 'bg-success/20 border-success/40 text-success-foreground';
      if (value >= 60) return 'bg-warning/20 border-warning/40 text-warning-foreground';
      return 'bg-destructive/20 border-destructive/40 text-destructive-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'occupied':
        return <Badge variant="success" className="text-xs">Occupied</Badge>;
      case 'available':
        return <Badge variant="warning" className="text-xs">Available</Badge>;
      case 'maintenance':
        return <Badge variant="destructive" className="text-xs">Maintenance</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  const formatMetricValue = (value: number) => {
    switch (metric) {
      case 'profitMargin':
      case 'occupancyRate':
        return formatPercentage(value);
      case 'maintenanceScore':
        return value.toFixed(0);
      default:
        return value.toFixed(1);
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'profitMargin':
        return 'Profit Margin';
      case 'occupancyRate':
        return 'Occupancy Rate';
      case 'maintenanceScore':
        return 'Maintenance Score';
      default:
        return 'Metric';
    }
  };

  const getLegend = () => {
    if (metric === 'maintenanceScore') {
      return (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/20 border border-success/40"></div>
            <span>Low (0-20)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning/20 border border-warning/40"></div>
            <span>Medium (21-50)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40"></div>
            <span>High (51+)</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/20 border border-success/40"></div>
            <span>Excellent (80%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning/20 border border-warning/40"></div>
            <span>Good (60-79%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40"></div>
            <span>Needs Attention (&lt;60%)</span>
          </div>
        </div>
      );
    }
  };

  return (
    <CardEnhanced variant="command" className="command-card">
      <CardEnhancedHeader>
        <div className="flex items-center justify-between">
          <CardEnhancedTitle gradient>Property Performance Heat Map</CardEnhancedTitle>
          <Badge variant="secondary" className="text-xs">
            {getMetricLabel()}
          </Badge>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Performance Indicators</h4>
            {getLegend()}
          </div>
          
          {/* Property Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {properties.map((property) => {
              const metricValue = getMetricValue(property);
              const colorClass = getMetricColor(metricValue);
              
              return (
                <div
                  key={property.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] ${colorClass}`}
                  onClick={() => onPropertyClick?.(property.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={property.address}>
                          {property.address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(property.monthlyRent)}/month
                        </p>
                      </div>
                      {getStatusBadge(property.status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {getMetricLabel()}:
                      </span>
                      <span className="font-semibold text-sm">
                        {formatMetricValue(metricValue)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {properties.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No properties available to display</p>
            </div>
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default PropertyHeatMap;