
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, User, Wrench, DollarSign, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { MaintenanceCost } from '@/hooks/useMaintenanceCosts';
import { formatCurrency } from '@/lib/formatters';

interface CostOverviewDashboardProps {
  costs: MaintenanceCost[];
}

const CostOverviewDashboard = ({ costs }: CostOverviewDashboardProps) => {
  // Recent costs (last 10)
  const recentCosts = costs.slice(0, 10);

  // Costs by status
  const approvedCosts = costs.filter(cost => cost.approved_at).length;
  const pendingCosts = costs.filter(cost => !cost.approved_at).length;

  // Monthly summary (current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTotal = costs
    .filter(cost => {
      const costDate = new Date(cost.created_at);
      return costDate.getMonth() === currentMonth && costDate.getFullYear() === currentYear;
    })
    .reduce((sum, cost) => sum + cost.total_cost, 0);

  const getCostTypeIcon = (type: string) => {
    switch (type) {
      case 'labor': return <User className="h-4 w-4" />;
      case 'materials': return <Wrench className="h-4 w-4" />;
      case 'equipment': return <Wrench className="h-4 w-4" />;
      case 'permits': return <Receipt className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (cost: MaintenanceCost) => {
    if (cost.approved_at) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{formatCurrency(monthlyTotal)}</div>
                <div className="text-sm text-gray-600">
                  {costs.filter(cost => {
                    const costDate = new Date(cost.created_at);
                    return costDate.getMonth() === currentMonth && costDate.getFullYear() === currentYear;
                  }).length} entries
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <div className="text-2xl font-bold">{approvedCosts}</div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(costs.filter(cost => cost.approved_at).reduce((sum, cost) => sum + cost.total_cost, 0))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-yellow-600 rounded-full"></div>
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingCosts}</div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(costs.filter(cost => !cost.approved_at).reduce((sum, cost) => sum + cost.total_cost, 0))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Costs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Costs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCosts.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No maintenance costs recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(cost.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{cost.description}</div>
                      <div className="text-sm text-gray-600">
                        Qty: {cost.quantity} × {formatCurrency(cost.unit_cost)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getCostTypeIcon(cost.cost_type)}
                        <span className="capitalize">{cost.cost_type.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{formatCurrency(cost.total_cost)}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostOverviewDashboard;
