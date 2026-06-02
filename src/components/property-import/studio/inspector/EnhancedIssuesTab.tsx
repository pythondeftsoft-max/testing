import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  Eye,
  ArrowRight
} from 'lucide-react';
import type { ProcessingRowResult, ImportValidationError } from '@/types/propertyImport';
import { cn } from '@/lib/utils';

interface EnhancedIssuesTabProps {
  row: ProcessingRowResult;
  onFixIssue?: (field: string, value: string) => void;
}

type ErrorSeverity = 'high' | 'medium' | 'low';
type ErrorCategory = 'validation' | 'formatting' | 'completeness';

interface StructuredError {
  field: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  suggestion?: string;
  fixValue?: string;
  canAutoFix: boolean;
}

export function EnhancedIssuesTab({ row, onFixIssue }: EnhancedIssuesTabProps) {
  const [previewFixes, setPreviewFixes] = useState<Record<string, string>>({});
  
  const structuredErrors = analyzeErrors(row);
  const errorsByCategory = groupErrorsByCategory(structuredErrors);
  const hasIssues = structuredErrors.length > 0 || row.status !== 'success';

  const handlePreviewFix = (field: string, fixValue: string) => {
    setPreviewFixes(prev => ({ ...prev, [field]: fixValue }));
  };

  const handleApplyFix = (field: string, value: string) => {
    onFixIssue?.(field, value);
    setPreviewFixes(prev => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  };

  const getBulkFixableErrors = () => {
    return structuredErrors.filter(error => error.canAutoFix);
  };

  const handleBulkFix = () => {
    const fixableErrors = getBulkFixableErrors();
    fixableErrors.forEach(error => {
      if (error.fixValue) {
        onFixIssue?.(error.field, error.fixValue);
      }
    });
  };

  if (!hasIssues) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle className="h-4 w-4" />
        No issues found
      </div>
    );
  }

  const bulkFixableCount = getBulkFixableErrors().length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium">
            {structuredErrors.length} Issues Found
          </span>
        </div>
        {bulkFixableCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkFix}
            className="h-7 text-xs"
          >
            <Zap className="h-3 w-3 mr-1" />
            Fix {bulkFixableCount} Issues
          </Button>
        )}
      </div>

      {Object.entries(errorsByCategory).map(([category, errors]) => (
        <div key={category} className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {category} Issues ({errors.length})
          </div>
          
          {errors.map((error, index) => (
            <ErrorCard
              key={`${category}-${index}`}
              error={error}
              preview={previewFixes[error.field]}
              onPreview={handlePreviewFix}
              onApply={handleApplyFix}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ 
  error, 
  preview, 
  onPreview, 
  onApply 
}: {
  error: StructuredError;
  preview?: string;
  onPreview: (field: string, value: string) => void;
  onApply: (field: string, value: string) => void;
}) {
  const severityColors = {
    high: 'destructive',
    medium: 'secondary',
    low: 'outline'
  } as const;

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Badge variant={severityColors[error.severity]} className="text-xs">
          {error.severity.toUpperCase()}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{error.field}</div>
          <div className="text-xs text-muted-foreground">{error.message}</div>
        </div>
      </div>

      {error.suggestion && (
        <div className="text-xs text-primary bg-primary/5 p-2 rounded border">
          💡 {error.suggestion}
        </div>
      )}

      {error.canAutoFix && error.fixValue && (
        <div className="space-y-2">
          {!preview ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(error.field, error.fixValue!)}
              className="h-6 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview Fix
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Preview:</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-mono bg-success/10 text-success px-2 py-1 rounded">
                  {preview}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onApply(error.field, preview)}
                  className="h-6 text-xs"
                >
                  Apply Fix
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview(error.field, '')}
                  className="h-6 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function analyzeErrors(row: ProcessingRowResult): StructuredError[] {
  const errors: StructuredError[] = [];
  const rawErrors = row.errors || [];
  const aiErrors = row.processed_data?.ai_insights?.error_analysis || [];

  // Process validation errors
  rawErrors.forEach(error => {
    errors.push(categorizeError(error, row));
  });

  // Process AI-detected errors
  if (Array.isArray(aiErrors)) {
    aiErrors.forEach(aiError => {
      errors.push({
        field: aiError.field || 'unknown',
        message: aiError.issue || 'AI detected issue',
        severity: aiError.severity as ErrorSeverity || 'medium',
        category: 'validation',
        suggestion: aiError.suggestion,
        fixValue: aiError.suggested_fix,
        canAutoFix: !!aiError.suggested_fix
      });
    });
  } else if (aiErrors?.detected_errors) {
    // Handle Phase 2 structure
    aiErrors.detected_errors.forEach(aiError => {
      errors.push({
        field: aiError.field || 'unknown',
        message: aiError.issue || 'AI detected issue',
        severity: aiError.severity as ErrorSeverity || 'medium',
        category: 'validation',
        suggestion: 'AI detected issue requiring attention',
        fixValue: aiError.suggested_fix,
        canAutoFix: !!aiError.suggested_fix
      });
    });
  }

  return errors;
}

function categorizeError(error: string, row: ProcessingRowResult): StructuredError {
  // Smart error categorization based on content
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('zip') || lowerError.includes('postal')) {
    return {
      field: 'zipcode',
      message: error,
      severity: 'medium',
      category: 'formatting',
      suggestion: 'ZIP codes should be 5 digits or 5+4 format',
      fixValue: normalizeZipCode(getFieldValue(row, 'zipcode')),
      canAutoFix: true
    };
  }
  
  if (lowerError.includes('state')) {
    return {
      field: 'state',
      message: error,
      severity: 'medium',
      category: 'formatting',
      suggestion: 'States should use 2-letter abbreviations',
      fixValue: normalizeState(getFieldValue(row, 'state')),
      canAutoFix: true
    };
  }
  
  if (lowerError.includes('required') || lowerError.includes('missing')) {
    return {
      field: extractFieldFromError(error),
      message: error,
      severity: 'high',
      category: 'completeness',
      suggestion: 'This field is required for processing',
      canAutoFix: false
    };
  }

  return {
    field: extractFieldFromError(error),
    message: error,
    severity: 'medium',
    category: 'validation',
    canAutoFix: false
  };
}

function groupErrorsByCategory(errors: StructuredError[]): Record<ErrorCategory, StructuredError[]> {
  return errors.reduce((acc, error) => {
    if (!acc[error.category]) {
      acc[error.category] = [];
    }
    acc[error.category].push(error);
    return acc;
  }, {} as Record<ErrorCategory, StructuredError[]>);
}

function getFieldValue(row: ProcessingRowResult, field: string): string {
  return row.original_data?.[field] || row.processed_data?.[field] || '';
}

function extractFieldFromError(error: string): string {
  // Simple field extraction - could be enhanced
  const matches = error.match(/field[:\s]+['"]?(\w+)['"]?/i);
  return matches?.[1] || 'unknown';
}

function normalizeZipCode(zip: string): string {
  if (!zip) return '';
  const cleaned = zip.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return cleaned.slice(0, 5);
}

function normalizeState(state: string): string {
  if (!state) return '';
  const stateMap: Record<string, string> = {
    'california': 'CA',
    'texas': 'TX',
    'florida': 'FL',
    'new york': 'NY',
    // Add more state mappings as needed
  };
  
  return stateMap[state.toLowerCase()] || state.toUpperCase().slice(0, 2);
}