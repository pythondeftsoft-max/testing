import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, BarChart3, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAssetComparison } from '@/hooks/useAssetAnalytics';
import type { AssetPerformanceMetrics } from '@/hooks/useAssetAnalytics';

interface AssetComparisonTableProps {
  assets: AssetPerformanceMetrics[];
  portfolioId: string;
  onSelectionChange?: (selectedAssets: AssetPerformanceMetrics[]) => void;
}

export const AssetComparisonTable = ({ 
  assets, 
  portfolioId, 
  onSelectionChange 
}: AssetComparisonTableProps) => {
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { data: comparisonData, isLoading } = useAssetComparison(selectedAssetIds, portfolioId);

  const handleAssetSelection = (assetId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedAssetIds, assetId]
      : selectedAssetIds.filter(id => id !== assetId);
    
    setSelectedAssetIds(newSelection);
    
    if (onSelectionChange) {
      const selectedAssets = assets.filter(asset => newSelection.includes(asset.id));
      onSelectionChange(selectedAssets);
    }
  };

  const getPerformanceIcon = (roi: number) => {
    if (roi > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getHealthBadge = (healthScore: number) => {
    if (healthScore >= 80) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (healthScore >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (healthScore >= 40) return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 67) return <Badge variant="destructive">High</Badge>;
    if (riskScore >= 33) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Asset Performance Comparison</CardTitle>
              <CardDescription>
                Compare assets side-by-side and against benchmarks
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedAssetIds.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowComparison(!showComparison)}
                  disabled={isLoading}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {showComparison ? 'Hide' : 'Show'} Benchmarks
                </Button>
              )}
              <Badge variant="secondary">
                {selectedAssetIds.length} selected
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedAssetIds.length === assets.length && assets.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAssetIds(assets.map(asset => asset.id));
                        } else {
                          setSelectedAssetIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">Monthly Income</TableHead>
                  <TableHead className="text-right">Net Monthly</TableHead>
                  <TableHead className="text-center">Health</TableHead>
                  <TableHead className="text-center">Risk</TableHead>
                  <TableHead className="text-right">Annualized Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAssetIds.includes(asset.id)}
                        onCheckedChange={(checked) => 
                          handleAssetSelection(asset.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPerformanceIcon(asset.roi)}
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Acquired {asset.daysSinceAcquisition} days ago
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(asset.currentValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={asset.roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {asset.roi > 0 ? '+' : ''}{asset.roi.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(asset.monthlyIncome)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={asset.netMonthlyIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(asset.netMonthlyIncome)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getHealthBadge(asset.healthScore)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getRiskBadge(asset.riskScore)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={asset.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {asset.annualizedReturn > 0 ? '+' : ''}{asset.annualizedReturn.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Comparison */}
      {showComparison && comparisonData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Benchmark Comparison
            </CardTitle>
            <CardDescription>
              Compare selected assets against portfolio and market benchmarks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {comparisonData.benchmarks.portfolioAverage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Portfolio Average ROI</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {comparisonData.benchmarks.categoryAverage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Category Average ROI</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {comparisonData.benchmarks.marketAverage.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Market Average ROI</div>
              </div>
            </div>

            <div className="space-y-4">
              {comparisonData.assets.map((asset) => (
                <div key={asset.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{asset.name}</h4>
                    <Badge variant="outline">{asset.category}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">vs Portfolio: </span>
                      <span className={
                        asset.roi > comparisonData.benchmarks.portfolioAverage 
                          ? 'text-green-600 font-medium' 
                          : 'text-red-600 font-medium'
                      }>
                        {asset.roi > comparisonData.benchmarks.portfolioAverage ? '+' : ''}
                        {(asset.roi - comparisonData.benchmarks.portfolioAverage).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">vs Category: </span>
                      <span className={
                        asset.roi > comparisonData.benchmarks.categoryAverage 
                          ? 'text-green-600 font-medium' 
                          : 'text-red-600 font-medium'
                      }>
                        {asset.roi > comparisonData.benchmarks.categoryAverage ? '+' : ''}
                        {(asset.roi - comparisonData.benchmarks.categoryAverage).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">vs Market: </span>
                      <span className={
                        asset.roi > comparisonData.benchmarks.marketAverage 
                          ? 'text-green-600 font-medium' 
                          : 'text-red-600 font-medium'
                      }>
                        {asset.roi > comparisonData.benchmarks.marketAverage ? '+' : ''}
                        {(asset.roi - comparisonData.benchmarks.marketAverage).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};