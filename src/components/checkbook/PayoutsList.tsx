import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Send,
  Truck,
  AlertCircle,
  RefreshCw,
  FileText,
  Building,
  Calendar
} from 'lucide-react';
import { useCheckbook } from '@/hooks/useCheckbook';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { format } from 'date-fns';
import { getPaymentMethodLabel, AVAILABLE_PAYMENT_METHODS } from '@/utils/paymentMethods';

interface Payout {
  id: string;
  status: string;
  payout_method: string;
  total_amount: number;
  recipient_details: {
    name: string;
    email?: string;
    address: {
      line1: string;
      city: string;
      state: string;
    };
  };
  checkbook_payout_id?: string;
  memo?: string;
  source_account_name?: string;
  due_date?: string;
  created_at: string;
  processed_at?: string;
  delivered_at?: string;
  sent_at?: string;
  failure_reason?: string;
  properties?: {
    address: string;
    monthly_rent: number;
  };
}

interface PayoutsListProps {
  userId: string;
  portfolioId?: string;
  refreshTrigger?: number;
}

export const PayoutsList = ({ userId, portfolioId, refreshTrigger }: PayoutsListProps) => {
  const { getPayouts, sendPayout, isLoading } = useCheckbook();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const fetchPayouts = async () => {
    const result = await getPayouts(userId, portfolioId);
    if (result.success) {
      const payoutsData = result.data || [];
      // Transform the data to match our interface
      const transformedPayouts = payoutsData.map((payout: any) => ({
        ...payout,
        recipient_details: typeof payout.recipient_details === 'string' 
          ? JSON.parse(payout.recipient_details)
          : payout.recipient_details
      }));
      setPayouts(transformedPayouts);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [userId, portfolioId, refreshTrigger]);

  useEffect(() => {
    let filtered = payouts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payout =>
        payout.recipient_details.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payout.checkbook_payout_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payout.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payout.memo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => payout.status === statusFilter);
    }

    // Method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(payout => payout.payout_method === methodFilter);
    }

    setFilteredPayouts(filtered);
  }, [payouts, searchTerm, statusFilter, methodFilter]);

  const handleSendPayout = async (payoutId: string) => {
    const result = await sendPayout(payoutId);
    if (result.success) {
      fetchPayouts(); // Refresh the list
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4 text-gray-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'sent':
        return <Send className="h-4 w-4 text-blue-600" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodDisplay = (method: string) => {
    return getPaymentMethodLabel(method as any);
  };

  const canSendPayout = (payout: Payout) => {
    return payout.status === 'draft';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Send Payments
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPayouts}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient, memo, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-background">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-background">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">All Methods</SelectItem>
                {AVAILABLE_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
                <SelectItem value="check">Mailed Check (Legacy)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Payouts Found</h3>
              <p className="text-muted-foreground">
                {payouts.length === 0
                  ? "You haven't created any payouts yet."
                  : "No payouts match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payout.recipient_details.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.recipient_details.address.city}, {payout.recipient_details.address.state}
                          </p>
                          {payout.memo && (
                            <p className="text-xs text-muted-foreground mt-1">{payout.memo}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <CurrencyDisplay amount={payout.total_amount} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{payout.source_account_name || 'Not set'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payout.due_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{format(new Date(payout.due_date), 'MMM d')}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getMethodDisplay(payout.payout_method)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payout.status)}
                          <Badge className={getStatusColor(payout.status)}>
                            {payout.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPayout(payout)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {canSendPayout(payout) && (
                            <Button
                              size="sm"
                              onClick={() => handleSendPayout(payout.id)}
                              disabled={isLoading}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send ePay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Details Modal */}
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Payout Details
            </DialogTitle>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Payout Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">
                        <CurrencyDisplay amount={selectedPayout.total_amount} />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method:</span>
                      <Badge variant="outline">
                        {getMethodDisplay(selectedPayout.payout_method)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedPayout.status)}
                        <Badge className={getStatusColor(selectedPayout.status)}>
                          {selectedPayout.status}
                        </Badge>
                      </div>
                    </div>
                    {selectedPayout.source_account_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account:</span>
                        <span className="text-sm">{selectedPayout.source_account_name}</span>
                      </div>
                    )}
                    {selectedPayout.checkbook_payout_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Checkbook ID:</span>
                        <code className="text-xs bg-muted px-1 rounded">
                          {selectedPayout.checkbook_payout_id}
                        </code>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recipient</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">{selectedPayout.recipient_details.name}</p>
                    {selectedPayout.recipient_details.email && (
                      <p className="text-sm text-muted-foreground">
                        {selectedPayout.recipient_details.email}
                      </p>
                    )}
                    <div className="pt-2 border-t text-sm">
                      <p>{selectedPayout.recipient_details.address.line1}</p>
                      <p>
                        {selectedPayout.recipient_details.address.city}, {selectedPayout.recipient_details.address.state}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedPayout.memo && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Memo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedPayout.memo}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <span className="text-sm">
                      {format(new Date(selectedPayout.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  {selectedPayout.due_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Due Date:</span>
                      <span className="text-sm">
                        {format(new Date(selectedPayout.due_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {selectedPayout.sent_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sent:</span>
                      <span className="text-sm">
                        {format(new Date(selectedPayout.sent_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  )}
                  {selectedPayout.processed_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Processed:</span>
                      <span className="text-sm">
                        {format(new Date(selectedPayout.processed_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  )}
                  {selectedPayout.delivered_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Delivered:</span>
                      <span className="text-sm">
                        {format(new Date(selectedPayout.delivered_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  )}
                  {selectedPayout.failure_reason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-900">Failure Reason:</p>
                      <p className="text-sm text-red-800 mt-1">{selectedPayout.failure_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};