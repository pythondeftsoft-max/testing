import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { WorkerTimeEntry } from '@/hooks/useWorkerTimeEntries';
import { Button } from '@/components/ui/button';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(340, 70%, 55%)',
  'hsl(270, 60%, 55%)',
];

interface TimePieChartProps {
  entries: WorkerTimeEntry[];
}

function calcHours(entry: WorkerTimeEntry): number {
  if (!entry.clock_out) return 0;
  return (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000;
}

export function TimePieChart({ entries }: TimePieChartProps) {
  const [view, setView] = useState<'worker' | 'weekday'>('worker');

  const data = view === 'worker'
    ? Object.entries(
        entries.reduce<Record<string, number>>((acc, e) => {
          const name = e.worker_name || 'Unknown';
          acc[name] = (acc[name] || 0) + calcHours(e);
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
    : (() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const acc: Record<string, number> = {};
        days.forEach(d => (acc[d] = 0));
        entries.forEach(e => {
          const day = days[new Date(e.clock_in).getDay()];
          acc[day] += calcHours(e);
        });
        return days.map(d => ({ name: d, value: Math.round(acc[d] * 10) / 10 })).filter(d => d.value > 0);
      })();

  return (
    <div>
      <div className="flex gap-1 mb-3">
        <Button size="sm" variant={view === 'worker' ? 'default' : 'outline'} onClick={() => setView('worker')}>
          By Worker
        </Button>
        <Button size="sm" variant={view === 'weekday' ? 'default' : 'outline'} onClick={() => setView('weekday')}>
          By Weekday
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data this month</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}h`} labelLine={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `${v}h`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
