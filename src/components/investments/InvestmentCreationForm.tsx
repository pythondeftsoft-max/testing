import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useAssetCategories } from '@/hooks/usePortfolioAssets';
import { useMarketData } from '@/hooks/useMarketData';
import { toast } from 'sonner';

const baseSchema = z.object({
  asset_name: z.string().min(1, 'Asset name is required'),
  asset_description: z.string().optional(),
  subcategory: z.string().min(1, 'Investment type is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  shares: z.coerce.number().min(0.01, 'Must have at least 0.01 shares'),
  purchase_price: z.coerce.number().min(0, 'Purchase price must be positive'),
  acquisition_date: z.date().optional(),
  broker: z.string().optional(),
  account_type: z.string().optional(),
});

// Extended schema for specific investment types
const stocksEtfsSchema = baseSchema.extend({
  dividend_yield: z.coerce.number().min(0).max(100).optional(),
  sector: z.string().optional(),
  market_cap: z.string().optional(),
  beta: z.coerce.number().optional(),
  expense_ratio: z.coerce.number().min(0).max(100).optional(),
});

const bondsSchema = baseSchema.extend({
  interest_rate: z.coerce.number().min(0).max(100).optional(),
  maturity_date: z.date().optional(),
  credit_rating: z.string().optional(),
});

const cryptoSchema = baseSchema.extend({
  exchange: z.string().optional(),
  wallet_address: z.string().optional(),
});

type FormData = z.infer<typeof stocksEtfsSchema> & z.infer<typeof bondsSchema> & z.infer<typeof cryptoSchema>;

interface InvestmentCreationFormProps {
  portfolioId: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const investmentSubcategories = [
  { value: 'stocks', label: 'Stocks', assetType: 'stock' as const },
  { value: 'etfs', label: 'ETFs', assetType: 'etf' as const },
  { value: 'mutual_funds', label: 'Mutual Funds', assetType: 'etf' as const },
  { value: 'bonds', label: 'Bonds', assetType: 'bond' as const },
  { value: 'treasury_bills', label: 'Treasury Bills', assetType: 'bond' as const },
  { value: 'corporate_bonds', label: 'Corporate Bonds', assetType: 'bond' as const },
  { value: 'municipal_bonds', label: 'Municipal Bonds', assetType: 'bond' as const },
  { value: 'cds', label: 'Certificates of Deposit', assetType: 'bond' as const },
  { value: 'crypto', label: 'Cryptocurrency', assetType: 'crypto' as const },
  { value: 'options', label: 'Options', assetType: 'stock' as const },
  { value: 'futures', label: 'Futures', assetType: 'commodity' as const },
  { value: 'commodities', label: 'Commodities', assetType: 'commodity' as const },
];

const accountTypes = [
  'Taxable',
  '401(k)',
  'IRA',
  'Roth IRA',
  'SEP-IRA',
  'HSA',
  'TFSA',
  'Trust',
  'Joint',
  'Corporate',
];

const marketCapOptions = [
  'Large Cap',
  'Mid Cap',
  'Small Cap',
  'Micro Cap',
  'Mega Cap',
];

const sectorOptions = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Energy',
  'Materials',
  'Real Estate',
  'Utilities',
  'Consumer Staples',
];

export const InvestmentCreationForm = ({ portfolioId, onSubmit, onCancel }: InvestmentCreationFormProps) => {
  const [symbolLookupLoading, setSymbolLookupLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const { data: categories } = useAssetCategories();
  const { fetchMarketData } = useMarketData();

  const investmentCategory = categories?.find(cat => cat.name === 'investments');

  const form = useForm<FormData>({
    resolver: zodResolver(stocksEtfsSchema), // Default schema, will be updated based on subcategory
    defaultValues: {
      asset_name: '',
      asset_description: '',
      subcategory: '',
      symbol: '',
      shares: 0,
      purchase_price: 0,
      acquisition_date: new Date(),
      broker: '',
      account_type: '',
    },
  });

  const selectedSubcategory = form.watch('subcategory');
  const symbol = form.watch('symbol');

  // Symbol lookup functionality
  const handleSymbolLookup = async () => {
    if (!symbol) {
      toast.error('Please enter a symbol first');
      return;
    }

    setSymbolLookupLoading(true);
    try {
      const subcategoryConfig = investmentSubcategories.find(s => s.value === selectedSubcategory);
      const assetType = subcategoryConfig?.assetType || 'stock';
      
      const marketData = await fetchMarketData(symbol.toUpperCase(), assetType);
      
      if (marketData) {
        setCurrentPrice(marketData.currentPrice);
        
        // Auto-fill asset name if empty
        if (!form.getValues('asset_name')) {
          form.setValue('asset_name', `${symbol.toUpperCase()} ${subcategoryConfig?.label || 'Investment'}`);
        }
        
        // Set current price as default purchase price
        form.setValue('purchase_price', marketData.currentPrice);
        
        toast.success(`Found ${symbol.toUpperCase()} - Current price: $${marketData.currentPrice.toFixed(2)}`);
      } else {
        toast.warning('Symbol not found or market data unavailable');
      }
    } catch (error) {
      console.error('Symbol lookup error:', error);
      toast.error('Failed to lookup symbol. Please check the symbol and try again.');
    } finally {
      setSymbolLookupLoading(false);
    }
  };

  const handleFormSubmit = (data: FormData) => {
    const investmentData = {
      portfolio_id: portfolioId,
      asset_category_id: investmentCategory?.id,
      asset_name: data.asset_name,
      asset_description: data.asset_description,
      asset_value: data.shares * data.purchase_price,
      acquisition_date: data.acquisition_date,
      acquisition_cost: data.shares * data.purchase_price,
      current_value: currentPrice ? data.shares * currentPrice : undefined,
      metadata: {
        subcategory: data.subcategory,
        symbol: data.symbol.toUpperCase(),
        shares: data.shares,
        purchase_price: data.purchase_price,
        broker: data.broker,
        account_type: data.account_type,
        // Add specific fields based on subcategory
        ...((['stocks', 'etfs', 'mutual_funds'].includes(data.subcategory)) && {
          dividend_yield: data.dividend_yield,
          sector: data.sector,
          market_cap: data.market_cap,
          beta: data.beta,
          expense_ratio: data.expense_ratio,
        }),
        ...((['bonds', 'treasury_bills', 'corporate_bonds', 'municipal_bonds', 'cds'].includes(data.subcategory)) && {
          interest_rate: data.interest_rate,
          maturity_date: data.maturity_date,
          credit_rating: data.credit_rating,
        }),
        ...(data.subcategory === 'crypto' && {
          exchange: data.exchange,
          wallet_address: data.wallet_address,
        }),
      },
      tags: [data.subcategory, ...(data.sector ? [data.sector] : [])],
    };

    onSubmit(investmentData);
  };

  const renderSubcategorySpecificFields = () => {
    if (['stocks', 'etfs', 'mutual_funds'].includes(selectedSubcategory)) {
      return (
        <>
          <FormField
            control={form.control}
            name="dividend_yield"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dividend Yield (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="2.5"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sector"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sector</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sectorOptions.map(sector => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="market_cap"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Market Cap Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select market cap" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {marketCapOptions.map(cap => (
                      <SelectItem key={cap} value={cap}>{cap}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedSubcategory === 'etfs' && (
            <FormField
              control={form.control}
              name="expense_ratio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Ratio (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.03"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </>
      );
    }

    if (['bonds', 'treasury_bills', 'corporate_bonds', 'municipal_bonds', 'cds'].includes(selectedSubcategory)) {
      return (
        <>
          <FormField
            control={form.control}
            name="interest_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="4.5"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maturity_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Maturity Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick maturity date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      );
    }

    if (selectedSubcategory === 'crypto') {
      return (
        <>
          <FormField
            control={form.control}
            name="exchange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exchange</FormLabel>
                <FormControl>
                  <Input placeholder="Coinbase, Binance, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="wallet_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wallet Address (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="0x..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      );
    }

    return null;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Investment Type */}
          <FormField
            control={form.control}
            name="subcategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Investment Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select investment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {investmentSubcategories.map(sub => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Symbol with lookup */}
          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Symbol *</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="AAPL, BTC, etc."
                      className="uppercase"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSymbolLookup}
                    disabled={!symbol || symbolLookupLoading}
                    className="px-3"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Asset Name */}
        <FormField
          control={form.control}
          name="asset_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Name *</FormLabel>
              <FormControl>
                <Input placeholder="Apple Inc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="asset_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of the investment" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shares */}
          <FormField
            control={form.control}
            name="shares"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shares/Units *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="100"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Purchase Price */}
          <FormField
            control={form.control}
            name="purchase_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Purchase Price * 
                  {currentPrice && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (Current: ${currentPrice.toFixed(2)})
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Acquisition Date */}
          <FormField
            control={form.control}
            name="acquisition_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Acquisition Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Account Type */}
          <FormField
            control={form.control}
            name="account_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accountTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Broker */}
        <FormField
          control={form.control}
          name="broker"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Broker</FormLabel>
              <FormControl>
                <Input placeholder="Fidelity, Schwab, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subcategory-specific fields */}
        {selectedSubcategory && renderSubcategorySpecificFields()}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Add Investment
          </Button>
        </div>
      </form>
    </Form>
  );
};