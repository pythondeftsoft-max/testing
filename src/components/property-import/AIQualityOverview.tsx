import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { AddressProcessingResult } from '@/types/propertyImport';

interface AIQualityOverviewProps {
  addressProcessingResult: AddressProcessingResult;
}

const AIQualityOverview: React.FC<AIQualityOverviewProps> = ({
  addressProcessingResult
}) => {
  const { ai_summary, row_results } = addressProcessingResult;

  if (!ai_summary) {
    return null;
  }

  const getQualityColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadge = (score: number) => {
    if (score >= 85) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">High Quality</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium Quality</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  const highConfidenceRows = row_results.filter(row => 
    row.ai_suggestions?.confidence && row.ai_suggestions.confidence >= 0.8
  ).length;

  const lowQualityRows = row_results.filter(row => 
    row.ai_suggestions?.priority === 'high'
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Quality Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Quality Score */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Overall Data Quality</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getQualityColor(ai_summary.overall_quality_score)}`}>
                {ai_summary.overall_quality_score}%
              </span>
              {getQualityBadge(ai_summary.overall_quality_score)}
            </div>
          </div>
          <Progress 
            value={ai_summary.overall_quality_score} 
            className="w-24 h-2"
          />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Processing Confidence</p>
              <p className="text-sm font-semibold">{Math.round(ai_summary.processing_confidence * 100)}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">High Confidence</p>
              <p className="text-sm font-semibold">{highConfidenceRows} rows</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Copy className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-xs text-muted-foreground">Duplicates Found</p>
              <p className="text-sm font-semibold">{ai_summary.total_duplicates_found}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">Needs Attention</p>
              <p className="text-sm font-semibold">{lowQualityRows} rows</p>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        {ai_summary.recommended_actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Top Recommendations</p>
            <div className="space-y-1">
              {ai_summary.recommended_actions.slice(0, 3).map((action, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIQualityOverview;