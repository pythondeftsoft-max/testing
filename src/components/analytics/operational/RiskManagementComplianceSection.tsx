import React from 'react';
import { Shield, Building2, AlertCircle, TrendingDown, FileCheck, Activity } from 'lucide-react';
import ModernMetricCard from '@/components/analytics/ModernMetricCard';
import { OperationalWidgetWrapper } from '@/components/analytics/wrappers/OperationalWidgetWrapper';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';
import { getWidgetsForCategory } from '@/utils/widgetCatalog';
import { ComplianceTrendChart } from './charts/ComplianceTrendChart';
import { IncidentRateTrendChart } from './charts/IncidentRateTrendChart';
import { RiskScoreTimelineChart } from './charts/RiskScoreTimelineChart';
import { PropertyRiskComparisonChart } from './charts/PropertyRiskComparisonChart';
import { BenchmarkComplianceChart } from './charts/BenchmarkComplianceChart';
import { InsuranceClaimsPanel } from './panels/InsuranceClaimsPanel';
import { RiskAssessmentPanel } from './panels/RiskAssessmentPanel';
import { ComplianceAuditPanel } from './panels/ComplianceAuditPanel';
import { EmergencyPreparednessPanel } from './panels/EmergencyPreparednessPanel';

interface RiskManagementComplianceSectionProps {
  portfolioId: string;
  currentUserId: string;
  isFavorited: (widgetId: string) => boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete: (widgetId: string) => void;
  onRegenerate: (widgetId: string) => void;
  isVisible: (widgetId: string) => boolean;
}

export const RiskManagementComplianceSection: React.FC<RiskManagementComplianceSectionProps> = ({
  portfolioId,
  currentUserId,
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
  isVisible
}) => {
  const { data: propertyData, isLoading } = useModernPropertyAnalytics(currentUserId, portfolioId);

  const { operationalExcellence } = propertyData || {
    operationalExcellence: {
      inspectionComplianceRate: 0,
      safetyIncidentRate: 0,
      insuranceClaimFrequency: 0,
      riskAssessmentScore: 85,
    }
  };

  // Get all widgets from catalog
  const catalogWidgets = getWidgetsForCategory('risk-management');

  // Map widget IDs to their data and display properties
  const getWidgetData = (widgetId: string) => {
    switch (widgetId) {
      case 'inspection-compliance':
        return { 
          value: operationalExcellence.inspectionComplianceRate, 
          formatValue: 'percentage' as const, 
          icon: Building2,
          title: 'Inspection Compliance',
          componentType: 'metric' as const
        };
      case 'safety-incident-rate':
        return { 
          value: operationalExcellence.safetyIncidentRate, 
          formatValue: 'percentage' as const, 
          icon: AlertCircle,
          title: 'Safety Incident Rate',
          subtitle: 'annual rate',
          componentType: 'metric' as const
        };
      case 'insurance-claims':
        return { 
          value: operationalExcellence.insuranceClaimFrequency, 
          formatValue: 'percentage' as const, 
          icon: AlertCircle,
          title: 'Insurance Claims',
          subtitle: 'annual rate',
          componentType: 'metric' as const
        };
      case 'risk-assessment-score':
        return { 
          value: 85, 
          formatValue: 'number' as const, 
          icon: Shield,
          title: 'Risk Assessment Score',
          componentType: 'metric' as const
        };
      case 'compliance-trends':
        return { 
          title: 'Compliance Trends',
          componentType: 'chart' as const,
          component: ComplianceTrendChart
        };
      case 'incident-rate-trends':
        return { 
          title: 'Incident Rate Trends',
          componentType: 'chart' as const,
          component: IncidentRateTrendChart
        };
      case 'risk-score-timeline':
        return { 
          title: 'Risk Score Over Time',
          componentType: 'chart' as const,
          component: RiskScoreTimelineChart
        };
      case 'property-risk-comparison':
        return { 
          title: 'Property Risk Comparison',
          componentType: 'chart' as const,
          component: PropertyRiskComparisonChart
        };
      case 'benchmark-compliance':
        return { 
          title: 'Benchmark Compliance',
          componentType: 'chart' as const,
          component: BenchmarkComplianceChart
        };
      case 'insurance-claims-analysis':
        return { 
          title: 'Insurance Claims Analysis',
          componentType: 'panel' as const,
          component: InsuranceClaimsPanel
        };
      case 'risk-assessment-dashboard':
        return { 
          title: 'Risk Assessment Dashboard',
          componentType: 'panel' as const,
          component: RiskAssessmentPanel
        };
      case 'compliance-audit-results':
        return { 
          title: 'Compliance Audit Results',
          componentType: 'panel' as const,
          component: ComplianceAuditPanel
        };
      case 'emergency-preparedness':
        return { 
          title: 'Emergency Preparedness',
          componentType: 'panel' as const,
          component: EmergencyPreparednessPanel
        };
      default:
        return null;
    }
  };

  // Build the widgets array from catalog
  const widgets = catalogWidgets
    .map(catalogWidget => {
      const widgetData = getWidgetData(catalogWidget.id);
      if (!widgetData) return null;
      
      return {
        id: catalogWidget.id,
        ...widgetData,
      };
    })
    .filter(Boolean);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {widgets.filter(widget => isVisible(widget.id)).map(widget => {
        const WidgetComponent = widget.component;
        
        return (
          <OperationalWidgetWrapper
            key={widget.id}
            widgetId={widget.id}
            title={widget.title}
            tab="operational"
            category="risk-management"
            isFavorited={isFavorited(widget.id)}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
            value={widget.value}
            subtitle={widget.subtitle}
            iconName={undefined}
            formatValue={widget.formatValue}
            componentType={widget.componentType}
          >
            {widget.componentType === 'metric' ? (
              <ModernMetricCard
                title={widget.title}
                value={widget.value!}
                formatValue={widget.formatValue!}
                icon={widget.icon!}
                subtitle={widget.subtitle}
              />
            ) : WidgetComponent ? (
              <WidgetComponent />
            ) : null}
          </OperationalWidgetWrapper>
        );
      })}
    </div>
  );
};