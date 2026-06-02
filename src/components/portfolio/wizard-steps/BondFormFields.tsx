import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface BondFormFieldsProps {
  selectedSubcategory?: string;
  assetName: string;
  assetValue: number;
  acquisitionCost: number;
  acquisitionDate: string;
  annualIncome: number;
  metadata: Record<string, any>;
  tags: string[];
  onFieldChange: (field: string, value: any) => void;
}

export const BondFormFields: React.FC<BondFormFieldsProps> = ({
  selectedSubcategory,
  assetName,
  assetValue,
  acquisitionCost,
  acquisitionDate,
  annualIncome,
  metadata,
  tags,
  onFieldChange,
}) => {
  console.log('🎯 BondFormFields rendering with selectedSubcategory:', selectedSubcategory);
  
  useEffect(() => {
    console.log('🔄 selectedSubcategory changed to:', selectedSubcategory);
  }, [selectedSubcategory]);
  const faceValue = parseFloat(metadata.face_value) || 0;
  const couponRate = parseFloat(metadata.coupon_rate) || 0;

  // Auto-calculate annual income when face value or coupon rate changes
  useEffect(() => {
    if (faceValue > 0 && couponRate > 0) {
      const calculatedIncome = faceValue * (couponRate / 100);
      if (Math.abs(calculatedIncome - annualIncome) > 0.01) {
        onFieldChange('annualIncome', calculatedIncome);
      }
    }
  }, [faceValue, couponRate, annualIncome, onFieldChange]);

  // Shared fields (always visible for all 7 bond types)
  const renderSharedFields = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assetName">
              Asset Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="assetName"
              value={assetName}
              onChange={(e) => onFieldChange('assetName', e.target.value)}
              placeholder="e.g., US Treasury 10-Year"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetValue">
              Current Value <span className="text-destructive">*</span>
            </Label>
            <Input
              id="assetValue"
              type="number"
              step="0.01"
              min="0"
              value={assetValue}
              onChange={(e) => onFieldChange('assetValue', e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">
              Purchase Price <span className="text-destructive">*</span>
            </Label>
            <Input
              id="acquisitionCost"
              type="number"
              step="0.01"
              min="0"
              value={acquisitionCost || ''}
              onChange={(e) => onFieldChange('acquisitionCost', e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acquisitionDate">
              Purchase Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="acquisitionDate"
              type="date"
              value={acquisitionDate || ''}
              onChange={(e) => onFieldChange('acquisitionDate', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maturity_date">
              Maturity Date
            </Label>
            <Input
              id="maturity_date"
              type="date"
              value={metadata.maturity_date || ''}
              onChange={(e) => onFieldChange('metadata.maturity_date', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuer">
              Issuer / Institution
            </Label>
            <Input
              id="issuer"
              value={metadata.issuer || ''}
              onChange={(e) => onFieldChange('metadata.issuer', e.target.value)}
              placeholder="e.g., US Treasury, Bank Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_custodian">
              Account / Custodian
            </Label>
            <Input
              id="account_custodian"
              value={metadata.account_custodian || ''}
              onChange={(e) => onFieldChange('metadata.account_custodian', e.target.value)}
              placeholder="e.g., Fidelity, Vanguard"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes / Description
            </Label>
            <Textarea
              id="notes"
              value={metadata.notes || ''}
              onChange={(e) => onFieldChange('metadata.notes', e.target.value)}
              placeholder="Additional notes about this asset..."
              rows={3}
            />
          </div>

        </div>
      </div>
    </div>
  );

  // Fixed Income (General) fields
  const renderFixedIncomeFields = () => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="interest_rate">
            Interest Rate (%) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="interest_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={metadata.interest_rate || ''}
              onChange={(e) => onFieldChange('metadata.interest_rate', e.target.value)}
              placeholder="4.50"
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="term_length">
            Term Length (years) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="term_length"
            type="number"
            step="0.1"
            min="0"
            value={metadata.term_length || ''}
            onChange={(e) => onFieldChange('metadata.term_length', e.target.value)}
            placeholder="5"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_frequency">
            Payment Frequency
          </Label>
          <Select
            value={metadata.payment_frequency || ''}
            onValueChange={(value) => onFieldChange('metadata.payment_frequency', value)}
          >
            <SelectTrigger id="payment_frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="semiannual">Semiannual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="credit_rating">
            Rating
          </Label>
          <Input
            id="credit_rating"
            value={metadata.credit_rating || ''}
            onChange={(e) => onFieldChange('metadata.credit_rating', e.target.value)}
            placeholder="AAA, AA+, BBB, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="collateralized" className="flex items-center gap-2">
            Collateralized?
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="collateralized"
              checked={metadata.collateralized === true || metadata.collateralized === 'true'}
              onCheckedChange={(checked) => onFieldChange('metadata.collateralized', checked)}
            />
            <Label htmlFor="collateralized" className="text-sm font-normal cursor-pointer">
              {metadata.collateralized ? 'Yes' : 'No'}
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="callable" className="flex items-center gap-2">
            Callable?
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="callable"
              checked={metadata.callable === true || metadata.callable === 'true'}
              onCheckedChange={(checked) => onFieldChange('metadata.callable', checked)}
            />
            <Label htmlFor="callable" className="text-sm font-normal cursor-pointer">
              {metadata.callable ? 'Yes' : 'No'}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );

  // Government Bond fields
  const renderGovernmentBondFields = () => (
    <div className="space-y-4 mt-4">
      <Alert className="py-2 px-3">
        <Info className="h-3 w-3" />
        <AlertDescription className="text-xs">
          Annual income will be automatically calculated from face value × coupon rate
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="government_bond_type">
            Bond Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={metadata.government_bond_type || ''}
            onValueChange={(value) => onFieldChange('metadata.government_bond_type', value)}
          >
            <SelectTrigger id="government_bond_type">
              <SelectValue placeholder="Select bond type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="treasury_note">Treasury Note</SelectItem>
              <SelectItem value="treasury_bond">Treasury Bond</SelectItem>
              <SelectItem value="tips">TIPS</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="face_value">
            Face Value / Par <span className="text-destructive">*</span>
          </Label>
          <Input
            id="face_value"
            type="number"
            step="0.01"
            min="0"
            value={metadata.face_value || ''}
            onChange={(e) => onFieldChange('metadata.face_value', e.target.value)}
            placeholder="10000.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coupon_rate">
            Coupon Rate (%) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="coupon_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={metadata.coupon_rate || ''}
              onChange={(e) => onFieldChange('metadata.coupon_rate', e.target.value)}
              placeholder="4.50"
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coupon_frequency">
            Coupon Frequency <span className="text-destructive">*</span>
          </Label>
          <Select
            value={metadata.coupon_frequency || ''}
            onValueChange={(value) => onFieldChange('metadata.coupon_frequency', value)}
          >
            <SelectTrigger id="coupon_frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semiannual">Semiannual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue_date">
            Issue Date
          </Label>
          <Input
            id="issue_date"
            type="date"
            value={metadata.issue_date || ''}
            onChange={(e) => onFieldChange('metadata.issue_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cusip">
            CUSIP / Identifier
          </Label>
          <Input
            id="cusip"
            value={metadata.cusip || ''}
            onChange={(e) => onFieldChange('metadata.cusip', e.target.value)}
            placeholder="Enter CUSIP"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_treatment">
            Tax Treatment
          </Label>
          <Select
            value={metadata.tax_treatment || ''}
            onValueChange={(value) => onFieldChange('metadata.tax_treatment', value)}
          >
            <SelectTrigger id="tax_treatment">
              <SelectValue placeholder="Select tax treatment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="taxable">Taxable</SelectItem>
              <SelectItem value="federal_tax_free">Federal Tax-Free</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="callable" className="flex items-center gap-2">
            Callable?
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="callable"
              checked={metadata.callable === true || metadata.callable === 'true'}
              onCheckedChange={(checked) => onFieldChange('metadata.callable', checked)}
            />
            <Label htmlFor="callable" className="text-sm font-normal cursor-pointer">
              {metadata.callable ? 'Yes' : 'No'}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );

  // Corporate Bond fields
  const renderCorporateBondFields = () => (
    <div className="space-y-4 mt-4">
      <Alert className="py-2 px-3">
        <Info className="h-3 w-3" />
        <AlertDescription className="text-xs">
          Annual income will be automatically calculated from face value × coupon rate
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="face_value">
            Face Value / Par <span className="text-destructive">*</span>
          </Label>
          <Input
            id="face_value"
            type="number"
            step="0.01"
            min="0"
            value={metadata.face_value || ''}
            onChange={(e) => onFieldChange('metadata.face_value', e.target.value)}
            placeholder="10000.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coupon_rate">
            Coupon Rate (%) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="coupon_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={metadata.coupon_rate || ''}
              onChange={(e) => onFieldChange('metadata.coupon_rate', e.target.value)}
              placeholder="5.25"
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="credit_rating">
            Credit Rating
          </Label>
          <Input
            id="credit_rating"
            value={metadata.credit_rating || ''}
            onChange={(e) => onFieldChange('metadata.credit_rating', e.target.value)}
            placeholder="AAA, AA+, BBB, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cusip">
            CUSIP / Identifier
          </Label>
          <Input
            id="cusip"
            value={metadata.cusip || ''}
            onChange={(e) => onFieldChange('metadata.cusip', e.target.value)}
            placeholder="Enter CUSIP"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="callable" className="flex items-center gap-2">
            Callable?
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="callable"
              checked={metadata.callable === true || metadata.callable === 'true'}
              onCheckedChange={(checked) => onFieldChange('metadata.callable', checked)}
            />
            <Label htmlFor="callable" className="text-sm font-normal cursor-pointer">
              {metadata.callable ? 'Yes' : 'No'}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );

  // Municipal Bond fields
  const renderMunicipalBondFields = () => (
    <div className="space-y-4 mt-4">
      <Alert className="py-2 px-3">
        <Info className="h-3 w-3" />
        <AlertDescription className="text-xs">
          Annual income will be automatically calculated from face value × coupon rate
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="issuing_municipality">
            Issuing Municipality <span className="text-destructive">*</span>
          </Label>
          <Input
            id="issuing_municipality"
            value={metadata.issuing_municipality || ''}
            onChange={(e) => onFieldChange('metadata.issuing_municipality', e.target.value)}
            placeholder="e.g., City of Los Angeles"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="municipal_bond_type">
            Bond Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={metadata.municipal_bond_type || ''}
            onValueChange={(value) => onFieldChange('metadata.municipal_bond_type', value)}
          >
            <SelectTrigger id="municipal_bond_type">
              <SelectValue placeholder="Select bond type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general_obligation">General Obligation</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="special_tax">Special Tax</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="face_value">
            Face Value / Par <span className="text-destructive">*</span>
          </Label>
          <Input
            id="face_value"
            type="number"
            step="0.01"
            min="0"
            value={metadata.face_value || ''}
            onChange={(e) => onFieldChange('metadata.face_value', e.target.value)}
            placeholder="10000.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coupon_rate">
            Coupon Rate (%) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="coupon_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={metadata.coupon_rate || ''}
              onChange={(e) => onFieldChange('metadata.coupon_rate', e.target.value)}
              placeholder="3.75"
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coupon_frequency">
            Coupon Frequency
          </Label>
          <Select
            value={metadata.coupon_frequency || ''}
            onValueChange={(value) => onFieldChange('metadata.coupon_frequency', value)}
          >
            <SelectTrigger id="coupon_frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semiannual">Semiannual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_status">
            Tax Status <span className="text-destructive">*</span>
          </Label>
          <Select
            value={metadata.tax_status || ''}
            onValueChange={(value) => onFieldChange('metadata.tax_status', value)}
          >
            <SelectTrigger id="tax_status">
              <SelectValue placeholder="Select tax status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="federal_tax_free">Federal Tax-Free</SelectItem>
              <SelectItem value="fed_state_tax_free">Fed+State Tax-Free</SelectItem>
              <SelectItem value="taxable">Taxable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="credit_rating">
            Credit Rating
          </Label>
          <Input
            id="credit_rating"
            value={metadata.credit_rating || ''}
            onChange={(e) => onFieldChange('metadata.credit_rating', e.target.value)}
            placeholder="AAA, AA+, BBB, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="callable" className="flex items-center gap-2">
            Callable?
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="callable"
              checked={metadata.callable === true || metadata.callable === 'true'}
              onCheckedChange={(checked) => onFieldChange('metadata.callable', checked)}
            />
            <Label htmlFor="callable" className="text-sm font-normal cursor-pointer">
              {metadata.callable ? 'Yes' : 'No'}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );

  // Certificate of Deposit fields
  const renderCDFields = () => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="deposit_amount">
            Deposit Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            id="deposit_amount"
            type="number"
            step="0.01"
            min="0"
            value={metadata.deposit_amount || ''}
            onChange={(e) => onFieldChange('metadata.deposit_amount', e.target.value)}
            placeholder="10000.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interest_rate">
            Interest Rate (%) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="interest_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={metadata.interest_rate || ''}
              onChange={(e) => onFieldChange('metadata.interest_rate', e.target.value)}
              placeholder="4.25"
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="compounding_method">
            Compounding Method
          </Label>
          <Select
            value={metadata.compounding_method || ''}
            onValueChange={(value) => onFieldChange('metadata.compounding_method', value)}
          >
            <SelectTrigger id="compounding_method">
              <SelectValue placeholder="Select compounding method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="term_length">
            Term Length <span className="text-destructive">*</span>
          </Label>
          <Input
            id="term_length"
            type="number"
            step="0.1"
            min="0"
            value={metadata.term_length || ''}
            onChange={(e) => onFieldChange('metadata.term_length', e.target.value)}
            placeholder="1.5"
            required
          />
          <p className="text-xs text-muted-foreground">In years</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="early_withdrawal_penalty">
            Early Withdrawal Penalty
          </Label>
          <Input
            id="early_withdrawal_penalty"
            value={metadata.early_withdrawal_penalty || ''}
            onChange={(e) => onFieldChange('metadata.early_withdrawal_penalty', e.target.value)}
            placeholder="e.g., 90 days interest"
          />
        </div>
      </div>
    </div>
  );

  // Treasury Security fields
  const renderTreasurySecurityFields = () => {
    const securityType = metadata.treasury_security_type;
    const isBill = securityType === 'bill';
    const isNoteOrBond = securityType === 'note' || securityType === 'bond';

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="treasury_security_type">
              Security Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={metadata.treasury_security_type || ''}
              onValueChange={(value) => onFieldChange('metadata.treasury_security_type', value)}
            >
              <SelectTrigger id="treasury_security_type">
                <SelectValue placeholder="Select security type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bill">Bill</SelectItem>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="bond">Bond</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="face_value">
              Face Value / Par <span className="text-destructive">*</span>
            </Label>
            <Input
              id="face_value"
              type="number"
              step="0.01"
              min="0"
              value={metadata.face_value || ''}
              onChange={(e) => onFieldChange('metadata.face_value', e.target.value)}
              placeholder="10000.00"
              required
            />
          </div>

          {isBill && (
            <div className="space-y-2">
              <Label htmlFor="discount_rate">
                Discount Rate (%) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="discount_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={metadata.discount_rate || ''}
                  onChange={(e) => onFieldChange('metadata.discount_rate', e.target.value)}
                  placeholder="4.00"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          )}

          {isNoteOrBond && (
            <div className="space-y-2">
              <Label htmlFor="coupon_rate">
                Coupon Rate (%)
              </Label>
              <div className="relative">
                <Input
                  id="coupon_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={metadata.coupon_rate || ''}
                  onChange={(e) => onFieldChange('metadata.coupon_rate', e.target.value)}
                  placeholder="4.50"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="purchase_method">
              Auction / Purchase Method
            </Label>
            <Select
              value={metadata.purchase_method || ''}
              onValueChange={(value) => onFieldChange('metadata.purchase_method', value)}
            >
              <SelectTrigger id="purchase_method">
                <SelectValue placeholder="Select purchase method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auction">Auction</SelectItem>
                <SelectItem value="secondary_market">Secondary Market</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_date">
              Issue Date
            </Label>
            <Input
              id="issue_date"
              type="date"
              value={metadata.issue_date || ''}
              onChange={(e) => onFieldChange('metadata.issue_date', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cusip">
              CUSIP / Identifier
            </Label>
            <Input
              id="cusip"
              value={metadata.cusip || ''}
              onChange={(e) => onFieldChange('metadata.cusip', e.target.value)}
              placeholder="Enter CUSIP"
            />
          </div>
        </div>
      </div>
    );
  };

  // Private Note / Promissory Note fields
  const renderPrivateNoteFields = () => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="borrower">
            Borrower / Counterparty <span className="text-destructive">*</span>
          </Label>
          <Input
            id="borrower"
            value={metadata.borrower || ''}
            onChange={(e) => onFieldChange('metadata.borrower', e.target.value)}
            placeholder="Borrower name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="principal_amount">
            Principal Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            id="principal_amount"
            type="number"
            step="0.01"
            min="0"
            value={metadata.principal_amount || ''}
            onChange={(e) => onFieldChange('metadata.principal_amount', e.target.value)}
            placeholder="50000.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interest_rate">
            Interest Rate (%) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="interest_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={metadata.interest_rate || ''}
              onChange={(e) => onFieldChange('metadata.interest_rate', e.target.value)}
              placeholder="6.50"
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_schedule">
            Payment Schedule <span className="text-destructive">*</span>
          </Label>
          <Select
            value={metadata.payment_schedule || ''}
            onValueChange={(value) => onFieldChange('metadata.payment_schedule', value)}
          >
            <SelectTrigger id="payment_schedule">
              <SelectValue placeholder="Select payment schedule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="interest_only">Interest-Only</SelectItem>
              <SelectItem value="balloon">Balloon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="term_length">
            Term Length <span className="text-destructive">*</span>
          </Label>
          <Input
            id="term_length"
            value={metadata.term_length || ''}
            onChange={(e) => onFieldChange('metadata.term_length', e.target.value)}
            placeholder="e.g., 5 years or 60 months"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="collateral_description">
            Collateral Description
          </Label>
          <Input
            id="collateral_description"
            value={metadata.collateral_description || ''}
            onChange={(e) => onFieldChange('metadata.collateral_description', e.target.value)}
            placeholder="Description of collateral"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amortization_type">
            Amortization Type
          </Label>
          <Select
            value={metadata.amortization_type || ''}
            onValueChange={(value) => onFieldChange('metadata.amortization_type', value)}
          >
            <SelectTrigger id="amortization_type">
              <SelectValue placeholder="Select amortization type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="interest_only">Interest-Only</SelectItem>
              <SelectItem value="amortized">Amortized</SelectItem>
              <SelectItem value="balloon">Balloon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signed_date">
            Signed Agreement Date
          </Label>
          <Input
            id="signed_date"
            type="date"
            value={metadata.signed_date || ''}
            onChange={(e) => onFieldChange('metadata.signed_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="servicing_platform">
            Servicing Platform
          </Label>
          <Input
            id="servicing_platform"
            value={metadata.servicing_platform || ''}
            onChange={(e) => onFieldChange('metadata.servicing_platform', e.target.value)}
            placeholder="e.g., LendingClub, Prosper"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Shared Fields */}
      {renderSharedFields()}

      {/* Type-Specific Fields in Card */}
      {selectedSubcategory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Type-Specific Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSubcategory === 'fixed_income' && renderFixedIncomeFields()}
            {selectedSubcategory === 'government_bond' && renderGovernmentBondFields()}
            {selectedSubcategory === 'corporate_bond' && renderCorporateBondFields()}
            {selectedSubcategory === 'municipal_bond' && renderMunicipalBondFields()}
            {selectedSubcategory === 'cd' && renderCDFields()}
            {selectedSubcategory === 'treasury_security' && renderTreasurySecurityFields()}
            {selectedSubcategory === 'private_note' && renderPrivateNoteFields()}

            <div className="space-y-2">
              <Label htmlFor="documents">
                Documents (upload)
              </Label>
              <Input
                id="documents"
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const fileNames = files.map(f => f.name);
                  onFieldChange('metadata.documents', fileNames);
                }}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Upload supporting documents (statements, certificates, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags (comma-separated)
              </Label>
              <Input
                id="tags"
                value={tags.join(', ')}
                onChange={(e) => onFieldChange('tags', e.target.value)}
                placeholder="treasury, fixed-income, government"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
