import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, DollarSign, TrendingUp, Calculator, Banknote, Plus } from 'lucide-react';

interface PropertyFinancialSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyAddress: string;
  currentData?: any;
}

interface FinancialData {
  monthly_rent: string;
  security_deposit_amount: string;
  current_market_value: string;
  purchase_price: string;
  outstanding_mortgage_balance: string;
  cash_reserves: string;
  insurance_cost: string;
  management_fee: string;
  mortgage_cost: string;
  // Cash Flow Fields
  beginning_cash_balance: string;
  ending_cash_balance: string;
  owner_contributions: string;
  owner_draws: string;
  tenant_security_deposits_held: string;
  property_reserve: string;
  other_income: string;
  other_expenses: string;
  // Additional Income & Expense Fields
  late_fee_income: string;
  laundry_income: string;
  vending_income: string;
  accounting_fees: string;
  legal_fees: string;
  marketing_cost: string;
  repair_costs: string;
}

const FIELD_GROUPS = [
  {
    title: 'Critical Information',
    icon: DollarSign,
    description: 'Essential data for accurate financial reporting',
    fields: [
      { key: 'monthly_rent', label: 'Monthly Rent', required: true },
      { key: 'current_market_value', label: 'Current Market Value', required: true },
      { key: 'purchase_price', label: 'Purchase Price', required: true }
    ]
  },
  {
    title: 'Asset & Liability Details',
    icon: TrendingUp,
    description: 'Complete your balance sheet information',
    fields: [
      { key: 'security_deposit_amount', label: 'Security Deposit Amount' },
      { key: 'outstanding_mortgage_balance', label: 'Outstanding Mortgage Balance' },
      { key: 'cash_reserves', label: 'Cash Reserves' }
    ]
  },
  {
    title: 'Operating Expenses',
    icon: Calculator,
    description: 'Monthly operational costs',
    fields: [
      { key: 'insurance_cost', label: 'Monthly Insurance Cost' },
      { key: 'management_fee', label: 'Monthly Management Fee' },
      { key: 'mortgage_cost', label: 'Monthly Mortgage Payment' }
    ]
  },
  {
    title: 'Cash Flow & Reserves',
    icon: Banknote,
    description: 'Configure cash flow tracking and reserves for property statement reports',
    fields: [
      { key: 'beginning_cash_balance', label: 'Beginning Cash Balance' },
      { key: 'ending_cash_balance', label: 'Current Cash Balance' },
      { key: 'property_reserve', label: 'Property Reserve Fund' },
      { key: 'tenant_security_deposits_held', label: 'Security Deposits Held' }
    ]
  },
  {
    title: 'Additional Income Sources',
    icon: Plus,
    description: 'Track additional income sources and fees',
    fields: [
      { key: 'late_fee_income', label: 'Monthly Late Fee Income' },
      { key: 'laundry_income', label: 'Monthly Laundry Income' },
      { key: 'vending_income', label: 'Monthly Vending Income' },
      { key: 'other_income', label: 'Other Monthly Income' }
    ]
  },
  {
    title: 'Additional Expenses',
    icon: Calculator,
    description: 'Track professional services and marketing costs',
    fields: [
      { key: 'accounting_fees', label: 'Monthly Accounting Fees' },
      { key: 'legal_fees', label: 'Monthly Legal Fees' },
      { key: 'marketing_cost', label: 'Monthly Marketing Cost' },
      { key: 'repair_costs', label: 'Monthly Repair & Maintenance' },
      { key: 'other_expenses', label: 'Other Monthly Expenses' }
    ]
  },
  {
    title: 'Owner Transactions',
    icon: TrendingUp,
    description: 'Track owner contributions and draws',
    fields: [
      { key: 'owner_contributions', label: 'Recent Owner Contributions' },
      { key: 'owner_draws', label: 'Recent Owner Draws' }
    ]
  }
];

