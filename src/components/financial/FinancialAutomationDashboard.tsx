import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  CreditCard,
  Plus,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { useFinancialAutomation } from '@/hooks/useFinancialAutomationReal';
import { format } from 'date-fns';

interface FinancialAutomationDashboardProps {
  userId: string;
  portfolioId?: string;
}

const FinancialAutomationDashboard = ({ userId, portfolioId }: FinancialAutomationDashboardProps) => {
  const {
    expenses,
    forecasts,
    taxDocuments,
    budgetAlerts,
    isLoading,
    createExpense,
    categorizeExpense,
    generateCashFlowForecast,
    generateTaxDocument,
    syncPlaidTransactions,
    acknowledgeBudgetAlert
  } = useFinancialAutomation(portfolioId);

  const [activeTab, setActiveTab] = useState('expenses');
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    property_id: '',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    tax_deductible: false
  });

  const expenseCategories = [
    'Maintenance & Repairs',
    'Property Management',
    'Insurance',
    'Utilities',
    'Marketing & Advertising',
    'Legal & Professional',
    'Property Taxes',
    'Mortgage Interest',
    'Capital Improvements',
    'Other'
  ];

  const handleCreateExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) return;

    await createExpense({
      ...expenseForm,
      amount: parseFloat(expenseForm.amount)
    });

    setExpenseDialog(false);
    setExpenseForm({
      property_id: '',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      tax_deductible: false
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, "default" | "destructive" | "outline" | "occupied" | "success" | "warning" | "secondary" | "danger" | "neutral"> = {
      'Maintenance & Repairs': 'destructive',
      'Property Management': 'occupied',
      'Insurance': 'success',
      'Utilities': 'warning',
      'Marketing & Advertising': 'secondary',
      'Legal & Professional': 'outline',
      'Property Taxes': 'destructive',
      'Mortgage Interest': 'warning',
      'Capital Improvements': 'success',
      'Other': 'secondary'
    };
    return colors[category] || 'outline';
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const taxDeductibleExpenses = expenses
    .filter(exp => exp.is_tax_deductible)
    .reduce((sum, exp) => sum + exp.amount, 0);

  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" animate={true}>
        <CardEnhancedContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-muted-foreground">Loading financial data...</p>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Cards */}
      {budgetAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {budgetAlerts.length} budget alert(s) require attention. Some categories are approaching or exceeding limits.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalExpenses.toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax Deductible</p>
                <p className="text-2xl font-bold text-foreground">
                  ${taxDeductibleExpenses.toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Forecasts</p>
                <p className="text-2xl font-bold text-foreground">{forecasts.length}</p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax Documents</p>
                <p className="text-2xl font-bold text-foreground">{taxDocuments.length}</p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>

      {/* Main Dashboard */}
      <CardEnhanced variant="elevated" hover={true} animate={true}>
        <CardEnhancedHeader>
          <div className="flex justify-between items-center">
            <CardEnhancedTitle className="flex items-center gap-2" gradient>
              <BarChart3 className="h-5 w-5 text-primary" />
              Financial Automation Dashboard
            </CardEnhancedTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={syncPlaidTransactions}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Transactions
              </Button>
              <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                <DialogTrigger asChild>
                  <Button variant="blue">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record New Expense</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={expenseForm.date}
                          onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select 
                        value={expenseForm.category} 
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        placeholder="Enter expense description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vendor">Vendor</Label>
                      <Input
                        id="vendor"
                        value={expenseForm.vendor}
                        onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                        placeholder="Vendor name"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tax_deductible"
                        checked={expenseForm.tax_deductible}
                        onChange={(e) => setExpenseForm({ ...expenseForm, tax_deductible: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="tax_deductible">Tax Deductible</Label>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setExpenseDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateExpense}>
                        Record Expense
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="expenses">Expense Tracking</TabsTrigger>
              <TabsTrigger value="forecasts">Cash Flow Forecasts</TabsTrigger>
              <TabsTrigger value="taxes">Tax Management</TabsTrigger>
              <TabsTrigger value="alerts">Budget Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Tax Deductible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.slice(0, 20).map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{expense.description}</div>
                            {expense.plaid_transaction_id && (
                              <div className="text-xs text-muted-foreground">Auto-imported</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getCategoryColor(expense.category)}>
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">{expense.vendor_name || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {expense.is_tax_deductible ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <div className="text-muted-foreground">-</div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="forecasts" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <CardEnhanced variant="elevated">
                  <CardEnhancedContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Avg Monthly Income</p>
                      <p className="text-2xl font-bold text-success">
                        ${forecasts.length > 0 
                          ? Math.round(forecasts.reduce((sum, f) => sum + f.projected_income, 0) / forecasts.length).toLocaleString()
                          : '0'
                        }
                      </p>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
                <CardEnhanced variant="elevated">
                  <CardEnhancedContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Avg Monthly Expenses</p>
                      <p className="text-2xl font-bold text-destructive">
                        ${forecasts.length > 0 
                          ? Math.round(forecasts.reduce((sum, f) => sum + f.projected_expenses, 0) / forecasts.length).toLocaleString()
                          : '0'
                        }
                      </p>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
                <CardEnhanced variant="elevated">
                  <CardEnhancedContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Avg Net Cash Flow</p>
                      <p className="text-2xl font-bold text-foreground">
                        ${forecasts.length > 0 
                          ? Math.round(forecasts.reduce((sum, f) => sum + f.projected_cash_flow, 0) / forecasts.length).toLocaleString()
                          : '0'
                        }
                      </p>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Property</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Projected Income</TableHead>
                      <TableHead>Projected Expenses</TableHead>
                      <TableHead>Net Cash Flow</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecasts.map((forecast) => (
                      <TableRow key={forecast.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {(forecast as any).properties?.address || 'Portfolio'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">{format(new Date(forecast.created_at), 'MMM yyyy')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-success">
                            ${forecast.projected_income.toLocaleString('en-US')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-destructive">
                            ${forecast.projected_expenses.toLocaleString('en-US')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${forecast.projected_cash_flow >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${forecast.projected_cash_flow.toLocaleString('en-US')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={85} className="w-16" />
                            <span className="text-sm text-muted-foreground">
                              85%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="taxes" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => generateTaxDocument('property-id', '1099', 2024)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Tax Document
                </Button>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Property</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {(doc as any).properties?.address || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.document_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{doc.tax_year}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">
                            Generated
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Property</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Spent</TableHead>
                      <TableHead>Alert Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {(alert as any).properties?.address || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">{alert.alert_type || 'General'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            ${alert.budget_amount.toLocaleString('en-US')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            ${alert.current_spent.toLocaleString('en-US')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.alert_type === 'exceeded' ? 'destructive' : 'warning'}>
                            {alert.alert_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeBudgetAlert(alert.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default FinancialAutomationDashboard;