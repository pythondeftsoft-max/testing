import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardData } from "../AddAssetWizard";

interface PrivateEquityBusinessFormFieldsProps {
  wizardData: WizardData;
  onFieldChange: (field: string, value: any) => void;
}

export const PrivateEquityBusinessFormFields = ({ 
  wizardData, 
  onFieldChange 
}: PrivateEquityBusinessFormFieldsProps) => {
  // Determine if this is PE fund vs business ownership
  const isPrivateEquityFund = ['private_equity_fund', 'venture_capital', 'hedge_fund', 'private_debt', 'private_company_stock'].includes(wizardData.selectedSubcategory || '');
  const isBusinessOwnership = ['sole_proprietorship', 'partnership', 'llc_ownership', 'corporation_stock', 'franchise'].includes(wizardData.selectedSubcategory || '');

  return (
    <div className="space-y-6">
      {/* SHARED SECTION - All Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entity / Investment Name */}
        <div className="space-y-2">
          <Label htmlFor="assetName">
            Entity / Investment Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="assetName"
            value={wizardData.assetName}
            onChange={(e) => onFieldChange('assetName', e.target.value)}
            placeholder="Atlas Growth Fund II, ABC Holdings LLC, etc."
            required
          />
          <p className="text-xs text-muted-foreground">
            Name of the fund, company, or business
          </p>
        </div>

        {/* Ownership Percentage */}
        <div className="space-y-2">
          <Label htmlFor="ownershipPercentage">
            Ownership Percentage (%) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ownershipPercentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={wizardData.metadata.ownership_percentage || ''}
            onChange={(e) => onFieldChange('metadata.ownership_percentage', e.target.value)}
            placeholder="25.5"
            required
          />
          <p className="text-xs text-muted-foreground">
            Percentage of equity you own
          </p>
        </div>

        {/* Initial Investment / Purchase Price */}
        <div className="space-y-2">
          <Label htmlFor="acquisitionCost">
            Initial Investment / Purchase Price <span className="text-destructive">*</span>
          </Label>
          <Input
            id="acquisitionCost"
            type="number"
            step="0.01"
            min="0"
            value={wizardData.acquisitionCost || ''}
            onChange={(e) => onFieldChange('acquisitionCost', parseFloat(e.target.value) || 0)}
            placeholder="100000.00"
            required
          />
          <p className="text-xs text-muted-foreground">
            Original capital contribution or purchase price
          </p>
        </div>

        {/* Investment Date */}
        <div className="space-y-2">
          <Label htmlFor="acquisitionDate">
            Investment Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="acquisitionDate"
            type="date"
            value={wizardData.acquisitionDate || ''}
            onChange={(e) => onFieldChange('acquisitionDate', e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Date you acquired or funded this investment
          </p>
        </div>

        {/* Current Value */}
        <div className="space-y-2">
          <Label htmlFor="assetValue">
            Current Value <span className="text-destructive">*</span>
          </Label>
          <Input
            id="assetValue"
            type="number"
            step="0.01"
            min="0"
            value={wizardData.assetValue}
            onChange={(e) => onFieldChange('assetValue', parseFloat(e.target.value) || 0)}
            placeholder="125000.00"
            required
          />
          <p className="text-xs text-muted-foreground">
            Current estimated value or market appraisal
          </p>
        </div>

        {/* Valuation Method */}
        <div className="space-y-2">
          <Label htmlFor="valuationMethod">Valuation Method</Label>
          <Select
            value={wizardData.metadata.valuation_method || ''}
            onValueChange={(value) => onFieldChange('metadata.valuation_method', value)}
          >
            <SelectTrigger id="valuationMethod">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="appraised">Appraised</SelectItem>
              <SelectItem value="reported">Reported (Fund NAV)</SelectItem>
              <SelectItem value="nav">Net Asset Value (NAV)</SelectItem>
              <SelectItem value="estimated">Estimated</SelectItem>
              <SelectItem value="market_multiple">Market Multiple</SelectItem>
              <SelectItem value="cost">Cost Basis</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            How the current value was determined
          </p>
        </div>

        {/* Capital Contributions (Total) */}
        <div className="space-y-2">
          <Label htmlFor="capitalContributions">Total Capital Contributions</Label>
          <Input
            id="capitalContributions"
            type="number"
            step="0.01"
            min="0"
            value={wizardData.metadata.total_capital_contributions || ''}
            onChange={(e) => onFieldChange('metadata.total_capital_contributions', e.target.value)}
            placeholder="110000.00"
          />
          <p className="text-xs text-muted-foreground">
            Sum of all contributions including initial investment
          </p>
        </div>

        {/* Distributions / Withdrawals */}
        <div className="space-y-2">
          <Label htmlFor="distributions">Distributions / Withdrawals Received</Label>
          <Input
            id="distributions"
            type="number"
            step="0.01"
            min="0"
            value={wizardData.metadata.total_distributions || ''}
            onChange={(e) => onFieldChange('metadata.total_distributions', e.target.value)}
            placeholder="5000.00"
          />
          <p className="text-xs text-muted-foreground">
            Total distributions or withdrawals received to date
          </p>
        </div>

        {/* Account / Custodian */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="custodian">Account / Custodian</Label>
          <Input
            id="custodian"
            value={wizardData.metadata.custodian || ''}
            onChange={(e) => onFieldChange('metadata.custodian', e.target.value)}
            placeholder="Fidelity Private Fund Platform, Direct Ownership, etc."
          />
          <p className="text-xs text-muted-foreground">
            Where this investment is held
          </p>
        </div>
      </div>

      {/* Notes / Description */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes / Description</Label>
        <Textarea
          id="notes"
          value={wizardData.notes || ''}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          placeholder="Additional details about this investment..."
          rows={3}
        />
      </div>

      {/* 1. PRIVATE EQUITY FUND */}
      {wizardData.selectedSubcategory === 'private_equity_fund' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Private Equity Fund Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundType">
                Fund Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.metadata.fund_type || ''}
                onValueChange={(value) => onFieldChange('metadata.fund_type', value)}
              >
                <SelectTrigger id="fundType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyout">Buyout</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="secondaries">Secondaries</SelectItem>
                  <SelectItem value="fund_of_funds">Fund of Funds</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fundManager">
                Fund Manager <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fundManager"
                value={wizardData.metadata.fund_manager || ''}
                onChange={(e) => onFieldChange('metadata.fund_manager', e.target.value)}
                placeholder="KKR, Blackstone, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capitalCommitment">
                Capital Commitment <span className="text-destructive">*</span>
              </Label>
              <Input
                id="capitalCommitment"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.capital_commitment || ''}
                onChange={(e) => onFieldChange('metadata.capital_commitment', e.target.value)}
                placeholder="1000000.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capitalCalled">Capital Called to Date</Label>
              <Input
                id="capitalCalled"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.capital_called || ''}
                onChange={(e) => onFieldChange('metadata.capital_called', e.target.value)}
                placeholder="750000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remainingCommitment">Remaining Commitment</Label>
              <Input
                id="remainingCommitment"
                type="number"
                value={
                  (parseFloat(wizardData.metadata.capital_commitment || '0') - 
                   parseFloat(wizardData.metadata.capital_called || '0')).toFixed(2)
                }
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Auto-calculated</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distributionFrequency">Distribution Frequency</Label>
              <Select
                value={wizardData.metadata.distribution_frequency || ''}
                onValueChange={(value) => onFieldChange('metadata.distribution_frequency', value)}
              >
                <SelectTrigger id="distributionFrequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="as_occurred">As Occurred</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedTerm">Expected Term (years)</Label>
              <Input
                id="expectedTerm"
                type="number"
                step="0.5"
                min="0"
                value={wizardData.metadata.expected_term_years || ''}
                onChange={(e) => onFieldChange('metadata.expected_term_years', e.target.value)}
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="irr">IRR (%)</Label>
              <Input
                id="irr"
                type="number"
                step="0.01"
                value={wizardData.metadata.irr || ''}
                onChange={(e) => onFieldChange('metadata.irr', e.target.value)}
                placeholder="15.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. VENTURE CAPITAL */}
      {wizardData.selectedSubcategory === 'venture_capital' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Venture Capital Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investmentStage">
                Fund / Investment Stage <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.metadata.investment_stage || ''}
                onValueChange={(value) => onFieldChange('metadata.investment_stage', value)}
              >
                <SelectTrigger id="investmentStage">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="series_a">Series A</SelectItem>
                  <SelectItem value="series_b">Series B</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadInvestor">Lead Investor</Label>
              <Input
                id="leadInvestor"
                value={wizardData.metadata.lead_investor || ''}
                onChange={(e) => onFieldChange('metadata.lead_investor', e.target.value)}
                placeholder="Sequoia, a16z, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolioCompany">
                Portfolio Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="portfolioCompany"
                value={wizardData.metadata.portfolio_company_name || ''}
                onChange={(e) => onFieldChange('metadata.portfolio_company_name', e.target.value)}
                placeholder="Startup Co."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vcOwnership">
                Ownership % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vcOwnership"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={wizardData.metadata.vc_ownership_percentage || ''}
                onChange={(e) => onFieldChange('metadata.vc_ownership_percentage', e.target.value)}
                placeholder="5.5"
                required
              />
              <p className="text-xs text-muted-foreground">For direct investments</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exitStrategy">Exit Strategy / Timeline</Label>
              <Input
                id="exitStrategy"
                value={wizardData.metadata.exit_strategy || ''}
                onChange={(e) => onFieldChange('metadata.exit_strategy', e.target.value)}
                placeholder="IPO in 3-5 years"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValuation">Current Round Valuation</Label>
              <Input
                id="currentValuation"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.current_round_valuation || ''}
                onChange={(e) => onFieldChange('metadata.current_round_valuation', e.target.value)}
                placeholder="50000000.00"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. PRIVATE COMPANY STOCK */}
      {wizardData.selectedSubcategory === 'private_company_stock' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Private Company Stock Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                value={wizardData.metadata.company_name || ''}
                onChange={(e) => onFieldChange('metadata.company_name', e.target.value)}
                placeholder="ABC Corp"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numShares">
                Number of Shares <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numShares"
                type="number"
                step="1"
                min="0"
                value={wizardData.metadata.num_shares || ''}
                onChange={(e) => onFieldChange('metadata.num_shares', e.target.value)}
                placeholder="10000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerShare">
                Purchase Price per Share <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pricePerShare"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.price_per_share || ''}
                onChange={(e) => onFieldChange('metadata.price_per_share', e.target.value)}
                placeholder="10.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockOwnership">
                Ownership % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stockOwnership"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={wizardData.metadata.stock_ownership_percentage || ''}
                onChange={(e) => onFieldChange('metadata.stock_ownership_percentage', e.target.value)}
                placeholder="15.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shareClass">Class of Shares</Label>
              <Select
                value={wizardData.metadata.share_class || ''}
                onValueChange={(value) => onFieldChange('metadata.share_class', value)}
              >
                <SelectTrigger id="shareClass">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuationSource">Valuation Source</Label>
              <Select
                value={wizardData.metadata.valuation_source || ''}
                onValueChange={(value) => onFieldChange('metadata.valuation_source', value)}
              >
                <SelectTrigger id="valuationSource">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appraised">Appraised</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="409a">409A Valuation</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="dividendHistory">Dividend / Distribution History</Label>
              <Textarea
                id="dividendHistory"
                value={wizardData.metadata.dividend_history || ''}
                onChange={(e) => onFieldChange('metadata.dividend_history', e.target.value)}
                placeholder="Quarterly $0.50/share since 2020"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. HEDGE FUND */}
      {wizardData.selectedSubcategory === 'hedge_fund' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Hedge Fund Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundStrategy">
                Fund Strategy <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.metadata.fund_strategy || ''}
                onValueChange={(value) => onFieldChange('metadata.fund_strategy', value)}
              >
                <SelectTrigger id="fundStrategy">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long_short">Long/Short</SelectItem>
                  <SelectItem value="macro">Macro</SelectItem>
                  <SelectItem value="quant">Quantitative</SelectItem>
                  <SelectItem value="multi_strategy">Multi-Strategy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hedgeFundManager">
                Fund Manager <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hedgeFundManager"
                value={wizardData.metadata.hedge_fund_manager || ''}
                onChange={(e) => onFieldChange('metadata.hedge_fund_manager', e.target.value)}
                placeholder="Bridgewater, Citadel, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriptionDate">
                Subscription Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subscriptionDate"
                type="date"
                value={wizardData.metadata.subscription_date || ''}
                onChange={(e) => onFieldChange('metadata.subscription_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redemptionFrequency">Redemption Frequency</Label>
              <Select
                value={wizardData.metadata.redemption_frequency || ''}
                onValueChange={(value) => onFieldChange('metadata.redemption_frequency', value)}
              >
                <SelectTrigger id="redemptionFrequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumLockup">Minimum Lock-Up (months)</Label>
              <Input
                id="minimumLockup"
                type="number"
                step="1"
                min="0"
                value={wizardData.metadata.minimum_lockup_months || ''}
                onChange={(e) => onFieldChange('metadata.minimum_lockup_months', e.target.value)}
                placeholder="12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="performanceFee">Performance Fee (%)</Label>
              <Input
                id="performanceFee"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={wizardData.metadata.performance_fee || ''}
                onChange={(e) => onFieldChange('metadata.performance_fee', e.target.value)}
                placeholder="20.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hurdleRate">Hurdle Rate (%)</Label>
              <Input
                id="hurdleRate"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.hurdle_rate || ''}
                onChange={(e) => onFieldChange('metadata.hurdle_rate', e.target.value)}
                placeholder="8.0"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. PRIVATE DEBT */}
      {wizardData.selectedSubcategory === 'private_debt' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Private Debt Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="borrower">
                Borrower / Issuer <span className="text-destructive">*</span>
              </Label>
              <Input
                id="borrower"
                value={wizardData.metadata.borrower || ''}
                onChange={(e) => onFieldChange('metadata.borrower', e.target.value)}
                placeholder="ABC Corp"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loanType">
                Loan Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.metadata.loan_type || ''}
                onValueChange={(value) => onFieldChange('metadata.loan_type', value)}
              >
                <SelectTrigger id="loanType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="mezzanine">Mezzanine</SelectItem>
                  <SelectItem value="convertible">Convertible</SelectItem>
                  <SelectItem value="bridge">Bridge</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="principalAmount">
                Principal Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="principalAmount"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.principal_amount || ''}
                onChange={(e) => onFieldChange('metadata.principal_amount', e.target.value)}
                placeholder="500000.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">
                Interest Rate (%) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.interest_rate || ''}
                onChange={(e) => onFieldChange('metadata.interest_rate', e.target.value)}
                placeholder="8.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentFrequency">Payment Frequency</Label>
              <Select
                value={wizardData.metadata.payment_frequency || ''}
                onValueChange={(value) => onFieldChange('metadata.payment_frequency', value)}
              >
                <SelectTrigger id="paymentFrequency">
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
              <Label htmlFor="maturityDate">
                Maturity Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="maturityDate"
                type="date"
                value={wizardData.metadata.maturity_date || ''}
                onChange={(e) => onFieldChange('metadata.maturity_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="collateralDescription">Collateral Description</Label>
              <Textarea
                id="collateralDescription"
                value={wizardData.metadata.collateral_description || ''}
                onChange={(e) => onFieldChange('metadata.collateral_description', e.target.value)}
                placeholder="Commercial real estate, equipment, etc."
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="covenantNotes">Covenant Notes</Label>
              <Textarea
                id="covenantNotes"
                value={wizardData.metadata.covenant_notes || ''}
                onChange={(e) => onFieldChange('metadata.covenant_notes', e.target.value)}
                placeholder="Debt-to-EBITDA < 3.0x, etc."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. SOLE PROPRIETORSHIP */}
      {wizardData.selectedSubcategory === 'sole_proprietorship' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Sole Proprietorship Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="businessName"
                value={wizardData.metadata.business_name || ''}
                onChange={(e) => onFieldChange('metadata.business_name', e.target.value)}
                placeholder="John's Consulting"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spIndustry">
                Industry <span className="text-destructive">*</span>
              </Label>
              <Input
                id="spIndustry"
                value={wizardData.metadata.sp_industry || ''}
                onChange={(e) => onFieldChange('metadata.sp_industry', e.target.value)}
                placeholder="Consulting, Retail, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spRevenue">Annual Revenue</Label>
              <Input
                id="spRevenue"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.sp_annual_revenue || ''}
                onChange={(e) => onFieldChange('metadata.sp_annual_revenue', e.target.value)}
                placeholder="250000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spNetIncome">Annual Net Income</Label>
              <Input
                id="spNetIncome"
                type="number"
                step="0.01"
                value={wizardData.metadata.sp_annual_net_income || ''}
                onChange={(e) => onFieldChange('metadata.sp_annual_net_income', e.target.value)}
                placeholder="75000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spValuation">Business Valuation</Label>
              <Input
                id="spValuation"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.sp_business_valuation || ''}
                onChange={(e) => onFieldChange('metadata.sp_business_valuation', e.target.value)}
                placeholder="500000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spEin">EIN</Label>
              <Input
                id="spEin"
                value={wizardData.metadata.sp_ein || ''}
                onChange={(e) => onFieldChange('metadata.sp_ein', e.target.value)}
                placeholder="12-3456789"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. PARTNERSHIP */}
      {wizardData.selectedSubcategory === 'partnership' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Partnership Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partnershipName">
                Partnership Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partnershipName"
                value={wizardData.metadata.partnership_name || ''}
                onChange={(e) => onFieldChange('metadata.partnership_name', e.target.value)}
                placeholder="Smith & Jones Partners"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnershipType">Partnership Type</Label>
              <Select
                value={wizardData.metadata.partnership_type || ''}
                onValueChange={(value) => onFieldChange('metadata.partnership_type', value)}
              >
                <SelectTrigger id="partnershipType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Partnership</SelectItem>
                  <SelectItem value="limited">Limited Partnership</SelectItem>
                  <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnershipCapital">
                Capital Contribution <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partnershipCapital"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.partnership_capital_contribution || ''}
                onChange={(e) => onFieldChange('metadata.partnership_capital_contribution', e.target.value)}
                placeholder="100000.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnershipOwnership">
                Ownership % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partnershipOwnership"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={wizardData.metadata.partnership_ownership_percentage || ''}
                onChange={(e) => onFieldChange('metadata.partnership_ownership_percentage', e.target.value)}
                placeholder="50.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnershipDistribution">Distribution Frequency</Label>
              <Select
                value={wizardData.metadata.partnership_distribution_frequency || ''}
                onValueChange={(value) => onFieldChange('metadata.partnership_distribution_frequency', value)}
              >
                <SelectTrigger id="partnershipDistribution">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="as_occurred">As Occurred</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="k1Received">K-1 Received?</Label>
              <Select
                value={wizardData.metadata.k1_received || ''}
                onValueChange={(value) => onFieldChange('metadata.k1_received', value)}
              >
                <SelectTrigger id="k1Received">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. LLC OWNERSHIP */}
      {wizardData.selectedSubcategory === 'llc_ownership' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">LLC Ownership Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="llcName">
                LLC Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="llcName"
                value={wizardData.metadata.llc_name || ''}
                onChange={(e) => onFieldChange('metadata.llc_name', e.target.value)}
                placeholder="My Company LLC"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="llcRole">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.metadata.llc_role || ''}
                onValueChange={(value) => onFieldChange('metadata.llc_role', value)}
              >
                <SelectTrigger id="llcRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="both">Member & Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llcOwnership">
                Ownership % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="llcOwnership"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={wizardData.metadata.llc_ownership_percentage || ''}
                onChange={(e) => onFieldChange('metadata.llc_ownership_percentage', e.target.value)}
                placeholder="100.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="llcCapital">
                Capital Contribution <span className="text-destructive">*</span>
              </Label>
              <Input
                id="llcCapital"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.llc_capital_contribution || ''}
                onChange={(e) => onFieldChange('metadata.llc_capital_contribution', e.target.value)}
                placeholder="50000.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="llcDistributions">Annual Distributions</Label>
              <Input
                id="llcDistributions"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.llc_annual_distributions || ''}
                onChange={(e) => onFieldChange('metadata.llc_annual_distributions', e.target.value)}
                placeholder="25000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="llcEin">EIN</Label>
              <Input
                id="llcEin"
                value={wizardData.metadata.llc_ein || ''}
                onChange={(e) => onFieldChange('metadata.llc_ein', e.target.value)}
                placeholder="12-3456789"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Operating Agreement Upload</Label>
              <div className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">
                Document upload coming soon
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 9. CORPORATION STOCK */}
      {wizardData.selectedSubcategory === 'corporation_stock' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Corporation Stock Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="corpName">
                Corporation Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="corpName"
                value={wizardData.metadata.corp_name || ''}
                onChange={(e) => onFieldChange('metadata.corp_name', e.target.value)}
                placeholder="XYZ Corporation"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="corpShares">
                Number of Shares <span className="text-destructive">*</span>
              </Label>
              <Input
                id="corpShares"
                type="number"
                step="1"
                min="0"
                value={wizardData.metadata.corp_num_shares || ''}
                onChange={(e) => onFieldChange('metadata.corp_num_shares', e.target.value)}
                placeholder="5000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="corpShareClass">
                Share Class <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.metadata.corp_share_class || ''}
                onValueChange={(value) => onFieldChange('metadata.corp_share_class', value)}
              >
                <SelectTrigger id="corpShareClass">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="corpPricePerShare">
                Purchase Price per Share <span className="text-destructive">*</span>
              </Label>
              <Input
                id="corpPricePerShare"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.corp_price_per_share || ''}
                onChange={(e) => onFieldChange('metadata.corp_price_per_share', e.target.value)}
                placeholder="25.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="corpOwnership">
                Ownership % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="corpOwnership"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={wizardData.metadata.corp_ownership_percentage || ''}
                onChange={(e) => onFieldChange('metadata.corp_ownership_percentage', e.target.value)}
                placeholder="10.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="corpDividendFrequency">Dividend Frequency</Label>
              <Select
                value={wizardData.metadata.corp_dividend_frequency || ''}
                onValueChange={(value) => onFieldChange('metadata.corp_dividend_frequency', value)}
              >
                <SelectTrigger id="corpDividendFrequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="corpValuationSource">Valuation Source</Label>
              <Select
                value={wizardData.metadata.corp_valuation_source || ''}
                onValueChange={(value) => onFieldChange('metadata.corp_valuation_source', value)}
              >
                <SelectTrigger id="corpValuationSource">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appraised">Appraised</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 10. FRANCHISE */}
      {wizardData.selectedSubcategory === 'franchise' && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Franchise Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="franchiseBrand">
                Franchise Brand <span className="text-destructive">*</span>
              </Label>
              <Input
                id="franchiseBrand"
                value={wizardData.metadata.franchise_brand || ''}
                onChange={(e) => onFieldChange('metadata.franchise_brand', e.target.value)}
                placeholder="McDonald's, Subway, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchiseLocation">
                Franchise Location / Territory <span className="text-destructive">*</span>
              </Label>
              <Input
                id="franchiseLocation"
                value={wizardData.metadata.franchise_location || ''}
                onChange={(e) => onFieldChange('metadata.franchise_location', e.target.value)}
                placeholder="123 Main St, City, State"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchisePurchasePrice">
                Purchase Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="franchisePurchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.franchise_purchase_price || ''}
                onChange={(e) => onFieldChange('metadata.franchise_purchase_price', e.target.value)}
                placeholder="250000.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchiseStartDate">
                Franchise Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="franchiseStartDate"
                type="date"
                value={wizardData.metadata.franchise_start_date || ''}
                onChange={(e) => onFieldChange('metadata.franchise_start_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchiseRoyaltyRate">Royalty Rate (%)</Label>
              <Input
                id="franchiseRoyaltyRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={wizardData.metadata.franchise_royalty_rate || ''}
                onChange={(e) => onFieldChange('metadata.franchise_royalty_rate', e.target.value)}
                placeholder="6.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchiseRevenue">Annual Gross Revenue</Label>
              <Input
                id="franchiseRevenue"
                type="number"
                step="0.01"
                min="0"
                value={wizardData.metadata.franchise_annual_revenue || ''}
                onChange={(e) => onFieldChange('metadata.franchise_annual_revenue', e.target.value)}
                placeholder="750000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchiseExpiration">Franchise Agreement Expiration</Label>
              <Input
                id="franchiseExpiration"
                type="date"
                value={wizardData.metadata.franchise_agreement_expiration || ''}
                onChange={(e) => onFieldChange('metadata.franchise_agreement_expiration', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Upload Placeholder */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium">Documents</p>
            <p className="mt-1">K-1s, operating agreements, fund statements (upload coming soon)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
