import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Target
} from 'lucide-react';
import type { ProcessingRowResult, AIInsights } from '@/types/propertyImport';
import { cn } from '@/lib/utils';

interface EnhancedAITabProps {
  row: ProcessingRowResult;
  onApplySuggestion?: (field: string, value: string) => void;
}

export function EnhancedAITab({ row, onApplySuggestion }: EnhancedAITabProps) {
  const insights = row.processed_data?.ai_insights;

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        <div className="text-center space-y-2">
          <Brain className="h-8 w-8 mx-auto opacity-50" />
          <p>No AI insights available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4" />
        <span className="text-sm font-medium">AI Analysis</span>
      </div>

      {/* Overall Confidence */}
      <OverallConfidenceCard insights={insights} />

      {/* Property Type Detection */}
      {insights.property_type_detection && (
        <PropertyTypeCard detection={insights.property_type_detection} />
      )}

      {/* Data Quality Assessment */}
      {insights.data_quality_assessment && (
        <DataQualityCard 
          assessment={insights.data_quality_assessment}
          onApplySuggestion={onApplySuggestion}
        />
      )}

      {/* Error Analysis */}
      {((Array.isArray(insights.error_analysis) && insights.error_analysis.length > 0) ||
        (insights.error_analysis?.detected_errors && insights.error_analysis.detected_errors.length > 0)) && (
        <ErrorAnalysisCard 
          errors={Array.isArray(insights.error_analysis) ? insights.error_analysis : insights.error_analysis.detected_errors}
          onApplySuggestion={onApplySuggestion}
        />
      )}

      {/* Duplicate Analysis */}
      {insights.duplicate_analysis && (
        <DuplicateAnalysisCard analysis={insights.duplicate_analysis} />
      )}
    </div>
  );
}

function OverallConfidenceCard({ insights }: { insights: AIInsights }) {
  const overallScore = Math.round((insights.data_quality_assessment?.accuracy_score || 0) * 100);
  
  const getConfidenceLevel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'default', icon: CheckCircle2 };
    if (score >= 80) return { label: 'Good', color: 'default', icon: TrendingUp };
    if (score >= 60) return { label: 'Fair', color: 'secondary', icon: BarChart3 };
    return { label: 'Needs Attention', color: 'destructive', icon: AlertTriangle };
  };

  const { label, color, icon: Icon } = getConfidenceLevel(overallScore);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">Overall AI Confidence</span>
        </div>
        <Badge variant={color as any} className="text-xs">
          {label}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Confidence Score</span>
          <span className="font-medium">{overallScore}%</span>
        </div>
        <Progress value={overallScore} className="h-2" />
      </div>
    </Card>
  );
}

function PropertyTypeCard({ detection }: { detection: any }) {
  const confidence = Math.round((detection.confidence || 0) * 100);
  
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4" />
        <span className="text-sm font-medium">Property Type Detection</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Detected Type</span>
          <Badge variant="outline" className="text-xs">
            {detection.detected_type || 'Unknown'}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Detection Confidence</span>
            <span className="font-medium">{confidence}%</span>
          </div>
          <Progress value={confidence} className="h-2" />
        </div>

        {detection.reasoning && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>AI Reasoning:</strong> {detection.reasoning}
          </div>
        )}
      </div>
    </Card>
  );
}

function DataQualityCard({ 
  assessment, 
  onApplySuggestion 
}: { 
  assessment: any; 
  onApplySuggestion?: (field: string, value: string) => void; 
}) {
  const accuracy = Math.round((assessment.accuracy_score || 0) * 100);
  const completeness = Math.round((assessment.completeness_score || 0) * 100);
  const consistency = Math.round((assessment.consistency_score || 0) * 100);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        <span className="text-sm font-medium">Data Quality Assessment</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <QualityMetric label="Accuracy" score={accuracy} />
        <QualityMetric label="Completeness" score={completeness} />
        <QualityMetric label="Consistency" score={consistency} />
      </div>

      {assessment.issues && assessment.issues.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quality Issues
          </div>
          {assessment.issues.map((issue: string, index: number) => (
            <div key={index} className="text-xs p-2 bg-warning/10 text-warning-foreground rounded border border-warning/20">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              {issue}
            </div>
          ))}
        </div>
      )}

      {assessment.suggestions && assessment.suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            AI Suggestions
          </div>
          {assessment.suggestions.map((suggestion: string, index: number) => (
            <SuggestionCard
              key={index}
              suggestion={suggestion}
              onApply={onApplySuggestion}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function QualityMetric({ label, score }: { label: string; score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={cn("font-medium", getColor(score))}>{score}%</span>
      </div>
      <Progress value={score} className="h-1.5" />
    </div>
  );
}

function ErrorAnalysisCard({ 
  errors, 
  onApplySuggestion 
}: { 
  errors: any[]; 
  onApplySuggestion?: (field: string, value: string) => void; 
}) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">AI Error Analysis</span>
      </div>

      {errors.map((error, index) => (
        <div key={index} className="space-y-2 p-3 bg-destructive/5 rounded border border-destructive/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{error.field || 'Unknown Field'}</span>
            <Badge variant="destructive" className="text-xs">
              {error.severity || 'medium'}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {error.issue || 'Issue detected by AI'}
          </div>

          {error.suggestion && (
            <div className="text-xs text-primary bg-primary/5 p-2 rounded border border-primary/20">
              <Lightbulb className="h-3 w-3 inline mr-1" />
              {error.suggestion}
            </div>
          )}

          {error.suggested_fix && onApplySuggestion && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApplySuggestion(error.field, error.suggested_fix)}
              className="h-6 text-xs"
            >
              Apply AI Fix
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}

function DuplicateAnalysisCard({ analysis }: { analysis: any }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4" />
        <span className="text-sm font-medium">Duplicate Analysis</span>
      </div>

      {analysis.is_potential_duplicate ? (
        <div className="space-y-2">
          <Badge variant="destructive" className="text-xs">
            Potential Duplicate Detected
          </Badge>
          
          {analysis.duplicate_group_id && (
            <div className="text-xs text-muted-foreground">
              Group ID: {analysis.duplicate_group_id}
            </div>
          )}
          
          {analysis.similarity_score && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Similarity Score</span>
                <span className="font-medium">
                  {Math.round(analysis.similarity_score * 100)}%
                </span>
              </div>
              <Progress value={analysis.similarity_score * 100} className="h-1.5" />
            </div>
          )}
          
          {analysis.reasoning && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <strong>AI Reasoning:</strong> {analysis.reasoning}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          No duplicates detected
        </div>
      )}
    </Card>
  );
}

function SuggestionCard({ 
  suggestion, 
  onApply 
}: { 
  suggestion: string; 
  onApply?: (field: string, value: string) => void; 
}) {
  // Parse suggestion to extract field and value if possible
  const parseSuggestion = (text: string) => {
    const fieldMatch = text.match(/(\w+):\s*(.+)/);
    if (fieldMatch) {
      return { field: fieldMatch[1], value: fieldMatch[2] };
    }
    return null;
  };

  const parsed = parseSuggestion(suggestion);

  return (
    <div className="text-xs p-2 bg-primary/5 rounded border border-primary/20 space-y-2">
      <div className="flex items-start gap-1">
        <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>{suggestion}</span>
      </div>
      
      {parsed && onApply && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApply(parsed.field, parsed.value)}
          className="h-5 text-xs"
        >
          Apply Suggestion
        </Button>
      )}
    </div>
  );
}