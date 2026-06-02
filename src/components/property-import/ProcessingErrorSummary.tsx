import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Brain, Target, TrendingUp } from 'lucide-react';
import { ProcessingRowResult, AddressProcessingResult } from '@/types/propertyImport';

interface ProcessingErrorSummaryProps {
  results: ProcessingRowResult[];
  aiSummary?: AddressProcessingResult['ai_summary'];
}

const ProcessingErrorSummary = ({ results, aiSummary }: ProcessingErrorSummaryProps) => {
  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  const errorTypes = results
    .filter(r => r.errors && r.errors.length > 0)
    .flatMap(r => r.errors || [])
    .reduce((acc, error) => {
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const warningTypes = results
    .filter(r => r.warnings && r.warnings.length > 0)
    .flatMap(r => r.warnings || [])
    .reduce((acc, warning) => {
      acc[warning] = (acc[warning] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {aiSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Analysis Summary
            </CardTitle>
            <CardDescription>
              Intelligent insights and quality assessment from AI processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded border bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Quality Score
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(aiSummary.overall_quality_score * 100)}%
                </div>
              </div>
              
              <div className="p-3 rounded border bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Target className="h-4 w-4 text-orange-600" />
                  Duplicates Found
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {aiSummary.total_duplicates_found}
                </div>
              </div>
              
              <div className="p-3 rounded border bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  AI Detected Issues
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {aiSummary.total_errors_detected}
                </div>
              </div>
            </div>

            {aiSummary.recommended_actions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Recommendations
                </h4>
                <div className="space-y-2">
                  {aiSummary.recommended_actions.map((action, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 rounded border bg-primary/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Brain className="h-3 w-3" />
              <span>Processing Confidence: {Math.round(aiSummary.processing_confidence * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Processing Summary */}
        <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Processing Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Successful</span>
            </div>
            <Badge variant="default">{successCount}</Badge>
          </div>
          
          {warningCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Warnings</span>
              </div>
              <Badge variant="secondary">{warningCount}</Badge>
            </div>
          )}
          
          {failedCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm">Failed</span>
              </div>
              <Badge variant="destructive">{failedCount}</Badge>
            </div>
          )}
          
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Rows</span>
              <span className="text-sm">{results.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Details */}
      {(Object.keys(errorTypes).length > 0 || Object.keys(warningTypes).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Issue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(errorTypes).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">Errors</h4>
                <div className="space-y-1">
                  {Object.entries(errorTypes).map(([error, count]) => (
                    <div key={error} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{error}</span>
                      <Badge variant="destructive" className="text-xs">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {Object.keys(warningTypes).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2">Warnings</h4>
                <div className="space-y-1">
                  {Object.entries(warningTypes).map(([warning, count]) => (
                    <div key={warning} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{warning}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default ProcessingErrorSummary;