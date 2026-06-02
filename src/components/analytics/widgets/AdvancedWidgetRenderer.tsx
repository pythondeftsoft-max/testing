import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Building, Users, Calendar, Target, Zap, BarChart3, PieChart as PieChartIcon, Activity, Gauge, Eye, Star } from 'lucide-react';
import { generateAdvancedMockData } from '@/utils/advancedMockDataGenerator';

interface AdvancedWidgetRendererProps {
  widgetType: string;
  category: string;
  title: string;
  description: string;
  componentType: 'metric' | 'chart' | 'panel';
  filters?: any;
  regenerationCount?: number;
  onDataReady?: (data: {
    value?: string | number;
    subtitle?: string;
    icon?: string;
    trend?: { value: number; isPositive: boolean };
    formatValue?: 'currency' | 'percentage' | 'number';
  }) => void;
}

export const AdvancedWidgetRenderer: React.FC<AdvancedWidgetRendererProps> = ({
  widgetType,
  category,
  title,
  description,
  componentType,
  filters,
  regenerationCount = 0,
  onDataReady
}) => {
  const data = useMemo(() => {
    return generateAdvancedMockData(widgetType, category, regenerationCount);
  }, [widgetType, category, regenerationCount]);

  // Notify parent when data is ready
  React.useEffect(() => {
    if (onDataReady && componentType === 'metric' && data) {
      const { value, subtitle, icon, change } = data;
      
      // Determine format based on widget type and value
      let formatValue: 'currency' | 'percentage' | 'number' = 'number';
      if (typeof value === 'number') {
        if (widgetType.includes('rate') || widgetType.includes('ratio') || widgetType.includes('percentage')) {
          formatValue = 'percentage';
        } else if (!widgetType.includes('score') && !widgetType.includes('multiplier')) {
          formatValue = 'currency';
        }
      }

      // Format the value for display
      let displayValue: string | number = value;
      if (typeof value === 'number') {
        if (formatValue === 'percentage') {
          displayValue = `${value.toFixed(1)}%`;
        } else if (formatValue === 'currency') {
          displayValue = `$${value.toLocaleString()}`;
        } else {
          displayValue = widgetType.includes('multiplier') ? `${value.toFixed(1)}x` : value.toFixed(1);
        }
      }

      onDataReady({
        value: displayValue,
        subtitle,
        icon: icon?.toLowerCase().replace(/([A-Z])/g, '-$1').substring(1) || 'dollar-sign',
        trend: change !== undefined ? { value: change, isPositive: change >= 0 } : undefined,
        formatValue
      });
    }
  }, [data, onDataReady, componentType, widgetType]);

  const renderMetricWidget = () => {
    const { value, change, status, subtitle, icon } = data;
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'excellent': return 'text-green-600';
        case 'good': return 'text-blue-600';
        case 'warning': return 'text-yellow-600';
        case 'poor': return 'text-red-600';
        default: return 'text-foreground';
      }
    };

    const getIcon = (iconName: string) => {
      const icons = {
        DollarSign, Building, Users, Calendar, Target, Zap, BarChart3, 
        PieChartIcon, Activity, Gauge, Eye, Star, TrendingUp, TrendingDown
      };
      const IconComponent = icons[iconName as keyof typeof icons] || DollarSign;
      return <IconComponent className="w-5 h-5" />;
    };

    return (
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-primary/10 rounded-lg`}>
          {getIcon(icon)}
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-xl font-bold ${getStatusColor(status)}`}>
            {typeof value === 'number' ? 
              (widgetType.includes('rate') || widgetType.includes('ratio') || widgetType.includes('percentage') ? 
                `${value.toFixed(1)}%` : 
                `$${value.toLocaleString()}`
              ) : value
            }
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {change >= 0 ? 
                <TrendingUp className="w-3 h-3 text-green-600" /> : 
                <TrendingDown className="w-3 h-3 text-red-600" />
              }
              <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChartWidget = () => {
    const { chartData, chartType } = data;

    if (!chartData || chartData.length === 0) {
      return <div className="text-center text-muted-foreground">No data available</div>;
    }

    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--secondary))', 
      'hsl(var(--accent))',
      'hsl(var(--success))',
      'hsl(var(--warning))',
      'hsl(var(--destructive))',
      'hsl(var(--info))'
    ];

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke={colors[0]} 
                strokeWidth={3}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="y" 
                stroke={colors[0]} 
                fill={colors[0]}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Bar dataKey="y" fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="y" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Scatter dataKey="y" fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis />
              <Radar 
                name="Score" 
                dataKey="A" 
                stroke={colors[0]} 
                fill={colors[0]} 
                fillOpacity={0.6} 
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="y" fill={colors[0]} />
              <Line type="monotone" dataKey="trend" stroke={colors[1]} strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return renderMetricWidget();
    }
  };

  const renderPanelWidget = () => {
    const { panelData, insights, recommendations, alerts } = data;

    return (
      <div className="space-y-4">
        {/* Key Metrics */}
        {panelData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {panelData.map((item: any, index: number) => (
              <div key={index} className="text-center p-3 bg-muted/20 rounded-lg">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold">{item.value}</p>
                {item.change && (
                  <p className={`text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change > 0 ? '+' : ''}{item.change}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Alerts</h4>
            {alerts.map((alert: any, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {insights && insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Key Insights</h4>
            {insights.map((insight: string, index: number) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <span className="text-sm">{insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Recommendations</h4>
            {recommendations.map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded">
                <Target className="w-4 h-4 text-green-600 mt-0.5" />
                <span className="text-sm">{rec}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (componentType) {
      case 'metric':
        return renderMetricWidget();
      case 'chart':
        return renderChartWidget();
      case 'panel':
        return renderPanelWidget();
      default:
        return renderChartWidget();
    }
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
};