import React from 'react';
import { CategorySection } from './CategorySection';
import { IncomeAndCashFlowManagement } from './financial/IncomeAndCashFlowManagement';
import { ExpensesAndProfitabilityControl } from './financial/ExpensesAndProfitabilityControl';
import { InvestmentAndPortfolioPerformance } from './financial/InvestmentAndPortfolioPerformance';
import { CoreFinancialMetrics } from './financial/CoreFinancialMetrics';
import FinancialFiltersPanel from './FinancialFiltersPanel';
import { useFinancialFilters, FinancialFilters } from '@/hooks/useFinancialFilters';
import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';
import { useFinancialWidgetState } from '@/hooks/useFinancialWidgetState';
import { GenerateMoreWidgetsButton, WidgetType } from './GenerateMoreWidgetsButton';
import { MockScenarioType, MockDataSection } from '@/utils/mockFinancialReports';
import { TrendingUp, DollarSign, BarChart3, Target } from 'lucide-react';

interface FinancialPerformanceHubProps {
  landlordId: string;
  portfolioId: string;
}

export const FinancialPerformanceHub: React.FC<FinancialPerformanceHubProps> = ({
  landlordId,
  portfolioId,
}) => {
  const {
    appliedFilters,
    updatePendingFilter,
    updatePendingCategory,
    clearFilters,
    isApplying,
    getFormattedFilters,
    applyPendingFilters,
  } = useFinancialFilters();

  // Create auto-apply filter update function that updates appliedFilters directly
  const handleFilterUpdate = <K extends keyof FinancialFilters>(
    key: K,
    value: FinancialFilters[K]
  ) => {
    // Update both pending and applied filters for immediate effect (auto-apply)
    updatePendingFilter(key, value);
    // Apply filters immediately to bypass manual application
    applyPendingFilters();
  };

  // Widget management hooks
  const { isFavorited, toggleFavorite } = useWidgetFavorites(landlordId);
  const {
    isWidgetVisible,
    deleteWidget,
    regenerateWidget, 
    getRegenerationCount,
    addDynamicWidget,
    getDynamicWidgets,
    applyWidgetSelection,
    getVisibleWidgets
  } = useFinancialWidgetState(landlordId);

  // Handle generating new widgets (legacy method)
  const handleGenerateWidget = (
    category: MockDataSection,
    widgetType: WidgetType,
    scenario: MockScenarioType
  ) => {
    addDynamicWidget(category, widgetType.id, scenario);
  };

  // Handle widget selection from the new dialog
  const handleWidgetSelection = (category: MockDataSection) => (selectedWidgets: string[]) => {
    applyWidgetSelection(selectedWidgets, category);
  };

  return (
    <div className="space-y-6">
      {/* Financial Filters Panel */}
      <FinancialFiltersPanel
        filters={appliedFilters}
        onDateRangeChange={(dateRange) => handleFilterUpdate('dateRange', dateRange)}
        onPropertiesChange={(properties) => handleFilterUpdate('selectedProperties', properties)}
        onPropertyTypesChange={(types) => handleFilterUpdate('selectedPropertyTypes', types)}
        onPortfoliosChange={(portfolios) => handleFilterUpdate('selectedPortfolios', portfolios)}
        onTenantTypesChange={(tenantTypes) => handleFilterUpdate('selectedTenantTypes', tenantTypes)}
        onCategoryChange={updatePendingCategory}
        onClearFilters={clearFilters}
        isApplying={isApplying}
        userId={landlordId}
        portfolioId={portfolioId}
        updateFilter={handleFilterUpdate}
      />
      
      <CategorySection
        title="Core Financial Metrics"
        description="Essential financial performance indicators and KPIs"
        icon={Target}
        badge={{ text: "Core", variant: "default" }}
        defaultExpanded={true}
      >
        <CoreFinancialMetrics 
          landlordId={landlordId} 
          portfolioId={portfolioId}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
        />
      </CategorySection>

      <CategorySection
        title="Income & Cash Flow Management"
        description="Revenue streams, cash flow trends, and operating income analysis"
        icon={DollarSign}
        badge={{ text: "Enhanced", variant: "default" }}
        defaultExpanded={false}
        headerActions={
          <GenerateMoreWidgetsButton
            category="income"
            onApplySelection={handleWidgetSelection('income')}
            currentVisibleWidgets={getVisibleWidgets('income')}
          />
        }
      >
        <IncomeAndCashFlowManagement 
          landlordId={landlordId} 
          portfolioId={portfolioId} 
          filters={getFormattedFilters}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          isWidgetVisible={isWidgetVisible}
          onDeleteWidget={deleteWidget}
          onRegenerateWidget={regenerateWidget}
          getRegenerationCount={getRegenerationCount}
          getDynamicWidgets={getDynamicWidgets}
        />
      </CategorySection>


      <CategorySection
        title="Expenses & Profitability Control"
        description="Expense analysis, NOI tracking, and property-level profitability"
        icon={BarChart3}
        badge={{ text: "Detailed", variant: "default" }}
        defaultExpanded={false}
        headerActions={
          <GenerateMoreWidgetsButton
            category="expenses"
            onApplySelection={handleWidgetSelection('expenses')}
            currentVisibleWidgets={getVisibleWidgets('expenses')}
          />
        }
      >
        <ExpensesAndProfitabilityControl 
          landlordId={landlordId} 
          portfolioId={portfolioId} 
          filters={getFormattedFilters}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          isWidgetVisible={isWidgetVisible}
          onDeleteWidget={deleteWidget}
          onRegenerateWidget={regenerateWidget}
          getRegenerationCount={getRegenerationCount}
        />
      </CategorySection>


      <CategorySection
        title="Investment & Portfolio Performance"
        description="ROI metrics, portfolio growth, and investment performance tracking"
        icon={TrendingUp}
        badge={{ text: "Performance", variant: "default" }}
        defaultExpanded={false}
        headerActions={
          <GenerateMoreWidgetsButton
            category="investment"
            onApplySelection={handleWidgetSelection('investment')}
            currentVisibleWidgets={getVisibleWidgets('investment')}
          />
        }
      >
        <InvestmentAndPortfolioPerformance 
          landlordId={landlordId} 
          portfolioId={portfolioId} 
          filters={getFormattedFilters}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          isWidgetVisible={isWidgetVisible}
          onDeleteWidget={deleteWidget}
          onRegenerateWidget={regenerateWidget}
          getRegenerationCount={getRegenerationCount}
        />
      </CategorySection>
    </div>
  );
};