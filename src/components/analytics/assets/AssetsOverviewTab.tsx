import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoldingsKpis } from './HoldingsKpis';
import { AllocationByTypeChart } from './AllocationByTypeChart';
import { TopMovers } from './TopMovers';
import { AssetsQuickActionsSidebar } from './AssetsQuickActionsSidebar';
import { AssetsTableWithSorting } from './AssetsTableWithSorting';

// Mock data for comprehensive asset display - All 9 categories
// IMPORTANT: All monetary values are in USD
const mockAssets = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    type: "Cryptocurrency",
    holdings: 2.5,
    currentPrice: 61234,
    totalValue: 153085,
    allocation: 12.3,
    marketStatus: 'open' as const,
    sector: "Cryptocurrency",
    costBasis: 125000,
    performance24h: 2.43,
    performance7d: 5.82,
    performance30d: 12.35,
    performance90d: 28.54,
    performanceYTD: 45.2,
    performance1y: 52.8,
    performanceAll: 22.47,
    unrealizedGain24h: 3821,
    unrealizedGain7d: 8915,
    unrealizedGain30d: 18925,
    unrealizedGain90d: 43725,
    unrealizedGainYTD: 69225,
    unrealizedGain1y: 80850,
    unrealizedGainAll: 28085,
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    type: "Cryptocurrency",
    holdings: 15.8,
    currentPrice: 3287,
    totalValue: 51935,
    allocation: 4.2,
    marketStatus: 'open' as const,
    sector: "Cryptocurrency",
    costBasis: 42000,
    performance24h: 2.78,
    performance7d: 6.45,
    performance30d: 15.28,
    performance90d: 32.15,
    performanceYTD: 38.7,
    performance1y: 45.3,
    performanceAll: 23.65,
    unrealizedGain24h: 1445,
    unrealizedGain7d: 3351,
    unrealizedGain30d: 7945,
    unrealizedGain90d: 16707,
    unrealizedGainYTD: 20122,
    unrealizedGain1y: 23550,
    unrealizedGainAll: 9935,
  },
  {
    name: "Apple Inc.",
    symbol: "AAPL",
    type: "Stock",
    holdings: 500,
    currentPrice: 188.50,
    totalValue: 94250,
    allocation: 7.6,
    marketStatus: 'closed' as const,
    sector: "Stocks & Equities",
    costBasis: 85000,
    performance24h: 1.34,
    performance7d: 3.25,
    performance30d: 8.45,
    performance90d: 18.75,
    performanceYTD: 28.5,
    performance1y: 35.2,
    performanceAll: 10.88,
    unrealizedGain24h: 1262,
    unrealizedGain7d: 3063,
    unrealizedGain30d: 7963,
    unrealizedGain90d: 17669,
    unrealizedGainYTD: 26863,
    unrealizedGain1y: 33188,
    unrealizedGainAll: 9250,
  },
  {
    name: "Tesla Inc.",
    symbol: "TSLA",
    type: "Stock",
    holdings: 200,
    currentPrice: 193.20,
    totalValue: 38640,
    allocation: 3.1,
    marketStatus: 'closed' as const,
    sector: "Stocks & Equities",
    costBasis: 44000,
    performance24h: -3.88,
    performance7d: -6.52,
    performance30d: -10.25,
    performance90d: -15.82,
    performanceYTD: -15.8,
    performance1y: -8.25,
    performanceAll: -12.18,
    unrealizedGain24h: -1705,
    unrealizedGain7d: -2869,
    unrealizedGain30d: -4510,
    unrealizedGain90d: -6961,
    unrealizedGainYTD: -6952,
    unrealizedGain1y: -3630,
    unrealizedGainAll: -5360,
  },
  {
    name: "SPDR S&P 500 ETF",
    symbol: "SPY",
    type: "ETF",
    holdings: 150,
    currentPrice: 448.75,
    totalValue: 67313,
    allocation: 5.4,
    marketStatus: 'closed' as const,
    sector: "Stocks & Equities",
    costBasis: 62000,
    performance24h: 0.84,
    performance7d: 2.45,
    performance30d: 6.82,
    performance90d: 12.58,
    performanceYTD: 18.2,
    performance1y: 22.5,
    performanceAll: 8.57,
    unrealizedGain24h: 565,
    unrealizedGain7d: 1649,
    unrealizedGain30d: 4591,
    unrealizedGain90d: 8465,
    unrealizedGainYTD: 12251,
    unrealizedGain1y: 15138,
    unrealizedGainAll: 5313,
  },
  {
    name: "Vanguard Real Estate ETF",
    symbol: "VNQ",
    type: "REIT",
    holdings: 800,
    currentPrice: 89.25,
    totalValue: 71400,
    allocation: 5.7,
    marketStatus: 'closed' as const,
    sector: "Real Estate",
    costBasis: 68000,
    performance24h: 0.60,
    performance7d: 1.85,
    performance30d: 4.25,
    performance90d: 8.15,
    performanceYTD: 12.3,
    performance1y: 15.8,
    performanceAll: 5.0,
    unrealizedGain24h: 428,
    unrealizedGain7d: 1321,
    unrealizedGain30d: 3036,
    unrealizedGain90d: 5821,
    unrealizedGainYTD: 8784,
    unrealizedGain1y: 11283,
    unrealizedGainAll: 3400,
  },
  {
    name: "Gold ETF",
    symbol: "GLD",
    type: "Commodity",
    holdings: 200,
    currentPrice: 178.90,
    totalValue: 35780,
    allocation: 2.9,
    marketStatus: 'open' as const,
    sector: "Commodities",
    costBasis: 32000,
    performance24h: 1.01,
    performance7d: 2.15,
    performance30d: 5.45,
    performance90d: 9.82,
    performanceYTD: 8.5,
    performance1y: 12.8,
    performanceAll: 11.81,
    unrealizedGain24h: 361,
    unrealizedGain7d: 768,
    unrealizedGain30d: 1947,
    unrealizedGain90d: 3510,
    unrealizedGainYTD: 3036,
    unrealizedGain1y: 4575,
    unrealizedGainAll: 3780,
  },
  {
    name: "US Treasury 10Y",
    symbol: "T-10Y",
    type: "Bond",
    holdings: 400,
    currentPrice: 98.50,
    totalValue: 39400,
    allocation: 3.2,
    marketStatus: 'closed' as const,
    sector: "Bonds & Fixed Income",
    costBasis: 40000,
    performance24h: -0.51,
    performance7d: -0.85,
    performance30d: -1.25,
    performance90d: 0.52,
    performanceYTD: 3.2,
    performance1y: 4.5,
    performanceAll: -1.5,
    unrealizedGain24h: -204,
    unrealizedGain7d: -340,
    unrealizedGain30d: -500,
    unrealizedGain90d: 208,
    unrealizedGainYTD: 1280,
    unrealizedGain1y: 1800,
    unrealizedGainAll: -600,
  },
  {
    name: "High-Yield Savings",
    symbol: "HYSA",
    type: "Cash",
    holdings: 85000,
    currentPrice: 1.0,
    totalValue: 85000,
    allocation: 6.8,
    marketStatus: 'open' as const,
    sector: "Cash & Equivalents",
    costBasis: 85000,
    performance24h: 0,
    performance7d: 0.01,
    performance30d: 0.35,
    performance90d: 1.12,
    performanceYTD: 4.5,
    performance1y: 5.2,
    performanceAll: 0,
    unrealizedGain24h: 0,
    unrealizedGain7d: 9,
    unrealizedGain30d: 298,
    unrealizedGain90d: 952,
    unrealizedGainYTD: 3825,
    unrealizedGain1y: 4420,
    unrealizedGainAll: 0,
  },
  {
    name: "Fine Art Collection",
    symbol: "ART-001",
    type: "Art",
    holdings: 1,
    currentPrice: 135000,
    totalValue: 135000,
    allocation: 10.8,
    marketStatus: 'closed' as const,
    sector: "Alternative Investments",
    costBasis: 125000,
    performance24h: 0,
    performance7d: 0,
    performance30d: 1.5,
    performance90d: 4.2,
    performanceYTD: 8.0,
    performance1y: 8.0,
    performanceAll: 8.0,
    unrealizedGain24h: 0,
    unrealizedGain7d: 0,
    unrealizedGain30d: 1875,
    unrealizedGain90d: 5250,
    unrealizedGainYTD: 10000,
    unrealizedGain1y: 10000,
    unrealizedGainAll: 10000,
  },
  {
    name: "Venture Capital Fund A",
    symbol: "VC-001",
    type: "Private Equity",
    holdings: 1,
    currentPrice: 225000,
    totalValue: 225000,
    allocation: 18.0,
    marketStatus: 'closed' as const,
    sector: "Private Equity & Business",
    costBasis: 200000,
    performance24h: 0,
    performance7d: 0.5,
    performance30d: 3.2,
    performance90d: 8.5,
    performanceYTD: 12.5,
    performance1y: 12.5,
    performanceAll: 12.5,
    unrealizedGain24h: 0,
    unrealizedGain7d: 1000,
    unrealizedGain30d: 6400,
    unrealizedGain90d: 17000,
    unrealizedGainYTD: 25000,
    unrealizedGain1y: 25000,
    unrealizedGainAll: 25000,
  },
  {
    name: "2023 Tesla Model S",
    symbol: "VEH-001",
    type: "Vehicle",
    holdings: 1,
    currentPrice: 72000,
    totalValue: 72000,
    allocation: 5.8,
    marketStatus: 'closed' as const,
    sector: "Vehicles & Equipment",
    costBasis: 85000,
    performance24h: -0.14,
    performance7d: -0.42,
    performance30d: -2.15,
    performance90d: -8.25,
    performanceYTD: -15.29,
    performance1y: -15.29,
    performanceAll: -15.29,
    unrealizedGain24h: -119,
    unrealizedGain7d: -357,
    unrealizedGain30d: -1827,
    unrealizedGain90d: -7013,
    unrealizedGainYTD: -12997,
    unrealizedGain1y: -12997,
    unrealizedGainAll: -13000,
  },
];
import { TrendingUp, PieChart, Target } from 'lucide-react';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { useState } from 'react';

