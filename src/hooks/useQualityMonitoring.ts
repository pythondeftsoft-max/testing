import { useMemo, useEffect } from 'react';
import type { ProcessingRowResult } from '@/types/propertyImport';
import { useImportStudio } from '@/stores/importStudioStore';

interface QualityMetrics {
  overall: {
    total: number;
    success: number;
    warning: number;
    failed: number;
    successRate: number;
    completenessScore: number;
    accuracyScore: number;
    consistencyScore: number;
  };
  byStage: {
    'field-mapping': QualityStageMetrics;
    'address-validation': QualityStageMetrics;
    'duplicate-detection': QualityStageMetrics;
    'quality-assessment': QualityStageMetrics;
    'ai-insights': QualityStageMetrics;
  };
  trends: {
    improving: number;
    degrading: number;
    stable: number;
  };
  issues: {
    critical: number;
    major: number;
    minor: number;
    suggestions: number;
  };
}

interface QualityStageMetrics {
  total: number;
  completed: number;
  issues: number;
  confidence: number;
  improvements: number;
}

export const useQualityMonitoring = (data: ProcessingRowResult[]) => {
  const { updateStageMetrics } = useImportStudio();

  const qualityMetrics = useMemo((): QualityMetrics => {
    const total = data.length;
    
    // Calculate overall stats
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

    // Calculate quality scores
    const completenessScore = data.reduce((acc, row) => {
      const requiredFields = ['street_address', 'city', 'state', 'zipcode'];
      const completedFields = requiredFields.filter(field => 
        row.original_data?.[field as keyof typeof row.original_data]
      ).length;
      return acc + (completedFields / requiredFields.length) * 100;
    }, 0) / total;

    const accuracyScore = data.reduce((acc, row) => {
      return acc + (row.processed_data?.ai_insights?.data_quality_assessment?.accuracy_score || 0) * 100;
    }, 0) / total;

    const consistencyScore = data.reduce((acc, row) => {
      return acc + (row.processed_data?.ai_insights?.data_quality_assessment?.consistency_score || 0) * 100;
    }, 0) / total;

    // Calculate stage-specific metrics
    const fieldMappingMetrics = calculateStageMetrics(data, 'field-mapping');
    const addressValidationMetrics = calculateStageMetrics(data, 'address-validation');
    const duplicateDetectionMetrics = calculateStageMetrics(data, 'duplicate-detection');
    const qualityAssessmentMetrics = calculateStageMetrics(data, 'quality-assessment');
    const aiInsightsMetrics = calculateStageMetrics(data, 'ai-insights');

    // Calculate trends (simplified - in real app would compare with previous data)
    const trends = {
      improving: Math.floor(stats.success * 0.7),
      degrading: Math.floor(stats.failed * 0.3),
      stable: total - Math.floor(stats.success * 0.7) - Math.floor(stats.failed * 0.3)
    };

    // Calculate issues by severity
    const issues = data.reduce((acc, row) => {
      const errors = row.errors || [];
      errors.forEach(error => {
        if (error.includes('critical') || error.includes('required')) {
          acc.critical++;
        } else if (error.includes('invalid') || error.includes('format')) {
          acc.major++;
        } else {
          acc.minor++;
        }
      });
      
    // Count AI suggestions as suggestions (using ai_suggestions field)
    const suggestions = row.ai_suggestions?.improvements?.length || 0;
    acc.suggestions += suggestions;
      
      return acc;
    }, { critical: 0, major: 0, minor: 0, suggestions: 0 });

    return {
      overall: {
        total,
        success: stats.success,
        warning: stats.warning,
        failed: stats.failed,
        successRate: total > 0 ? (stats.success / total) * 100 : 0,
        completenessScore: isNaN(completenessScore) ? 0 : completenessScore,
        accuracyScore: isNaN(accuracyScore) ? 0 : accuracyScore,
        consistencyScore: isNaN(consistencyScore) ? 0 : consistencyScore,
      },
      byStage: {
        'field-mapping': fieldMappingMetrics,
        'address-validation': addressValidationMetrics,
        'duplicate-detection': duplicateDetectionMetrics,
        'quality-assessment': qualityAssessmentMetrics,
        'ai-insights': aiInsightsMetrics,
      },
      trends,
      issues,
    };
  }, [data]);

  // Update store metrics when quality changes
  useEffect(() => {
    const stageMetrics = {
      'field-mapping': {
        total: qualityMetrics.byStage['field-mapping'].total,
        completed: qualityMetrics.byStage['field-mapping'].completed,
        issues: qualityMetrics.byStage['field-mapping'].issues,
      },
      'address-validation': {
        total: qualityMetrics.byStage['address-validation'].total,
        completed: qualityMetrics.byStage['address-validation'].completed,
        issues: qualityMetrics.byStage['address-validation'].issues,
      },
      'duplicate-detection': {
        total: qualityMetrics.byStage['duplicate-detection'].total,
        completed: qualityMetrics.byStage['duplicate-detection'].completed,
        issues: qualityMetrics.byStage['duplicate-detection'].issues,
      },
      'quality-assessment': {
        total: qualityMetrics.byStage['quality-assessment'].total,
        completed: qualityMetrics.byStage['quality-assessment'].completed,
        issues: qualityMetrics.byStage['quality-assessment'].issues,
      },
      'ai-insights': {
        total: qualityMetrics.byStage['ai-insights'].total,
        completed: qualityMetrics.byStage['ai-insights'].completed,
        issues: qualityMetrics.byStage['ai-insights'].issues,
      },
    };

    updateStageMetrics(stageMetrics);
  }, [qualityMetrics, updateStageMetrics]);

  return qualityMetrics;
};

