import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Receipt, TrendingUp, Award, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVendorPaymentAnalytics } from '@/hooks/useVendorPaymentAnalytics';
import { format } from 'date-fns';
import MaintenanceRequestDetailModal from './MaintenanceRequestDetailModal';

interface VendorPaymentAnalyticsProps {
  userId: string;
  portfolioId?: string;
}

const VendorPaymentAnalytics: React.FC<VendorPaymentAnalyticsProps> = ({ userId, portfolioId }) => {
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const { data, isLoading, error } = useVendorPaymentAnalytics(userId, portfolioId);

  const filteredPayments = useMemo(() => {
    if (!data?.payments) return [];
    if (selectedVendor === 'all') return data.payments;
    return data.payments.filter(p => 
      (p.vendor_name || p.recipient_name) === selectedVendor
    );
  }, [data?.payments, selectedVendor]);

  const filteredStats = useMemo(() => {
    if (selectedVendor === 'all') {
      return {
        totalSpend: data?.totalSpend || 0,
        paymentCount: data?.paymentCount || 0,
        avgCost: data?.avgCostPerRequest || 0,
      };
    }
    const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      totalSpend: total,
      paymentCount: filteredPayments.length,
      avgCost: filteredPayments.length > 0 ? total / filteredPayments.length : 0,
    };
  }, [selectedVendor, filteredPayments, data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Error loading vendor payment data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Vendor:</label>
        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {data?.vendors.map(v => (
              <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold">${filteredStats.totalSpend.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Receipt className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground"># Payments</p>
                <p className="text-2xl font-bold">{filteredStats.paymentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Award className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Vendor</p>
                <p className="text-lg font-bold truncate max-w-[150px]">
                  {data?.topVendor || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Cost/Request</p>
                <p className="text-2xl font-bold">${filteredStats.avgCost.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendor payments recorded yet
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.paid_at 
                          ? format(new Date(payment.paid_at), 'MMM d, yyyy')
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {payment.request_title || (
                          <span className="text-muted-foreground italic">Manual Entry</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.property_address || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {payment.vendor_name || payment.recipient_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {payment.maintenance_request_id && payment.request_status ? (
                          <Badge variant={payment.request_status === 'completed' ? 'default' : 'secondary'}>
                            {payment.request_status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.maintenance_request_id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequestId(payment.maintenance_request_id)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <MaintenanceRequestDetailModal
        requestId={selectedRequestId}
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
      />
    </div>
  );
};

export default VendorPaymentAnalytics;
