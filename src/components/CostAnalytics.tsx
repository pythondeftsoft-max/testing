
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Calendar, User } from 'lucide-react';
import { MaintenanceCost } from '@/hooks/useMaintenanceCosts';
import { formatCurrency } from '@/lib/formatters';

interface CostAnalyticsProps {
  costs: MaintenanceCost[];
}

const CostAnalytics = ({ costs }: CostAnalyticsProps) => {
  // Cost by type data
  const costsByType = costs.reduce((acc, cost) => {
    const type = cost.cost_type.replace('_', ' ');
    const existingType = acc.find(item => item.name === type);
    if (existingType) {
      existingType.value += cost.total_cost;
    } else {
      acc.push({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: cost.total_cost
      });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Monthly cost trends
  const monthlyData = costs.reduce((acc, cost) => {
    const month = new Date(cost.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const existingMonth = acc.find(item => item.month === month);
    if (existingMonth) {
      existingMonth.amount += cost.total_cost;
      existingMonth.count += 1;
    } else {
      acc.push({
        month,
        amount: cost.total_cost,
        count: 1
      });
    }
    return acc;
  }, [] as { month: string; amount: number; count: number }[]);

  // Sort monthly data chronologically
  monthlyData.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Calculate averages
  const totalCosts = costs.reduce((sum, cost) => sum + cost.total_cost, 0);
  const averageCostPerEntry = costs.length > 0 ? totalCosts / costs.length : 0;
  const approvedCosts = costs.filter(cost => cost.approved_at);
  const approvalRate = costs.length > 0 ? (approvedCosts.length / costs.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalCosts)}</div>
                <div className="text-sm text-gray-600">{costs.length} entries</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{formatCurrency(averageCostPerEntry)}</div>
                <div className="text-sm text-gray-600">per entry</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{approvalRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">approved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    costs
                      .filter(cost => {
                        const costDate = new Date(cost.created_at);
                        const now = new Date();
                        return costDate.getMonth() === now.getMonth() && costDate.getFullYear() === now.getFullYear();
                      })
                      .reduce((sum, cost) => sum + cost.total_cost, 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">current month</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {costsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cost Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Type Breakdown Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {costsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostAnalytics;
