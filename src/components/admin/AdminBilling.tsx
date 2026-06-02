import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  MoreHorizontal, 
  ExternalLink, 
  RefreshCw, 
  CreditCard,
  XCircle,
  AlertTriangle,
  FileText,
  Settings,
  UserPlus,
  Check,
  X,
  Users,
  Building,
  UserCheck,
  Layers
} from 'lucide-react';
import { 
  useAdminSubscriptions, 
  useAdminCustomerPortal, 
  useAdminSyncSubscription, 
  useAdminCancelSubscription,
  useAdminInvoices,
  type AdminSubscription 
} from '@/hooks/useAdminBilling';
import { useAdminCancelManualSubscription } from '@/hooks/useAdminSubscriptionManagement';
import { UserManagementDrawer } from './UserManagementDrawer';
import UserSearchAutocomplete from './UserSearchAutocomplete';
import type { AdminUserSearchResult } from '@/hooks/useAdminUserSearch';
import { useComprehensiveAdminMetrics } from '@/hooks/useComprehensiveAdminMetrics';
import { MetricDisplay } from '@/components/ui/metric-display';
import { useSubscriptionRevenueByRole } from '@/hooks/useSubscriptionRevenueByRole';

const StatusBadge = ({ status }: { status: string }) => {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'canceled':
      case 'cancelled':
        return 'secondary';
      case 'past_due':
        return 'destructive';
      case 'unpaid':
        return 'destructive';
      case 'incomplete':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Badge variant={getVariant(status)}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};

