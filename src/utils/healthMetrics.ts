import type { HealthMetric } from '@/types/analytics';

export const getHealthColor = (status: HealthMetric['status']): string => {
  const colorMap = {
    excellent: 'hsl(var(--health-excellent))',
    good: 'hsl(var(--health-good))', 
    attention: 'hsl(var(--health-attention))',
    critical: 'hsl(var(--health-critical))',
    'needs-attention': 'hsl(var(--health-needs-attention))',
    perfect: 'hsl(var(--health-perfect))'
  };
  return colorMap[status] || colorMap.good;
};

export const getHealthColorClass = (status: HealthMetric['status']): string => {
  const classMap = {
    excellent: 'text-health-excellent',
    good: 'text-health-good',
    attention: 'text-health-attention', 
    critical: 'text-health-critical',
    'needs-attention': 'text-health-needs-attention',
    perfect: 'text-health-perfect'
  };
  return classMap[status] || classMap.good;
};

export const formatMetricValue = (value: number, label: string): string => {
  if (label.toLowerCase().includes('rate') || label.toLowerCase().includes('occupancy')) {
    return `${value}%`;
  }
  if (label.toLowerCase().includes('days')) {
    return `${value} days`;
  }
  if (label.toLowerCase().includes('requests') || label.toLowerCase().includes('units')) {
    return value.toString();
  }
  return value.toString();
};

export const generateSparklineData = (baseValue: number, points: number = 30): number[] => {
  const data: number[] = [];
  let current = baseValue;
  
  for (let i = 0; i < points; i++) {
    const variance = (Math.random() - 0.5) * 0.1 * baseValue;
    current = Math.max(0, current + variance);
    data.push(Math.round(current * 100) / 100);
  }
  
  return data;
};

export const generateSparklinePath = (data: number[], width: number, height: number): string => {
  if (data.length === 0) return '';
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });
  
  return `M ${points.join(' L ')}`;
};

/**
 * Calculate dynamic color based on percentage (0-100)
 * Returns RGB color that transitions from red -> yellow -> green
 */
export const getScoreBasedColor = (percentage: number): string => {
  const score = Math.max(0, Math.min(100, percentage));
  
  let r: number, g: number, b: number;
  
  if (score < 50) {
    // 0-50%: Red (220, 38, 38) -> Yellow (234, 179, 8)
    const ratio = score / 50;
    r = Math.round(220 + (234 - 220) * ratio);
    g = Math.round(38 + (179 - 38) * ratio);
    b = Math.round(38 + (8 - 38) * ratio);
  } else {
    // 50-100%: Yellow (234, 179, 8) -> Dark Green (21, 128, 61)
    const ratio = (score - 50) / 50;
    r = Math.round(234 + (21 - 234) * ratio);
    g = Math.round(179 + (128 - 179) * ratio);
    b = Math.round(8 + (61 - 8) * ratio);
  }
  
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Get Tailwind-compatible CSS class for dynamic score colors
 */
export const getScoreBasedColorClass = (percentage: number): string => {
  const score = Math.max(0, Math.min(100, percentage));
  
  if (score >= 85) return 'text-green-700';
  if (score >= 70) return 'text-green-600';
  if (score >= 55) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-500';
  if (score >= 25) return 'text-orange-600';
  return 'text-red-600';
};

/**
 * Get background color for icon circles
 */
export const getScoreBasedBgClass = (percentage: number): string => {
  const score = Math.max(0, Math.min(100, percentage));
  
  if (score >= 85) return 'bg-green-100';
  if (score >= 70) return 'bg-green-50';
  if (score >= 55) return 'bg-yellow-50';
  if (score >= 40) return 'bg-orange-50';
  return 'bg-red-50';
};

/**
 * Get icon color based on score
 */
export const getScoreBasedIconClass = (percentage: number): string => {
  const score = Math.max(0, Math.min(100, percentage));
  
  if (score >= 85) return 'text-green-700';
  if (score >= 70) return 'text-green-600';
  if (score >= 55) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-600';
};