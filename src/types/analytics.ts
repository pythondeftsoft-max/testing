export interface HealthMetric {
  label: string;
  value: number;
  status?: 'excellent' | 'good' | 'needs-attention';
  trend?: number; // Percentage change as number
  color?: string; // Add color property for compatibility
  target?: number;
  breakdown?: BreakdownItem[];
  sparklineData?: number[];
  icon?: string;
}

export interface BreakdownItem {
  category: string;
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface StreamStatus {
  isConnected: boolean;
  lastUpdate: string;
  connectionQuality: 'excellent' | 'good' | 'poor';
  dataPoints: number;
}

export interface PredictiveInsight {
  id: string;
  type: 'prediction' | 'recommendation' | 'alert' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  timeframe: string;
  metric: string;
  predictedValue: number;
  currentValue: number;
  trend: 'up' | 'down' | 'stable';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface FilterState {
  propertyTypes: string[];
  locations: string[];
  rentRange: [number, number];
  occupancyRange: [number, number];
  timePeriod: string;
  status: string[];
  hasMaintenanceIssues: boolean;
  hasParking: boolean;
  isPetFriendly: boolean;
  isLuxury: boolean;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ComparisonData {
  current: number;
  previous: number;
  benchmark: number;
  industry: number;
}