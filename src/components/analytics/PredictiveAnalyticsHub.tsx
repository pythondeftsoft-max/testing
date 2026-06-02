import React, { useState } from 'react';
import { CategorySection } from './CategorySection';
import { VacancyPredictions } from './predictive/VacancyPredictions';
import { FinancialForecasting } from './predictive/FinancialForecasting';
import { MarketIntelligence } from './predictive/MarketIntelligence';
import { MaintenanceForecasting } from './predictive/MaintenanceForecasting';
import { GenerateMoreWidgetsButton } from './GenerateMoreWidgetsButton';
import { usePredictiveWidgetState } from '@/hooks/usePredictiveWidgetState';
import { getWidgetsForCategory } from '@/utils/widgetCatalog';
import { useAuth } from '@/hooks/useAuth';
import { Brain, TrendingDown, DollarSign, BarChart3, Wrench } from 'lucide-react';

interface PredictiveAnalyticsHubProps {
  landlordId: string;
  portfolioId: string;
}

export const PredictiveAnalyticsHub: React.FC<PredictiveAnalyticsHubProps> = ({
  landlordId,
  portfolioId,
}) => {
  const { user } = useAuth();
  const {
    applyWidgetSelection,
    getVisibleWidgets,
  } = usePredictiveWidgetState(user?.id || 'anonymous');

  const handleApplySelection = (selectedWidgets: string[]) => {
    applyWidgetSelection(selectedWidgets, 'predictive-analytics');
  };

  const getVisibleWidgetsForCategory = (category: string): string[] => {
    const dashboardWidgetIds = [
      'vacancy-risk-score',
      'predicted-noi', 
      'tenant-quality-score',
      'predictive-maintenance-cost',
      'revenue-forecast-chart',
      'vacancy-trend-analysis'
    ];
    return getVisibleWidgets(dashboardWidgetIds);
  };

  return (
    <div className="space-y-6">
      <CategorySection
        title="Vacancy Predictions"
        description="Risk scoring, vacancy forecasting, and renewal probability analysis"
        icon={TrendingDown}
        badge={{ text: "AI-Powered", variant: "default" }}
        defaultExpanded={true}
        headerActions={
          <GenerateMoreWidgetsButton
            category="predictive-analytics"
            onApplySelection={handleApplySelection}
            currentVisibleWidgets={getVisibleWidgetsForCategory('vacancy-predictions')}
          />
        }
      >
        <VacancyPredictions landlordId={landlordId} portfolioId={portfolioId} />
      </CategorySection>

      <CategorySection
        title="Financial Forecasting"
        description="Revenue predictions, NOI projections, and break-even analysis"
        icon={DollarSign}
        badge={{ text: "Predictive", variant: "default" }}
        defaultExpanded={true}
        headerActions={
          <GenerateMoreWidgetsButton
            category="predictive-analytics"
            onApplySelection={handleApplySelection}
            currentVisibleWidgets={getVisibleWidgetsForCategory('financial-forecasting')}
          />
        }
      >
        <FinancialForecasting landlordId={landlordId} portfolioId={portfolioId} />
      </CategorySection>

      <CategorySection
        title="Market Intelligence"
        description="Rent optimization, market gap analysis, and pricing recommendations"
        icon={BarChart3}
        badge={{ text: "Market Data", variant: "default" }}
        defaultExpanded={false}
        headerActions={
          <GenerateMoreWidgetsButton
            category="predictive-analytics"
            onApplySelection={handleApplySelection}
            currentVisibleWidgets={getVisibleWidgetsForCategory('market-intelligence')}
          />
        }
      >
        <MarketIntelligence landlordId={landlordId} portfolioId={portfolioId} />
      </CategorySection>

      <CategorySection
        title="Maintenance Forecasting"
        description="Predictive maintenance costs and scheduling optimization"
        icon={Wrench}
        badge={{ text: "Predictive", variant: "default" }}
        defaultExpanded={false}
        headerActions={
          <GenerateMoreWidgetsButton
            category="predictive-analytics"
            onApplySelection={handleApplySelection}
            currentVisibleWidgets={getVisibleWidgetsForCategory('maintenance-forecasting')}
          />
        }
      >
        <MaintenanceForecasting landlordId={landlordId} portfolioId={portfolioId} />
      </CategorySection>
    </div>
  );
};