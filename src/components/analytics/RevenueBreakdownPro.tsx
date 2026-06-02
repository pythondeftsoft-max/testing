import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Clock, PieChart as PieChartIcon, TrendingUp, BarChart } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAdvancedRevenueBreakdown, AdvancedRevenueRange } from '@/hooks/useAdvancedRevenueBreakdown';
import { RevenueSourcesBarChart } from '@/components/charts/RevenueSourcesBarChart';

interface Props { landlordId: string; portfolioId?: string }

const RANGE_OPTIONS: { key: AdvancedRevenueRange; label: string }[] = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'ytd', label: 'YTD' },
  { key: '12m', label: '12m' },
];

const RevenueBreakdownPro: React.FC<Props> = ({ landlordId, portfolioId }) => {
  const [range, setRange] = useState<AdvancedRevenueRange>('90d');
  const { data, isLoading } = useAdvancedRevenueBreakdown(landlordId, portfolioId, range);

  const pieData = useMemo(() => (data?.bySource || []).map(s => ({ name: s.label, value: s.value, color: s.color, key: s.key })), [data]);
  const areaData = useMemo(() => (data?.trendByMonth || []).map(m => ({
    ...m,
    monthLabel: new Date(m.month).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
  })), [data]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Source', 'Amount'],
      ...data.bySource.map(s => [s.label, s.value.toFixed(2)]),
      ['Total', data.total.toFixed(2)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-breakdown-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Range</span>
          <div className="flex items-center gap-1">
            {RANGE_OPTIONS.map(opt => (
              <Button
                key={opt.key}
                size="sm"
                variant={opt.key === range ? 'default' : 'outline'}
                className="h-7 px-2"
                onClick={() => setRange(opt.key)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2 border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </header>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Donut */}
        <CardEnhanced variant="elevated" className="card-hover-gold">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue text-base">
              <PieChartIcon className="h-4 w-4" />
              Revenue Sources
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="h-48">
              {isLoading ? (
                <div className="h-full w-full animate-pulse bg-muted/20 rounded-md" />
              ) : pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No revenue in selected range</div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Revenue</div>
                <div className="text-lg font-semibold text-openkey-blue">${(data?.total || 0).toLocaleString()}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {pieData.slice(0, 4).map(s => (
                  <div key={s.key} className="flex items-center gap-1 text-xs">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        {/* Trend */}
        <CardEnhanced variant="elevated" className="card-hover-gold">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue text-base">
              <TrendingUp className="h-4 w-4" />
              Revenue Trend
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="h-48">
              {isLoading ? (
                <div className="h-full w-full animate-pulse bg-muted/20 rounded-md" />
              ) : areaData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No trend data in selected range</div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={areaData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--openkey-blue))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--openkey-blue))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="hap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--openkey-gold))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--openkey-gold))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="monthLabel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${v/1000}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                    <Area type="monotone" dataKey="tenant_rent" stroke="hsl(var(--openkey-blue))" fill="url(#rent)" strokeWidth={2} />
                    <Area type="monotone" dataKey="hap_payments" stroke="hsl(var(--openkey-gold))" fill="url(#hap)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>

      {/* Top sources bar chart */}
      <CardEnhanced variant="elevated" className="card-hover-gold mt-4">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue text-base">
            <BarChart className="h-4 w-4" />
            Top Sources
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-48">
            {isLoading ? (
              <div className="h-full w-full animate-pulse bg-muted/20 rounded-md" />
            ) : ( 
              <RevenueSourcesBarChart data={(data?.bySource || []).map(s => ({ name: s.label, value: s.value, color: s.color }))} total={data?.total || 0} />
            )}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      <Separator />
      <footer className="text-xs text-muted-foreground">
        Accurate monthly aggregation from tenant rent, HAP, and fees with portfolio/date filters. Interactive, exportable.
      </footer>
    </section>
  );
};

export default RevenueBreakdownPro;
