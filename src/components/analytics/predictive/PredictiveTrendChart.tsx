import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar } from 'lucide-react';

interface DataPoint {
  date: string;
  actual?: number;
  predicted?: number;
  confidence?: number;
  type: 'historical' | 'future';
}

interface PredictiveTrendChartProps {
  title: string;
  data: DataPoint[];
  formatValue?: 'currency' | 'percentage' | 'number';
  className?: string;
}

const formatDisplayValue = (value: number, format?: 'currency' | 'percentage' | 'number'): string => {
  if (value === undefined || value === null) return '';
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return value.toLocaleString();
  }
};

const CustomTooltip = ({ active, payload, label, formatValue }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isHistorical = data.type === 'historical';
    
    return (
      <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {isHistorical ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm text-muted-foreground">Actual:</span>
              <span className="text-sm font-medium text-foreground">
                {formatDisplayValue(data.actual, formatValue)}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Predicted:</span>
              <span className="text-sm font-medium text-foreground">
                {formatDisplayValue(data.predicted, formatValue)}
              </span>
            </div>
            {data.confidence && (
              <div className="text-xs text-muted-foreground">
                Confidence: {data.confidence}%
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const PredictiveTrendChart: React.FC<PredictiveTrendChartProps> = ({
  title,
  data,
  formatValue = 'number',
  className
}) => {
  // Find the boundary between historical and future data
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return (
    <CardEnhanced variant="command" className={`command-card ${className || ''}`}>
      <CardEnhancedHeader className="pb-4">
        <CardEnhancedTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          {title}
        </CardEnhancedTitle>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => formatDisplayValue(value, formatValue)}
              />
              <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
              
              {/* Reference line for today */}
              <ReferenceLine 
                x={todayStr} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2"
                label={{ value: "Today", position: "top" }}
              />
              
              {/* Historical data line */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                connectNulls={false}
                name="Historical"
              />
              
              {/* Predicted data line */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                connectNulls={false}
                name="Predicted"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary rounded"></div>
            <span className="text-sm text-muted-foreground">Historical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-amber-500 rounded" style={{backgroundImage: 'linear-gradient(to right, #f59e0b 60%, transparent 60%)', backgroundSize: '8px 1px', backgroundRepeat: 'repeat-x'}}></div>
            <span className="text-sm text-muted-foreground">Predicted</span>
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};