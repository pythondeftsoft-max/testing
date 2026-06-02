import React from 'react';
import { CurrentVsPredictiveCard } from './CurrentVsPredictiveCard';
import * as Icons from 'lucide-react';
import type { WidgetDefinition } from '@/types/widgetTypes';
import { generateWidgetSeed, seededRandom } from '@/utils/seededRandom';

interface PredictiveMetricCardProps {
  widget: WidgetDefinition;
}

export const PredictiveMetricCard: React.FC<PredictiveMetricCardProps> = ({ widget }) => {
  // Generate mock data based on widget type using seeded random
  const getMockData = () => {
    const widgetType = widget.widgetType;
    const baseSeed = generateWidgetSeed(widget.id);
    
    // Determine if metric should be currency, percentage, or number
    const isCurrency = widgetType.includes('cost') || widgetType.includes('revenue') || 
                       widgetType.includes('noi') || widgetType.includes('roi') ||
                       widgetType.includes('value') || widgetType.includes('income');
    const isPercentage = widgetType.includes('rate') || widgetType.includes('probability') ||
                         widgetType.includes('occupancy') || widgetType.includes('risk-score') ||
                         widgetType.includes('efficiency');
    
    const formatValue = isCurrency ? 'currency' : isPercentage ? 'percentage' : 'number';
    
    // Generate appropriate current value using seeded random
    let currentValue: number;
    if (isCurrency) {
      currentValue = Math.floor(seededRandom(baseSeed) * 50000) + 10000;
    } else if (isPercentage) {
      currentValue = Math.floor(seededRandom(baseSeed) * 40) + 60;
    } else {
      currentValue = Math.floor(seededRandom(baseSeed) * 90) + 10;
    }
    
    // Generate predicted value (slightly different from current)
    const changePercent = (seededRandom(baseSeed + 1) * 15) - 5; // -5% to +10%
    const predictedValue = currentValue + (currentValue * changePercent / 100);
    
    // Determine trend
    const trend: 'up' | 'down' | 'stable' = 
      Math.abs(changePercent) < 1 ? 'stable' : 
      changePercent > 0 ? 'up' : 'down';
    
    return {
      currentValue,
      predictedValue,
      formatValue,
      trend,
      changePercent: Math.abs(changePercent)
    };
  };
  
  const mockData = getMockData();
  
  // Get appropriate icon
  const getIcon = () => {
    const iconMap: Record<string, keyof typeof Icons> = {
      'vacancy': 'Home',
      'tenant': 'Users',
      'cost': 'DollarSign',
      'maintenance': 'Wrench',
      'revenue': 'TrendingUp',
      'risk': 'AlertTriangle',
      'market': 'TrendingUp',
      'financial': 'DollarSign',
      'roi': 'Target',
      'default': 'TrendingUp'
    };
    
    const widgetType = widget.widgetType.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (widgetType.includes(key)) {
        return Icons[icon] as React.ComponentType<any>;
      }
    }
    return Icons.TrendingUp;
  };
  
  const Icon = getIcon();
  
  return (
    <CurrentVsPredictiveCard
      title={widget.name}
      currentValue={mockData.currentValue}
      predictiveData={{
        value: mockData.predictedValue,
        confidence: Math.floor(seededRandom(generateWidgetSeed(widget.id) + 2) * 20) + 75, // 75-95% confidence
        timeframe: "30 days",
        trend: mockData.trend,
        trendPercentage: mockData.changePercent
      }}
      formatValue={mockData.formatValue as 'currency' | 'percentage' | 'number'}
      icon={Icon}
    />
  );
};