const InvoicesPanel = ({ customerId }: { customerId: string }) => {
  const { data, isLoading } = useAdminInvoices(customerId);

  if (isLoading) {
    return <div className="p-4">Loading invoices...</div>;
  }

  const invoices = data?.invoices || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Invoices</h3>
      {invoices.length === 0 ? (
        <p className="text-muted-foreground">No invoices found</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{invoice.number || invoice.id}</span>
                  <StatusBadge status={invoice.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  ${(invoice.amount_due / 100).toFixed(2)} {invoice.currency.toUpperCase()} • 
                  Created: {new Date(invoice.created * 1000).toLocaleDateString()}
                </p>
              </div>
              {invoice.hosted_invoice_url && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminBilling = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscription | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [managementDrawerOpen, setManagementDrawerOpen] = useState(false);
  const [managedUser, setManagedUser] = useState<AdminSubscription | null>(null);
  const [userSearchDialogOpen, setUserSearchDialogOpen] = useState(false);

  const { 
    data: subscriptions = [], 
    isLoading,
    refetch 
  } = useAdminSubscriptions(search, roleFilter);
  
  const { data: metrics, isLoading: metricsLoading } = useComprehensiveAdminMetrics();
  const { data: revenueByRole, isLoading: revenueLoading } = useSubscriptionRevenueByRole();
  
  const customerPortalMutation = useAdminCustomerPortal();
  const syncMutation = useAdminSyncSubscription();
  const cancelMutation = useAdminCancelSubscription();
  const cancelManualMutation = useAdminCancelManualSubscription();

  const handleCustomerPortal = (customerId: string) => {
    customerPortalMutation.mutate(customerId);
  };

  const handleSync = (customerId: string) => {
    syncMutation.mutate(customerId);
  };

  const handleCancelSubscription = () => {
    if (!selectedSubscription) return;
    
    if (selectedSubscription.stripe_subscription_id) {
      // Cancel Stripe subscription
      cancelMutation.mutate({
        subscriptionId: selectedSubscription.stripe_subscription_id,
        cancelImmediately
      });
    } else {
      // Cancel manual subscription
      cancelManualMutation.mutate(selectedSubscription.id);
    }
    setCancelDialogOpen(false);
    setSelectedSubscription(null);
  };

  const handleUserSearch = (user: AdminUserSearchResult) => {
    // Convert search result to AdminSubscription format for drawer
    const mockSubscription: AdminSubscription = {
      id: '', // No subscription ID yet
      user_id: user.id,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      plan_type: null,
      status: 'none',
      role: user.user_type as any,
      current_period_end: null,
      user_name: `${user.first_name} ${user.last_name}`,
      created_at: new Date().toISOString(),
      date_subscribed: new Date().toISOString(),
      subscription_units: null,
      autopay_enabled: null,
      last_payment_amount: null,
      last_payment_date: null,
    };
    
    setManagedUser(mockSubscription);
    setManagementDrawerOpen(true);
    setUserSearchDialogOpen(false);
  };

  if (isLoading) {
    return <div className="p-6">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Subscriptions Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setUserSearchDialogOpen(true)} variant="default">
            <UserPlus className="h-4 w-4 mr-2" />
            Quick Manage User
          </Button>
        </CardContent>
      </Card>

      {/* Subscription KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricDisplay
          label="Tenant Subscriptions"
          value={metrics?.subscriptions.by_role?.tenant || 0}
          subtitle={revenueByRole?.tenant.revenue 
            ? `$${revenueByRole.tenant.revenue.toFixed(2)} MRR`
            : '$0.00 MRR'
          }
          icon={<Users className="h-4 w-4" />}
          isLoading={metricsLoading || revenueLoading}
        />
        <MetricDisplay
          label="Landlord Subscriptions"
          value={metrics?.subscriptions.by_role?.landlord || 0}
          subtitle={revenueByRole?.landlord.revenue 
            ? `$${revenueByRole.landlord.revenue.toFixed(2)} MRR`
            : '$0.00 MRR'
          }
          icon={<Building className="h-4 w-4" />}
          isLoading={metricsLoading || revenueLoading}
        />
        <MetricDisplay
          label="Subscribed Users"
          value={metrics?.subscriptions.subscribed_users || 0}
          subtitle={revenueByRole?.total.revenue 
            ? `$${revenueByRole.total.revenue.toFixed(2)} MRR`
            : '$0.00 MRR'
          }
          icon={<UserCheck className="h-4 w-4" />}
          isLoading={metricsLoading || revenueLoading}
        />
        <MetricDisplay
          label="Total Properties/Units"
          value={metrics?.subscriptions.active_units || 0}
          icon={<Layers className="h-4 w-4" />}
          isLoading={metricsLoading}
        />
      </div>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, customer ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="landlord">Landlord</SelectItem>
                <SelectItem value="white_label">White Label</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Subscribed</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead>Autopay</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subscription.user_name || 'Unknown User'}</div>
                      {subscription.is_white_label && subscription.white_label_domain && (
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {subscription.white_label_domain}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {subscription.is_white_label ? (
                      <Badge variant="default" className="bg-purple-600">
                        <Layers className="h-3 w-3 mr-1" />
                        White Label
                      </Badge>
                    ) : (
                      <Badge variant="outline">{subscription.role || 'N/A'}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{subscription.plan_type || 'N/A'}</TableCell>
                  <TableCell>
                    <StatusBadge status={subscription.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {subscription.date_subscribed 
                      ? new Date(subscription.date_subscribed).toLocaleDateString()
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell className="text-center">
                    {subscription.subscription_units || '—'}
                  </TableCell>
                  <TableCell>
                    {subscription.autopay_enabled ? (
                      <Badge variant="success" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        <X className="h-3 w-3 mr-1" />
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {subscription.last_payment_amount && subscription.last_payment_date ? (
                      <div className="text-sm">
                        <div className="font-medium">
                          ${(subscription.last_payment_amount / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(subscription.last_payment_date).toLocaleDateString()}
                        </div>
                      </div>
                    ) : subscription.monthly_cost ? (
                      <div className="text-sm">
                        <div className="font-medium">${subscription.monthly_cost}/mo</div>
                        <div className="text-xs text-muted-foreground">Monthly cost</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No payments</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {subscription.stripe_customer_id?.slice(-8) || 'N/A'}
                    </code>
                  </TableCell>
                  <TableCell>
                    {subscription.current_period_end 
                      ? new Date(subscription.current_period_end).toLocaleDateString()
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            setManagedUser(subscription);
                            setManagementDrawerOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Manage User
                        </DropdownMenuItem>
                        {subscription.stripe_customer_id && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => handleCustomerPortal(subscription.stripe_customer_id!)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Customer Portal
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSync(subscription.stripe_customer_id!)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync from Stripe
                            </DropdownMenuItem>
                          </>
                        )}
                        {subscription.status === 'active' && (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setCancelDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Subscription
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {subscriptions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No subscriptions found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Panel for Selected Customer */}
      {selectedSubscription?.stripe_customer_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoices for {selectedSubscription.user_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvoicesPanel customerId={selectedSubscription.stripe_customer_id} />
          </CardContent>
        </Card>
      )}


      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription for {selectedSubscription?.user_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={cancelImmediately}
                onChange={(e) => setCancelImmediately(e.target.checked)}
              />
              <span className="text-sm">Cancel immediately (otherwise cancels at period end)</span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelImmediately ? 'Cancel Now' : 'Schedule Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Search Dialog */}
      <Dialog open={userSearchDialogOpen} onOpenChange={setUserSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Manage User</DialogTitle>
            <DialogDescription>
              Search for any user to manage their subscription and application credits, even if they don't currently have a subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UserSearchAutocomplete 
              onUserSelect={handleUserSearch}
              placeholder="Search by name or email..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserSearchDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Management Drawer */}
      <UserManagementDrawer 
        open={managementDrawerOpen}
        onOpenChange={(open) => {
          setManagementDrawerOpen(open);
          if (!open) {
            // Refetch data when drawer closes to show updated info
            refetch();
          }
        }}
        subscription={managedUser}
      />
    </div>
  );
};