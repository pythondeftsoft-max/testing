
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, DollarSign, TrendingUp, Building, Target, Calculator, Receipt, BarChart3 } from 'lucide-react';

interface PropertyFinancesProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  property?: { unit_count?: number };
}

export const PropertyFinances = ({ formData, updateFormData, property }: PropertyFinancesProps) => {
  // Helper function to count filled fields in a section
  const countFilledFields = (fields: string[]) => {
    return fields.filter(field => formData[field] && formData[field] !== '').length;
  };

  // Helper function to calculate total fields in a section
  const getTotalFields = (fields: string[]) => fields.length;

  // Define field groups for counting
  const incomeFields = ['monthly_rent', 'securityDepositAmount', 'applicationFee', 'late_fee_amount', 'pet_deposit', 'petFeeMonthly', 'otherIncomeSources', 'parking_income', 'storage_income', 'laundry_income'];
  const expenseFields = ['insurance_cost', 'mortgage_cost', 'management_fee', 'repair_costs', 'propertyTaxes', 'utilityWater', 'utilityElectric', 'utilityGas', 'utilityTrash', 'landscapingCost', 'advertisingCost', 'legalProfessionalFees', 'propertyManagementSoftware', 'capitalImprovements', 'turnoverCosts', 'tenantScreeningCosts', 'hoa_fees', 'accounting_fees'];
  const capitalFields = ['purchasePrice', 'currentMarketValue', 'purchaseDate', 'downPaymentAmount', 'loanAmount', 'interestRate', 'loan_term', 'closing_costs', 'renovation_costs'];
  const balanceSheetFields = ['outstanding_mortgage_balance', 'cash_reserves', 'accounts_payable', 'prepaid_expenses', 'accumulated_depreciation', 'beginning_cash_balance', 'ending_cash_balance', 'owner_contributions', 'owner_draws', 'property_reserve', 'tenant_security_deposits_held', 'other_additions', 'other_subtractions'];
  
  const performanceFields = ['leaseRenewalRate', 'averageRentIncrease', 'targetNoi', 'targetCapRate', 'expectedAnnualAppreciation', 'reserveFundTarget', 'vacancy_rate', 'occupancy_rate'];

  // Detect if this is a multi-unit property
  const isMultiUnit = property?.unit_count && property.unit_count > 1;

  return (
    <div className="space-y-6">

      {/* Property-Level Financial Details (Always Show) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Property-Level Financial Details
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isMultiUnit 
              ? "Shared expenses and financial information for this multi-unit property"
              : "Organize your property's financial information for professional analysis"
            }
          </p>
        </CardHeader>
        <CardContent>
        <Accordion type="multiple" className="w-full">
            
            {/* Rent & HAP Configuration */}
            <AccordionItem value="rent-hap">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Rent & HAP</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {(formData.monthly_rent && formData.voucher_type) ? 'Configured' : 'Not configured'}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthly_rent">Total Rent (Contract Rent)</Label>
                    <Input
                      id="monthly_rent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monthly_rent || ''}
                      onChange={(e) => updateFormData('monthly_rent', e.target.value)}
                      placeholder="0.00"
                      className="text-lg font-semibold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="voucher_type">Voucher Type</Label>
                    <Select 
                      value={formData.voucher_type || ''} 
                      onValueChange={(value) => updateFormData('voucher_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select voucher type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Section 8">Section 8</SelectItem>
                        <SelectItem value="HCV">Housing Choice Voucher (HCV)</SelectItem>
                        <SelectItem value="VASH">Veterans Affairs (VASH)</SelectItem>
                        <SelectItem value="Project-Based">Project-Based</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tenant_portion">Tenant Portion</Label>
                    <Input
                      id="tenant_portion"
                      type="number"
                      step="0.01"
                      value={formData.tenant_portion}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateFormData('tenant_portion', value);
                        const total = parseFloat(formData.monthly_rent) || 0;
                        const tenant = parseFloat(value) || 0;
                        const calculatedHAP = Math.max(0, total - tenant);
                        updateFormData('hap_portion', calculatedHAP.toFixed(2));
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hap_portion">HAP Portion</Label>
                    <Input
                      id="hap_portion"
                      type="number"
                      step="0.01"
                      value={formData.hap_portion}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateFormData('hap_portion', value);
                        const total = parseFloat(formData.monthly_rent) || 0;
                        const hap = parseFloat(value) || 0;
                        const calculatedTenant = Math.max(0, total - hap);
                        updateFormData('tenant_portion', calculatedTenant.toFixed(2));
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Balance Indicator */}
                {formData.monthly_rent && (formData.tenant_portion || formData.hap_portion) && (() => {
                  const totalRent = parseFloat(formData.monthly_rent) || 0;
                  const tenantPart = parseFloat(formData.tenant_portion || '0');
                  const hapPart = parseFloat(formData.hap_portion || '0');
                  const splitTotal = tenantPart + hapPart;
                  const isBalanced = Math.abs(splitTotal - totalRent) < 0.01;
                  const difference = totalRent - splitTotal;

                  return (
                    <div className={`p-4 rounded-lg border-2 text-sm ${
                      isBalanced 
                        ? 'bg-success/10 border-success/30 text-success-foreground' 
                        : 'bg-warning/10 border-warning/30 text-warning-foreground'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-base">
                          {isBalanced ? '✓ Rent split balanced' : '⚠️ Rent split unbalanced'}
                        </span>
                        {!isBalanced && (
                          <span className="font-semibold">
                            ${Math.abs(difference).toFixed(2)} {difference > 0 ? 'short' : 'over'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Total rent:</span>
                          <span className="ml-2 font-medium">${totalRent.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Split total:</span>
                          <span className="ml-2 font-medium">${splitTotal.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tenant:</span>
                          <span className="ml-2 font-medium">
                            ${tenantPart.toFixed(2)} ({totalRent > 0 ? ((tenantPart / totalRent) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">HAP:</span>
                          <span className="ml-2 font-medium">
                            ${hapPart.toFixed(2)} ({totalRent > 0 ? ((hapPart / totalRent) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </AccordionContent>
            </AccordionItem>

            {/* Other Income Sources */}
            <AccordionItem value="other-income">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Other Income Sources</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Optional
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="securityDepositAmount">Security Deposit</Label>
                    <Input
                      id="securityDepositAmount"
                      type="number"
                      step="0.01"
                      value={formData.securityDepositAmount}
                      onChange={(e) => updateFormData('securityDepositAmount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="applicationFee">Application Fee</Label>
                    <Input
                      id="applicationFee"
                      type="number"
                      step="0.01"
                      value={formData.applicationFee}
                      onChange={(e) => updateFormData('applicationFee', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="late_fee_amount">Late Fee Amount</Label>
                     <Input
                       id="late_fee_amount"
                       type="number"
                       step="0.01"
                       value={formData.late_fee_amount}
                       onChange={(e) => updateFormData('late_fee_amount', e.target.value)}
                       placeholder="0.00"
                     />
                   </div>
                   <div>
                     <Label htmlFor="pet_deposit">Pet Deposit</Label>
                     <Input
                       id="pet_deposit"
                       type="number"
                       step="0.01"
                       value={formData.pet_deposit}
                       onChange={(e) => updateFormData('pet_deposit', e.target.value)}
                       placeholder="0.00"
                     />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="petFeeMonthly">Monthly Pet Fee</Label>
                    <Input
                      id="petFeeMonthly"
                      type="number"
                      step="0.01"
                      value={formData.petFeeMonthly}
                      onChange={(e) => updateFormData('petFeeMonthly', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parking_income">Monthly Parking Income</Label>
                    <Input
                      id="parking_income"
                      type="number"
                      step="0.01"
                      value={formData.parking_income}
                      onChange={(e) => updateFormData('parking_income', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="storage_income">Monthly Storage Income</Label>
                    <Input
                      id="storage_income"
                      type="number"
                      step="0.01"
                      value={formData.storage_income}
                      onChange={(e) => updateFormData('storage_income', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="laundry_income">Monthly Laundry Income</Label>
                    <Input
                      id="laundry_income"
                      type="number"
                      step="0.01"
                      value={formData.laundry_income}
                      onChange={(e) => updateFormData('laundry_income', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="otherIncomeSources">Other Monthly Income</Label>
                  <Input
                    id="otherIncomeSources"
                    type="number"
                    step="0.01"
                    value={formData.otherIncomeSources}
                    onChange={(e) => updateFormData('otherIncomeSources', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="otherIncomeDescription">Other Income Description</Label>
                  <Input
                    id="otherIncomeDescription"
                    value={formData.otherIncomeDescription}
                    onChange={(e) => updateFormData('otherIncomeDescription', e.target.value)}
                    placeholder="Describe other income sources..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Operating Expenses */}
            <AccordionItem value="expenses">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <span>Operating Expenses</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {countFilledFields(expenseFields)}/{getTotalFields(expenseFields)} completed
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="insurance_cost">Property Insurance</Label>
                     <Input
                       id="insurance_cost"
                       type="number"
                       step="0.01"
                       value={formData.insurance_cost}
                       onChange={(e) => updateFormData('insurance_cost', e.target.value)}
                       placeholder="0.00"
                     />
                   </div>
                   <div>
                     <Label htmlFor="mortgage_cost">Mortgage Payment</Label>
                     <Input
                       id="mortgage_cost"
                       type="number"
                       step="0.01"
                       value={formData.mortgage_cost}
                       onChange={(e) => updateFormData('mortgage_cost', e.target.value)}
                       placeholder="0.00"
                     />
                   </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyTaxes">Monthly Property Taxes</Label>
                    <Input
                      id="propertyTaxes"
                      type="number"
                      step="0.01"
                      value={formData.propertyTaxes}
                      onChange={(e) => updateFormData('propertyTaxes', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                   <div>
                     <Label htmlFor="management_fee">Management Fee</Label>
                     <Input
                       id="management_fee"
                       type="number"
                       step="0.01"
                       value={formData.management_fee}
                       onChange={(e) => updateFormData('management_fee', e.target.value)}
                       placeholder="0.00"
                     />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="repair_costs">Repairs & Maintenance</Label>
                     <Input
                       id="repair_costs"
                       type="number"
                       step="0.01"
                       value={formData.repair_costs}
                       onChange={(e) => updateFormData('repair_costs', e.target.value)}
                       placeholder="0.00"
                     />
                   </div>
                  <div>
                    <Label htmlFor="hoa_fees">HOA Fees</Label>
                    <Input
                      id="hoa_fees"
                      type="number"
                      step="0.01"
                      value={formData.hoa_fees}
                      onChange={(e) => updateFormData('hoa_fees', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Utilities */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Utilities (Landlord Paid)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="utilityWater">Water & Sewer</Label>
                      <Input
                        id="utilityWater"
                        type="number"
                        step="0.01"
                        value={formData.utilityWater}
                        onChange={(e) => updateFormData('utilityWater', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="utilityElectric">Electric</Label>
                      <Input
                        id="utilityElectric"
                        type="number"
                        step="0.01"
                        value={formData.utilityElectric}
                        onChange={(e) => updateFormData('utilityElectric', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="utilityGas">Gas</Label>
                      <Input
                        id="utilityGas"
                        type="number"
                        step="0.01"
                        value={formData.utilityGas}
                        onChange={(e) => updateFormData('utilityGas', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="utilityTrash">Trash & Recycling</Label>
                      <Input
                        id="utilityTrash"
                        type="number"
                        step="0.01"
                        value={formData.utilityTrash}
                        onChange={(e) => updateFormData('utilityTrash', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Other Operating Expenses */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Other Operating Expenses</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="landscapingCost">Landscaping & Grounds</Label>
                      <Input
                        id="landscapingCost"
                        type="number"
                        step="0.01"
                        value={formData.landscapingCost}
                        onChange={(e) => updateFormData('landscapingCost', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="advertisingCost">Advertising & Marketing</Label>
                      <Input
                        id="advertisingCost"
                        type="number"
                        step="0.01"
                        value={formData.advertisingCost}
                        onChange={(e) => updateFormData('advertisingCost', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="legalProfessionalFees">Legal & Professional</Label>
                      <Input
                        id="legalProfessionalFees"
                        type="number"
                        step="0.01"
                        value={formData.legalProfessionalFees}
                        onChange={(e) => updateFormData('legalProfessionalFees', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accounting_fees">Accounting & Bookkeeping</Label>
                      <Input
                        id="accounting_fees"
                        type="number"
                        step="0.01"
                        value={formData.accounting_fees}
                        onChange={(e) => updateFormData('accounting_fees', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="propertyManagementSoftware">PM Software</Label>
                      <Input
                        id="propertyManagementSoftware"
                        type="number"
                        step="0.01"
                        value={formData.propertyManagementSoftware}
                        onChange={(e) => updateFormData('propertyManagementSoftware', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tenantScreeningCosts">Tenant Screening</Label>
                      <Input
                        id="tenantScreeningCosts"
                        type="number"
                        step="0.01"
                        value={formData.tenantScreeningCosts}
                        onChange={(e) => updateFormData('tenantScreeningCosts', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="capitalImprovements">Capital Improvements Reserve</Label>
                      <Input
                        id="capitalImprovements"
                        type="number"
                        step="0.01"
                        value={formData.capitalImprovements}
                        onChange={(e) => updateFormData('capitalImprovements', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="turnoverCosts">Turnover Costs (Average)</Label>
                      <Input
                        id="turnoverCosts"
                        type="number"
                        step="0.01"
                        value={formData.turnoverCosts}
                        onChange={(e) => updateFormData('turnoverCosts', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Capital & Financing */}
            <AccordionItem value="capital">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>Capital & Financing</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {countFilledFields(capitalFields)}/{getTotalFields(capitalFields)} completed
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchasePrice">Purchase Price</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => updateFormData('purchasePrice', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentMarketValue">Current Market Value</Label>
                    <Input
                      id="currentMarketValue"
                      type="number"
                      step="0.01"
                      value={formData.currentMarketValue}
                      onChange={(e) => updateFormData('currentMarketValue', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => updateFormData('purchaseDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="closing_costs">Closing Costs</Label>
                    <Input
                      id="closing_costs"
                      type="number"
                      step="0.01"
                      value={formData.closing_costs}
                      onChange={(e) => updateFormData('closing_costs', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="downPaymentAmount">Down Payment</Label>
                    <Input
                      id="downPaymentAmount"
                      type="number"
                      step="0.01"
                      value={formData.downPaymentAmount}
                      onChange={(e) => updateFormData('downPaymentAmount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="renovation_costs">Renovation Costs</Label>
                    <Input
                      id="renovation_costs"
                      type="number"
                      step="0.01"
                      value={formData.renovation_costs}
                      onChange={(e) => updateFormData('renovation_costs', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="loanAmount">Current Loan Balance</Label>
                    <Input
                      id="loanAmount"
                      type="number"
                      step="0.01"
                      value={formData.loanAmount}
                      onChange={(e) => updateFormData('loanAmount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      value={formData.interestRate}
                      onChange={(e) => updateFormData('interestRate', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="loan_term">Loan Term (Years)</Label>
                  <Input
                    id="loan_term"
                    type="number"
                    value={formData.loan_term}
                    onChange={(e) => updateFormData('loan_term', e.target.value)}
                    placeholder="30"
                    className="w-full md:w-1/2"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Balance Sheet Information */}
            <AccordionItem value="balance-sheet">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Balance Sheet Information</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {countFilledFields(balanceSheetFields)}/{getTotalFields(balanceSheetFields)} completed
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-medium">Balance Sheet Reporting</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    These fields are used to generate accurate balance sheet reports for your property portfolio. 
                    Complete this information to enable comprehensive financial reporting.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="beginning_cash_balance">Beginning Cash Balance</Label>
                    <Input
                      id="beginning_cash_balance"
                      type="number"
                      step="0.01"
                      value={formData.beginning_cash_balance || ''}
                      onChange={(e) => updateFormData('beginning_cash_balance', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Starting cash balance for property statement period
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="ending_cash_balance">Ending Cash Balance</Label>
                    <Input
                      id="ending_cash_balance"
                      type="number"
                      step="0.01"
                      value={formData.ending_cash_balance || ''}
                      onChange={(e) => updateFormData('ending_cash_balance', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ending cash balance (can be auto-calculated if left blank)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="owner_contributions">Owner Contributions</Label>
                    <Input
                      id="owner_contributions"
                      type="number"
                      step="0.01"
                      value={formData.owner_contributions || ''}
                      onChange={(e) => updateFormData('owner_contributions', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cash contributions made by property owner
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="owner_draws">Owner Draws</Label>
                    <Input
                      id="owner_draws"
                      type="number"
                      step="0.01"
                      value={formData.owner_draws || ''}
                      onChange={(e) => updateFormData('owner_draws', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cash draws/distributions taken by owner
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="property_reserve">Property Reserve</Label>
                    <Input
                      id="property_reserve"
                      type="number"
                      step="0.01"
                      value={formData.property_reserve || ''}
                      onChange={(e) => updateFormData('property_reserve', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cash reserve set aside for this property
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="tenant_security_deposits_held">Security Deposits Held</Label>
                    <Input
                      id="tenant_security_deposits_held"
                      type="number"
                      step="0.01"
                      value={formData.tenant_security_deposits_held || ''}
                      onChange={(e) => updateFormData('tenant_security_deposits_held', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total tenant security deposits currently held
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="other_additions">Other Cash Additions</Label>
                    <Input
                      id="other_additions"
                      type="number"
                      step="0.01"
                      value={formData.other_additions || ''}
                      onChange={(e) => updateFormData('other_additions', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Miscellaneous cash additions not otherwise categorized
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="other_subtractions">Other Cash Subtractions</Label>
                    <Input
                      id="other_subtractions"
                      type="number"
                      step="0.01"
                      value={formData.other_subtractions || ''}
                      onChange={(e) => updateFormData('other_subtractions', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Miscellaneous cash subtractions not otherwise categorized
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="outstanding_mortgage_balance">Outstanding Mortgage Balance</Label>
                    <Input
                      id="outstanding_mortgage_balance"
                      type="number"
                      step="0.01"
                      value={formData.outstanding_mortgage_balance || ''}
                      onChange={(e) => updateFormData('outstanding_mortgage_balance', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Current remaining balance on the mortgage
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="cash_reserves">Cash Reserves</Label>
                    <Input
                      id="cash_reserves"
                      type="number"
                      step="0.01"
                      value={formData.cash_reserves || ''}
                      onChange={(e) => updateFormData('cash_reserves', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cash held specifically for this property
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accounts_payable">Accounts Payable</Label>
                    <Input
                      id="accounts_payable"
                      type="number"
                      step="0.01"
                      value={formData.accounts_payable || ''}
                      onChange={(e) => updateFormData('accounts_payable', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Outstanding amounts owed to vendors/contractors
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="prepaid_expenses">Prepaid Expenses</Label>
                    <Input
                      id="prepaid_expenses"
                      type="number"
                      step="0.01"
                      value={formData.prepaid_expenses || ''}
                      onChange={(e) => updateFormData('prepaid_expenses', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Prepaid insurance, taxes, and other expenses
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="accumulated_depreciation">Accumulated Depreciation</Label>
                    <Input
                      id="accumulated_depreciation"
                      type="number"
                      step="0.01"
                      value={formData.accumulated_depreciation || ''}
                      onChange={(e) => updateFormData('accumulated_depreciation', e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total depreciation taken on the property for tax/accounting purposes
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Performance Metrics & Analysis */}
            <AccordionItem value="performance">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Performance Metrics & Analysis</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {countFilledFields(performanceFields)}/{getTotalFields(performanceFields)} completed
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="occupancy_rate">Occupancy Rate (%)</Label>
                    <Input
                      id="occupancy_rate"
                      type="number"
                      step="0.01"
                      value={formData.occupancy_rate}
                      onChange={(e) => updateFormData('occupancy_rate', e.target.value)}
                      placeholder="95.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vacancy_rate">Vacancy Rate (%)</Label>
                    <Input
                      id="vacancy_rate"
                      type="number"
                      step="0.01"
                      value={formData.vacancy_rate}
                      onChange={(e) => updateFormData('vacancy_rate', e.target.value)}
                      placeholder="5.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leaseRenewalRate">Lease Renewal Rate (%)</Label>
                    <Input
                      id="leaseRenewalRate"
                      type="number"
                      step="0.01"
                      value={formData.leaseRenewalRate}
                      onChange={(e) => updateFormData('leaseRenewalRate', e.target.value)}
                      placeholder="80.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="averageRentIncrease">Average Annual Rent Increase (%)</Label>
                    <Input
                      id="averageRentIncrease"
                      type="number"
                      step="0.01"
                      value={formData.averageRentIncrease}
                      onChange={(e) => updateFormData('averageRentIncrease', e.target.value)}
                      placeholder="3.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetNoi">Target NOI (Monthly)</Label>
                    <Input
                      id="targetNoi"
                      type="number"
                      step="0.01"
                      value={formData.targetNoi}
                      onChange={(e) => updateFormData('targetNoi', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetCapRate">Target Cap Rate (%)</Label>
                    <Input
                      id="targetCapRate"
                      type="number"
                      step="0.01"
                      value={formData.targetCapRate}
                      onChange={(e) => updateFormData('targetCapRate', e.target.value)}
                      placeholder="6.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expectedAnnualAppreciation">Expected Annual Appreciation (%)</Label>
                    <Input
                      id="expectedAnnualAppreciation"
                      type="number"
                      step="0.01"
                      value={formData.expectedAnnualAppreciation}
                      onChange={(e) => updateFormData('expectedAnnualAppreciation', e.target.value)}
                      placeholder="3.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reserveFundTarget">Reserve Fund Target</Label>
                    <Input
                      id="reserveFundTarget"
                      type="number"
                      step="0.01"
                      value={formData.reserveFundTarget}
                      onChange={(e) => updateFormData('reserveFundTarget', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>

      {/* Private Notes - Always Show */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Private Notes
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Private Only:</strong> These notes are only visible to landlords and property managers. 
                They will not be shown to tenants when the property is listed.
              </p>
            </div>
            <div>
              <Label htmlFor="description">Private Notes & Comments</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Internal notes, maintenance history, tenant preferences, screening notes, etc. This information is private and will not be visible to prospective tenants."
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use this space for internal notes, maintenance history, screening criteria, or any other information for your team.
              </p>
            </div>
          </CardContent>
        </Card>
    </div>
  );
};
