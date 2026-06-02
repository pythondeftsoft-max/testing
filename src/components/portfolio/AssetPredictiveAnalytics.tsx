import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Brain, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAssetPredictions } from '@/hooks/useAssetAnalytics';
import { formatCurrency } from '@/lib/utils';
import type { PortfolioAsset } from '@/types/portfolio-assets';

interface AssetPredictiveAnalyticsProps {
  assets: PortfolioAsset[];
  portfolioId: string;
}

export const AssetPredictiveAnalytics = ({ assets, portfolioId }: AssetPredictiveAnalyticsProps) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  
  const { data: predictions, isLoading, refetch } = useAssetPredictions(selectedAssetId);

  const selectedAsset = assets.find(asset => asset.id === selectedAssetId);

  if (!selectedAsset) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No assets available for prediction analysis</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Predictive Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>;
    if (confidence >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low Confidence</Badge>;
  };

  // Prepare chart data combining historical and predicted values
  const chartData = predictions?.predictions.map(pred => ({
    date: pred.date,
    value: pred.predictedValue,
    confidence: pred.confidence,
    type: 'predicted'
  })) || [];

  // Add current value as reference point
  const currentDate = new Date().toISOString().slice(0, 7);
  const currentValue = selectedAsset.current_value || selectedAsset.asset_value;
  
  const fullChartData = [
    { date: currentDate, value: currentValue, confidence: 1, type: 'current' },
    ...chartData
  ];

  const formatTooltipValue = (value: number, name: string, props: any) => {
    const confidence = props.payload.confidence;
    return [
      `${formatCurrency(value)} (${(confidence * 100).toFixed(0)}% confidence)`,
      name === 'value' ? 'Predicted Value' : name
    ];
  };

  const formatXAxisLabel = (dateString: string) => {
    const date = new Date(dateString + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Calculate key insights
  const futureValue = predictions?.predictions[11]?.predictedValue || currentValue;
  const totalReturn = futureValue - currentValue;
  const returnPercentage = currentValue > 0 ? (totalReturn / currentValue) * 100 : 0;
  const monthlyGrowthRate = Math.pow(futureValue / currentValue, 1/12) - 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Predictive Analytics
              </CardTitle>
              <CardDescription>
                AI-powered forecasting and trend analysis for your assets
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.asset_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Predictions */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                12-Month Forecast
              </h4>
              
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Current Value</div>
                  <div className="text-lg font-semibold">{formatCurrency(currentValue)}</div>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Predicted Value (12 months)</div>
                  <div className="text-lg font-semibold">{formatCurrency(futureValue)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {returnPercentage >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {returnPercentage > 0 ? '+' : ''}{returnPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Monthly Growth Rate</div>
                  <div className="text-lg font-semibold">
                    {monthlyGrowthRate > 0 ? '+' : ''}{(monthlyGrowthRate * 100).toFixed(2)}%
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Model Accuracy</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">
                      {predictions ? (predictions.modelAccuracy * 100).toFixed(0) : '0'}%
                    </div>
                    {predictions && getConfidenceBadge(predictions.modelAccuracy)}
                  </div>
                </div>
              </div>
            </div>

            {/* Prediction Chart */}
            <div className="lg:col-span-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">
                Value Projection
              </h4>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={fullChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxisLabel}
                    className="text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelFormatter={(label) => `Month: ${formatXAxisLabel(label)}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <ReferenceLine 
                    x={currentDate} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="2 2"
                    label={{ value: "Today", position: "top" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={(props) => {
                      const { payload } = props;
                      const opacity = payload.type === 'current' ? 1 : payload.confidence;
                      return (
                        <circle 
                          {...props} 
                          fill="hsl(var(--primary))" 
                          strokeWidth={2}
                          opacity={opacity}
                        />
                      );
                    }}
                    strokeDasharray={currentValue ? "0" : "5 5"}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment and Recommendations */}
      {predictions && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Assessment</CardTitle>
              <CardDescription>Potential risks and market factors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Prediction Reliability</span>
                  <Badge className={getConfidenceColor(predictions.modelAccuracy)}>
                    {(predictions.modelAccuracy * 100).toFixed(0)}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Market Volatility Risk</span>
                  <Badge variant="secondary">Medium</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Liquidity Risk</span>
                  <Badge variant="outline">Low</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommendations</CardTitle>
              <CardDescription>AI-generated insights and suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {returnPercentage > 10 ? (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-800">Strong Growth Expected</div>
                      <div className="text-green-700">Consider holding or increasing investment</div>
                    </div>
                  </div>
                ) : returnPercentage < -5 ? (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-800">Potential Value Decline</div>
                      <div className="text-red-700">Review fundamentals and consider strategy adjustment</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-800">Stable Performance</div>
                      <div className="text-blue-700">Asset expected to maintain steady value</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};