import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart as PieChartIcon, BarChart3, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AssetAllocationChartProps {
  data: Record<string, number>;
  isLoading?: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(25, 70%, 50%)',
  'hsl(140, 70%, 50%)',
  'hsl(200, 70%, 50%)',
  'hsl(320, 70%, 50%)',
];

export const AssetAllocationChart = ({ data, isLoading }: AssetAllocationChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-muted-foreground">Loading allocation data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No allocation data available</p>
            <p className="text-sm">Add assets to see allocation breakdown</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for charts
  const chartData = Object.entries(data).map(([name, value], index) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[index % COLORS.length],
    percentage: (value / Object.values(data).reduce((a, b) => a + b, 0)) * 100
  })).sort((a, b) => b.value - a.value);

  const totalValue = Object.values(data).reduce((a, b) => a + b, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Asset Allocation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {formatCurrency(totalValue)}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pie" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pie" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Pie Chart
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Bar Chart
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pie" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {chartData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium">{entry.name}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {entry.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="bar" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => formatCurrency(value)}
                    className="text-xs"
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    width={80}
                    className="text-xs"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};