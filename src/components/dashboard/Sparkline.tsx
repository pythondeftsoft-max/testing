import React from 'react';

interface SparklineProps {
  positive?: boolean;
  height?: number;
  width?: number;
  className?: string;
}

/**
 * Mini SVG sparkline chart for metric cards.
 * Shows a smooth trend line with gradient fill.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  positive = true,
  height = 40,
  width = 100,
  className = '',
}) => {
  // Predefined trend data points
  const upwardPoints = [40, 35, 50, 45, 60, 55, 70, 65, 80, 75, 85];
  const downwardPoints = [85, 75, 80, 65, 70, 55, 60, 45, 50, 35, 40];
  
  const points = positive ? upwardPoints : downwardPoints;
  
  // Calculate SVG path
  const maxValue = Math.max(...points);
  const minValue = Math.min(...points);
  const range = maxValue - minValue || 1;
  
  const stepX = width / (points.length - 1);
  const padding = 4;
  const chartHeight = height - padding * 2;
  
  // Create smooth bezier curve path
  const pathPoints = points.map((value, index) => {
    const x = index * stepX;
    const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
    return { x, y };
  });
  
  // Generate smooth curve using quadratic bezier
  let pathD = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1];
    const curr = pathPoints[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` Q ${prev.x + (curr.x - prev.x) / 4} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
    pathD += ` T ${curr.x} ${curr.y}`;
  }
  
  // Create area path for gradient fill
  const areaD = pathD + ` L ${width} ${height} L 0 ${height} Z`;
  
  const gradientId = `sparkline-gradient-${positive ? 'up' : 'down'}`;
  const strokeColor = positive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
  const fillColorStart = positive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
  
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillColorStart} stopOpacity="0.3" />
          <stop offset="100%" stopColor={fillColorStart} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <path
        d={areaD}
        fill={`url(#${gradientId})`}
      />
      
      {/* Line stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End point dot */}
      <circle
        cx={pathPoints[pathPoints.length - 1].x}
        cy={pathPoints[pathPoints.length - 1].y}
        r="3"
        fill={strokeColor}
      />
    </svg>
  );
};

export default Sparkline;
