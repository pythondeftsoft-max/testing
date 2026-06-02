import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Home, 
  TrendingUp,
  Receipt,
  Wrench,
  Shield,
  FileText,
  Users,
  Calculator
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropertyFinancialEditorProps {
  property: any;
  onSave: (updatedData?: any) => void;
  onCancel: () => void;
}

export const PropertyFinancialEditor = ({ property, onSave, onCancel }: PropertyFinancialEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Property Info
    monthly_rent: property.monthly_rent || 0,
    security_deposit_amount: property.security_deposit_amount || 0,
    purchase_price: property.purchase_price || 0,
    
    // Operating Expenses
    insurance_cost: property.insurance_cost || 0,
    mortgage_cost: property.mortgage_cost || 0,
    management_fee: property.management_fee || 0,
    repair_costs: property.repair_costs || 0,
    property_taxes: property.property_taxes || 0, // Fixed field name
    utilities_expense: property.utilities_expense || 0, // Fixed field name
    
    // Additional Revenue Streams
    other_income: property.other_income || 0, // Fixed field name
    late_fee_income: property.late_fee_income || 0,
    pet_fee_income: property.pet_fee_income || 0, // Added missing field
    application_fee_income: property.application_fee_income || 0,
    
    // Advanced Financial Fields
    depreciation_expense: property.depreciation_expense || 0,
    hoa_fees: property.hoa_fees || 0,
    landscaping_costs: property.landscaping_costs || 0,
    advertising_expense: property.advertising_expense || 0, // Fixed field name
    legal_professional_fees: property.legal_professional_fees || 0, // Fixed field name
    accounting_fees: property.accounting_fees || 0,
    property_management_fees: property.property_management_fees || 0, // Added missing field
    other_operating_expenses: property.other_operating_expenses || 0, // Added missing field
    
    // Balance Sheet Fields - Assets
    beginning_cash_balance: property.beginning_cash_balance || 0, // Added missing field
    ending_cash_balance: property.ending_cash_balance || 0, // Added missing field
    accounts_receivable: property.accounts_receivable || 0, // Added missing field
    security_deposits_receivable: property.security_deposits_receivable || 0, // Added missing field
    prepaid_expenses: property.prepaid_expenses || 0, // Added missing field
    
    // Balance Sheet Fields - Liabilities
    security_deposits_held: property.security_deposits_held || 0, // Added missing field
    accounts_payable: property.accounts_payable || 0, // Added missing field
    accrued_expenses: property.accrued_expenses || 0, // Added missing field
    maintenance_reserves: property.maintenance_reserves || 0, // Added missing field
    
    // Dates for financial tracking
    last_appraisal_date: property.last_appraisal_date || '',
    last_appraisal_value: property.last_appraisal_value || 0,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field.includes('date') ? value : parseFloat(value) || 0
    }));
  };

  const calculateMetrics = () => {
    const totalIncome = formData.monthly_rent + formData.other_income + formData.late_fee_income + 
                       formData.pet_fee_income + formData.application_fee_income;
    const totalExpenses = formData.insurance_cost + formData.mortgage_cost + formData.management_fee + 
                         formData.repair_costs + formData.property_taxes + formData.utilities_expense +
                         formData.hoa_fees + formData.landscaping_costs + formData.advertising_expense +
                         formData.legal_professional_fees + formData.accounting_fees + formData.depreciation_expense +
                         formData.property_management_fees + formData.other_operating_expenses;
    const netOperatingIncome = totalIncome - totalExpenses;
    const grossYield = formData.purchase_price > 0 ? (totalIncome * 12) / formData.purchase_price * 100 : 0;
    
    return { totalIncome, totalExpenses, netOperatingIncome, grossYield };
  };

  const metrics = calculateMetrics();

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('properties')
        .update(formData)
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Financial data updated",
        description: `Property financials have been saved successfully.`,
      });

      onSave(formData);
    } catch (error) {
      console.error('Error updating property financials:', error);
      toast({
        title: "Error updating financials",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[85vh] overflow-y-auto">
      {/* Financial Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-muted-foreground">Monthly Income</div>
              <div className="font-bold text-lg text-success">${metrics.totalIncome.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-muted-foreground">Monthly Expenses</div>
              <div className="font-bold text-lg text-destructive">${metrics.totalExpenses.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-muted-foreground">Net Income</div>
              <div className={`font-bold text-lg ${metrics.netOperatingIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${metrics.netOperatingIncome.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-muted-foreground">Gross Yield</div>
              <div className="font-bold text-lg text-primary">{metrics.grossYield.toFixed(2)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Income Tab */}
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Income & Revenue Streams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent</Label>
                  <Input
                    id="monthly_rent"
                    type="number"
                    step="0.01"
                    value={formData.monthly_rent}
                    onChange={(e) => handleInputChange('monthly_rent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_income">Other Income</Label>
                  <Input
                    id="other_income"
                    type="number"
                    step="0.01"
                    value={formData.other_income}
                    onChange={(e) => handleInputChange('other_income', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pet_fee_income">Pet Fee Income (Monthly)</Label>
                  <Input
                    id="pet_fee_income"
                    type="number"
                    step="0.01"
                    value={formData.pet_fee_income}
                    onChange={(e) => handleInputChange('pet_fee_income', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="late_fee_income">Late Fee Income (Monthly)</Label>
                  <Input
                    id="late_fee_income"
                    type="number"
                    step="0.01"
                    value={formData.late_fee_income}
                    onChange={(e) => handleInputChange('late_fee_income', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="application_fee_income">Application Fee Income (Monthly)</Label>
                  <Input
                    id="application_fee_income"
                    type="number"
                    step="0.01"
                    value={formData.application_fee_income}
                    onChange={(e) => handleInputChange('application_fee_income', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-600" />
                Operating Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insurance_cost" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Insurance (Monthly)
                  </Label>
                  <Input
                    id="insurance_cost"
                    type="number"
                    step="0.01"
                    value={formData.insurance_cost}
                    onChange={(e) => handleInputChange('insurance_cost', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mortgage_cost" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Mortgage Payment
                  </Label>
                  <Input
                    id="mortgage_cost"
                    type="number"
                    step="0.01"
                    value={formData.mortgage_cost}
                    onChange={(e) => handleInputChange('mortgage_cost', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_taxes">Property Tax (Monthly)</Label>
                  <Input
                    id="property_taxes"
                    type="number"
                    step="0.01"
                    value={formData.property_taxes}
                    onChange={(e) => handleInputChange('property_taxes', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="management_fee" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Management Fee
                  </Label>
                  <Input
                    id="management_fee"
                    type="number"
                    step="0.01"
                    value={formData.management_fee}
                    onChange={(e) => handleInputChange('management_fee', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repair_costs" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Maintenance & Repairs
                  </Label>
                  <Input
                    id="repair_costs"
                    type="number"
                    step="0.01"
                    value={formData.repair_costs}
                    onChange={(e) => handleInputChange('repair_costs', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utilities_expense">Utility Costs</Label>
                  <Input
                    id="utilities_expense"
                    type="number"
                    step="0.01"
                    value={formData.utilities_expense}
                    onChange={(e) => handleInputChange('utilities_expense', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_management_fees">Property Management Fees</Label>
                  <Input
                    id="property_management_fees"
                    type="number"
                    step="0.01"
                    value={formData.property_management_fees}
                    onChange={(e) => handleInputChange('property_management_fees', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_operating_expenses">Other Operating Expenses</Label>
                  <Input
                    id="other_operating_expenses"
                    type="number"
                    step="0.01"
                    value={formData.other_operating_expenses}
                    onChange={(e) => handleInputChange('other_operating_expenses', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Assets & Cash Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="beginning_cash_balance">Beginning Cash Balance</Label>
                  <Input
                    id="beginning_cash_balance"
                    type="number"
                    step="0.01"
                    value={formData.beginning_cash_balance}
                    onChange={(e) => handleInputChange('beginning_cash_balance', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ending_cash_balance">Ending Cash Balance</Label>
                  <Input
                    id="ending_cash_balance"
                    type="number"
                    step="0.01"
                    value={formData.ending_cash_balance}
                    onChange={(e) => handleInputChange('ending_cash_balance', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accounts_receivable">Accounts Receivable</Label>
                  <Input
                    id="accounts_receivable"
                    type="number"
                    step="0.01"
                    value={formData.accounts_receivable}
                    onChange={(e) => handleInputChange('accounts_receivable', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security_deposits_receivable">Security Deposits Receivable</Label>
                  <Input
                    id="security_deposits_receivable"
                    type="number"
                    step="0.01"
                    value={formData.security_deposits_receivable}
                    onChange={(e) => handleInputChange('security_deposits_receivable', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prepaid_expenses">Prepaid Expenses</Label>
                  <Input
                    id="prepaid_expenses"
                    type="number"
                    step="0.01"
                    value={formData.prepaid_expenses}
                    onChange={(e) => handleInputChange('prepaid_expenses', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liabilities Tab */}
        <TabsContent value="liabilities">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-red-600" />
                Liabilities & Reserves
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="security_deposits_held">Security Deposits Held</Label>
                  <Input
                    id="security_deposits_held"
                    type="number"
                    step="0.01"
                    value={formData.security_deposits_held}
                    onChange={(e) => handleInputChange('security_deposits_held', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accounts_payable">Accounts Payable</Label>
                  <Input
                    id="accounts_payable"
                    type="number"
                    step="0.01"
                    value={formData.accounts_payable}
                    onChange={(e) => handleInputChange('accounts_payable', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accrued_expenses">Accrued Expenses</Label>
                  <Input
                    id="accrued_expenses"
                    type="number"
                    step="0.01"
                    value={formData.accrued_expenses}
                    onChange={(e) => handleInputChange('accrued_expenses', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance_reserves">Maintenance Reserves</Label>
                  <Input
                    id="maintenance_reserves"
                    type="number"
                    step="0.01"
                    value={formData.maintenance_reserves}
                    onChange={(e) => handleInputChange('maintenance_reserves', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Advanced Financial Fields & Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Property Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchase_price">Purchase Price</Label>
                    <Input
                      id="purchase_price"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => handleInputChange('purchase_price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="security_deposit_amount">Security Deposit Amount</Label>
                    <Input
                      id="security_deposit_amount"
                      type="number"
                      step="0.01"
                      value={formData.security_deposit_amount}
                      onChange={(e) => handleInputChange('security_deposit_amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_appraisal_value">Last Appraisal Value</Label>
                    <Input
                      id="last_appraisal_value"
                      type="number"
                      step="0.01"
                      value={formData.last_appraisal_value}
                      onChange={(e) => handleInputChange('last_appraisal_value', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_appraisal_date">Last Appraisal Date</Label>
                    <Input
                      id="last_appraisal_date"
                      type="date"
                      value={formData.last_appraisal_date}
                      onChange={(e) => handleInputChange('last_appraisal_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Additional Expenses</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depreciation_expense">Depreciation Expense (Monthly)</Label>
                    <Input
                      id="depreciation_expense"
                      type="number"
                      step="0.01"
                      value={formData.depreciation_expense}
                      onChange={(e) => handleInputChange('depreciation_expense', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hoa_fees">HOA Fees</Label>
                    <Input
                      id="hoa_fees"
                      type="number"
                      step="0.01"
                      value={formData.hoa_fees}
                      onChange={(e) => handleInputChange('hoa_fees', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landscaping_costs">Landscaping Costs</Label>
                    <Input
                      id="landscaping_costs"
                      type="number"
                      step="0.01"
                      value={formData.landscaping_costs}
                      onChange={(e) => handleInputChange('landscaping_costs', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advertising_expense">Advertising Expense</Label>
                    <Input
                      id="advertising_expense"
                      type="number"
                      step="0.01"
                      value={formData.advertising_expense}
                      onChange={(e) => handleInputChange('advertising_expense', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal_professional_fees">Legal & Professional Fees</Label>
                    <Input
                      id="legal_professional_fees"
                      type="number"
                      step="0.01"
                      value={formData.legal_professional_fees}
                      onChange={(e) => handleInputChange('legal_professional_fees', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accounting_fees">Accounting Fees</Label>
                    <Input
                      id="accounting_fees"
                      type="number"
                      step="0.01"
                      value={formData.accounting_fees}
                      onChange={(e) => handleInputChange('accounting_fees', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Financial Data'}
        </Button>
      </div>
    </div>
  );
};