export const PropertyFinancialSetupWizard: React.FC<PropertyFinancialSetupWizardProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyAddress,
  currentData
}) => {
  const [formData, setFormData] = useState<FinancialData>({
    monthly_rent: currentData?.monthly_rent?.toString() || '',
    security_deposit_amount: currentData?.security_deposit_amount?.toString() || '',
    current_market_value: currentData?.current_market_value?.toString() || '',
    purchase_price: currentData?.purchase_price?.toString() || '',
    outstanding_mortgage_balance: currentData?.outstanding_mortgage_balance?.toString() || '',
    cash_reserves: currentData?.cash_reserves?.toString() || '',
    insurance_cost: currentData?.insurance_cost?.toString() || '',
    management_fee: currentData?.management_fee?.toString() || '',
    mortgage_cost: currentData?.mortgage_cost?.toString() || '',
    beginning_cash_balance: currentData?.beginning_cash_balance?.toString() || '',
    ending_cash_balance: currentData?.ending_cash_balance?.toString() || '',
    owner_contributions: currentData?.owner_contributions?.toString() || '',
    owner_draws: currentData?.owner_draws?.toString() || '',
    tenant_security_deposits_held: currentData?.tenant_security_deposits_held?.toString() || '',
    property_reserve: currentData?.property_reserve?.toString() || '',
    other_income: currentData?.other_income?.toString() || '',
    other_expenses: currentData?.other_expenses?.toString() || '',
    late_fee_income: currentData?.late_fee_income?.toString() || '',
    laundry_income: currentData?.laundry_income?.toString() || '',
    vending_income: currentData?.vending_income?.toString() || '',
    accounting_fees: currentData?.accounting_fees?.toString() || '',
    legal_fees: currentData?.legal_fees?.toString() || '',
    marketing_cost: currentData?.marketing_cost?.toString() || '',
    repair_costs: currentData?.repair_costs?.toString() || ''
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateProgress = () => {
    const totalFields = FIELD_GROUPS.flatMap(group => group.fields).length;
    const filledFields = Object.values(formData).filter(value => value.trim() !== '').length;
    return Math.round((filledFields / totalFields) * 100);
  };

  const getRequiredFieldsComplete = () => {
    const requiredFields = FIELD_GROUPS.flatMap(group => 
      group.fields.filter(field => field.required).map(field => field.key)
    );
    return requiredFields.every(key => formData[key as keyof FinancialData].trim() !== '');
  };

  const handleInputChange = (key: keyof FinancialData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const updateData: any = {};
      
      // Convert string values to numbers, handling empty strings
      Object.entries(formData).forEach(([key, value]) => {
        if (value.trim() !== '') {
          updateData[key] = parseFloat(value);
        }
      });

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId);

      if (error) throw error;

      toast.success('Property financial data updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating property financial data:', error);
      toast.error('Failed to update property financial data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentGroup = FIELD_GROUPS[currentStep];
  const progress = calculateProgress();
  const requiredComplete = getRequiredFieldsComplete();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Complete Financial Setup
          </DialogTitle>
          <div className="space-y-2">
            <p className="text-muted-foreground">{propertyAddress}</p>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="flex-1" />
              <Badge variant={progress >= 80 ? 'default' : 'secondary'}>
                {progress}% Complete
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Navigation */}
          <div className="flex items-center gap-2">
            {FIELD_GROUPS.map((group, index) => {
              const Icon = group.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(index)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : isComplete 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">
                      {group.title}
                    </span>
                  </button>
                  {index < FIELD_GROUPS.length - 1 && (
                    <div className="w-2 h-px bg-border" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Step Content */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{currentGroup.title}</h3>
              <p className="text-sm text-muted-foreground">{currentGroup.description}</p>
            </div>

            <div className="grid gap-4">
              {currentGroup.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="flex items-center gap-2">
                    {field.label}
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData[field.key as keyof FinancialData]}
                    onChange={(e) => handleInputChange(field.key as keyof FinancialData, e.target.value)}
                    className="font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {currentStep < FIELD_GROUPS.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!requiredComplete || isSubmitting}
                  className="min-w-24"
                >
                  {isSubmitting ? 'Saving...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </div>

          {!requiredComplete && (
            <p className="text-sm text-muted-foreground text-center">
              Please complete all required fields to finish setup
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};