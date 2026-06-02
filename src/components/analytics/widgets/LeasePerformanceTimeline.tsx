import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeasePerformanceTimelineProps {
  landlordId: string;
  portfolioId?: string;
}

export const LeasePerformanceTimeline: React.FC<LeasePerformanceTimelineProps> = ({
  landlordId,
  portfolioId
}) => {
  // Mock data for lease performance timeline
  const timelineData = [
    { month: 'Jan', renewals: 12, newLeases: 8, expirations: 5, avgRent: 1850 },
    { month: 'Feb', renewals: 15, newLeases: 6, expirations: 3, avgRent: 1875 },
    { month: 'Mar', renewals: 18, newLeases: 10, expirations: 7, avgRent: 1900 },
    { month: 'Apr', renewals: 14, newLeases: 12, expirations: 4, avgRent: 1925 },
    { month: 'May', renewals: 16, newLeases: 9, expirations: 6, avgRent: 1950 },
    { month: 'Jun', renewals: 20, newLeases: 7, expirations: 2, avgRent: 1975 },
  ];

  const renewalRate = 82.5; // Percentage
  const avgLeaseLength = 14.2; // Months

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Lease Performance Timeline</CardTitle>
              <CardDescription>Track lease performance metrics and renewal decisions over time</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">6M Trend</Badge>
        </div>
      </CardHeader>
      <CardContent>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-primary">{renewalRate}%</div>
            <div className="text-sm text-muted-foreground">Renewal Rate</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-primary">{avgLeaseLength}</div>
            <div className="text-sm text-muted-foreground">Avg Lease Length (mo)</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
              <TrendingUp className="h-5 w-5 text-green-600" />
              $1,975
            </div>
            <div className="text-sm text-muted-foreground">Current Avg Rent</div>
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  value,
                  name === 'renewals' ? 'Renewals' :
                  name === 'newLeases' ? 'New Leases' : 'Expirations'
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Bar dataKey="renewals" stackId="a" fill="hsl(var(--primary))" name="renewals" />
              <Bar dataKey="newLeases" stackId="a" fill="hsl(var(--chart-2))" name="newLeases" />
              <Bar dataKey="expirations" stackId="a" fill="hsl(var(--destructive))" name="expirations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Insights */}
        <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-blue-900">Performance Insight</div>
            <div className="text-blue-700">
              Renewal rates have improved by 12% over the last quarter. June shows the strongest performance 
              with 20 renewals and minimal expirations.
            </div>
          </div>
        </div>
      </div>
      </CardContent>
    </Card>
  );
};