interface AssetsOverviewTabProps {
  holdingsSummary: any;
  isHoldingsLoading: boolean;
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
}

export const AssetsOverviewTab = ({
  holdingsSummary,
  isHoldingsLoading,
  timeframe = 'ytd'
}: AssetsOverviewTabProps) => {
  const { currency, updateCurrency } = useCurrencyPreference();
  const [visibleColumns, setVisibleColumns] = useState(['type', 'marketValue', 'allocation']);
  
  const availableColumns = [
    { id: 'type', label: 'Type', required: true },
    { id: 'marketValue', label: 'Market Value', required: true },
    { id: 'allocation', label: 'Allocation', required: true },
    { id: 'costBasis', label: 'Cost Basis' },
    { id: 'unrealizedPL', label: 'Unrealized P/L' },
  ];

  const handleColumnToggle = (columnId: string, visible: boolean) => {
    setVisibleColumns(prev => 
      visible ? [...prev, columnId] : prev.filter(id => id !== columnId)
    );
  };

  // Use mock data when real data is empty to demonstrate UI
  const displayData = (!holdingsSummary || Object.keys(holdingsSummary.allocation_by_type || {}).length === 0) ? {
    total_assets: 12,
    total_market_value: 1070000,
    total_cost_basis: 950000,
    total_unrealized_pl: 120000,
    total_unrealized_pl_percent: 12.63,
    total_annual_income: 28500,
    allocation_by_type: {
      'stocks': 520000,
      'bonds': 280000,
      'etfs': 170000,
      'cryptocurrency': 75000,
      'commodities': 25000
    },
    top_performer: {
      symbol: 'AAPL',
      change_percent: 5.2
    },
    worst_performer: {
      symbol: 'TSLA',
      change_percent: -2.8
    }
  } : holdingsSummary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Portfolio Overview</h2>
      </div>

      {/* ONE parent grid controls KPIs + Quick Actions + Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_1fr_320px] auto-rows-auto">
        {/* Row 1 — KPI row fills columns 1–2 */}
        <div className="lg:col-span-2">
          <HoldingsKpis
            data={displayData}
            isLoading={isHoldingsLoading}
          />
        </div>

        {/* Right column — Quick Actions spans rows 1–2 */}
        <div className="lg:row-span-2 h-full">
          <AssetsQuickActionsSidebar
            onAddAsset={() => console.log('Add asset')}
            onRefreshQuotes={() => console.log('Refresh quotes')}
            onViewAlerts={() => console.log('View alerts')}
            onExportData={() => console.log('Export data')}
            currency={currency}
            onCurrencyChange={updateCurrency}
            visibleColumns={visibleColumns}
            availableColumns={availableColumns}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Row 2 — Asset Allocation (left half) */}
        <Card className="bg-card border-border col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationByTypeChart
              data={displayData?.allocation_by_type || {}}
              isLoading={isHoldingsLoading}
            />
          </CardContent>
        </Card>

        {/* Row 2 — Top Movers (right half) */}
        <Card className="bg-card border-border col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Movers</CardTitle>
          </CardHeader>
          <CardContent>
            <TopMovers
              topMovers={displayData?.top_movers || []}
              isLoading={isHoldingsLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Assets table full width below */}
      <AssetsTableWithSorting 
        assets={mockAssets}
        isLoading={isHoldingsLoading}
        currency={currency}
        timeframe={timeframe}
      />
    </div>
  );
};