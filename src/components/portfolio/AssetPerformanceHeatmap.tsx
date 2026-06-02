import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { AssetPerformanceMetrics } from '@/hooks/useAssetAnalytics';

interface AssetPerformanceHeatmapProps {
  assets: AssetPerformanceMetrics[];
  title?: string;
  description?: string;
}

export const AssetPerformanceHeatmap = ({ 
  assets, 
  title = "Asset Performance Heatmap", 
  description = "Visual overview of asset health and performance" 
}: AssetPerformanceHeatmapProps) => {
  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No asset data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (healthScore: number) => {
    if (healthScore >= 80) return 'bg-green-500';
    if (healthScore >= 60) return 'bg-yellow-500';
    if (healthScore >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getHealthTextColor = (healthScore: number) => {
    if (healthScore >= 80) return 'text-green-700';
    if (healthScore >= 60) return 'text-yellow-700';
    if (healthScore >= 40) return 'text-orange-700';
    return 'text-red-700';
  };

  const getRiskIcon = (riskScore: number) => {
    if (riskScore >= 67) return <AlertTriangle className="h-3 w-3 text-red-500" />;
    if (riskScore >= 33) return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    return null;
  };

  const getTrendIcon = (roi: number) => {
    if (roi > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {assets.map((asset) => (
              <Tooltip key={asset.id}>
                <TooltipTrigger asChild>
                  <div 
                    className={`
                      relative p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
                      ${getHealthColor(asset.healthScore)} hover:scale-105
                    `}
                    style={{
                      opacity: 0.1 + (asset.healthScore / 100) * 0.9, // Opacity based on health score
                    }}
                  >
                    {/* Asset Name */}
                    <div className="text-white font-medium text-sm mb-1 truncate">
                      {asset.name}
                    </div>
                    
                    {/* Category */}
                    <div className="text-white/80 text-xs mb-2 truncate">
                      {asset.category}
                    </div>
                    
                    {/* Key Metrics */}
                    <div className="flex items-center justify-between text-white text-xs">
                      <span className="font-medium">
                        {asset.roi > 0 ? '+' : ''}{asset.roi.toFixed(1)}%
                      </span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(asset.roi)}
                        {getRiskIcon(asset.riskScore)}
                      </div>
                    </div>
                    
                    {/* Health Score Indicator */}
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 rounded-full bg-white/80" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="w-64">
                  <div className="space-y-2">
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-muted-foreground">{asset.category}</div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current Value:</span>
                        <div className="font-medium">{formatCurrency(asset.currentValue)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ROI:</span>
                        <div className={`font-medium ${asset.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {asset.roi > 0 ? '+' : ''}{asset.roi.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly Income:</span>
                        <div className="font-medium text-green-600">
                          {formatCurrency(asset.monthlyIncome)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly Expenses:</span>
                        <div className="font-medium text-red-600">
                          {formatCurrency(asset.monthlyExpenses)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Health:</span>
                        <Badge variant="secondary" className={getHealthTextColor(asset.healthScore)}>
                          {asset.healthScore.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Risk:</span>
                        <Badge 
                          variant="secondary" 
                          className={
                            asset.riskScore >= 67 ? 'text-red-700' :
                            asset.riskScore >= 33 ? 'text-yellow-700' : 'text-green-700'
                          }
                        >
                          {asset.riskScore >= 67 ? 'High' : 
                           asset.riskScore >= 33 ? 'Medium' : 'Low'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Health Score:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-xs">80-100%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-xs">60-79%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-xs">40-59%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-xs">0-39%</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};