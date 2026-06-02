import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { usePriceHistory } from '@/hooks/usePriceHistory';

interface PriceSparklineProps {
  symbol: string;
  className?: string;
}

const PriceSparkline = ({ symbol, className = '' }: PriceSparklineProps) => {
  const { fetchPriceHistory, isLoading, error } = usePriceHistory();
  const [priceHistory, setPriceHistory] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadPriceHistory = async () => {
      try {
        const data = await fetchPriceHistory(symbol, 'stock', '1Y', '1d');
        setPriceHistory(data?.priceHistory || []);
      } catch (err) {
        console.error('Failed to load price history:', err);
      }
    };

    if (symbol) {
      loadPriceHistory();
    }
  }, [symbol, fetchPriceHistory]);

  if (isLoading || error || !priceHistory || priceHistory.length === 0) {
    return (
      <div className={`w-16 h-8 flex items-center justify-center ${className}`}>
        {isLoading ? (
          <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <div className="w-full h-full bg-muted rounded opacity-50"></div>
        )}
      </div>
    );
  }

  // Calculate if trend is positive or negative
  const firstPrice = priceHistory[0]?.close || 0;
  const lastPrice = priceHistory[priceHistory.length - 1]?.close || 0;
  const isPositive = lastPrice >= firstPrice;

  // Transform data for the chart
  const chartData = priceHistory.map((point, index) => ({
    index,
    close: point.close,
  }));

  return (
    <div className={`w-16 h-8 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="close"
            stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--danger))'}
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceSparkline;