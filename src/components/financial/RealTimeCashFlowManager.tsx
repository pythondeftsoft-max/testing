import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  Calendar,
  BarChart3,
  RefreshCw,
  Bell,
  Target,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, addDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  net_flow: number;
  balance: number;
  projected: boolean;
}

interface CashFlowAlert {
  id: string;
  type: 'low_balance' | 'negative_flow' | 'expense_spike' | 'income_drop';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  threshold: number;
  current_value: number;
  created_at: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  adjustments: {
    income_change: number;
    expense_change: number;
    one_time_expenses?: Array<{ amount: number; date: string; description: string }>;
  };
  color: string;
}

interface RealTimeCashFlowManagerProps {
  portfolioId?: string;
  userId: string;
}

const RealTimeCashFlowManager = ({ portfolioId, userId }: RealTimeCashFlowManagerProps) => {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [alerts, setAlerts] = useState<CashFlowAlert[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('3months');
  const [selectedScenario, setSelectedScenario] = useState<string>('current');
  const [isLive, setIsLive] = useState(false);
  const { toast } = useToast();

  // Mock scenarios for what-if analysis
  const defaultScenarios: Scenario[] = [
    {
      id: 'current',
      name: 'Current Projection',
      description: 'Based on current trends',
      adjustments: { income_change: 0, expense_change: 0 },
      color: '#3B82F6'
    },
    {
      id: 'optimistic',
      name: 'Optimistic',
      description: '10% income increase, 5% expense reduction',
      adjustments: { income_change: 0.1, expense_change: -0.05 },
      color: '#10B981'
    },
    {
      id: 'conservative',
      name: 'Conservative',
      description: '5% income decrease, 10% expense increase',
      adjustments: { income_change: -0.05, expense_change: 0.1 },
      color: '#F59E0B'
    },
    {
      id: 'emergency',
      name: 'Emergency Scenario',
      description: 'Major maintenance expense',
      adjustments: { 
        income_change: 0, 
        expense_change: 0,
        one_time_expenses: [
          { amount: 15000, date: format(addDays(new Date(), 30), 'yyyy-MM-dd'), description: 'Emergency HVAC Replacement' }
        ]
      },
      color: '#EF4444'
    }
  ];

  // Generate mock cash flow data
  const generateCashFlowData = useMemo(() => {
    const data: CashFlowData[] = [];
    const baseIncome = 25000;
    const baseExpenses = 18000;
    let currentBalance = 50000;

    const scenario = scenarios.find(s => s.id === selectedScenario) || defaultScenarios[0];
    
    for (let i = -30; i <= 90; i++) {
      const date = addDays(new Date(), i);
      const isProjected = i > 0;
      
      // Apply seasonal adjustments
      const seasonalMultiplier = 1 + (Math.sin((date.getMonth() * Math.PI) / 6) * 0.1);
      
      // Calculate income and expenses with scenario adjustments
      const income = baseIncome * seasonalMultiplier * (1 + scenario.adjustments.income_change);
      let expenses = baseExpenses * seasonalMultiplier * (1 + scenario.adjustments.expense_change);
      
      // Add one-time expenses
      if (scenario.adjustments.one_time_expenses) {
        const oneTimeExpense = scenario.adjustments.one_time_expenses.find(
          expense => expense.date === format(date, 'yyyy-MM-dd')
        );
        if (oneTimeExpense) {
          expenses += oneTimeExpense.amount;
        }
      }
      
      const netFlow = income - expenses;
      currentBalance += netFlow;
      
      data.push({
        date: format(date, 'yyyy-MM-dd'),
        income,
        expenses,
        net_flow: netFlow,
        balance: currentBalance,
        projected: isProjected
      });
    }
    
    return data;
  }, [selectedScenario, scenarios]);

  // Generate alerts based on cash flow data
  const generateAlerts = useMemo(() => {
    const alerts: CashFlowAlert[] = [];
    const currentData = generateCashFlowData.slice(-7); // Last 7 days
    const futureData = generateCashFlowData.slice(-30); // Next 30 days
    
    // Low balance alert
    const lowBalanceThreshold = 10000;
    const minBalance = Math.min(...futureData.map(d => d.balance));
    if (minBalance < lowBalanceThreshold) {
      alerts.push({
        id: 'low_balance',
        type: 'low_balance',
        severity: minBalance < 5000 ? 'critical' : 'warning',
        message: `Balance projected to drop to $${minBalance.toLocaleString()} within 30 days`,
        threshold: lowBalanceThreshold,
        current_value: minBalance,
        created_at: new Date().toISOString()
      });
    }
    
    // Negative cash flow alert
    const negativeFlowDays = currentData.filter(d => d.net_flow < 0).length;
    if (negativeFlowDays >= 3) {
      alerts.push({
        id: 'negative_flow',
        type: 'negative_flow',
        severity: 'warning',
        message: `Negative cash flow detected for ${negativeFlowDays} days`,
        threshold: 0,
        current_value: negativeFlowDays,
        created_at: new Date().toISOString()
      });
    }
    
    return alerts;
  }, [generateCashFlowData]);

  useEffect(() => {
    setCashFlowData(generateCashFlowData);
    setAlerts(generateAlerts);
    setScenarios(defaultScenarios);
  }, [generateCashFlowData, generateAlerts]);

  // Real-time data simulation
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      // Simulate real-time updates
      setCashFlowData(prev => {
        const newData = [...prev];
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayIndex = newData.findIndex(d => d.date === today);
        
        if (todayIndex >= 0) {
          // Add small random variation to simulate real-time changes
          const variation = (Math.random() - 0.5) * 1000;
          newData[todayIndex] = {
            ...newData[todayIndex],
            balance: newData[todayIndex].balance + variation
          };
        }
        
        return newData;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLive]);

  const currentMetrics = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayData = cashFlowData.find(d => d.date === today);
    const thisMonth = cashFlowData.filter(d => 
      d.date >= format(startOfMonth(new Date()), 'yyyy-MM-dd') &&
      d.date <= format(endOfMonth(new Date()), 'yyyy-MM-dd')
    );
    
    return {
      currentBalance: todayData?.balance || 0,
      monthlyIncome: thisMonth.reduce((sum, d) => sum + d.income, 0),
      monthlyExpenses: thisMonth.reduce((sum, d) => sum + d.expenses, 0),
      monthlyNetFlow: thisMonth.reduce((sum, d) => sum + d.net_flow, 0),
      burnRate: thisMonth.length > 0 ? thisMonth.reduce((sum, d) => sum + d.expenses, 0) / thisMonth.length : 0
    };
  }, [cashFlowData]);

  const AlertCard = ({ alert }: { alert: CashFlowAlert }) => {
    const severityColors = {
      info: 'bg-info border-info/20',
      warning: 'bg-warning border-warning/20',
      critical: 'bg-destructive border-destructive/20'
    };
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-4 rounded-lg border ${severityColors[alert.severity]} text-white`}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{alert.message}</p>
            <p className="text-sm opacity-90">
              {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gradient-blue-gold">Real-Time Cash Flow</h2>
          <p className="text-muted-foreground">Live cash flow monitoring and forecasting</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            onClick={() => setIsLive(!isLive)}
            className={isLive ? "animate-pulse" : ""}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isLive ? 'Live' : 'Start Live'}
          </Button>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Active Alerts
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold">${currentMetrics.currentBalance.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-openkey-gold" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Net Flow</p>
                <p className={`text-2xl font-bold ${currentMetrics.monthlyNetFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${currentMetrics.monthlyNetFlow.toLocaleString()}
                </p>
              </div>
              {currentMetrics.monthlyNetFlow >= 0 ? 
                <TrendingUp className="h-8 w-8 text-success" /> :
                <TrendingDown className="h-8 w-8 text-destructive" />
              }
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-2xl font-bold text-success">
                  ${currentMetrics.monthlyIncome.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Burn Rate</p>
                <p className="text-2xl font-bold">
                  ${currentMetrics.burnRate.toLocaleString()}/day
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData.slice(-60)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                    />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                      labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="hsl(var(--openkey-blue))" 
                      fill="hsl(var(--openkey-blue) / 0.1)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map(scenario => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {scenarios.find(s => s.id === selectedScenario)?.description}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scenario Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowData.slice(-90)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                    />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                      labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke={scenarios.find(s => s.id === selectedScenario)?.color || '#3B82F6'}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>6-Month Cash Flow Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Generate 6-month forecast from existing cash flow data
                const forecastData = Array.from({ length: 6 }, (_, i) => {
                  const month = addMonths(new Date(), i + 1);
                  const lastDataPoint = cashFlowData[cashFlowData.length - 1];
                  const avgIncome = cashFlowData.length > 0 
                    ? cashFlowData.reduce((sum, d) => sum + d.income, 0) / cashFlowData.length 
                    : 0;
                  const avgExpenses = cashFlowData.length > 0 
                    ? cashFlowData.reduce((sum, d) => sum + d.expenses, 0) / cashFlowData.length 
                    : 0;
                  const growthFactor = 1 + (i * 0.01); // 1% monthly growth assumption
                  return {
                    month: format(month, 'MMM yyyy'),
                    projectedIncome: Math.round(avgIncome * growthFactor),
                    projectedExpenses: Math.round(avgExpenses * (1 + i * 0.005)),
                    netFlow: Math.round((avgIncome * growthFactor) - (avgExpenses * (1 + i * 0.005))),
                  };
                });
                
                if (forecastData.every(d => d.projectedIncome === 0 && d.projectedExpenses === 0)) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Add cash flow data to generate forecasts</p>
                    </div>
                  );
                }

                return (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                        <Area type="monotone" dataKey="projectedIncome" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.3)" name="Projected Income" />
                        <Area type="monotone" dataKey="projectedExpenses" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.3)" name="Projected Expenses" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeCashFlowManager;