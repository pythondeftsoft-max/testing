import React from 'react';
import { 
  Building, Users, DollarSign, TrendingUp, RefreshCw, Activity, 
  CreditCard, Calculator, Gauge, Shield, UserCheck, Home, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import EnhancedMetricCard from '@/components/EnhancedMetricCard';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { LoadingSpinner } from '@/components/ui/spinner';

const AdminAnalyticsDashboard = () => {
  const { data: adminData, isLoading, error, refetch } = useAdminAnalytics();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-openkey-blue mb-2">Loading System Analytics...</h3>
          <p className="text-muted-foreground">Aggregating platform-wide data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Unable to Load Analytics</h3>
          <p className="text-muted-foreground mb-4">There was an error loading the system analytics.</p>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">System-Wide Analytics</h2>
            <p className="text-white/90">Platform performance and operational insights</p>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="bg-card text-foreground border-border"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <EnhancedMetricCard
          title="Total Properties"
          value={adminData?.totalProperties?.toString() || "0"}
          icon={Building}
          iconColor="text-blue-600"
          subtitle={`${adminData?.occupiedUnits || 0} occupied units`}
        />
        
        <EnhancedMetricCard
          title="Active Landlords"
          value={adminData?.totalLandlords?.toString() || "0"}
          icon={UserCheck}
          iconColor="text-green-600"
          subtitle="Property owners"
        />
        
        <EnhancedMetricCard
          title="Registered Tenants"
          value={adminData?.totalTenants?.toString() || "0"}
          icon={Users}
          iconColor="text-purple-600"
          subtitle="Platform users"
        />
        
        <EnhancedMetricCard
          title="System Occupancy"
          value={`${adminData?.occupancyRate?.toFixed(1) || "0"}%`}
          icon={Home}
          iconColor="text-blue-600"
          percentage={adminData?.occupancyRate}
          isPositive={adminData ? adminData.occupancyRate > 90 : undefined}
        />
        
        <EnhancedMetricCard
          title="Platform Health"
          value={`${adminData?.portfolioHealthScore?.toFixed(0) || "0"}%`}
          icon={Gauge}
          iconColor="text-emerald-600"
          percentage={adminData?.portfolioHealthScore}
          isPositive={adminData ? adminData.portfolioHealthScore > 75 : undefined}
        />
      </div>

      {/* Financial Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedMetricCard
          title="Total Monthly Revenue"
          value={`$${adminData?.grossRevenue?.toLocaleString() || "0"}`}
          icon={DollarSign}
          iconColor="text-green-600"
          subtitle="System-wide"
        />
        
        <EnhancedMetricCard
          title="Collection Rate"
          value={`${adminData?.collectionRate?.toFixed(1) || "0"}%`}
          icon={CreditCard}
          iconColor="text-blue-600"
          percentage={adminData?.collectionRate}
          isPositive={adminData ? adminData.collectionRate > 95 : undefined}
        />
        
        <EnhancedMetricCard
          title="Net Operating Income"
          value={`$${adminData?.netOperatingIncome?.toLocaleString() || "0"}`}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          percentage={adminData ? 
            ((adminData.netOperatingIncome / (adminData.grossRevenue || 1)) * 100) : undefined
          }
          isPositive={adminData ? adminData.netOperatingIncome > 0 : undefined}
        />
        
        <EnhancedMetricCard
          title="Open Maintenance"
          value={adminData?.maintenanceRequestsOpen?.toString() || "0"}
          icon={Activity}
          iconColor="text-orange-600"
          subtitle="Active requests"
        />
      </div>

      {/* Detailed Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Breakdown */}
        <CardEnhanced variant="command" className="command-card">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="flex items-center gap-2 text-blue-600">
              <Calculator className="h-5 w-5" />
              Financial Overview
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gross Rent Roll</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${adminData?.totalGrossRent?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Collected Rent</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ${adminData?.totalCollectedRent?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Total Revenue</span>
                  <span className="font-medium">${adminData?.grossRevenue?.toLocaleString() || "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Total Expenses</span>
                  <span className="font-medium text-red-600">
                    -${adminData?.totalExpenses?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Net Operating Income</span>
                  <span className={`font-bold text-lg ${
                    adminData && adminData.netOperatingIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${adminData?.netOperatingIncome?.toLocaleString() || "0"}
                  </span>
                </div>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        {/* Operational Metrics */}
        <CardEnhanced variant="command" className="command-card">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="flex items-center gap-2 text-purple-600">
              <Gauge className="h-5 w-5" />
              Operational Health
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {adminData?.totalUnits?.toLocaleString() || "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {adminData?.occupiedUnits || 0} occupied, {adminData?.vacantUnits || 0} vacant
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rent/Unit</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${adminData?.averageRentPerUnit?.toFixed(0) || "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Monthly average</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Shield className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                  <p className="text-sm font-medium">Occupancy Rate</p>
                  <p className="text-lg font-bold text-blue-600">
                    {adminData?.occupancyRate?.toFixed(1) || "0"}%
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Activity className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                  <p className="text-sm font-medium">Health Score</p>
                  <p className="text-lg font-bold text-purple-600">
                    {adminData?.portfolioHealthScore?.toFixed(0) || "0"}%
                  </p>
                </div>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>

      {/* Maintenance & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardEnhanced variant="command" className="command-card">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-orange-700">
              Maintenance Overview
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open Requests</span>
                <Badge variant={adminData && adminData.maintenanceRequestsOpen > 10 ? "destructive" : "secondary"}>
                  {adminData?.maintenanceRequestsOpen || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
                <span className="font-medium">
                  {adminData?.maintenanceResponseTime?.toFixed(1) || "0"} days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Maintenance Costs</span>
                <span className="font-medium text-red-600">
                  ${adminData?.maintenanceExpenses?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="command" className="command-card">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-green-700">
              Revenue Performance
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${adminData?.grossRevenue?.toLocaleString() || "0"}
                </p>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expense Ratio</span>
                <span className="font-medium">
                  {adminData?.expenseRatio?.toFixed(1) || "0"}%
                </span>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="command" className="command-card">
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-purple-700">
              Quick Actions
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-left"
                onClick={() => window.open('/admin/reports', '_blank')}
              >
                View Detailed Reports
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-left"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;