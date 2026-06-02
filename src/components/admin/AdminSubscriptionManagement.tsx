import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreVertical, Search, CreditCard, Users, DollarSign, TrendingUp, Building2, TableProperties } from 'lucide-react';
import { useAdminSubscriptions } from '@/hooks/useAdminBilling';
import { useSubscriptionPricing } from '@/hooks/useSubscriptionPricing';
import { useSubscriptionUsageMetrics } from '@/hooks/useSubscriptionUsageMetrics';
import { SubscriptionStatusBadge } from './subscriptions/SubscriptionStatusBadge';
import { AutopayIndicator } from './subscriptions/AutopayIndicator';
import { UsageMetrics } from './subscriptions/UsageMetrics';
import { PaymentHistory } from './PaymentHistory';
import FeatureMatrix from './FeatureMatrix';
import { format } from 'date-fns';

interface SubscriptionRowProps {
  subscription: any;
}

const SubscriptionRow = ({ subscription }: SubscriptionRowProps) => {
  const pricing = useSubscriptionPricing(subscription.plan_type, subscription.subscription_units);
  const usage = useSubscriptionUsageMetrics(subscription.user_id, subscription.role || 'unknown');
  
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{subscription.user_name || 'Unknown'}</div>
          <div className="text-sm text-muted-foreground">{subscription.user_email}</div>
          <Badge variant="outline" className="mt-1 text-xs">
            {subscription.role || 'unknown'}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {subscription.plan_type || 'Free'}
        </Badge>
      </TableCell>
      <TableCell>
        <SubscriptionStatusBadge status={subscription.status} />
      </TableCell>
      <TableCell className="font-medium">
        {pricing.formattedPrice}
      </TableCell>
      <TableCell>
        <AutopayIndicator enabled={subscription.autopay_enabled || false} />
      </TableCell>
      <TableCell>
        <UsageMetrics 
          role={subscription.role || 'unknown'}
          propertyCount={usage.propertyCount}
          applicationCount={usage.applicationCount}
          isLoading={usage.isLoading}
        />
      </TableCell>
      <TableCell>
        {subscription.current_period_end 
          ? format(new Date(subscription.current_period_end), 'MMM d, yyyy')
          : 'N/A'}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            {subscription.stripe_customer_id && (
              <DropdownMenuItem>Manage in Stripe</DropdownMenuItem>
            )}
            <DropdownMenuItem>Grant/Adjust Subscription</DropdownMenuItem>
            <DropdownMenuItem>View Invoices</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

interface AdminSubscriptionManagementProps {
  filterPlanType?: string;
}

export const AdminSubscriptionManagement = ({ filterPlanType }: AdminSubscriptionManagementProps = {}) => {
  const [activeTab, setActiveTab] = useState<string>('landlord');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('landlord');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>(filterPlanType || 'all');
  const [autopayFilter, setAutopayFilter] = useState<string>('all');

  // Handle tab changes and sync with role filter
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'tenant') {
      setRoleFilter('tenant');
    } else if (tab === 'landlord') {
      setRoleFilter('landlord');
    } else {
      setRoleFilter('all');
    }
  };

  const { data: subscriptions, isLoading } = useAdminSubscriptions(searchQuery, roleFilter === 'all' ? undefined : roleFilter);

  // Calculate metrics
  const totalSubscriptions = subscriptions?.length || 0;
  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
  const autopayEnabled = subscriptions?.filter(s => s.autopay_enabled).length || 0;
  const autopayRate = totalSubscriptions > 0 ? Math.round((autopayEnabled / totalSubscriptions) * 100) : 0;
  
  // Calculate total revenue
  const totalRevenue = subscriptions?.reduce((sum, sub) => {
    const pricing = useSubscriptionPricing(sub.plan_type, sub.subscription_units);
    return sum + pricing.totalPrice;
  }, 0) || 0;

  // Apply filters
  const filteredSubscriptions = subscriptions?.filter(sub => {
    if (roleFilter !== 'all' && sub.role !== roleFilter) return false;
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    if (planFilter !== 'all' && sub.plan_type?.toLowerCase() !== planFilter) return false;
    if (autopayFilter !== 'all') {
      const hasAutopay = sub.autopay_enabled || false;
      if (autopayFilter === 'enabled' && !hasAutopay) return false;
      if (autopayFilter === 'disabled' && hasAutopay) return false;
    }
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">
          Manage all user subscriptions, pricing, and usage metrics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="tenant" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tenant Plans
          </TabsTrigger>
          <TabsTrigger value="landlord" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Landlord Plans
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment History
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <TableProperties className="h-4 w-4" />
            Feature Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="mt-6 space-y-6">
          {/* Tenant Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSubscriptions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeSubscriptions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Autopay Rate</CardTitle>
                <CreditCard className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{autopayRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {autopayEnabled} of {totalSubscriptions} users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Subscriptions</CardTitle>
              <CardDescription>Search and filter by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={autopayFilter} onValueChange={setAutopayFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Autopay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Autopay</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Subscriptions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Subscriptions ({filteredSubscriptions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tenant subscriptions found matching your filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Autopay</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <SubscriptionRow key={subscription.id} subscription={subscription} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="landlord" className="mt-6 space-y-6">
          {/* Landlord Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSubscriptions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeSubscriptions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Autopay Rate</CardTitle>
                <CreditCard className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{autopayRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {autopayEnabled} of {totalSubscriptions} users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Subscriptions</CardTitle>
              <CardDescription>Search and filter by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={autopayFilter} onValueChange={setAutopayFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Autopay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Autopay</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Landlord Subscriptions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Landlord Subscriptions ({filteredSubscriptions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No landlord subscriptions found matching your filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Autopay</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <SubscriptionRow key={subscription.id} subscription={subscription} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentHistory />
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <FeatureMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
};
