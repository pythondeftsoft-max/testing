import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, PieChart, TrendingUp, Wallet, CreditCard, Upload, Download } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart as RechartsBarChart, Bar as RechartsBar, XAxis as RechartsXAxis, YAxis as RechartsYAxis, CartesianGrid as RechartsCartesianGrid, ResponsiveContainer as RechartsResponsiveContainer } from 'recharts';
import { PortfolioNetWorthSummary } from './PortfolioNetWorthSummary';
import AssetTable from './AssetTable';
import { AddAssetWizard } from './AddAssetWizard';
import { WalletConnectionDialog } from './WalletConnectionDialog';
import { LiabilityDialog } from './LiabilityDialog';
import { CSVImportDialog } from './CSVImportDialog';
import { usePortfolioAssets } from '@/hooks/usePortfolioAssets';
import { usePortfolioLiabilities } from '@/hooks/usePortfolioLiabilities';
import { useWalletConnections } from '@/hooks/useWalletConnections';
import { useHoldingsSummary } from '@/hooks/useHoldingsSummary';
import { useRealtimeAssets } from '@/hooks/useRealtimeAssets';

interface ComprehensivePortfolioViewProps {
  portfolioId: string;
  userId: string;
}

export const ComprehensivePortfolioView: React.FC<ComprehensivePortfolioViewProps> = ({
  portfolioId,
  userId
}) => {
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Enable real-time updates for assets
  useRealtimeAssets(portfolioId);

  const { data: assets = [], refetch: refetchAssets } = usePortfolioAssets(portfolioId);
  const { data: liabilities = [] } = usePortfolioLiabilities(portfolioId);
  const { data: walletConnections = [] } = useWalletConnections(portfolioId);
  const { data: holdingsSummary } = useHoldingsSummary(portfolioId, userId);

  const handleRefresh = () => {
    refetchAssets();
  };

  const handleAssetAdded = () => {
    refetchAssets();
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Overview</h1>
          <p className="text-muted-foreground">Complete view of your assets and liabilities</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <AddAssetWizard 
            portfolioId={portfolioId}
            onAssetAdded={handleAssetAdded}
            trigger={
              <Button size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            }
          />
          
          <LiabilityDialog 
            portfolioId={portfolioId}
            trigger={
              <Button variant="outline" size="sm">
                <CreditCard className="w-4 h-4 mr-2" />
                Add Liability
              </Button>
            }
          />
          
          <WalletConnectionDialog 
            portfolioId={portfolioId}
            trigger={
              <Button variant="outline" size="sm">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            }
          />
          
            <CSVImportDialog 
              portfolioId={portfolioId}
              onImportComplete={() => {
                // Refresh data when import completes
                window.location.reload();
              }}
              trigger={
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              }
            />
        </div>
      </div>

      {/* Portfolio Summary */}
      <PortfolioNetWorthSummary
        portfolioId={portfolioId}
        onAddAsset={() => setAddAssetOpen(true)}
        onAddLiability={() => {}}
        onRefresh={handleRefresh}
      />

      {/* Connected Services Status */}
      {walletConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Connected Wallets & Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {walletConnections.map((connection) => (
                <Badge key={connection.id} variant="secondary" className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  {connection.connection_name}
                  <span className="text-xs text-muted-foreground">
                    ({connection.wallet_type})
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Asset Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(assets.map(a => a.asset_category?.display_name)).size}
                </div>
                <p className="text-xs text-muted-foreground">Diversification</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Real-time Tracked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {assets.filter(a => a.metadata?.symbol).length}
                </div>
                <p className="text-xs text-muted-foreground">Market data enabled</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Wallet Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {walletConnections.length}
                </div>
                <p className="text-xs text-muted-foreground">Auto-sync enabled</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetTable 
                assets={assets.slice(0, 5).map(asset => ({
                  ...asset,
                  marketData: holdingsSummary ? {
                    currentPrice: asset.current_value || asset.asset_value,
                    marketValue: asset.current_value || asset.asset_value,
                  } : undefined
                }))} 
                isLoading={false} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <AssetTable 
            assets={assets.map(asset => ({
              ...asset,
              marketData: holdingsSummary ? {
                currentPrice: asset.current_value || asset.asset_value,
                marketValue: asset.current_value || asset.asset_value,
              } : undefined
            }))} 
            isLoading={false} 
          />
        </TabsContent>

        <TabsContent value="liabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liabilities Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {liabilities.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No liabilities recorded</p>
                  <LiabilityDialog 
                    portfolioId={portfolioId}
                    trigger={
                      <Button>Add Your First Liability</Button>
                    }
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {liabilities.map((liability) => (
                    <div key={liability.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{liability.liability_name}</h4>
                        <p className="text-sm text-muted-foreground">{liability.liability_type}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-destructive">
                          ${liability.current_balance.toLocaleString()}
                        </div>
                        {liability.monthly_payment && (
                          <div className="text-sm text-muted-foreground">
                            ${liability.monthly_payment}/mo
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Asset Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const categoryMap: Record<string, number> = {};
                  assets.forEach(a => {
                    const cat = a.asset_category?.display_name || 'Uncategorized';
                    categoryMap[cat] = (categoryMap[cat] || 0) + (a.current_value || a.asset_value || 0);
                  });
                  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
                  const COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(48, 96%, 53%)', 'hsl(280, 65%, 60%)', 'hsl(200, 80%, 50%)', 'hsl(350, 70%, 55%)'];
                  
                  if (pieData.length === 0) {
                    return <div className="text-center py-8 text-muted-foreground">No assets to display</div>;
                  }
                  
                  const total = pieData.reduce((s, d) => s + d.value, 0);
                  
                  return (
                    <div>
                      <div className="h-[250px]">
                        <RechartsPieChart width={400} height={250}>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={2}>
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                        </RechartsPieChart>
                      </div>
                      <div className="space-y-2 mt-4">
                        {pieData.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span>{d.name}</span>
                            </div>
                            <span className="font-medium">{((d.value / total) * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Generate performance data from assets with acquisition dates
                  const performanceData = assets
                    .filter(a => a.acquisition_date && a.acquisition_cost)
                    .map(a => ({
                      name: a.asset_name.substring(0, 15),
                      cost: a.acquisition_cost || 0,
                      current: a.current_value || a.asset_value || 0,
                      roi: a.acquisition_cost ? (((a.current_value || a.asset_value || 0) - a.acquisition_cost) / a.acquisition_cost * 100) : 0,
                    }))
                    .slice(0, 8);
                  
                  if (performanceData.length === 0) {
                    return <div className="text-center py-8 text-muted-foreground">Add acquisition cost data to track performance</div>;
                  }
                  
                  return (
                    <div className="h-[300px]">
                      <RechartsResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={performanceData}>
                          <RechartsCartesianGrid strokeDasharray="3 3" />
                          <RechartsXAxis dataKey="name" fontSize={11} />
                          <RechartsYAxis fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                          <RechartsTooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                          <RechartsBar dataKey="cost" fill="hsl(var(--muted-foreground))" name="Acquisition Cost" />
                          <RechartsBar dataKey="current" fill="hsl(var(--primary))" name="Current Value" />
                        </RechartsBarChart>
                      </RechartsResponsiveContainer>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};