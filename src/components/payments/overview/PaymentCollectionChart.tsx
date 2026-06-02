import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface DailyCollection {
  date: string;
  amount: number;
  hapAmount: number;
  tenantAmount: number;
}

interface PaymentSource {
  name: string;
  value: number;
  color: string;
}

interface PaymentCollectionChartProps {
  dailyCollections: DailyCollection[];
  paymentSources: PaymentSource[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{data.name}</p>
        <p className="text-xs text-muted-foreground">${data.value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export const PaymentCollectionChart = ({
  dailyCollections,
  paymentSources,
  loading,
}: PaymentCollectionChartProps) => {
  // Filter to show only days with activity or sample days
  const filteredDaily = dailyCollections.filter((d, i) => 
    d.amount > 0 || i % 5 === 0
  ).slice(0, 15);

  const hasData = dailyCollections.some(d => d.amount > 0) || paymentSources.some(s => s.value > 0);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="animate-pulse">
          <CardContent className="p-6 h-64" />
        </Card>
        <Card className="animate-pulse">
          <CardContent className="p-6 h-64" />
        </Card>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Daily Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            No collection data for this period
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChartIcon className="h-5 w-5" />
              Payment Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            No payment source data
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Daily Collections Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Daily Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredDaily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={formatCurrency} 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="tenantAmount" 
                  stackId="a" 
                  fill="hsl(var(--primary))" 
                  name="Tenant"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="hapAmount" 
                  stackId="a" 
                  fill="hsl(var(--chart-2))" 
                  name="HAP"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Payment Sources Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChartIcon className="h-5 w-5" />
            Payment Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {paymentSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
