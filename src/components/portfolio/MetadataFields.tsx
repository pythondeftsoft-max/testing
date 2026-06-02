
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MetadataFieldsProps {
  control: Control<any>;
  subcategory: string;
}

export const MetadataFields = ({ control, subcategory }: MetadataFieldsProps) => {
  if (!subcategory) return null;

  const renderCryptocurrencyFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.ticker_symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ticker Symbol</FormLabel>
              <FormControl>
                <Input placeholder="BTC, ETH, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="metadata.exchange"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exchange/Platform</FormLabel>
              <FormControl>
                <Input placeholder="Coinbase, Binance, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="metadata.blockchain"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Blockchain</FormLabel>
            <FormControl>
              <Input placeholder="Bitcoin, Ethereum, Solana, etc." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderStockFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.ticker_symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Symbol</FormLabel>
              <FormControl>
                <Input placeholder="AAPL, TSLA, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="metadata.exchange"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Exchange</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exchange" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NYSE">NYSE</SelectItem>
                  <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                  <SelectItem value="AMEX">AMEX</SelectItem>
                  <SelectItem value="TSX">TSX</SelectItem>
                  <SelectItem value="LSE">LSE</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.sector"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sector</FormLabel>
              <FormControl>
                <Input placeholder="Technology, Healthcare, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.market_cap"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Market Cap Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select market cap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="large_cap">Large Cap ($10B+)</SelectItem>
                  <SelectItem value="mid_cap">Mid Cap ($2B-$10B)</SelectItem>
                  <SelectItem value="small_cap">Small Cap ($300M-$2B)</SelectItem>
                  <SelectItem value="micro_cap">Micro Cap (Under $300M)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderBondFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.issuer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issuer</FormLabel>
              <FormControl>
                <Input placeholder="US Treasury, Apple Inc., etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.coupon_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coupon Rate (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="4.50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.maturity_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maturity Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.credit_rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit Rating</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AAA">AAA</SelectItem>
                  <SelectItem value="AA">AA</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="BBB">BBB</SelectItem>
                  <SelectItem value="BB">BB</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="CCC">CCC</SelectItem>
                  <SelectItem value="CC">CC</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderAnnuityFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.annuity_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Annuity Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Annuity</SelectItem>
                  <SelectItem value="variable">Variable Annuity</SelectItem>
                  <SelectItem value="indexed">Indexed Annuity</SelectItem>
                  <SelectItem value="immediate">Immediate Annuity</SelectItem>
                  <SelectItem value="deferred">Deferred Annuity</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.insurance_company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Company</FormLabel>
              <FormControl>
                <Input placeholder="Company issuing annuity" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.premium_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Premium Paid</FormLabel>
              <FormControl>
                <Input type="number" placeholder="100000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.guaranteed_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guaranteed Rate (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="3.5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.payout_start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payout Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.monthly_payout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Payout</FormLabel>
              <FormControl>
                <Input type="number" placeholder="2500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="metadata.surrender_period_years"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Surrender Period (Years)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="7" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderLifeInsuranceFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.policy_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whole_life">Whole Life</SelectItem>
                  <SelectItem value="universal_life">Universal Life</SelectItem>
                  <SelectItem value="variable_life">Variable Life</SelectItem>
                  <SelectItem value="variable_universal">Variable Universal Life</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.insurance_company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Company</FormLabel>
              <FormControl>
                <Input placeholder="Company issuing policy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.policy_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Number</FormLabel>
              <FormControl>
                <Input placeholder="Policy ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.death_benefit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Death Benefit</FormLabel>
              <FormControl>
                <Input type="number" placeholder="500000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.cash_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Cash Value</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Current cash surrender value" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.annual_premium"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Annual Premium</FormLabel>
              <FormControl>
                <Input type="number" placeholder="5000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.interest_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interest/Growth Rate (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="4.0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.issue_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderFixedIncomeFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.financial_institution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Financial Institution</FormLabel>
              <FormControl>
                <Input placeholder="Chase Bank, Wells Fargo, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.interest_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interest Rate (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="3.50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.maturity_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maturity Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.cd_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CD Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select CD type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="traditional">Traditional CD</SelectItem>
                  <SelectItem value="jumbo">Jumbo CD</SelectItem>
                  <SelectItem value="callable">Callable CD</SelectItem>
                  <SelectItem value="bump_up">Bump-up CD</SelectItem>
                  <SelectItem value="step_up">Step-up CD</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderCommercialPropertyFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.property_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office Building</SelectItem>
                  <SelectItem value="retail">Retail Space</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="prison">Prison/Correctional Facility</SelectItem>
                  <SelectItem value="medical">Medical Facility</SelectItem>
                  <SelectItem value="mixed_use">Mixed Use</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.square_footage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Square Footage</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="10000"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="metadata.address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Property Address</FormLabel>
            <FormControl>
              <Input placeholder="123 Main St, City, State 12345" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.occupancy_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Occupancy Rate (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="85.5"
                  max="100"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.lease_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lease Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lease type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gross">Gross Lease</SelectItem>
                  <SelectItem value="net">Net Lease</SelectItem>
                  <SelectItem value="modified_gross">Modified Gross</SelectItem>
                  <SelectItem value="triple_net">Triple Net (NNN)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderVehicleFields = () => (
    <div className="space-y-4">
      {/* Row 1: Year* and Make* (Required) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="2023"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.make"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Make / Manufacturer *</FormLabel>
              <FormControl>
                <Input placeholder="Ford, Caterpillar, Yamaha, Boeing, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Row 2: Model and Usage Type (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <FormControl>
                <Input placeholder="F-150, 320D, FX Cruiser, 172, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.usage_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Usage Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select usage type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="mixed">Mixed Use</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Row 3: VIN/Serial and Registration (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.vin_serial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VIN / Serial Number</FormLabel>
              <FormControl>
                <Input placeholder="VIN, Hull ID, Serial Number, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.registration_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Number</FormLabel>
              <FormControl>
                <Input placeholder="License Plate, N-number, Registration, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Row 4: Condition and Mileage/Hours (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.mileage_hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mileage / Hours</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Odometer miles, engine/flight hours, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderBusinessFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.business_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Type</FormLabel>
              <FormControl>
                <Input placeholder="LLC, Corporation, Partnership, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <FormControl>
                <Input placeholder="Technology, Retail, Food Service, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.ownership_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ownership Percentage (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="25.5"
                  max="100"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.valuation_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valuation Method</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select valuation method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dcf">Discounted Cash Flow</SelectItem>
                  <SelectItem value="market_multiple">Market Multiple</SelectItem>
                  <SelectItem value="asset_based">Asset-Based</SelectItem>
                  <SelectItem value="revenue_multiple">Revenue Multiple</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderPrivateEquityFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.fund_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fund/Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Sequoia Capital, Acme Inc., etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.investment_class"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Class</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class_a">Class A Shares</SelectItem>
                  <SelectItem value="class_b">Class B Shares</SelectItem>
                  <SelectItem value="class_c">Class C Shares</SelectItem>
                  <SelectItem value="common">Common Stock</SelectItem>
                  <SelectItem value="preferred">Preferred Stock</SelectItem>
                  <SelectItem value="rsu">Restricted Stock Units (RSU)</SelectItem>
                  <SelectItem value="options">Stock Options</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.commitment_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commitment Amount ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="100000"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.called_capital"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Called Capital ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="50000"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.management_fee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Management Fee (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="2.0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.carry_fee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Carry/Performance Fee (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="20.0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.vintage_year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fund Vintage Year</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="2023"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.investment_stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Stage</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="series_a">Series A</SelectItem>
                  <SelectItem value="series_b">Series B</SelectItem>
                  <SelectItem value="series_c">Series C</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="late_stage">Late Stage</SelectItem>
                  <SelectItem value="buyout">Buyout</SelectItem>
                  <SelectItem value="mature">Mature</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.lockup_period_years"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lock-up Period (Years)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="5"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.expected_distribution_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expected Distribution Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.number_of_shares"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Shares (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="10000"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.strike_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strike Price (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="10.50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="metadata.vesting_schedule"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vesting Schedule (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="4 years with 1 year cliff" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderCollectibleFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="Painting, Sculpture, Vintage Car, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.artist_creator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Artist/Creator</FormLabel>
              <FormControl>
                <Input placeholder="Artist or creator name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.year_created"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year Created</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="1950"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mint">Mint</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="very_good">Very Good</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderAlternativesFields = () => {
    const isWine = subcategory === 'wine';
    const isIP = subcategory === 'intellectual_property';
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metadata.item_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Type</FormLabel>
                <FormControl>
                  <Input placeholder={isWine ? "e.g., Bordeaux, Burgundy" : isIP ? "e.g., Patent, Trademark" : "e.g., Painting, Vintage Watch"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="metadata.artist_creator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isWine ? "Producer/Winery" : isIP ? "Creator/Inventor" : "Artist/Brand/Creator"}</FormLabel>
                <FormControl>
                  <Input placeholder={isWine ? "e.g., Château Margaux" : isIP ? "e.g., John Smith" : "e.g., Picasso, Rolex"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metadata.year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isWine ? "Vintage Year" : "Year"}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="1965" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isWine && (
            <FormField
              control={control}
              name="metadata.varietal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Varietal</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cabernet Sauvignon" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {!isIP && !isWine && (
            <FormField
              control={control}
              name="metadata.condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mint">Mint</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {isWine && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="metadata.region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Napa Valley, Bordeaux" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="metadata.bottle_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Bottles</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {isIP && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="metadata.registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., US123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="metadata.expiration_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isIP && (
            <FormField
              control={control}
              name="metadata.authentication_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authentication Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="certified">Certified</SelectItem>
                      <SelectItem value="authenticated">Authenticated</SelectItem>
                      <SelectItem value="uncertified">Uncertified</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={control}
            name="metadata.insurance_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insurance Appraised Value</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="metadata.storage_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Climate-controlled storage, Bank vault" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  const renderCashEquivalentsFields = () => {
    const isPhysicalCash = subcategory === 'cash';
    
    return (
      <div className="space-y-4">
        <FormField
          control={control}
          name="metadata.financial_institution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isPhysicalCash ? "Storage Location" : "Financial Institution"}</FormLabel>
              <FormControl>
                <Input placeholder={isPhysicalCash ? "e.g., Home Safe, Bank Safety Deposit Box" : "e.g., Chase, Wells Fargo"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isPhysicalCash && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="metadata.account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="high_yield_savings">High-Yield Savings</SelectItem>
                        <SelectItem value="money_market">Money Market</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="metadata.interest_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (APY %)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="4.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="metadata.account_last_four"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account # (Last 4)</FormLabel>
                    <FormControl>
                      <Input placeholder="****1234" maxLength={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="metadata.fdic_insured"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FDIC/NCUA Insured</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metadata.currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Input placeholder="USD" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="metadata.liquidity_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Liquidity Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select liquidity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="1_day">1-Day Notice</SelectItem>
                    <SelectItem value="7_day">7-Day Notice</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    );
  };

  const renderCommoditiesFields = () => {
    const isPreciousMetals = subcategory === 'precious_metals';
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metadata.commodity_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commodity Type</FormLabel>
                <FormControl>
                  <Input placeholder={isPreciousMetals ? "e.g., Gold, Silver" : "e.g., Crude Oil, Wheat"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="metadata.quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity/Volume</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metadata.unit_of_measurement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measurement</FormLabel>
                <FormControl>
                  <Input placeholder={isPreciousMetals ? "troy ounces" : "barrels, bushels, tons"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="metadata.purity_grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purity/Grade</FormLabel>
                <FormControl>
                  <Input placeholder={isPreciousMetals ? "99.99% pure" : "Grade A"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isPreciousMetals && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="metadata.form"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bars">Bars</SelectItem>
                      <SelectItem value="coins">Coins</SelectItem>
                      <SelectItem value="rounds">Rounds</SelectItem>
                      <SelectItem value="jewelry">Jewelry</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="metadata.mint_refiner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mint/Refiner</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., US Mint, PAMP Suisse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metadata.possession_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Physical vs Paper</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical Possession</SelectItem>
                    <SelectItem value="futures">Futures Contract</SelectItem>
                    <SelectItem value="etf">ETF/Fund</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="metadata.storage_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Vault, Warehouse" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    );
  };

  const renderResidentialRealEstateFields = () => {
    const isLand = subcategory === 'land';
    
    return (
      <div className="space-y-4">
        <FormField
          control={control}
          name="metadata.property_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, City, State, ZIP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isLand && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="metadata.property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_family">Single Family</SelectItem>
                        <SelectItem value="duplex">Duplex</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="condo">Condominium</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="metadata.square_footage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Square Footage</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="metadata.bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="metadata.bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" placeholder="2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metadata.lot_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isLand ? "Acreage" : "Lot Size"}</FormLabel>
                <FormControl>
                  <Input placeholder={isLand ? "10 acres" : "0.25 acres"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="metadata.year_built"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year Built</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2010" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isLand && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="metadata.zoning"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zoning Classification</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select zoning" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="agricultural">Agricultural</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="metadata.water_rights"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Water Rights</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {!isLand && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="metadata.rental_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rental Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner_occupied">Owner-Occupied</SelectItem>
                        <SelectItem value="rented">Rented</SelectItem>
                        <SelectItem value="vacant">Vacant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="metadata.monthly_rent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Rent</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="metadata.hoa_fees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HOA Fees (Monthly)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="metadata.property_tax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Tax (Annual)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="metadata.mortgage_balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mortgage Balance</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    );
  };

  const renderREITFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.reit_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>REIT Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Vanguard Real Estate ETF" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.ticker_symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ticker Symbol</FormLabel>
              <FormControl>
                <Input placeholder="e.g., VNQ" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.reit_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>REIT Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">Equity REIT</SelectItem>
                  <SelectItem value="mortgage">Mortgage REIT</SelectItem>
                  <SelectItem value="hybrid">Hybrid REIT</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.property_focus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Focus</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select focus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="data_centers">Data Centers</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.number_of_shares"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Shares</FormLabel>
              <FormControl>
                <Input type="number" placeholder="100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.dividend_yield"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dividend Yield (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="4.5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderSpecialtyRealEstateFields = () => (
    <div className="space-y-4">
      <FormField
        control={control}
        name="metadata.property_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Property Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Seaside Marina & Resort" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="metadata.property_address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Property Address</FormLabel>
            <FormControl>
              <Input placeholder="123 Main St, City, State, ZIP" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.specialty_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="motel">Motel</SelectItem>
                  <SelectItem value="marina">Marina</SelectItem>
                  <SelectItem value="golf_course">Golf Course</SelectItem>
                  <SelectItem value="self_storage">Self Storage</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.units_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Units/Rooms/Berths</FormLabel>
              <FormControl>
                <Input type="number" placeholder="150" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="metadata.occupancy_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Occupancy Rate (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" placeholder="85" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="metadata.operating_model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operating Model</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner_operated">Owner-Operated</SelectItem>
                  <SelectItem value="management_company">Management Company</SelectItem>
                  <SelectItem value="franchise">Franchise</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="metadata.franchise_brand"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Franchise Brand (if applicable)</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Marriott, Hilton" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  switch (subcategory) {
    case 'crypto':
    case 'cryptocurrency':
      return renderCryptocurrencyFields();
    case 'stocks':
    case 'stock':
    case 'etf':
    case 'mutual_fund':
      return renderStockFields();
    case 'bonds':
    case 'bond':
    case 'government_bond':
    case 'corporate_bond':
    case 'municipal_bond':
    case 'treasury_bill':
    case 'savings_bond':
    case 'treasury':
    case 'other_fixed_income':
      return renderBondFields();
    case 'annuity':
      return renderAnnuityFields();
    case 'life_insurance':
      return renderLifeInsuranceFields();
    case 'cd':
    case 'fixed_income':
    case 'cash_equivalents':
      return renderFixedIncomeFields();
    case 'commercial_property':
    case 'office':
    case 'retail':
    case 'warehouse':
    case 'industrial':
    case 'mixed_use':
      return renderCommercialPropertyFields();
    case 'equipment':
    case 'car':
    case 'boat':
    case 'aircraft':
    case 'rv':
      return renderVehicleFields();
    case 'private_equity_fund':
    case 'private_equity':
    case 'venture_capital':
    case 'private_company_stock':
    case 'hedge_fund':
    case 'private_debt':
      return renderPrivateEquityFields();
    case 'sole_proprietorship':
    case 'partnership':
    case 'llc_ownership':
    case 'corporation_stock':
    case 'franchise':
    case 'business_ownership':
    case 'restaurant_business':
    case 'hospitality_business':
      return renderBusinessFields();
    case 'art':
    case 'wine':
    case 'classic_cars':
    case 'watches':
    case 'sports_memorabilia':
    case 'intellectual_property':
    case 'collectibles':
    case 'antiques':
    case 'memorabilia':
      return renderAlternativesFields();
    case 'checking_account':
    case 'savings_account':
    case 'money_market':
    case 'cash':
    case 'short_term_fund':
      return renderCashEquivalentsFields();
    case 'precious_metals':
    case 'energy':
    case 'agriculture':
    case 'industrial_metals':
    case 'soft_commodities':
    case 'rare_earth_elements':
      return renderCommoditiesFields();
    case 'residential_rental':
    case 'primary_residence':
    case 'vacation_home':
    case 'land':
      return renderResidentialRealEstateFields();
    case 'real_estate_fund':
    case 'reit':
      return renderREITFields();
    case 'hotel':
    case 'marina':
    case 'golf_course':
    case 'self_storage':
    case 'motel':
    case 'restaurant':
    case 'hospitality':
    case 'specialty':
      return renderSpecialtyRealEstateFields();
    default:
      return null;
  }
};
