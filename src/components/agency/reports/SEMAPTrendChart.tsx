import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { useSEMAPHistory } from '@/hooks/useSEMAPHistory';
import { format, parseISO } from 'date-fns';

interface Props { agencyId: string; }

const SEMAPTrendChart: React.FC<Props> = ({ agencyId }) => {
  const { history, loading } = useSEMAPHistory(agencyId);

  const data = history.map(h => ({
    date: format(parseISO(h.snapshot_date), 'MMM d'),
    percentage: Number(h.percentage),
    score: Number(h.total_score),
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> SEMAP Score Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            No history yet. Recalculate SEMAP to record your first snapshot.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis domain={[0, 100]} className="text-xs" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <ReferenceLine y={60} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: 'Pass 60%', fontSize: 11, fill: 'hsl(var(--destructive))' }} />
              <Line type="monotone" dataKey="percentage" name="Overall %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SEMAPTrendChart;
