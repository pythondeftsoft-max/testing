import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Eye, EyeOff } from 'lucide-react';
import { validateRoutingNumber, maskAccountNumber } from '@/utils/banking';

interface CashEquivalentsFormFieldsProps {
  selectedSubcategory: string;
  assetName: string;
  assetValue: number;
  acquisitionCost: number;
  acquisitionDate: string;
  annualIncome: number;
  annualExpenses: number;
  metadata: Record<string, any>;
  tags: string[];
  onFieldChange: (field: string, value: any) => void;
}

export const CashEquivalentsFormFields: React.FC<CashEquivalentsFormFieldsProps> = ({
  selectedSubcategory,
  assetName,
  assetValue,
  acquisitionCost,
  acquisitionDate,
  annualIncome,
  annualExpenses,
  metadata,
  tags,
  onFieldChange,
}) => {
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [routingNumberError, setRoutingNumberError] = useState("");

  const subcategoryLabels: Record<string, string> = {
    'checking_account': 'Checking Account',
    'savings_account': 'Savings Account',
    'money_market': 'Money Market',
    'cash': 'Physical Cash',
    'short_term_fund': 'Short-Term Fund',
  };

  const handleRoutingNumberChange = (value: string) => {
    onFieldChange('metadata.checking_routing_number', value);
    if (value && !validateRoutingNumber(value)) {
      setRoutingNumberError("Invalid routing number");
    } else {
      setRoutingNumberError("");
    }
  };

  const renderTypeSpecificFields = () => {
    if (!selectedSubcategory) {
      return (
        <p className="text-sm text-muted-foreground">
          Please select an asset type above to see specific fields.
        </p>
      );
    }

    switch (selectedSubcategory) {
      case 'checking_account':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="checkingAccountNumber">
                  Account Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="checkingAccountNumber"
                    type={showAccountNumber ? "text" : "password"}
                    value={metadata.checking_account_number || ''}
                    onChange={(e) => onFieldChange('metadata.checking_account_number', e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAccountNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Account Holder Name */}
              <div className="space-y-2">
                <Label htmlFor="checkingHolderName">Account Holder Name</Label>
                <Input
                  id="checkingHolderName"
                  value={metadata.checking_holder_name || ''}
                  onChange={(e) => onFieldChange('metadata.checking_holder_name', e.target.value)}
                />
              </div>

              {/* Routing Number */}
              <div className="space-y-2">
                <Label htmlFor="checkingRoutingNumber">Routing Number</Label>
                <Input
                  id="checkingRoutingNumber"
                  value={metadata.checking_routing_number || ''}
                  onChange={(e) => handleRoutingNumberChange(e.target.value)}
                  maxLength={9}
                  className={routingNumberError ? "border-destructive" : ""}
                />
                {routingNumberError && (
                  <p className="text-xs text-destructive">{routingNumberError}</p>
                )}
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label htmlFor="checkingAccountType">Account Type</Label>
                <Select
                  value={metadata.checking_account_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.checking_account_type', value)}
                >
                  <SelectTrigger id="checkingAccountType">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="joint">Joint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'savings_account':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="savingsAccountNumber">
                  Account Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="savingsAccountNumber"
                    type={showAccountNumber ? "text" : "password"}
                    value={metadata.savings_account_number || ''}
                    onChange={(e) => onFieldChange('metadata.savings_account_number', e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAccountNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Interest Rate */}
              <div className="space-y-2">
                <Label htmlFor="savingsInterestRate">
                  Interest Rate (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="savingsInterestRate"
                  type="number"
                  step="0.01"
                  value={metadata.savings_interest_rate || ''}
                  onChange={(e) => onFieldChange('metadata.savings_interest_rate', e.target.value)}
                  required
                />
              </div>

              {/* Compounding Frequency */}
              <div className="space-y-2">
                <Label htmlFor="savingsCompounding">Compounding Frequency</Label>
                <Select
                  value={metadata.savings_compounding_frequency || ''}
                  onValueChange={(value) => onFieldChange('metadata.savings_compounding_frequency', value)}
                >
                  <SelectTrigger id="savingsCompounding">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Withdrawal Limits */}
            <div className="space-y-2">
              <Label htmlFor="savingsWithdrawalLimits">Withdrawal Limits / Notes</Label>
              <Textarea
                id="savingsWithdrawalLimits"
                value={metadata.savings_withdrawal_limits || ''}
                onChange={(e) => onFieldChange('metadata.savings_withdrawal_limits', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 'money_market':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fund Type */}
              <div className="space-y-2">
                <Label htmlFor="mmFundType">
                  Fund Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={metadata.mm_fund_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.mm_fund_type', value)}
                >
                  <SelectTrigger id="mmFundType">
                    <SelectValue placeholder="Select fund type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="bank_money_market">Bank Money Market</SelectItem>
                    <SelectItem value="brokerage_money_market">Brokerage Money Market</SelectItem>
                    <SelectItem value="institutional">Institutional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Yield */}
              <div className="space-y-2">
                <Label htmlFor="mmYield">
                  Yield (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mmYield"
                  type="number"
                  step="0.01"
                  value={metadata.mm_yield || ''}
                  onChange={(e) => onFieldChange('metadata.mm_yield', e.target.value)}
                  required
                />
              </div>

              {/* Liquidity Notice Period */}
              <div className="space-y-2">
                <Label htmlFor="mmLiquidityNotice">Liquidity Notice Period (days)</Label>
                <Input
                  id="mmLiquidityNotice"
                  type="number"
                  value={metadata.mm_liquidity_notice_period || ''}
                  onChange={(e) => onFieldChange('metadata.mm_liquidity_notice_period', e.target.value)}
                />
              </div>

              {/* Ticker/Symbol */}
              <div className="space-y-2">
                <Label htmlFor="mmTicker">Ticker / Symbol</Label>
                <Input
                  id="mmTicker"
                  value={metadata.mm_ticker || ''}
                  onChange={(e) => onFieldChange('metadata.mm_ticker', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        );

      case 'cash':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location/Storage */}
              <div className="space-y-2">
                <Label htmlFor="cashLocation">
                  Location / Storage <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cashLocation"
                  value={metadata.cash_location || ''}
                  onChange={(e) => onFieldChange('metadata.cash_location', e.target.value)}
                  placeholder="e.g., Safe, Office, Deposit Box"
                  required
                />
              </div>

              {/* Amount Held */}
              <div className="space-y-2">
                <Label htmlFor="cashAmountHeld">
                  Amount Held <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cashAmountHeld"
                  type="number"
                  step="0.01"
                  value={metadata.cash_amount_held || ''}
                  onChange={(e) => onFieldChange('metadata.cash_amount_held', e.target.value)}
                  required
                />
              </div>

              {/* Verification/Count Date */}
              <div className="space-y-2">
                <Label htmlFor="cashVerificationDate">Verification / Count Date</Label>
                <Input
                  id="cashVerificationDate"
                  type="date"
                  value={metadata.cash_verification_date || ''}
                  onChange={(e) => onFieldChange('metadata.cash_verification_date', e.target.value)}
                />
              </div>
            </div>

            {/* Currency Denominations */}
            <div className="space-y-2">
              <Label htmlFor="cashDenominations">Currency Denominations</Label>
              <Textarea
                id="cashDenominations"
                value={metadata.cash_denominations || ''}
                onChange={(e) => onFieldChange('metadata.cash_denominations', e.target.value)}
                placeholder="Optional detail notes about denominations"
                rows={3}
              />
            </div>
          </div>
        );

      case 'short_term_fund':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fund Name/Ticker */}
              <div className="space-y-2">
                <Label htmlFor="stfFundName">
                  Fund Name / Ticker <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="stfFundName"
                  value={metadata.stf_fund_name || ''}
                  onChange={(e) => onFieldChange('metadata.stf_fund_name', e.target.value)}
                  required
                />
              </div>

              {/* Fund Type */}
              <div className="space-y-2">
                <Label htmlFor="stfFundType">
                  Fund Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={metadata.stf_fund_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.stf_fund_type', value)}
                >
                  <SelectTrigger id="stfFundType">
                    <SelectValue placeholder="Select fund type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="treasury_fund">Treasury Fund</SelectItem>
                    <SelectItem value="ultra_short_bond">Ultra-Short Bond</SelectItem>
                    <SelectItem value="stable_value">Stable Value</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Current Yield */}
              <div className="space-y-2">
                <Label htmlFor="stfCurrentYield">
                  Current Yield (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="stfCurrentYield"
                  type="number"
                  step="0.01"
                  value={metadata.stf_current_yield || ''}
                  onChange={(e) => onFieldChange('metadata.stf_current_yield', e.target.value)}
                  required
                />
              </div>

              {/* Expense Ratio */}
              <div className="space-y-2">
                <Label htmlFor="stfExpenseRatio">Expense Ratio (%)</Label>
                <Input
                  id="stfExpenseRatio"
                  type="number"
                  step="0.01"
                  value={metadata.stf_expense_ratio || ''}
                  onChange={(e) => onFieldChange('metadata.stf_expense_ratio', e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {/* Redemption Notice Period */}
              <div className="space-y-2">
                <Label htmlFor="stfRedemptionNotice">Redemption Notice Period (days)</Label>
                <Input
                  id="stfRedemptionNotice"
                  type="number"
                  value={metadata.stf_redemption_notice_period || ''}
                  onChange={(e) => onFieldChange('metadata.stf_redemption_notice_period', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            No specific fields for this asset type yet.
          </p>
        );
    }
  };

  return (
    <>
      {/* Asset Details Card - Shared Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Category:</span>
            <Badge variant="outline">Cash & Equivalents</Badge>
          </div>

          {/* Asset Type Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="cashAssetType">
              Asset Type <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={selectedSubcategory} 
              onValueChange={(value) => onFieldChange('selectedSubcategory', value)}
            >
              <SelectTrigger id="cashAssetType">
                <SelectValue placeholder="Select asset type *" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking_account">Checking Account</SelectItem>
                <SelectItem value="savings_account">Savings Account</SelectItem>
                <SelectItem value="money_market">Money Market</SelectItem>
                <SelectItem value="cash">Physical Cash</SelectItem>
                <SelectItem value="short_term_fund">Short-Term Fund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Asset Name and Current Balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="assetName">
                Asset Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assetName"
                value={assetName}
                onChange={(e) => onFieldChange('assetName', e.target.value)}
                placeholder='e.g., "Chase Business Checking," "Fidelity Treasury Money Market"'
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentBalance">
                Current Balance / Value <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currentBalance"
                type="number"
                step="0.01"
                min="0"
                value={assetValue}
                onChange={(e) => onFieldChange('assetValue', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Acquisition Date and Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="acquisitionDate">
                Acquisition Date
              </Label>
              <Input
                id="acquisitionDate"
                type="date"
                value={acquisitionDate || ''}
                onChange={(e) => onFieldChange('acquisitionDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisitionCost">
                Acquisition Cost
              </Label>
              <Input
                id="acquisitionCost"
                type="number"
                step="0.01"
                min="0"
                value={acquisitionCost || ''}
                onChange={(e) => onFieldChange('acquisitionCost', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Institution and Account Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="institutionProvider">
                Institution / Provider <span className="text-destructive">*</span>
              </Label>
              <Input
                id="institutionProvider"
                value={metadata.institution_provider || ''}
                onChange={(e) => onFieldChange('metadata.institution_provider', e.target.value)}
                placeholder="Bank, Brokerage, or Custodian"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountCustodianName">
                Account / Custodian Name
              </Label>
              <Input
                id="accountCustodianName"
                value={metadata.account_custodian_name || ''}
                onChange={(e) => onFieldChange('metadata.account_custodian_name', e.target.value)}
                placeholder="For internal labeling (optional)"
              />
            </div>
          </div>

          {/* Interest Rate and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="interestRate">
                Interest Rate (%)
              </Label>
              <div className="relative">
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={metadata.interest_rate || ''}
                  onChange={(e) => onFieldChange('metadata.interest_rate', e.target.value)}
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">
                Currency
              </Label>
              <Input
                id="currency"
                value={metadata.currency || 'USD'}
                onChange={(e) => onFieldChange('metadata.currency', e.target.value)}
                placeholder="USD"
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes / Description
            </Label>
            <Textarea
              id="notes"
              value={metadata.notes || ''}
              onChange={(e) => onFieldChange('metadata.notes', e.target.value)}
              placeholder="Optional free text area for additional information..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Type-Specific Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type-Specific Details</CardTitle>
        </CardHeader>
        <CardContent>
          {renderTypeSpecificFields()}
        </CardContent>
      </Card>

      {/* Documents & Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Documents Upload */}
          <div className="space-y-2">
            <Label htmlFor="documents">
              Documents (upload)
            </Label>
            <Input
              id="documents"
              type="file"
              multiple
              onChange={(e) => {
                // Handle file upload - will be implemented later
                console.log('Files selected:', e.target.files);
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Upload statements or proofs (optional)
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              value={tags.join(', ')}
              onChange={(e) => onFieldChange('tags', e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};
