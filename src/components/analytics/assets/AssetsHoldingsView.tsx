import { AssetsTableWithSorting } from './AssetsTableWithSorting';
import { AssetsQuickActionsSidebar } from './AssetsQuickActionsSidebar';
import type { SupportedCurrency } from '@/lib/currencyUtils';

interface AssetsHoldingsViewProps {
  holdingsSummary?: any;
  isHoldingsLoading: boolean;
  currency?: SupportedCurrency;
  visibleColumns?: string[];
  availableColumns?: Array<{ id: string; label: string; required?: boolean }>;
  onToggleColumn?: (columnId: string) => void;
  onAddAsset?: () => void;
  onRefreshQuotes?: () => void;
  onViewAlerts?: () => void;
  onExportData?: () => void;
  onCurrencyChange?: (currency: any) => void;
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
}

export const AssetsHoldingsView = ({
  holdingsSummary,
  isHoldingsLoading,
  currency,
  visibleColumns,
  availableColumns,
  onToggleColumn,
  onAddAsset,
  onRefreshQuotes,
  onViewAlerts,
  onExportData,
  onCurrencyChange,
  timeframe = 'ytd',
}: AssetsHoldingsViewProps) => {
  // Comprehensive mock assets data with all 9 categories
  // IMPORTANT: All monetary values are in USD
  const mockAssets = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      type: "Cryptocurrency",
      sector: "Cryptocurrency",
      holdings: 5.3,
      currentPrice: 43250.00,
      totalValue: 229225.00,
      costBasis: 185000.00,
      allocation: 35.2,
      marketStatus: 'open' as const,
      performance24h: 2.98,
      performance7d: 5.82,
      performance30d: 12.35,
      performance90d: 28.54,
      performanceYTD: 18.5,
      performance1y: 52.8,
      performanceAll: 23.9,
      unrealizedGain24h: 6831,
      unrealizedGain7d: 13345,
      unrealizedGain30d: 28322,
      unrealizedGain90d: 65438,
      unrealizedGainYTD: 42421,
      unrealizedGain1y: 121018,
      unrealizedGainAll: 44225,
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      type: "Cryptocurrency",
      sector: "Cryptocurrency",
      holdings: 25.7,
      currentPrice: 2350.00,
      totalValue: 60395.00,
      costBasis: 65000.00,
      unrealizedGain: -4605.00,
      unrealizedGainPercent: -7.08,
      performanceYTD: -3.2,
      performanceYTDAmount: -2080.00,
      priceChange24h: -85.50,
      priceChangePercentage24h: -1.52,
      allocation: 9.3,
      marketStatus: 'open' as const
    },
    {
      name: "Apple Inc.",
      symbol: "AAPL",
      type: "Stock",
      sector: "Stocks & Equities",
      holdings: 150,
      currentPrice: 178.25,
      totalValue: 26737.50,
      costBasis: 24000.00,
      unrealizedGain: 2737.50,
      unrealizedGainPercent: 11.4,
      performanceYTD: 9.8,
      performanceYTDAmount: 2352.00,
      priceChange24h: 3.75,
      priceChangePercentage24h: 2.15,
      allocation: 4.1,
      marketStatus: 'closed' as const
    },
    {
      name: "Tesla Inc.",
      symbol: "TSLA",
      type: "Stock",
      sector: "Stocks & Equities",
      holdings: 45,
      currentPrice: 242.50,
      totalValue: 10912.50,
      costBasis: 12500.00,
      unrealizedGain: -1587.50,
      unrealizedGainPercent: -12.7,
      performanceYTD: -8.5,
      performanceYTDAmount: -1062.50,
      priceChange24h: -5.25,
      priceChangePercentage24h: -2.12,
      allocation: 1.7,
      marketStatus: 'closed' as const
    },
    {
      name: "S&P 500 ETF",
      symbol: "SPY",
      type: "ETF",
      sector: "Stocks & Equities",
      holdings: 200,
      currentPrice: 485.75,
      totalValue: 97150.00,
      costBasis: 89000.00,
      unrealizedGain: 8150.00,
      unrealizedGainPercent: 9.16,
      performanceYTD: 12.3,
      performanceYTDAmount: 10947.00,
      priceChange24h: 4.20,
      priceChangePercentage24h: 0.87,
      allocation: 14.9,
      marketStatus: 'closed' as const
    },
    {
      name: "Vanguard Real Estate ETF",
      symbol: "VNQ",
      type: "ETF",
      sector: "Real Estate",
      holdings: 500,
      currentPrice: 92.45,
      totalValue: 46225.00,
      costBasis: 43000.00,
      unrealizedGain: 3225.00,
      unrealizedGainPercent: 7.5,
      performanceYTD: 5.2,
      performanceYTDAmount: 2236.00,
      priceChange24h: 1.25,
      priceChangePercentage24h: 1.37,
      allocation: 7.1,
      marketStatus: 'closed' as const
    },
    {
      name: "Gold",
      symbol: "XAU",
      type: "Commodity",
      sector: "Commodities",
      holdings: 10,
      currentPrice: 2045.50,
      totalValue: 20455.00,
      costBasis: 19500.00,
      unrealizedGain: 955.00,
      unrealizedGainPercent: 4.9,
      performanceYTD: 8.7,
      performanceYTDAmount: 1696.50,
      priceChange24h: 12.30,
      priceChangePercentage24h: 0.60,
      allocation: 3.1,
      marketStatus: 'open' as const
    },
    {
      name: "Vanguard Total Bond",
      symbol: "BND",
      type: "Bond",
      sector: "Bonds & Fixed Income",
      holdings: 300,
      currentPrice: 78.25,
      totalValue: 23475.00,
      costBasis: 24000.00,
      unrealizedGain: -525.00,
      unrealizedGainPercent: -2.19,
      performanceYTD: 1.8,
      performanceYTDAmount: 432.00,
      priceChange24h: -0.15,
      priceChangePercentage24h: -0.19,
      allocation: 3.6,
      marketStatus: 'closed' as const
    },
    {
      name: "High-Yield Savings",
      symbol: "HYSA",
      type: "Cash",
      sector: "Cash & Equivalents",
      holdings: 1,
      currentPrice: 45000.00,
      totalValue: 45000.00,
      costBasis: 42000.00,
      unrealizedGain: 3000.00,
      unrealizedGainPercent: 7.14,
      performanceYTD: 4.5,
      performanceYTDAmount: 1890.00,
      priceChange24h: 5.50,
      priceChangePercentage24h: 0.01,
      allocation: 6.9,
      marketStatus: 'open' as const
    },
    {
      name: "Fine Art Collection",
      symbol: "ART",
      type: "Alternative",
      sector: "Alternative Investments",
      holdings: 1,
      currentPrice: 125000.00,
      totalValue: 125000.00,
      costBasis: 95000.00,
      unrealizedGain: 30000.00,
      unrealizedGainPercent: 31.6,
      performanceYTD: 22.5,
      performanceYTDAmount: 21375.00,
      priceChange24h: 0.00,
      priceChangePercentage24h: 0.00,
      allocation: 19.2,
      marketStatus: 'closed' as const
    },
    {
      name: "Venture Capital Fund A",
      symbol: "VCFA",
      type: "Private Equity",
      sector: "Private Equity & Business",
      holdings: 5000,
      currentPrice: 5.85,
      totalValue: 29250.00,
      costBasis: 25000.00,
      unrealizedGain: 4250.00,
      unrealizedGainPercent: 17.0,
      performanceYTD: 15.2,
      performanceYTDAmount: 3800.00,
      priceChange24h: 0.00,
      priceChangePercentage24h: 0.00,
      allocation: 4.5,
      marketStatus: 'closed' as const
    },
    {
      name: "2023 Tesla Model S",
      symbol: "TSLA-MS",
      type: "Vehicle",
      sector: "Vehicles & Equipment",
      holdings: 1,
      currentPrice: 68500.00,
      totalValue: 68500.00,
      costBasis: 89000.00,
      unrealizedGain: -20500.00,
      unrealizedGainPercent: -23.03,
      performanceYTD: -18.5,
      performanceYTDAmount: -16465.00,
      priceChange24h: -100.00,
      priceChangePercentage24h: -0.15,
      allocation: 10.5,
      marketStatus: 'closed' as const
    }
  ];

  // Use mock data if real data is not available or empty
  const displayAssets = holdingsSummary?.allocation_by_type?.length > 0 
    ? holdingsSummary.allocation_by_type.map((asset: any) => ({
        name: asset.asset_category || 'Unknown',
        symbol: asset.asset_category?.substring(0, 3).toUpperCase() || 'N/A',
        type: asset.asset_category || 'Other',
        holdings: asset.count || 0,
        currentPrice: asset.total_value / (asset.count || 1),
        totalValue: asset.total_value || 0,
        priceChange24h: 0,
        priceChangePercentage24h: 0,
        allocation: asset.percentage || 0,
        marketStatus: 'open' as const,
      }))
    : mockAssets;

  return (
    <div className="space-y-6">
      {/* Full-width table */}
      <AssetsTableWithSorting 
        assets={displayAssets} 
        isLoading={isHoldingsLoading}
        currency={currency}
        showTitle={false}
        timeframe={timeframe}
      />
    </div>
  );
};
