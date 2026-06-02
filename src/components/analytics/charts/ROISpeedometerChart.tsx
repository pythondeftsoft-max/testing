import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { formatPercentage } from '@/lib/formatters';

interface ROISpeedometerProps {
  value: number;
  title?: string;
  maxValue?: number;
  zones?: {
    min: number;
    max: number;
    color: string;
    label: string;
  }[];
}

const ROISpeedometerChart = ({ 
  value, 
  title = "ROI Performance", 
  maxValue = 25,
  zones = [
    { min: 0, max: 5, color: 'hsl(var(--destructive))', label: 'Poor' },
    { min: 5, max: 10, color: 'hsl(var(--warning))', label: 'Fair' },
    { min: 10, max: 15, color: 'hsl(var(--primary))', label: 'Good' },
    { min: 15, max: 25, color: 'hsl(var(--success))', label: 'Excellent' }
  ]
}: ROISpeedometerProps) => {
  // Create gauge data
  const createGaugeData = () => {
    const totalAngle = 180; // Half circle
    const data = [];
    
    zones.forEach((zone, index) => {
      const zoneRange = zone.max - zone.min;
      const angle = (zoneRange / maxValue) * totalAngle;
      
      data.push({
        name: zone.label,
        value: angle,
        color: zone.color,
        range: `${zone.min}%-${zone.max}%`
      });
    });
    
    return data;
  };

  const gaugeData = createGaugeData();
  
  // Calculate needle position
  const needleAngle = (value / maxValue) * 180 - 90;
  
  // Get current zone color
  const getCurrentZoneColor = () => {
    const currentZone = zones.find(zone => value >= zone.min && value <= zone.max);
    return currentZone?.color || 'hsl(var(--muted))';
  };

  return (
    <CardEnhanced variant="command" className="command-card">
      <CardEnhancedHeader>
        <CardEnhancedTitle gradient>{title}</CardEnhancedTitle>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="80%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                stroke="none"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Needle */}
          <div 
            className="absolute top-1/2 left-1/2 w-0.5 bg-foreground origin-bottom"
            style={{
              height: '80px',
              transform: `translate(-50%, -100%) rotate(${needleAngle}deg)`,
              transformOrigin: 'bottom center'
            }}
          />
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-foreground rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          
          {/* Value display */}
          <div className="text-center mt-4">
            <div 
              className="text-3xl font-bold"
              style={{ color: getCurrentZoneColor() }}
            >
              {formatPercentage(value)}
            </div>
            <div className="text-sm text-muted-foreground">ROI</div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-6">
          {zones.map((zone, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: zone.color }}
              />
              <span className="text-muted-foreground">
                {zone.label} ({zone.min}%-{zone.max}%)
              </span>
            </div>
          ))}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default ROISpeedometerChart;