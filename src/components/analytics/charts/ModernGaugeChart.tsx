import React from 'react';

interface ModernGaugeChartProps {
  value: number;
  max: number;
  min?: number;
  label: string;
  unit?: string;
  size?: number;
  thickness?: number;
  colorStops?: { offset: number; color: string }[];
}

const ModernGaugeChart = ({
  value,
  max,
  min = 0,
  label,
  unit = '',
  size = 120,
  thickness = 8,
  colorStops = [
    { offset: 0, color: 'hsl(var(--destructive))' },
    { offset: 50, color: 'hsl(var(--warning))' },
    { offset: 80, color: 'hsl(var(--openkey-blue))' },
    { offset: 100, color: 'hsl(var(--success))' }
  ]
}: ModernGaugeChartProps) => {
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  const strokeDasharray = Math.PI * (size - thickness);
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;
  
  const radius = (size - thickness) / 2;
  const center = size / 2;

  // Determine color based on percentage
  const getColor = () => {
    for (let i = colorStops.length - 1; i >= 0; i--) {
      if (percentage >= colorStops[i].offset) {
        return colorStops[i].color;
      }
    }
    return colorStops[0].color;
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toLocaleString();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={thickness}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDasharray / 4} // Start from top
            strokeLinecap="round"
            opacity={0.2}
          />
          
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={thickness}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset + strokeDasharray / 4}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 6px currentColor)',
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-bold text-foreground">
            {formatValue(normalizedValue)}{unit}
          </div>
          <div className="text-xs text-muted-foreground text-center px-2">
            {percentage.toFixed(0)}%
          </div>
        </div>
      </div>
      
      {/* Label */}
      <div className="text-sm text-muted-foreground text-center mt-2 px-2">
        {label}
      </div>
    </div>
  );
};

export default ModernGaugeChart;