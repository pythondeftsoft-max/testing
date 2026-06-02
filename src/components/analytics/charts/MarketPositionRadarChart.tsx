import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';

interface MarketMetric {
  subject: string;
  portfolio: number;
  market: number;
  competitor: number;
  fullMark: number;
}

interface MarketPositionRadarChartProps {
  data: MarketMetric[];
  height?: number;
}

const MarketPositionRadarChart = ({ data, height = 300 }: MarketPositionRadarChartProps) => {
  return (
    <CardEnhanced variant="command" className="command-card">
      <CardEnhancedHeader>
        <CardEnhancedTitle gradient>Market Position Analysis</CardEnhancedTitle>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={data} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            
            {/* Your Portfolio */}
            <Radar
              name="Your Portfolio"
              dataKey="portfolio"
              stroke="hsl(var(--openkey-blue))"
              fill="hsl(var(--openkey-blue) / 0.3)"
              strokeWidth={2}
            />
            
            {/* Market Average */}
            <Radar
              name="Market Average"
              dataKey="market"
              stroke="hsl(var(--openkey-gold))"
              fill="hsl(var(--openkey-gold) / 0.2)"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            
            {/* Top Competitor */}
            <Radar
              name="Top Competitor"
              dataKey="competitor"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground) / 0.1)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
          </RadarChart>
        </ResponsiveContainer>
        
        {/* Performance Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-2 bg-openkey-blue/10 rounded-lg">
            <div className="text-sm font-semibold text-openkey-blue">Your Portfolio</div>
            <div className="text-xs text-muted-foreground">Above market in most areas</div>
          </div>
          <div className="p-2 bg-openkey-gold/10 rounded-lg">
            <div className="text-sm font-semibold text-openkey-gold">Market Average</div>
            <div className="text-xs text-muted-foreground">Benchmark performance</div>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-sm font-semibold text-muted-foreground">Top Competitor</div>
            <div className="text-xs text-muted-foreground">Industry leader</div>
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default MarketPositionRadarChart;