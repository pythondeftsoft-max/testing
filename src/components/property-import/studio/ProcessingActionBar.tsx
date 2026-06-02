import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  Loader2 
} from 'lucide-react';
import { useImportStudio } from '@/stores/importStudioStore';
import type { ProcessingRowResult } from '@/types/propertyImport';

interface ProcessingActionBarProps {
  data: ProcessingRowResult[];
  onReprocessSelected?: () => void;
  onReprocessFailed?: () => void;
  onContinue?: () => void;
  isProcessing?: boolean;
  qualityMetrics?: {
    successRate: number;
    completenessScore: number;
    accuracyScore: number;
    trends: {
      improving: number;
      degrading: number;
      stable: number;
    };
  };
}

export function ProcessingActionBar({ 
  data, 
  onReprocessSelected,
  onReprocessFailed,
  onContinue,
  isProcessing = false,
  qualityMetrics
}: ProcessingActionBarProps) {
  const { selectedRowIds, hasSelection, getSelectedCount } = useImportStudio();

  // Calculate stats
  const stats = data.reduce((acc, row) => {
    switch (row.status) {
      case 'success':
        acc.success++;
        break;
      case 'warning':
        acc.warning++;
        break;
      case 'failed':
        acc.failed++;
        break;
    }
    return acc;
  }, { success: 0, warning: 0, failed: 0 });

  const total = data.length;
  const successRate = total > 0 ? (stats.success / total) * 100 : 0;
  const canContinue = stats.failed === 0 && total > 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Stats Section */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">{stats.success}</span>
                <span className="text-muted-foreground">Success</span>
              </div>
              
              <div className="flex items-center gap-1 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">{stats.warning}</span>
                <span className="text-muted-foreground">Warning</span>
              </div>
              
              <div className="flex items-center gap-1 text-sm">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium">{stats.failed}</span>
                <span className="text-muted-foreground">Failed</span>
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              <div className="text-sm">
                <span className="font-medium">{Math.round(successRate)}%</span>
                <span className="text-muted-foreground"> success rate</span>
              </div>
              <Progress value={successRate} className="w-20 h-2" />
            </div>

            {qualityMetrics && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="font-medium">{Math.round(qualityMetrics.completenessScore)}%</span>
                    <span className="text-muted-foreground"> complete</span>
                  </div>
                  <div>
                    <span className="font-medium">{Math.round(qualityMetrics.accuracyScore)}%</span>
                    <span className="text-muted-foreground"> accurate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs">{qualityMetrics.trends.improving} improving</span>
                  </div>
                </div>
              </>
            )}

            {hasSelection() && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Badge variant="secondary" className="text-xs">
                  {getSelectedCount()} selected
                </Badge>
              </>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2">
            {hasSelection() && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReprocessSelected}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reprocess Selected
              </Button>
            )}

            {stats.failed > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReprocessFailed}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reprocess Failed ({stats.failed})
              </Button>
            )}

            <Button
              variant={canContinue ? "default" : "secondary"}
              size="sm"
              onClick={onContinue}
              disabled={!canContinue || isProcessing}
              className="gap-2"
            >
              Continue to Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}