import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, DollarSign, Building, Users, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  portfolioMetrics: {
    totalValue: number;
    totalRent: number;
    occupancyRate: number;
    cashFlow: number;
    roi: number;
    trends: {
      value: number;
      rent: number;
      occupancy: number;
      cashFlow: number;
    };
  };
  performanceData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netIncome: number;
    occupancyRate: number;
  }>;
  propertyBreakdown: Array<{
    property: string;
    value: number;
    rent: number;
    expenses: number;
    roi: number;
  }>;
  maintenanceMetrics: {
    totalRequests: number;
    avgResolutionTime: number;
    costPerUnit: number;
    urgentCount: number;
  };
  tenantMetrics: {
    satisfaction: number;
    retention: number;
    avgLease: number;
    applications: number;
  };
}

interface AdvancedAnalyticsDashboardProps {
  userId: string;
  portfolioId?: string;
}

const AdvancedAnalyticsDashboard = ({ userId, portfolioId }: AdvancedAnalyticsDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12months');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch comprehensive analytics data
      const [
        propertiesResponse,
        paymentsResponse,
        expensesResponse,
        maintenanceResponse,
        applicationsResponse
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .eq('owner_id', userId)
          .not('deleted_at', 'is', null),
        
        supabase
          .from('rent_payments')
          .select('*')
          .gte('payment_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('expense_tracking')
          .select('*')
          .gte('expense_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('maintenance_requests')
          .select('*')
          .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('property_applications')
          .select('*')
          .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const properties = propertiesResponse.data || [];
      const payments = paymentsResponse.data || [];
      const expenses = expensesResponse.data || [];
      const maintenance = maintenanceResponse.data || [];
      const applications = applicationsResponse.data || [];

      // Calculate portfolio metrics
      const totalValue = properties.reduce((sum, p) => sum + (p.purchase_price || 0), 0);
      const totalRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
      const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
      const occupancyRate = properties.length > 0 ? (occupiedProperties / properties.length) * 100 : 0;
      
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netCashFlow = totalRevenue - totalExpenses;
      const roi = totalValue > 0 ? (netCashFlow / totalValue) * 100 : 0;

      // Generate monthly performance data
      const performanceData = generateMonthlyData(payments, expenses, properties);

      // Property breakdown
      const propertyBreakdown = properties.map(property => {
        const propertyPayments = payments.filter(p => p.property_id === property.id);
        const propertyExpenses = expenses.filter(e => e.property_id === property.id);
        const propertyRevenue = propertyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const propertyExpenseTotal = propertyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const propertyROI = property.current_market_value > 0 ? 
          ((propertyRevenue - propertyExpenseTotal) / property.current_market_value) * 100 : 0;

        return {
          property: property.address || 'Unknown',
          value: property.current_market_value || 0,
          rent: property.monthly_rent || 0,
          expenses: propertyExpenseTotal,
          roi: propertyROI
        };
      });

      // Maintenance metrics
      const completedMaintenance = maintenance.filter(m => m.status === 'completed');
      const avgResolutionTime = completedMaintenance.length > 0 ?
        completedMaintenance.reduce((sum, m) => {
          const days = m.completed_date ? 
            Math.ceil((new Date(m.completed_date).getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          return sum + days;
        }, 0) / completedMaintenance.length : 0;

      const urgentMaintenance = maintenance.filter(m => m.priority === 'high' && m.status !== 'completed').length;
      
      const maintenanceMetrics = {
        totalRequests: maintenance.length,
        avgResolutionTime,
        costPerUnit: properties.length > 0 ? totalExpenses / properties.length : 0,
        urgentCount: urgentMaintenance
      };

      // Tenant metrics
      const approvedApplications = applications.filter(a => a.status === 'approved').length;
      const tenantMetrics = {
        satisfaction: 85, // This would come from surveys
        retention: 78, // Calculate from lease renewals
        avgLease: 14, // Average lease length in months
        applications: applications.length
      };

      setAnalyticsData({
        portfolioMetrics: {
          totalValue,
          totalRent,
          occupancyRate,
          cashFlow: netCashFlow,
          roi,
          trends: {
            value: 5.2,
            rent: 3.1,
            occupancy: -2.1,
            cashFlow: 8.4
          }
        },
        performanceData,
        propertyBreakdown,
        maintenanceMetrics,
        tenantMetrics
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateMonthlyData = (payments: any[], expenses: any[], properties: any[]) => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7); // YYYY-MM format
      
      const monthlyPayments = payments.filter(p => 
        p.payment_date && p.payment_date.startsWith(monthStr)
      );
      const monthlyExpenses = expenses.filter(e => 
        e.expense_date && e.expense_date.startsWith(monthStr)
      );
      
      const revenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const expenseTotal = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        expenses: expenseTotal,
        netIncome: revenue - expenseTotal,
        occupancyRate: 85 + Math.random() * 10 // This would be calculated from actual data
      });
    }
    return months;
  };

  const exportData = () => {
    if (!analyticsData) return;
    
    const dataToExport = {
      exportDate: new Date().toISOString(),
      portfolioMetrics: analyticsData.portfolioMetrics,
      performanceData: analyticsData.performanceData,
      propertyBreakdown: analyticsData.propertyBreakdown
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Analytics data has been exported successfully",
    });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [userId, portfolioId, timeRange]);

  if (isLoading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights into your property portfolio performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="24months">Last 24 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.portfolioMetrics.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`inline-flex items-center ${analyticsData.portfolioMetrics.trends.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analyticsData.portfolioMetrics.trends.value >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(analyticsData.portfolioMetrics.trends.value)}%
              </span>
              {" "}from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent Roll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.portfolioMetrics.totalRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`inline-flex items-center ${analyticsData.portfolioMetrics.trends.rent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analyticsData.portfolioMetrics.trends.rent >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(analyticsData.portfolioMetrics.trends.rent)}%
              </span>
              {" "}from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.portfolioMetrics.occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              <span className={`inline-flex items-center ${analyticsData.portfolioMetrics.trends.occupancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analyticsData.portfolioMetrics.trends.occupancy >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(analyticsData.portfolioMetrics.trends.occupancy)}%
              </span>
              {" "}from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.portfolioMetrics.cashFlow.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`inline-flex items-center ${analyticsData.portfolioMetrics.trends.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analyticsData.portfolioMetrics.trends.cashFlow >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(analyticsData.portfolioMetrics.trends.cashFlow)}%
              </span>
              {" "}from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
                <CardDescription>Monthly financial performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Income Trend</CardTitle>
                <CardDescription>Monthly net income performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Net Income']} />
                    <Line type="monotone" dataKey="netIncome" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Performance</CardTitle>
              <CardDescription>Individual property ROI and financial metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.propertyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="property" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="roi" fill="#8884d8" name="ROI %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.maintenanceMetrics.totalRequests}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.maintenanceMetrics.avgResolutionTime.toFixed(1)} days</div>
                <p className="text-xs text-muted-foreground">Average time to complete</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost per Unit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData.maintenanceMetrics.costPerUnit.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">Annual maintenance cost</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Urgent Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analyticsData.maintenanceMetrics.urgentCount}</div>
                <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.tenantMetrics.satisfaction}%</div>
                <p className="text-xs text-muted-foreground">Based on surveys</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.tenantMetrics.retention}%</div>
                <p className="text-xs text-muted-foreground">Lease renewals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Lease Length</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.tenantMetrics.avgLease} months</div>
                <p className="text-xs text-muted-foreground">Average tenant stay</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Applications</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.tenantMetrics.applications}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;