function calculateStageMetrics(data: ProcessingRowResult[], stage: string): QualityStageMetrics {
  const total = data.length;
  
  // Stage-specific logic
  switch (stage) {
    case 'field-mapping':
      const mappedRows = data.filter(row => 
        row.schema_map?.field_confidences &&
        row.schema_map.field_confidences.length > 0
      );
      const mappingIssues = data.filter(row => 
        row.schema_map?.unmapped_fields &&
        row.schema_map.unmapped_fields.length > 0
      );
      const avgConfidence = mappedRows.reduce((acc, row) => {
        const confidences = row.schema_map?.field_confidences || [];
        const avgRowConfidence = confidences.reduce((sum, conf) => sum + (conf.confidence || 0), 0) / confidences.length;
        return acc + (avgRowConfidence || 0);
      }, 0) / mappedRows.length;
      
      return {
        total,
        completed: mappedRows.length,
        issues: mappingIssues.length,
        confidence: isNaN(avgConfidence) ? 0 : avgConfidence * 100,
        improvements: 0 // Would track improvements over time
      };

    case 'address-validation':
      const validatedRows = data.filter(row => 
        row.processed_data?.normalized_address ||
        row.processed_data?.full_address
      );
      const addressIssues = data.filter(row => 
        row.errors?.some(error => error.toLowerCase().includes('address'))
      );
      
      return {
        total,
        completed: validatedRows.length,
        issues: addressIssues.length,
        confidence: validatedRows.length > 0 ? (validatedRows.length / total) * 100 : 0,
        improvements: 0
      };

    case 'duplicate-detection':
      const duplicateRows = data.filter(row => 
        row.duplicate_group_id
      );
      
      return {
        total,
        completed: total, // All rows are checked for duplicates
        issues: duplicateRows.length,
        confidence: 85, // Static confidence for duplicate detection
        improvements: 0
      };

    case 'quality-assessment':
      const assessedRows = data.filter(row => 
        row.processed_data?.ai_insights?.data_quality_assessment
      );
      const qualityIssues = data.filter(row => row.status === 'failed');
      
      return {
        total,
        completed: assessedRows.length,
        issues: qualityIssues.length,
        confidence: assessedRows.length > 0 ? (assessedRows.length / total) * 100 : 0,
        improvements: 0
      };

    case 'ai-insights':
      const insightRows = data.filter(row => 
        row.ai_suggestions?.improvements &&
        row.ai_suggestions.improvements.length > 0
      );
      const totalSuggestions = data.reduce((acc, row) => 
        acc + (row.ai_suggestions?.improvements?.length || 0), 0
      );
      
      return {
        total,
        completed: insightRows.length,
        issues: totalSuggestions,
        confidence: insightRows.length > 0 ? (insightRows.length / total) * 100 : 0,
        improvements: 0
      };

    default:
      return {
        total,
        completed: 0,
        issues: 0,
        confidence: 0,
        improvements: 0
      };
  }
}