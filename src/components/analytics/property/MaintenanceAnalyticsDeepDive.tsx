import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Wrench, Clock, DollarSign, Users, AlertTriangle, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { useMaintenanceDashboard } from '@/hooks/useMaintenanceDashboard';

interface MaintenanceAnalyticsDeepDiveProps {
  portfolioId: string;
  currentUserId: string;
  properties: any[];
}

export const MaintenanceAnalyticsDeepDive: React.FC<MaintenanceAnalyticsDeepDiveProps> = ({
  portfolioId,
  currentUserId,
  properties
}) => {
  const { metrics: maintenanceData } = useMaintenanceDashboard(portfolioId === 'everything' ? undefined : portfolioId);

  // Mock data for demonstration - in real app, this would come from maintenance hooks
  const maintenanceCostsByProperty = properties.slice(0, 6).map(property => ({
    name: property.address.split(',')[0] || property.address,
    cost: Math.floor(Math.random() * 5000) + 1000,
    requests: Math.floor(Math.random() * 20) + 5,
    avgDays: Math.floor(Math.random() * 10) + 3
  }));

  const maintenanceByCategory = [
    { name: 'Plumbing', value: 35, cost: 8500 },
    { name: 'Electrical', value: 20, cost: 6200 },
    { name: 'HVAC', value: 25, cost: 9800 },
    { name: 'Appliances', value: 15, cost: 3400 },
    { name: 'Other', value: 5, cost: 1200 }
  ];

  const monthlyTrends = [
    { month: 'Jan', cost: 4200, requests: 15 },
    { month: 'Feb', cost: 3800, requests: 12 },
    { month: 'Mar', cost: 5100, requests: 18 },
    { month: 'Apr', cost: 4600, requests: 16 },
    { month: 'May', cost: 3900, requests: 14 },
    { month: 'Jun', cost: 4800, requests: 17 }
  ];

  const vendorPerformance = [
    { name: 'ABC Plumbing', rating: 4.8, jobs: 24, avgCost: 285, avgDays: 2.1 },
    { name: 'Elite HVAC', rating: 4.6, jobs: 18, avgCost: 420, avgDays: 3.2 },
    { name: 'Quick Fix Electric', rating: 4.9, jobs: 15, avgCost: 195, avgDays: 1.8 },
    { name: 'General Repairs Co', rating: 4.3, jobs: 32, avgCost: 165, avgDays: 2.5 }
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#fbbf24', '#f87171'];

  return (
    <div className="space-y-6">
      {/* Key Maintenance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Active Requests</p>
                <p className="text-2xl font-bold text-blue-900">
                  {maintenanceData?.pending_requests || 12}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Avg Resolution</p>
                <p className="text-2xl font-bold text-green-900">
                  {maintenanceData?.avg_completion_time || 3.2} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Monthly Cost</p>
                <p className="text-2xl font-bold text-purple-900">
                  ${(maintenanceData?.total_costs || 24800).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700">Active Vendors</p>
                <p className="text-2xl font-bold text-amber-900">
                  {maintenanceData?.active_vendors || 8}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Costs by Property */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-blue">Costs by Property</h3>
                <p className="text-sm text-navy-blue/70">Monthly maintenance spending</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={maintenanceCostsByProperty}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Maintenance by Category */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wrench className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-blue">Category Breakdown</h3>
                <p className="text-sm text-navy-blue/70">Requests by maintenance type</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={maintenanceByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {maintenanceByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-2">
                {maintenanceByCategory.map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{category.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-blue">Maintenance Trends</h3>
                <p className="text-sm text-navy-blue/70">Monthly cost and request volume</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar yAxisId="left" dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="requests" stroke="hsl(var(--secondary))" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Performance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-blue">Vendor Performance</h3>
              <p className="text-sm text-navy-blue/70">Performance metrics and ratings</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-medium text-navy-blue">Vendor</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Rating</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Jobs</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Avg Cost</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Avg Days</th>
                  <th className="text-center p-3 font-medium text-navy-blue">Performance</th>
                </tr>
              </thead>
              <tbody>
                {vendorPerformance.map((vendor) => (
                  <tr key={vendor.name} className="border-b border-gray-100">
                    <td className="p-3">
                      <span className="font-medium">{vendor.name}</span>
                    </td>
                    <td className="text-center p-3">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold">{vendor.rating}</span>
                        <span className="text-yellow-500">★</span>
                      </div>
                    </td>
                    <td className="text-center p-3">
                      <Badge variant="outline">{vendor.jobs}</Badge>
                    </td>
                    <td className="text-center p-3">
                      <span className="font-medium">${vendor.avgCost}</span>
                    </td>
                    <td className="text-center p-3">
                      <span className="font-medium">{vendor.avgDays}</span>
                    </td>
                    <td className="text-center p-3">
                      <div className="w-20 mx-auto">
                        <Progress value={vendor.rating * 20} className="h-2" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};