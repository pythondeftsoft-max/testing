import React from 'react';

interface EnhancedGaugeChartProps {
  value: number;
  max: number;
  min?: number;
  label: string;
  unit?: string;
  size?: number;
  thickness?: number;
  showTarget?: boolean;
  target?: number;
  gradient?: boolean;
}

const EnhancedGaugeChart = ({
  value,
  max,
  min = 0,
  label,
  unit = '',
  size = 140,
  thickness = 12,
  showTarget = false,
  target,
  gradient = true,
}: EnhancedGaugeChartProps) => {
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  const strokeDasharray = Math.PI * (size - thickness);
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;
  
  const radius = (size - thickness) / 2;
  const center = size / 2;

  // Determine color and status based on percentage
  const getStatusColor = () => {
    if (percentage >= 80) return 'hsl(var(--success))';
    if (percentage >= 60) return 'hsl(var(--primary))';
    if (percentage >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getStatusText = () => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(0);
  };

  // Target indicator position
  const targetPercentage = target ? ((target - min) / (max - min)) * 100 : 0;
  const targetAngle = (targetPercentage / 100) * 270 - 135; // 270 degrees total, starting at -135

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-45">
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={thickness}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDasharray / 4}
            strokeLinecap="round"
            opacity={0.2}
          />
          
          {/* Progress track */}
          {gradient ? (
            <>
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" />
                  <stop offset="25%" stopColor="hsl(var(--warning))" />
                  <stop offset="75%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--success))" />
                </linearGradient>
              </defs>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth={thickness}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset + strokeDasharray / 4}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 8px currentColor)',
                }}
              />
            </>
          ) : (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={getStatusColor()}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset + strokeDasharray / 4}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                filter: 'drop-shadow(0 0 8px currentColor)',
              }}
            />
          )}
          
          {/* Target indicator */}
          {showTarget && target && (
            <g transform={`rotate(${targetAngle} ${center} ${center})`}>
              <line
                x1={center}
                y1={center - radius + thickness/2}
                x2={center}
                y2={center - radius - 8}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx={center}
                cy={center - radius - 8}
                r="3"
                fill="hsl(var(--muted-foreground))"
              />
            </g>
          )}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-foreground leading-none">
            {formatValue(normalizedValue)}{unit}
          </div>
          <div className="text-sm text-muted-foreground leading-none mt-1">
            {percentage.toFixed(0)}%
          </div>
          <div 
            className="text-xs font-medium leading-none mt-1"
            style={{ color: getStatusColor() }}
          >
            {getStatusText()}
          </div>
        </div>
      </div>
      
      {/* Label and range */}
      <div className="text-center space-y-1">
        <div className="text-sm font-medium text-foreground">
          {label}
        </div>
        <div className="text-xs text-muted-foreground">
          Range: {formatValue(min)} - {formatValue(max)}{unit}
        </div>
        {showTarget && target && (
          <div className="text-xs text-muted-foreground">
            Target: {formatValue(target)}{unit}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedGaugeChart;