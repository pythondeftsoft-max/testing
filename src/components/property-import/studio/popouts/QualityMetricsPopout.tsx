import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useImportStudio } from '@/stores/importStudioStore';
import type { ProcessingRowResult } from '@/types/propertyImport';

interface QualityMetricsPopoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProcessingRowResult[];
}

export function QualityMetricsPopout({ open, onOpenChange, data }: QualityMetricsPopoutProps) {
  const { qualityTrends } = useImportStudio();

  const calculateMetrics = () => {
    const total = data.length;
    const successful = data.filter(r => r.status === 'success').length;
    const warnings = data.filter(r => r.status === 'warning').length;
    const failed = data.filter(r => r.status === 'failed').length;
    
    const successRate = (successful / total) * 100;
    const warningRate = (warnings / total) * 100;
    const failureRate = (failed / total) * 100;

    // Calculate completeness score
    const completenessScore = data.reduce((acc, row) => {
      const fields = Object.keys(row.processed_data || {});
      const filledFields = fields.filter(key => {
        const value = row.processed_data?.[key];
        return value !== null && value !== undefined && value !== '';
      });
      return acc + (filledFields.length / Math.max(fields.length, 1));
    }, 0) / total * 100;

    // Calculate accuracy score based on AI confidence
    const accuracyScore = data.reduce((acc, row) => {
      const aiInsights = row.processed_data?.ai_insights;
      const confidence = aiInsights?.data_quality_assessment?.accuracy_score || 0;
      return acc + confidence;
    }, 0) / total * 100;

    return {
      total,
      successful,
      warnings,
      failed,
      successRate,
      warningRate,
      failureRate,
      completenessScore,
      accuracyScore
    };
  };

  const metrics = calculateMetrics();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Quality Metrics & Analytics</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-y-auto space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <p className={`text-2xl font-bold ${getScoreColor(metrics.successRate)}`}>
                        {metrics.successRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${getScoreBackground(metrics.successRate)}`}>
                      <CheckCircle className={`h-6 w-6 ${getScoreColor(metrics.successRate)}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={metrics.successRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completeness</p>
                      <p className={`text-2xl font-bold ${getScoreColor(metrics.completenessScore)}`}>
                        {metrics.completenessScore.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${getScoreBackground(metrics.completenessScore)}`}>
                      <Target className={`h-6 w-6 ${getScoreColor(metrics.completenessScore)}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={metrics.completenessScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">AI Accuracy</p>
                      <p className={`text-2xl font-bold ${getScoreColor(metrics.accuracyScore)}`}>
                        {metrics.accuracyScore.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${getScoreBackground(metrics.accuracyScore)}`}>
                      <BarChart3 className={`h-6 w-6 ${getScoreColor(metrics.accuracyScore)}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={metrics.accuracyScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">{metrics.total}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-green-600">{metrics.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                    <Badge variant="default">{metrics.successRate.toFixed(1)}%</Badge>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-yellow-600">{metrics.warnings}</div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                    <Badge variant="secondary">{metrics.warningRate.toFixed(1)}%</Badge>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-red-600">{metrics.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                    <Badge variant="destructive">{metrics.failureRate.toFixed(1)}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="flex-1 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <LineChart className="h-4 w-4" />
                    Success Rate Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{(qualityTrends[qualityTrends.length - 1]?.successRate || 0).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Current</div>
                    </div>
                    {getTrendIcon(qualityTrends[qualityTrends.length - 1]?.successRate || 0, 85)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Completeness Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{(qualityTrends[qualityTrends.length - 1]?.completenessScore || 0).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Current</div>
                    </div>
                    {getTrendIcon(qualityTrends[qualityTrends.length - 1]?.completenessScore || 0, 78)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Accuracy Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{(qualityTrends[qualityTrends.length - 1]?.accuracyScore || 0).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Current</div>
                    </div>
                    {getTrendIcon(qualityTrends[qualityTrends.length - 1]?.accuracyScore || 0, 82)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="flex-1 overflow-y-auto space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Common Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">Missing Address Components</div>
                      <div className="text-sm text-muted-foreground">
                        {data.filter(r => r.errors?.some(e => e.includes('address'))).length} records
                      </div>
                    </div>
                    <Badge variant="secondary">High Priority</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">Invalid Property Types</div>
                      <div className="text-sm text-muted-foreground">
                        {data.filter(r => r.errors?.some(e => e.includes('property_type'))).length} records
                      </div>
                    </div>
                    <Badge variant="outline">Medium Priority</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="flex-1 overflow-y-auto space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Data Quality Improvements</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Standardize address formats before import</li>
                      <li>• Add property type validation rules</li>
                      <li>• Implement duplicate detection thresholds</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Process Optimization</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Use batch processing for large datasets</li>
                      <li>• Enable auto-correction for common errors</li>
                      <li>• Set up monitoring alerts for quality drops</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}