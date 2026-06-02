import React from 'react';
import { PredictiveTrendChart } from './PredictiveTrendChart';
import type { WidgetDefinition } from '@/types/widgetTypes';
import { generateWidgetSeed, seededRandom } from '@/utils/seededRandom';

interface PredictiveChartCardProps {
  widget: WidgetDefinition;
}

export const PredictiveChartCard: React.FC<PredictiveChartCardProps> = ({ widget }) => {
  // Generate mock time series data based on widget type using seeded random
  const getMockChartData = () => {
    const widgetType = widget.widgetType;
    const baseSeed = generateWidgetSeed(widget.id);
    
    // Determine format based on widget type
    const isCurrency = widgetType.includes('revenue') || widgetType.includes('cost') || 
                       widgetType.includes('cashflow') || widgetType.includes('income');
    const isPercentage = widgetType.includes('occupancy') || widgetType.includes('rate') ||
                         widgetType.includes('vacancy') || widgetType.includes('efficiency');
    
    const formatValue = isCurrency ? 'currency' : isPercentage ? 'percentage' : 'number';
    
    // Generate base value using seeded random
    let baseValue: number;
    if (isCurrency) {
      baseValue = Math.floor(seededRandom(baseSeed) * 50000) + 30000;
    } else if (isPercentage) {
      baseValue = Math.floor(seededRandom(baseSeed) * 30) + 65;
    } else {
      baseValue = Math.floor(seededRandom(baseSeed) * 80) + 20;
    }
    
    // Generate 12-month time series (6 historical, 6 predicted)
    const today = new Date();
    const data = [];
    
    // Historical data (last 6 months)
    for (let i = -6; i < 0; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() + i);
      const variance = (seededRandom(baseSeed + 100 + i) - 0.5) * 10;
      data.push({
        date: date.toISOString().split('T')[0],
        actual: Math.round(baseValue + (baseValue * variance / 100)),
        type: 'historical' as const
      });
    }
    
    // Predicted data (next 6 months)
    const trend = seededRandom(baseSeed + 50) > 0.5 ? 1 : -1;
    for (let i = 0; i < 6; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() + i);
      const trendEffect = trend * i * 2;
      const variance = (seededRandom(baseSeed + 200 + i) - 0.5) * 8;
      data.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(baseValue + (baseValue * (trendEffect + variance) / 100)),
        confidence: Math.floor(95 - (i * 4)), // Confidence decreases over time (slower decline)
        type: 'future' as const
      });
    }
    
    return { data, formatValue };
  };
  
  const mockData = getMockChartData();
  
  return (
    <PredictiveTrendChart
      title={widget.name}
      formatValue={mockData.formatValue as 'currency' | 'percentage' | 'number'}
      data={mockData.data}
    />
  );
};
