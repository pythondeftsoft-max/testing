import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Receipt, 
  Camera, 
  Upload, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  property_id: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_url?: string;
  ai_category?: string;
  confidence_score?: number;
  is_tax_deductible: boolean;
  approval_workflow?: {
    submitted_by: string;
    approved_by?: string;
    approval_date?: string;
    notes?: string;
  };
}

interface Budget {
  id: string;
  category: string;
  allocated_amount: number;
  spent_amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  alerts_enabled: boolean;
}

interface EnhancedExpenseManagerProps {
  portfolioId?: string;
  userId: string;
}

const EnhancedExpenseManager = ({ portfolioId, userId }: EnhancedExpenseManagerProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeTab, setActiveTab] = useState('expenses');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Memoized filtered expenses for performance
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
      const matchesSearch = searchQuery === '' || 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [expenses, filterCategory, filterStatus, searchQuery]);

  // Calculate budget analytics
  const budgetAnalytics = useMemo(() => {
    return budgets.map(budget => {
      const percentage = budget.allocated_amount > 0 
        ? (budget.spent_amount / budget.allocated_amount) * 100 
        : 0;
      
      const status = percentage > 90 ? 'critical' : 
                    percentage > 75 ? 'warning' : 'good';
      
      return { ...budget, percentage, status };
    });
  }, [budgets]);

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', '#6366f1', '#14b8a6', '#f59e0b'];

  // Monthly spending data for bar chart
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const key = format(new Date(e.date), 'MMM yyyy');
      map.set(key, (map.get(key) || 0) + e.amount);
    }
    return Array.from(map.entries()).map(([month, total]) => ({ month, total })).slice(-12);
  }, [expenses]);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // Handle receipt upload with OCR processing
  const handleReceiptUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockExpenseData = {
        amount: Math.random() * 500 + 50,
        description: 'Extracted from receipt',
        category: 'maintenance',
        ai_category: 'plumbing',
        confidence_score: 0.85,
        is_tax_deductible: true
      };

      toast({
        title: "Receipt Processed",
        description: "Expense data extracted successfully. Please review and confirm.",
      });

      setReceiptDialog(true);
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: "Could not process receipt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Enhanced expense categorization with AI suggestions
  const getAISuggestionBadge = (expense: Expense) => {
    if (!expense.ai_category || !expense.confidence_score) return null;
    
    const confidenceColor = expense.confidence_score > 0.8 ? 'bg-success' : 
                           expense.confidence_score > 0.6 ? 'bg-warning' : 'bg-info';
    
    return (
      <Badge variant="outline" className={`${confidenceColor} text-white`}>
        AI: {expense.ai_category} ({Math.round(expense.confidence_score * 100)}%)
      </Badge>
    );
  };

  // Mobile-optimized expense card component
  const ExpenseCard = ({ expense }: { expense: Expense }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
      className="card-hover"
    >
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-sm truncate">{expense.description}</h4>
                {expense.receipt_url && (
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline">{expense.category}</Badge>
                {getAISuggestionBadge(expense)}
                {expense.is_tax_deductible && (
                  <Badge variant="outline" className="bg-openkey-gold text-white">
                    Tax Deductible
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                {format(new Date(expense.date), 'MMM dd, yyyy')}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span className="font-bold text-lg">${expense.amount.toFixed(2)}</span>
              <Badge
                variant={expense.status === 'approved' ? 'default' : 
                        expense.status === 'rejected' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {expense.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Budget progress component
  const BudgetProgressCard = ({ budget }: { budget: typeof budgetAnalytics[0] }) => (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-medium">{budget.category}</h4>
            <p className="text-sm text-muted-foreground capitalize">{budget.period}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">${budget.spent_amount} / ${budget.allocated_amount}</p>
            <p className="text-xs text-muted-foreground">{budget.percentage.toFixed(1)}% used</p>
          </div>
        </div>
        
        <Progress 
          value={budget.percentage} 
          className={`h-2 ${budget.status === 'critical' ? 'bg-destructive/20' : 
                           budget.status === 'warning' ? 'bg-warning/20' : 'bg-primary/20'}`}
        />
        
        {budget.status === 'critical' && (
          <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            Budget exceeded
          </div>
        )}
        
        {budget.status === 'warning' && (
          <div className="flex items-center gap-1 mt-2 text-xs text-warning">
            <Clock className="h-3 w-3" />
            Approaching limit
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gradient-blue-gold">Enhanced Expense Manager</h2>
          <p className="text-muted-foreground">AI-powered expense tracking and budget management</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
            <DialogTrigger asChild>
              <Button className="button-primary">
                <Camera className="h-4 w-4 mr-2" />
                Scan Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Receipt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drop receipt image or click to browse
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedFile(e.target.files[0]);
                        handleReceiptUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label htmlFor="receipt-upload">
                    <Button variant="outline" className="cursor-pointer">
                      Choose File
                    </Button>
                  </label>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters and search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="taxes">Taxes</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <AnimatePresence mode="wait">
            {filteredExpenses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No expenses found</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-4"
              >
                {filteredExpenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgetAnalytics.map((budget) => (
              <BudgetProgressCard key={budget.id} budget={budget} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Spending Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No expense data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBarChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                      <Bar dataKey="total" name="Spending" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No expense data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedExpenseManager;