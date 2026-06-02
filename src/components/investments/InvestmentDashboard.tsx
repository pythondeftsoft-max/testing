import { useAdvancedPortfolioAssets } from "@/hooks/useAdvancedPortfolioAssets";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricDisplay } from "@/components/ui/metric-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Wallet, RefreshCw, Search, Filter, PieChart, LineChart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, PieChart as RechartsPieChart, Pie, Cell } from "recharts";

interface InvestmentDashboardProps {
  portfolioId: string;
}

export const InvestmentDashboard = ({ portfolioId }: InvestmentDashboardProps) => {
  const { assets, holdingsSummary, isLoading, refreshData } = useAdvancedPortfolioAssets(portfolioId);
  const { fetchPriceHistory } = usePriceHistory();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetType, setSelectedAssetType] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [priceChartData, setPriceChartData] = useState<any[]>([]);
  const [chartRange, setChartRange] = useState<string>("1M");

  // Filter for investment assets
  const investmentAssets = assets?.filter(asset => 
    asset.asset_category?.name === 'investments'
  ) || [];

  // Apply search and type filters
  const filteredAssets = useMemo(() => {
    return investmentAssets.filter(asset => {
      const matchesSearch = !searchQuery || 
        asset.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.metadata?.symbol || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedAssetType === "all" || 
        (asset.metadata?.asset_type || 'stock') === selectedAssetType;
      
      return matchesSearch && matchesType;
    });
  }, [investmentAssets, searchQuery, selectedAssetType]);

  // Prepare allocation chart data
  const allocationData = useMemo(() => {
    if (!holdingsSummary?.allocationByType) return [];
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
    return Object.entries(holdingsSummary.allocationByType).map(([type, value], index) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: Number(value),
      color: colors[index % colors.length]
    }));
  }, [holdingsSummary?.allocationByType]);

  const handleAssetClick = async (asset: any) => {
    setSelectedAsset(asset);
    const symbol = asset.metadata?.symbol || asset.metadata?.ticker;
    if (symbol) {
      const historyData = await fetchPriceHistory(
        symbol, 
        asset.metadata?.asset_type || 'stock', 
        chartRange as any
      );
      if (historyData) {
        const chartData = historyData.priceHistory.map(point => ({
          date: new Date(point.timestamp).toLocaleDateString(),
          price: point.close
        }));
        setPriceChartData(chartData);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalValue = holdingsSummary?.totalMarketValue || 0;
  const totalChange = holdingsSummary?.totalUnrealizedPL || 0;
  const totalChangePercent = holdingsSummary?.totalUnrealizedPLPercent || 0;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {portfolioId === 'everything' ? 'All Investment Holdings' : 'Investment Portfolio'}
          </h2>
          <p className="text-muted-foreground">
            {portfolioId === 'everything' 
              ? 'Track all your investments across portfolios' 
              : 'Track your stocks, crypto, bonds, and other investments'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricDisplay
          label="Total Market Value"
          value={formatCurrency(totalValue)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricDisplay
          label="Unrealized P&L"
          value={formatCurrency(totalChange)}
          trend={totalChange >= 0 ? "up" : "down"}
          trendValue={`${totalChangePercent.toFixed(2)}%`}
          icon={totalChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        />
        <MetricDisplay
          label="Cost Basis"
          value={formatCurrency(holdingsSummary?.totalCostBasis || 0)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricDisplay
          label="Total Holdings"
          value={holdingsSummary?.totalAssets?.toString() || '0'}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <MetricDisplay
          label="Annual Income"
          value={formatCurrency(holdingsSummary?.totalAnnualIncome || 0)}
          icon={<PieChart className="h-4 w-4" />}
        />
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="stock">Stocks</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="etf">ETFs</SelectItem>
              <SelectItem value="bond">Bonds</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {allocationData.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <PieChart className="h-4 w-4 mr-1" />
              Allocation
            </Button>
          </div>
        )}
      </div>

      {/* Holdings Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Holdings</h3>
            <Badge variant="outline">{investmentAssets.length} positions</Badge>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {searchQuery || selectedAssetType !== "all" 
                  ? "No investments match your filters" 
                  : "No investments found"
                }
              </p>
              <p className="text-sm">
                {searchQuery || selectedAssetType !== "all"
                  ? "Try adjusting your search or filters"
                  : "Add your first investment to start tracking"
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    {portfolioId === 'everything' && <TableHead>Portfolio</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Shares/Units</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Market Value</TableHead>
                    <TableHead>Unrealized P&L</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => {
                    const symbol = asset.metadata?.symbol || asset.metadata?.ticker || 'N/A';
                    const shares = parseFloat(asset.metadata?.shares || '1');
                    const marketData = asset.marketData;
                    const currentPrice = marketData?.currentPrice || asset.current_value || asset.asset_value || 0;
                    const marketValue = marketData?.marketValue || (shares * currentPrice);
                    const unrealizedPL = marketData?.unrealizedPL || 0;
                    const unrealizedPLPercent = marketData?.unrealizedPLPercent || 0;

                    return (
                      <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{asset.asset_name}</TableCell>
                        {portfolioId === 'everything' && (
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {asset.portfolioName || 'Unknown'}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="secondary">
                            {(asset.metadata?.asset_type || 'stock').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{symbol}</TableCell>
                        <TableCell>{shares.toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(currentPrice)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(marketValue)}</TableCell>
                        <TableCell>
                          <div className={`font-semibold ${
                            unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(unrealizedPL)}
                            <div className="text-xs opacity-75">
                              ({unrealizedPLPercent.toFixed(2)}%)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAssetClick(asset)}
                              >
                                <LineChart className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>{asset.asset_name} ({symbol})</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Current Price</p>
                                    <p className="text-lg font-semibold">{formatCurrency(currentPrice)}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Market Value</p>
                                    <p className="text-lg font-semibold">{formatCurrency(marketValue)}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                                    <p className={`text-lg font-semibold ${
                                      unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {formatCurrency(unrealizedPL)}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">P&L %</p>
                                    <p className={`text-lg font-semibold ${
                                      unrealizedPLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {unrealizedPLPercent.toFixed(2)}%
                                    </p>
                                  </div>
                                </div>
                                
                                {priceChartData.length > 0 && (
                                  <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <RechartsLineChart data={priceChartData}>
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line 
                                          type="monotone" 
                                          dataKey="price" 
                                          stroke="hsl(var(--primary))" 
                                          strokeWidth={2}
                                          dot={false}
                                        />
                                      </RechartsLineChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* Analytics and Performance */}
      {holdingsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Movers</h3>
            <div className="space-y-3">
              {holdingsSummary.topMovers && holdingsSummary.topMovers.length > 0 ? (
                holdingsSummary.topMovers.slice(0, 3).map((mover, index) => {
                  const isPositive = mover.changePercent >= 0;
                  return (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isPositive 
                          ? 'bg-green-50 dark:bg-green-950/20' 
                          : 'bg-red-50 dark:bg-red-950/20'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{mover.symbol}</p>
                        <p className="text-sm text-muted-foreground">{mover.timeframe.toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          <span className="font-semibold">
                            {isPositive ? '+' : ''}{mover.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No performance data available</p>
              )}
            </div>
          </Card>

          {allocationData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};