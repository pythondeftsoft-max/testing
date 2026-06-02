import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Clock } from 'lucide-react';
import { useRevenueBreakdown, RevenueRange } from '@/hooks/useRevenueBreakdown';
import RevenueSourcesBarChart from '@/components/analytics/charts/RevenueSourcesBarChart';

interface RevenueBreakdownWidgetProps {
  landlordId: string;
  portfolioId?: string;
}

const RANGE_OPTIONS: { key: RevenueRange; label: string }[] = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'ytd', label: 'YTD' },
  { key: '12m', label: '12m' },
];

const RevenueBreakdownWidget: React.FC<RevenueBreakdownWidgetProps> = ({ landlordId, portfolioId }) => {
  const [range, setRange] = useState<RevenueRange>('30d');
  const { data, isLoading } = useRevenueBreakdown(landlordId, portfolioId, range);

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const toggleKey = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const chartData = useMemo(() => {
    const sources = data?.sources || [];
    const enabled = sources.filter((s) => !visibleKeys.has(s.key));
    return enabled.map((s) => ({ name: s.label, value: s.value, color: s.color, key: s.key }));
  }, [data, visibleKeys]);

  const total = data?.total || 0;

  const exportCSV = () => {
    const rows = [
      ['Source', 'Value'],
      ...(data?.sources || []).map((s) => [s.label, String(s.value)]),
      ['Total', String(total)],
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-breakdown-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="revenue-breakdown-title" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" aria-hidden />
          <span className="text-sm">Range</span>
          <div className="flex items-center gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={range === opt.key ? 'default' : 'ghost'}
                onClick={() => setRange(opt.key)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Donut + center KPI */}
        <article className="md:col-span-2">
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  isAnimationActive
                >
                  {chartData.map((entry, idx) => (
                    <Cell key={`slice-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold text-foreground">${total.toLocaleString()}</div>
            </div>
          </div>
          {/* Legend with toggles */}
          <ul className="mt-3 space-y-2">
            {(data?.sources || []).map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleKey(s.key)}
                  className="group inline-flex items-center gap-2 text-left"
                  aria-pressed={visibleKeys.has(s.key)}
                >
                  <span
                    className="h-3 w-3 rounded-sm ring-1 ring-border"
                    style={{ background: s.color, opacity: visibleKeys.has(s.key) ? 0.3 : 1 }}
                    aria-hidden
                  />
                  <span className="text-sm text-foreground">{s.label}</span>
                </button>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  ${s.value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </article>

        {/* Top sources bar */}
        <article className="md:col-span-3">
          <div className="h-64 bg-muted/20 rounded-md p-3">
            <RevenueSourcesBarChart data={(data?.sources || []).map((s) => ({ name: s.label, value: s.value, color: s.color }))} total={total} height={220} />
          </div>
        </article>
      </div>

      <Separator />
      <footer className="text-xs text-muted-foreground">
        Accurate sums from tenant rent, HAP, and fees with portfolio/date filters. Interactive legend to focus on specific sources.
      </footer>
    </section>
  );
};

export default RevenueBreakdownWidget;
