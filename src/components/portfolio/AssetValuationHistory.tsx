import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calendar, FileText } from 'lucide-react';
import { useAssetValuations } from '@/hooks/usePortfolioAssets';
import type { PortfolioAsset, AssetValuation } from '@/types/portfolio-assets';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AssetValuationHistoryProps {
  asset: PortfolioAsset;
  onRecordValuation: () => void;
}

export const AssetValuationHistory: React.FC<AssetValuationHistoryProps> = ({
  asset,
  onRecordValuation,
}) => {
  const { data: valuations = [], isLoading } = useAssetValuations(asset.id);

  const currentValue = asset.current_value || asset.asset_value;
  const latestValuation = valuations[0];
  const previousValuation = valuations[1];

  // Calculate value change
  const valueChange = latestValuation && previousValuation 
    ? latestValuation.market_value - previousValuation.market_value 
    : null;

  const valueChangePercent = valueChange && previousValuation
    ? ((valueChange / previousValuation.market_value) * 100)
    : null;

  // Calculate depreciation (simple straight-line for demo)
  const calculateDepreciation = (valuation: AssetValuation) => {
    const acquisitionCost = asset.acquisition_cost || asset.asset_value;
    const yearsOwned = asset.acquisition_date 
      ? Math.max(1, (new Date().getTime() - new Date(asset.acquisition_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 1;
    
    // Assume 20-year useful life for demo
    const usefulLife = 20;
    const annualDepreciation = acquisitionCost / usefulLife;
    const totalDepreciation = Math.min(acquisitionCost, annualDepreciation * yearsOwned);
    
    return {
      annual: annualDepreciation,
      total: totalDepreciation,
      remaining: acquisitionCost - totalDepreciation,
    };
  };

  const depreciation = calculateDepreciation(latestValuation || {
    market_value: currentValue,
    valuation_date: new Date().toISOString(),
  } as AssetValuation);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">Loading valuation history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Value & Change Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Valuation Overview</CardTitle>
            <Button onClick={onRecordValuation} size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Record Valuation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Current Value</div>
              <div className="text-2xl font-bold">{formatCurrency(currentValue)}</div>
            </div>
            
            {valueChange !== null && (
              <div>
                <div className="text-sm text-muted-foreground">Value Change</div>
                <div className={`text-lg font-semibold flex items-center gap-1 ${
                  valueChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {valueChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatCurrency(Math.abs(valueChange))}
                  {valueChangePercent && (
                    <span className="text-sm">
                      ({valueChangePercent > 0 ? '+' : ''}{valueChangePercent.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm text-muted-foreground">Annual Depreciation</div>
              <div className="text-lg font-semibold text-orange-600">
                {formatCurrency(depreciation.annual)}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Book Value</div>
              <div className="text-lg font-semibold">
                {formatCurrency(depreciation.remaining)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation History */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation History</CardTitle>
        </CardHeader>
        <CardContent>
          {valuations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>No valuation history recorded yet.</div>
              <div className="text-sm">Record your first valuation to track value changes over time.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {valuations.map((valuation, index) => {
                const isLatest = index === 0;
                const prevValuation = valuations[index + 1];
                const change = prevValuation 
                  ? valuation.market_value - prevValuation.market_value 
                  : null;

                return (
                  <div 
                    key={valuation.id} 
                    className={`border rounded-lg p-4 ${isLatest ? 'bg-primary/5 border-primary/20' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatDate(new Date(valuation.valuation_date))}
                          </span>
                          {isLatest && (
                            <Badge variant="default" className="text-xs">Latest</Badge>
                          )}
                          <Badge variant="outline" className="text-xs capitalize">
                            {valuation.valuation_method.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <div className="text-sm text-muted-foreground">Market Value</div>
                            <div className="text-lg font-semibold">
                              {formatCurrency(valuation.market_value)}
                            </div>
                          </div>
                          
                          {valuation.appraised_value && (
                            <div>
                              <div className="text-sm text-muted-foreground">Appraised Value</div>
                              <div className="text-lg font-semibold">
                                {formatCurrency(valuation.appraised_value)}
                              </div>
                            </div>
                          )}
                        </div>

                        {change !== null && (
                          <div className={`text-sm flex items-center gap-1 ${
                            change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {change >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {change >= 0 ? '+' : ''}{formatCurrency(change)} from previous valuation
                          </div>
                        )}

                        {valuation.notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <FileText className="h-3 w-3 inline mr-1" />
                            {valuation.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};