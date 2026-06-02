import { WidgetDefinition, WidgetGroup } from '@/types/widgetTypes';
import { MockDataSection } from '@/utils/mockFinancialReports';

// Complete catalog of all available widgets organized by category and group
export const WIDGET_CATALOG: Record<MockDataSection, WidgetDefinition[]> = {
  income: [
    // Core Metrics
    {
      id: 'avg-monthly-operating',
      name: 'Avg Monthly Operating',
      description: 'Average monthly operating cash flow across all properties',
      category: 'income',
      widgetType: 'avg-monthly-operating',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'avg-monthly-net',
      name: 'Avg Monthly Net',
      description: 'Average monthly net cash flow after all expenses',
      category: 'income',
      widgetType: 'avg-monthly-net',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'operating-change',
      name: 'Operating Change',
      description: 'Month-over-month operating cash flow percentage change',
      category: 'income',
      widgetType: 'operating-change',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'total-operating',
      name: 'Total Operating (12mo)',
      description: 'Total operating cash flow for the last 12 months',
      category: 'income',
      widgetType: 'total-operating',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'rental-income-velocity',
      name: 'Rental Income Velocity',
      description: 'Rate of rental income growth month-over-month',
      category: 'income',
      widgetType: 'rental-income-velocity',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'collection-rate',
      name: 'Collection Rate',
      description: 'Percentage of rent collected on time',
      category: 'income',
      widgetType: 'collection-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'gross-rent-multiplier',
      name: 'Gross Rent Multiplier',
      description: 'Property value to annual rental income ratio',
      category: 'income',
      widgetType: 'gross-rent-multiplier',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'income-per-unit',
      name: 'Income Per Unit',
      description: 'Average monthly income generated per rental unit',
      category: 'income',
      widgetType: 'income-per-unit',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // Charts & Trends
    {
      id: 'cash-flow-trends',
      name: 'Cash Flow Trends',
      description: 'Monthly cash flow trends and patterns over time',
      category: 'income',
      widgetType: 'cash-flow-trends',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'current-month-waterfall',
      name: 'Current Month Waterfall',
      description: 'Waterfall chart showing current month cash flow breakdown',
      category: 'income',
      widgetType: 'current-month-waterfall',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'rental-income-trends',
      name: 'Rental Income Trends',
      description: 'Monthly rental income patterns and growth analysis',
      category: 'income',
      widgetType: 'rental-income-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'seasonal-income-patterns',
      name: 'Seasonal Income Patterns',
      description: 'Identify seasonal trends in rental income across properties',
      category: 'income',
      widgetType: 'seasonal-income-patterns',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'income-source-breakdown',
      name: 'Income Source Breakdown',
      description: 'Pie chart showing breakdown by income source type',
      category: 'income',
      widgetType: 'income-source-breakdown',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'rent-roll-timeline',
      name: 'Rent Roll Timeline',
      description: 'Timeline view of rent collections and payment patterns',
      category: 'income',
      widgetType: 'rent-roll-timeline',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'cash-flow-forecasting',
      name: 'Cash Flow Forecasting',
      description: 'Predictive analytics for future cash flow projections',
      category: 'income',
      widgetType: 'cash-flow-forecasting',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'income-heatmap',
      name: 'Income Heat Map',
      description: 'Visual heat map of income performance by property and time',
      category: 'income',
      widgetType: 'income-heatmap',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'rent-increase-tracker',
      name: 'Rent Increase Tracker',
      description: 'Track rent increases and their impact on revenue',
      category: 'income',
      widgetType: 'rent-increase-tracker',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'late-payment-trends',
      name: 'Late Payment Trends',
      description: 'Analyze patterns in late payments and collections',
      category: 'income',
      widgetType: 'late-payment-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    // Analysis Tools
    {
      id: 'vacancy-impact-analysis',
      name: 'Vacancy Impact Analysis',
      description: 'Analyze how vacancy rates affect cash flow performance',
      category: 'income',
      widgetType: 'vacancy-impact-analysis',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'rent-roll-summary',
      name: 'Rent Roll Summary',
      description: 'Comprehensive overview of rent collection patterns',
      category: 'income',
      widgetType: 'rent-roll-summary',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'income-variance-report',
      name: 'Income Variance Report',
      description: 'Detailed analysis of income variations and their causes',
      category: 'income',
      widgetType: 'income-variance-report',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'tenant-payment-reliability',
      name: 'Tenant Payment Reliability',
      description: 'Score tenants based on payment history and reliability',
      category: 'income',
      widgetType: 'tenant-payment-reliability',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'market-rent-analyzer',
      name: 'Market Rent Analyzer',
      description: 'Compare current rents with market rates for optimization',
      category: 'income',
      widgetType: 'market-rent-analyzer',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'income-optimization-suggestions',
      name: 'Income Optimization Suggestions',
      description: 'AI-powered suggestions for maximizing rental income',
      category: 'income',
      widgetType: 'income-optimization-suggestions',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // Comparative Analysis
    {
      id: 'property-income-comparison',
      name: 'Property Income Comparison',
      description: 'Compare income performance across different properties',
      category: 'income',
      widgetType: 'property-income-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'market-vs-actual-rent',
      name: 'Market vs Actual Rent',
      description: 'Compare your rents against market rates',
      category: 'income',
      widgetType: 'market-vs-actual-rent',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'portfolio-income-benchmarks',
      name: 'Portfolio Income Benchmarks',
      description: 'Benchmark your income against industry standards',
      category: 'income',
      widgetType: 'portfolio-income-benchmarks',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'peer-performance-comparison',
      name: 'Peer Performance Comparison',
      description: 'Compare your performance with similar portfolios',
      category: 'income',
      widgetType: 'peer-performance-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'year-over-year-income',
      name: 'Year-over-Year Income',
      description: 'Compare current year income with previous years',
      category: 'income',
      widgetType: 'year-over-year-income',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  expenses: [
    // Core Metrics
    {
      id: 'profit-margin',
      name: 'Avg Profit Margin',
      description: 'Average profit margin across all properties',
      category: 'expenses',
      widgetType: 'profit-margin',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'expense-ratio',
      name: 'Expense Ratio',
      description: 'Total expenses as percentage of gross revenue',
      category: 'expenses',
      widgetType: 'expense-ratio',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'total-revenue',
      name: 'Total Revenue (12mo)',
      description: 'Total revenue generated over the last 12 months',
      category: 'expenses',
      widgetType: 'total-revenue',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'total-expenses',
      name: 'Total Expenses (12mo)',
      description: 'Total expenses incurred over the last 12 months',
      category: 'expenses',
      widgetType: 'total-expenses',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    // Charts & Trends
    {
      id: 'monthly-noi-trend',
      name: 'Monthly NOI Trend',
      description: 'Net Operating Income trends over time',
      category: 'expenses',
      widgetType: 'monthly-noi-trend',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'expense-breakdown',
      name: 'Expense Breakdown',
      description: 'Pie chart showing expense distribution by category',
      category: 'expenses',
      widgetType: 'expense-breakdown',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'expense-control-trends',
      name: 'Expense Control Trends',
      description: 'Track expense control effectiveness over time',
      category: 'expenses',
      widgetType: 'expense-control-trends',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'maintenance-cost-trends',
      name: 'Maintenance Cost Trends',
      description: 'Track maintenance expenses and identify patterns',
      category: 'expenses',
      widgetType: 'maintenance-cost-trends',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    {
      id: 'utility-expense-analysis',
      name: 'Utility Expense Analysis',
      description: 'Analyze utility costs across properties',
      category: 'expenses',
      widgetType: 'utility-expense-analysis',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    // Analysis Tools
    {
      id: 'property-profitability-ranking',
      name: 'Property Profitability Ranking',
      description: 'Ranking of properties by profitability metrics',
      category: 'expenses',
      widgetType: 'property-profitability-ranking',
      componentType: 'panel',
      isCore: true,
      group: 'analysis-tools'
    },
    {
      id: 'budget-vs-actual',
      name: 'Budget vs Actual',
      description: 'Compare planned vs actual expenses',
      category: 'expenses',
      widgetType: 'budget-vs-actual',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'property-expense-comparison',
      name: 'Property Expense Comparison',
      description: 'Compare expenses across different properties',
      category: 'expenses',
      widgetType: 'property-expense-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'cost-per-unit-analysis',
      name: 'Cost Per Unit Analysis',
      description: 'Analyze costs on a per-unit basis across properties',
      category: 'expenses',
      widgetType: 'cost-per-unit-analysis',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    // Additional Expense Metrics
    {
      id: 'expense-per-square-foot',
      name: 'Cost Per Square Foot',
      description: 'Track operating expenses per square foot across properties',
      category: 'expenses',
      widgetType: 'expense-per-square-foot',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'maintenance-efficiency-score',
      name: 'Maintenance Efficiency Score',
      description: 'Score maintenance operations based on cost and response time',
      category: 'expenses',
      widgetType: 'maintenance-efficiency-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'vendor-performance-score',
      name: 'Vendor Performance Score',
      description: 'Evaluate vendor performance based on cost and quality',
      category: 'expenses',
      widgetType: 'vendor-performance-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'expense-variance-ratio',
      name: 'Expense Variance Ratio',
      description: 'Ratio of actual expenses to budgeted expenses',
      category: 'expenses',
      widgetType: 'expense-variance-ratio',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // Additional Charts
    {
      id: 'expense-category-trends',
      name: 'Expense Category Trends',
      description: 'Track trends across different expense categories',
      category: 'expenses',
      widgetType: 'expense-category-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'seasonal-expense-patterns',
      name: 'Seasonal Expense Patterns',
      description: 'Identify seasonal patterns in operating expenses',
      category: 'expenses',
      widgetType: 'seasonal-expense-patterns',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'expense-forecast-model',
      name: 'Expense Forecast Model',
      description: 'Predictive model for future expense projections',
      category: 'expenses',
      widgetType: 'expense-forecast-model',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'vendor-cost-analysis',
      name: 'Vendor Cost Analysis',
      description: 'Analyze costs by vendor and service category',
      category: 'expenses',
      widgetType: 'vendor-cost-analysis',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'emergency-expense-tracker',
      name: 'Emergency Expense Tracker',
      description: 'Track and categorize emergency maintenance expenses',
      category: 'expenses',
      widgetType: 'emergency-expense-tracker',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'utility-efficiency-trends',
      name: 'Utility Efficiency Trends',
      description: 'Track utility usage and efficiency improvements',
      category: 'expenses',
      widgetType: 'utility-efficiency-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    // Advanced Analysis Tools
    {
      id: 'expense-optimization-opportunities',
      name: 'Expense Optimization Opportunities',
      description: 'AI-powered suggestions for reducing operating expenses',
      category: 'expenses',
      widgetType: 'expense-optimization-opportunities',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'maintenance-schedule-optimizer',
      name: 'Maintenance Schedule Optimizer',
      description: 'Optimize maintenance schedules to reduce costs',
      category: 'expenses',
      widgetType: 'maintenance-schedule-optimizer',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'expense-anomaly-detector',
      name: 'Expense Anomaly Detector',
      description: 'Automatically detect unusual expense patterns',
      category: 'expenses',
      widgetType: 'expense-anomaly-detector',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'cost-center-profitability',
      name: 'Cost Center Profitability',
      description: 'Analyze profitability by property and cost center',
      category: 'expenses',
      widgetType: 'cost-center-profitability',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // Additional Comparative Analysis
    {
      id: 'expense-benchmarking',
      name: 'Expense Benchmarking',
      description: 'Compare your expenses against industry benchmarks',
      category: 'expenses',
      widgetType: 'expense-benchmarking',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'property-expense-ranking',
      name: 'Property Expense Ranking',
      description: 'Rank properties by expense efficiency and performance',
      category: 'expenses',
      widgetType: 'property-expense-ranking',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'market-expense-comparison',
      name: 'Market Expense Comparison',
      description: 'Compare your expenses with local market averages',
      category: 'expenses',
      widgetType: 'market-expense-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  investment: [
    // Core Metrics
    {
      id: 'total-net-worth',
      name: 'Total Net Worth',
      description: 'Combined value of all properties and financial assets',
      category: 'investment',
      widgetType: 'total-net-worth',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'total-properties-metric',
      name: 'Total Properties',
      description: 'Total number of properties in portfolio',
      category: 'investment',
      widgetType: 'total-properties-metric',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'total-investment-metric',
      name: 'Total Investment',
      description: 'Total capital invested across all properties',
      category: 'investment',
      widgetType: 'total-investment-metric',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'avg-property-value-metric',
      name: 'Avg Property Value',
      description: 'Average market value per property',
      category: 'investment',
      widgetType: 'avg-property-value-metric',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'monthly-cash-flow-metric',
      name: 'Monthly Cash Flow',
      description: 'Current monthly cash flow from all properties',
      category: 'investment',
      widgetType: 'monthly-cash-flow-metric',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    // Performance Indicators
    {
      id: 'cap-rate-speedometer',
      name: 'Cap Rate',
      description: 'Capitalization rate performance indicator',
      category: 'investment',
      widgetType: 'cap-rate-speedometer',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'cash-on-cash-speedometer',
      name: 'Cash-on-Cash Return',
      description: 'Cash-on-cash return performance gauge',
      category: 'investment',
      widgetType: 'cash-on-cash-speedometer',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'rent-to-value-speedometer',
      name: 'Rent-to-Value Ratio',
      description: 'Monthly rent to property value ratio',
      category: 'investment',
      widgetType: 'rent-to-value-speedometer',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    // Charts & Trends
    {
      id: 'portfolio-growth-timeline',
      name: 'Portfolio Growth Timeline',
      description: 'Timeline showing portfolio expansion over time',
      category: 'investment',
      widgetType: 'portfolio-growth-timeline',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'property-type-distribution',
      name: 'Property Type Distribution',
      description: 'Distribution of properties by type and category',
      category: 'investment',
      widgetType: 'property-type-distribution',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'market-value-trends',
      name: 'Market Value Trends',
      description: 'Track property value changes over time',
      category: 'investment',
      widgetType: 'market-value-trends',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    {
      id: 'appreciation-tracking',
      name: 'Property Appreciation',
      description: 'Monitor property appreciation rates',
      category: 'investment',
      widgetType: 'appreciation-tracking',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    {
      id: 'yield-analysis',
      name: 'Yield Analysis',
      description: 'Analyze rental yields and returns',
      category: 'investment',
      widgetType: 'yield-analysis',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    // Analysis Tools
    {
      id: 'property-performance-overview',
      name: 'Property Performance Overview',
      description: 'Comprehensive overview of individual property performance',
      category: 'investment',
      widgetType: 'property-performance-overview',
      componentType: 'panel',
      isCore: true,
      group: 'analysis-tools'
    },
    {
      id: 'benchmark-comparison',
      name: 'Market Benchmarks',
      description: 'Compare performance against market benchmarks',
      category: 'investment',
      widgetType: 'benchmark-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'roi-comparison',
      name: 'ROI Comparison',
      description: 'Compare ROI across different properties and investments',
      category: 'investment',
      widgetType: 'roi-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'risk-assessment',
      name: 'Risk Assessment',
      description: 'Analyze investment risks and portfolio diversification',
      category: 'investment',
      widgetType: 'risk-assessment',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // Additional Core Investment Metrics
    {
      id: 'portfolio-irr',
      name: 'Portfolio IRR',
      description: 'Internal Rate of Return across entire portfolio',
      category: 'investment',
      widgetType: 'portfolio-irr',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'debt-service-coverage',
      name: 'Debt Service Coverage',
      description: 'Ability to service debt obligations from operating income',
      category: 'investment',
      widgetType: 'debt-service-coverage',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'loan-to-value-ratio',
      name: 'Loan-to-Value Ratio',
      description: 'Outstanding loan balance as percentage of property value',
      category: 'investment',
      widgetType: 'loan-to-value-ratio',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'portfolio-diversification-score',
      name: 'Portfolio Diversification Score',
      description: 'Measure of portfolio diversification across markets and types',
      category: 'investment',
      widgetType: 'portfolio-diversification-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'investment-velocity',
      name: 'Investment Velocity',
      description: 'Rate of new property acquisitions and capital deployment',
      category: 'investment',
      widgetType: 'investment-velocity',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // Advanced Investment Charts
    {
      id: 'acquisition-pipeline',
      name: 'Acquisition Pipeline',
      description: 'Timeline and status of potential property acquisitions',
      category: 'investment',
      widgetType: 'acquisition-pipeline',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'market-value-heatmap',
      name: 'Market Value Heat Map',
      description: 'Geographic visualization of property values and performance',
      category: 'investment',
      widgetType: 'market-value-heatmap',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'portfolio-composition-evolution',
      name: 'Portfolio Composition Evolution',
      description: 'Track changes in portfolio composition over time',
      category: 'investment',
      widgetType: 'portfolio-composition-evolution',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'investment-performance-matrix',
      name: 'Investment Performance Matrix',
      description: 'Matrix view of all properties by performance metrics',
      category: 'investment',
      widgetType: 'investment-performance-matrix',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'cash-flow-projection-model',
      name: 'Cash Flow Projection Model',
      description: 'Long-term cash flow projections with scenario analysis',
      category: 'investment',
      widgetType: 'cash-flow-projection-model',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'refinancing-opportunities',
      name: 'Refinancing Opportunities',
      description: 'Identify optimal refinancing opportunities and savings',
      category: 'investment',
      widgetType: 'refinancing-opportunities',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'market-cycle-indicator',
      name: 'Market Cycle Indicator',
      description: 'Track local real estate market cycles and timing',
      category: 'investment',
      widgetType: 'market-cycle-indicator',
      componentType: 'chart',
      group: 'charts-trends'
    },
    // Advanced Analysis Panels
    {
      id: 'deal-analyzer',
      name: 'Deal Analyzer',
      description: 'Comprehensive analysis tool for evaluating new investments',
      category: 'investment',
      widgetType: 'deal-analyzer',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'exit-strategy-planner',
      name: 'Exit Strategy Planner',
      description: 'Plan and analyze different exit strategies for properties',
      category: 'investment',
      widgetType: 'exit-strategy-planner',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'portfolio-optimization-engine',
      name: 'Portfolio Optimization Engine',
      description: 'AI-powered recommendations for portfolio optimization',
      category: 'investment',
      widgetType: 'portfolio-optimization-engine',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'market-opportunity-scanner',
      name: 'Market Opportunity Scanner',
      description: 'Scan markets for investment opportunities and trends',
      category: 'investment',
      widgetType: 'market-opportunity-scanner',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'investment-goal-tracker',
      name: 'Investment Goal Tracker',
      description: 'Track progress towards investment goals and milestones',
      category: 'investment',
      widgetType: 'investment-goal-tracker',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // Advanced Comparative Analysis
    {
      id: 'market-performance-comparison',
      name: 'Market Performance Comparison',
      description: 'Compare portfolio performance across different markets',
      category: 'investment',
      widgetType: 'market-performance-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'property-class-analysis',
      name: 'Property Class Analysis',
      description: 'Compare performance across different property classes',
      category: 'investment',
      widgetType: 'property-class-analysis',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'vintage-performance-analysis',
      name: 'Vintage Performance Analysis',
      description: 'Analyze performance by acquisition year and vintage',
      category: 'investment',
      widgetType: 'vintage-performance-analysis',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'investment-strategy-comparison',
      name: 'Investment Strategy Comparison',
      description: 'Compare different investment strategies and their outcomes',
      category: 'investment',
      widgetType: 'investment-strategy-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  leasing: [
    // Core Metrics
    {
      id: 'days-to-fill-vacancy',
      name: 'Days to Fill Vacancy',
      description: 'Average days to fill vacant units',
      category: 'leasing',
      widgetType: 'days-to-fill-vacancy',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'leasing-velocity',
      name: 'Leasing Velocity',
      description: 'Rate of new lease signings per month',
      category: 'leasing',
      widgetType: 'leasing-velocity',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'application-to-lease-ratio',
      name: 'Application to Lease Ratio',
      description: 'Percentage of applications that convert to leases',
      category: 'leasing',
      widgetType: 'application-to-lease-ratio',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'tenant-retention-rate',
      name: 'Tenant Retention Rate',
      description: 'Percentage of tenants who renew their leases',
      category: 'leasing',
      widgetType: 'tenant-retention-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'renewal-rate',
      name: 'Renewal Rate',
      description: 'Overall lease renewal rate across portfolio',
      category: 'leasing',
      widgetType: 'renewal-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'tour-to-lease-ratio',
      name: 'Tour to Lease Ratio',
      description: 'Conversion rate from property tours to signed leases',
      category: 'leasing',
      widgetType: 'tour-to-lease-ratio',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'lead-response-time',
      name: 'Lead Response Time',
      description: 'Average time to respond to leasing inquiries',
      category: 'leasing',
      widgetType: 'lead-response-time',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'average-lease-term',
      name: 'Average Lease Term',
      description: 'Average length of lease agreements in months',
      category: 'leasing',
      widgetType: 'average-lease-term',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'lease-concession-rate',
      name: 'Lease Concession Rate',
      description: 'Percentage of leases with concessions or incentives',
      category: 'leasing',
      widgetType: 'lease-concession-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'showing-activity-rate',
      name: 'Showing Activity Rate',
      description: 'Number of property showings per available unit',
      category: 'leasing',
      widgetType: 'showing-activity-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // Charts & Trends
    {
      id: 'vacancy-trends',
      name: 'Vacancy Trends',
      description: 'Track vacancy rates over time',
      category: 'leasing',
      widgetType: 'vacancy-trends',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'renewal-rate-trends',
      name: 'Renewal Rate Trends',
      description: 'Track lease renewal rates over time',
      category: 'leasing',
      widgetType: 'renewal-rate-trends',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'leasing-pipeline',
      name: 'Leasing Pipeline',
      description: 'Funnel visualization of leasing stages from lead to lease',
      category: 'leasing',
      widgetType: 'leasing-pipeline',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'lease-expiration-timeline',
      name: 'Lease Expiration Timeline',
      description: 'Timeline of upcoming lease expirations',
      category: 'leasing',
      widgetType: 'lease-expiration-timeline',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'tenant-turnover-trends',
      name: 'Tenant Turnover Trends',
      description: 'Track tenant turnover patterns and seasonality',
      category: 'leasing',
      widgetType: 'tenant-turnover-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'application-volume-trends',
      name: 'Application Volume Trends',
      description: 'Track rental application volume over time',
      category: 'leasing',
      widgetType: 'application-volume-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'showing-activity-trends',
      name: 'Showing Activity Trends',
      description: 'Monitor property showing activity patterns',
      category: 'leasing',
      widgetType: 'showing-activity-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'move-in-move-out-calendar',
      name: 'Move-In/Move-Out Calendar',
      description: 'Calendar view of scheduled move-ins and move-outs',
      category: 'leasing',
      widgetType: 'move-in-move-out-calendar',
      componentType: 'chart',
      group: 'charts-trends'
    },
    // Analysis Tools
    {
      id: 'tenant-satisfaction-score',
      name: 'Tenant Satisfaction Analysis',
      description: 'Detailed tenant satisfaction metrics and feedback',
      category: 'leasing',
      widgetType: 'tenant-satisfaction-score',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'complaint-resolution-time',
      name: 'Complaint Resolution Time',
      description: 'Average time to resolve tenant complaints',
      category: 'leasing',
      widgetType: 'complaint-resolution-time',
      componentType: 'metric',
      group: 'analysis-tools'
    },
    {
      id: 'leasing-performance-scorecard',
      name: 'Leasing Performance Scorecard',
      description: 'Comprehensive leasing team performance metrics',
      category: 'leasing',
      widgetType: 'leasing-performance-scorecard',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'tenant-screening-analysis',
      name: 'Tenant Screening Analysis',
      description: 'Analysis of tenant screening effectiveness and approval rates',
      category: 'leasing',
      widgetType: 'tenant-screening-analysis',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'renewal-optimization-insights',
      name: 'Renewal Optimization Insights',
      description: 'AI-powered insights for improving renewal rates',
      category: 'leasing',
      widgetType: 'renewal-optimization-insights',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'lease-pricing-analyzer',
      name: 'Lease Pricing Analyzer',
      description: 'Analyze lease pricing effectiveness and market positioning',
      category: 'leasing',
      widgetType: 'lease-pricing-analyzer',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'tenant-demographic-analysis',
      name: 'Tenant Demographic Analysis',
      description: 'Analyze tenant demographics and preferences',
      category: 'leasing',
      widgetType: 'tenant-demographic-analysis',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // Comparative Analysis
    {
      id: 'property-leasing-comparison',
      name: 'Property Leasing Comparison',
      description: 'Compare leasing performance across properties',
      category: 'leasing',
      widgetType: 'property-leasing-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'market-vacancy-benchmarks',
      name: 'Market Vacancy Benchmarks',
      description: 'Compare your vacancy rates to market benchmarks',
      category: 'leasing',
      widgetType: 'market-vacancy-benchmarks',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'retention-rate-benchmarks',
      name: 'Retention Rate Benchmarks',
      description: 'Compare retention rates to industry standards',
      category: 'leasing',
      widgetType: 'retention-rate-benchmarks',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'lease-term-comparison',
      name: 'Lease Term Comparison',
      description: 'Compare lease terms across properties and units',
      category: 'leasing',
      widgetType: 'lease-term-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'concession-strategy-comparison',
      name: 'Concession Strategy Comparison',
      description: 'Compare effectiveness of different concession strategies',
      category: 'leasing',
      widgetType: 'concession-strategy-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  'risk-management': [
    // Core Metrics
    {
      id: 'inspection-compliance',
      name: 'Inspection Compliance',
      description: 'Percentage of properties passing safety inspections',
      category: 'risk-management',
      widgetType: 'inspection-compliance',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'safety-incident-rate',
      name: 'Safety Incident Rate',
      description: 'Annual safety incident rate across all properties',
      category: 'risk-management',
      widgetType: 'safety-incident-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'insurance-claims',
      name: 'Insurance Claims',
      description: 'Annual insurance claim frequency rate',
      category: 'risk-management',
      widgetType: 'insurance-claims',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'risk-assessment-score',
      name: 'Risk Assessment Score',
      description: 'Overall portfolio risk assessment rating',
      category: 'risk-management',
      widgetType: 'risk-assessment-score',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    // Charts & Trends
    {
      id: 'compliance-trends',
      name: 'Compliance Trends',
      description: 'Track compliance rates over time',
      category: 'risk-management',
      widgetType: 'compliance-trends',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'incident-rate-trends',
      name: 'Incident Rate Trends',
      description: 'Monitor safety incident patterns over time',
      category: 'risk-management',
      widgetType: 'incident-rate-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'risk-score-timeline',
      name: 'Risk Score Over Time',
      description: 'Track portfolio risk score changes',
      category: 'risk-management',
      widgetType: 'risk-score-timeline',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'insurance-claims-analysis',
      name: 'Insurance Claims Analysis',
      description: 'Analyze insurance claim patterns and costs',
      category: 'risk-management',
      widgetType: 'insurance-claims-analysis',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    // Analysis Tools
    {
      id: 'risk-assessment-dashboard',
      name: 'Risk Assessment Dashboard',
      description: 'Comprehensive risk assessment and mitigation planning',
      category: 'risk-management',
      widgetType: 'risk-assessment-dashboard',
      componentType: 'panel',
      isCore: true,
      group: 'analysis-tools'
    },
    {
      id: 'compliance-audit-results',
      name: 'Compliance Audit Results',
      description: 'Detailed results from compliance audits and inspections',
      category: 'risk-management',
      widgetType: 'compliance-audit-results',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'emergency-preparedness',
      name: 'Emergency Preparedness',
      description: 'Emergency response planning and preparedness metrics',
      category: 'risk-management',
      widgetType: 'emergency-preparedness',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'property-risk-comparison',
      name: 'Property Risk Comparison',
      description: 'Compare risk levels across different properties',
      category: 'risk-management',
      widgetType: 'property-risk-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'benchmark-compliance',
      name: 'Benchmark Compliance',
      description: 'Compare compliance rates against industry benchmarks',
      category: 'risk-management',
      widgetType: 'benchmark-compliance',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  'tenant-performance': [
    // Core Metrics
    {
      id: 'tenant-quality-score',
      name: 'Tenant Quality Score',
      description: 'Overall tenant quality assessment',
      category: 'tenant-performance',
      widgetType: 'tenant-quality-score',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'on-time-payment-rate',
      name: 'On-Time Payment Rate',
      description: 'Percentage of rent payments made on time',
      category: 'tenant-performance',
      widgetType: 'on-time-payment-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'tenant-turnover-rate',
      name: 'Tenant Turnover Rate',
      description: 'Rate of tenant departures',
      category: 'tenant-performance',
      widgetType: 'tenant-turnover-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    // Analysis Tools
    {
      id: 'tenant-screening-efficiency',
      name: 'Tenant Screening Efficiency',
      description: 'Effectiveness of tenant screening process',
      category: 'tenant-performance',
      widgetType: 'tenant-screening-efficiency',
      componentType: 'panel',
      group: 'analysis-tools'
    }
  ],

  maintenance: [
    // Core Metrics
    {
      id: 'work-order-response-time',
      name: 'Work Order Response Time',
      description: 'Average time to respond to maintenance requests',
      category: 'maintenance',
      widgetType: 'work-order-response-time',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'maintenance-cost-per-unit',
      name: 'Maintenance Cost per Unit',
      description: 'Average maintenance costs per property unit',
      category: 'maintenance',
      widgetType: 'maintenance-cost-per-unit',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'preventive-maintenance-ratio',
      name: 'Preventive Maintenance %',
      description: 'Percentage of maintenance that is preventive',
      category: 'maintenance',
      widgetType: 'preventive-maintenance-ratio',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'maintenance-completion-rate',
      name: 'Completion Rate',
      description: 'Percentage of maintenance requests completed on time',
      category: 'maintenance',
      widgetType: 'maintenance-completion-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'maintenance-response-time',
      name: 'Response Time',
      description: 'Average time to respond to maintenance requests',
      category: 'maintenance',
      widgetType: 'maintenance-response-time',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'first-call-resolution-rate',
      name: 'First Call Resolution',
      description: 'Percentage of requests resolved on first visit',
      category: 'maintenance',
      widgetType: 'first-call-resolution-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'complaint-resolution-time-maint',
      name: 'Complaint Resolution Time',
      description: 'Average time to resolve tenant complaints',
      category: 'maintenance',
      widgetType: 'complaint-resolution-time-maint',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'emergency-response-time',
      name: 'Emergency Response Time',
      description: 'Average response time for emergency requests',
      category: 'maintenance',
      widgetType: 'emergency-response-time',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'maintenance-satisfaction-score',
      name: 'Maintenance Satisfaction',
      description: 'Tenant satisfaction with maintenance services',
      category: 'maintenance',
      widgetType: 'maintenance-satisfaction-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'work-order-backlog',
      name: 'Work Order Backlog',
      description: 'Number of pending maintenance work orders',
      category: 'maintenance',
      widgetType: 'work-order-backlog',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'average-repair-cost',
      name: 'Average Repair Cost',
      description: 'Average cost per maintenance repair',
      category: 'maintenance',
      widgetType: 'average-repair-cost',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'maintenance-efficiency-ratio',
      name: 'Efficiency Ratio',
      description: 'Ratio of completed vs scheduled maintenance',
      category: 'maintenance',
      widgetType: 'maintenance-efficiency-ratio',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'repeat-request-rate',
      name: 'Repeat Request Rate',
      description: 'Percentage of recurring maintenance issues',
      category: 'maintenance',
      widgetType: 'repeat-request-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // Charts & Trends
    {
      id: 'maintenance-backlog-trends',
      name: 'Maintenance Backlog',
      description: 'Track maintenance request backlog over time',
      category: 'maintenance',
      widgetType: 'maintenance-backlog-trends',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'emergency-vs-routine',
      name: 'Emergency vs Routine',
      description: 'Breakdown of emergency vs routine maintenance',
      category: 'maintenance',
      widgetType: 'emergency-vs-routine',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'maintenance-request-trends',
      name: 'Request Trends',
      description: 'Track maintenance request volume over time',
      category: 'maintenance',
      widgetType: 'maintenance-request-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'category-breakdown-chart',
      name: 'Category Breakdown',
      description: 'Breakdown of maintenance by category type',
      category: 'maintenance',
      widgetType: 'category-breakdown-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'seasonal-maintenance-patterns',
      name: 'Seasonal Patterns',
      description: 'Identify seasonal maintenance trends',
      category: 'maintenance',
      widgetType: 'seasonal-maintenance-patterns',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'response-time-trends',
      name: 'Response Time Trends',
      description: 'Track response time improvements over time',
      category: 'maintenance',
      widgetType: 'response-time-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'cost-vs-budget-analysis',
      name: 'Cost vs Budget',
      description: 'Compare actual maintenance costs to budget',
      category: 'maintenance',
      widgetType: 'cost-vs-budget-analysis',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'completion-rate-trends',
      name: 'Completion Rate Trends',
      description: 'Track on-time completion rate over time',
      category: 'maintenance',
      widgetType: 'completion-rate-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    // Analysis Tools
    {
      id: 'maintenance-cost-analysis',
      name: 'Cost Analysis',
      description: 'Detailed breakdown of maintenance costs',
      category: 'maintenance',
      widgetType: 'maintenance-cost-analysis',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'property-maintenance-comparison',
      name: 'Property Comparison',
      description: 'Compare maintenance metrics across properties',
      category: 'maintenance',
      widgetType: 'property-maintenance-comparison',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'predictive-maintenance-insights',
      name: 'Predictive Insights',
      description: 'AI-powered predictive maintenance recommendations',
      category: 'maintenance',
      widgetType: 'predictive-maintenance-insights',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'maintenance-priority-matrix',
      name: 'Priority Matrix',
      description: 'Prioritize maintenance requests by urgency and impact',
      category: 'maintenance',
      widgetType: 'maintenance-priority-matrix',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // Comparative Analysis
    {
      id: 'maintenance-benchmarking',
      name: 'Industry Benchmarking',
      description: 'Compare maintenance metrics against industry standards',
      category: 'maintenance',
      widgetType: 'maintenance-benchmarking',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'year-over-year-maintenance',
      name: 'Year-over-Year Analysis',
      description: 'Compare maintenance performance year-over-year',
      category: 'maintenance',
      widgetType: 'year-over-year-maintenance',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  'vendor-operations': [
    // Core Metrics
    {
      id: 'vendor-performance-score',
      name: 'Vendor Performance Score',
      description: 'Overall vendor performance rating',
      category: 'vendor-operations',
      widgetType: 'vendor-performance-score',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'service-quality-rating',
      name: 'Service Quality Rating',
      description: 'Quality rating of vendor services',
      category: 'vendor-operations',
      widgetType: 'service-quality-rating',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'vendor-cost-efficiency',
      name: 'Cost Efficiency',
      description: 'Cost effectiveness of vendor services',
      category: 'vendor-operations',
      widgetType: 'vendor-cost-efficiency',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'active-vendors-count',
      name: 'Active Vendors',
      description: 'Number of currently active vendors',
      category: 'vendor-operations',
      widgetType: 'active-vendors-count',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'vendor-response-time',
      name: 'Vendor Response Time',
      description: 'Average time for vendors to respond to requests',
      category: 'vendor-operations',
      widgetType: 'vendor-response-time',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'vendor-reliability-score',
      name: 'Reliability Score',
      description: 'Vendor reliability based on completion rates',
      category: 'vendor-operations',
      widgetType: 'vendor-reliability-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'average-job-completion-time',
      name: 'Avg Job Completion',
      description: 'Average time for vendors to complete jobs',
      category: 'vendor-operations',
      widgetType: 'average-job-completion-time',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'vendor-cost-per-job',
      name: 'Cost Per Job',
      description: 'Average vendor cost per completed job',
      category: 'vendor-operations',
      widgetType: 'vendor-cost-per-job',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'vendor-compliance-rate',
      name: 'Compliance Rate',
      description: 'Percentage of vendors meeting compliance standards',
      category: 'vendor-operations',
      widgetType: 'vendor-compliance-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'contract-renewal-rate',
      name: 'Contract Renewal Rate',
      description: 'Percentage of vendor contracts renewed',
      category: 'vendor-operations',
      widgetType: 'contract-renewal-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // Charts & Trends
    {
      id: 'vendor-performance-comparison',
      name: 'Vendor Performance Comparison',
      description: 'Compare performance across different vendors',
      category: 'vendor-operations',
      widgetType: 'vendor-performance-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'service-request-trends',
      name: 'Service Request Trends',
      description: 'Track vendor service requests over time',
      category: 'vendor-operations',
      widgetType: 'service-request-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'vendor-cost-trends',
      name: 'Cost Trends',
      description: 'Track vendor costs and spending patterns over time',
      category: 'vendor-operations',
      widgetType: 'vendor-cost-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'vendor-utilization-chart',
      name: 'Vendor Utilization',
      description: 'Track which vendors are most frequently used',
      category: 'vendor-operations',
      widgetType: 'vendor-utilization-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'service-category-breakdown',
      name: 'Service Category Breakdown',
      description: 'Breakdown of vendor services by category',
      category: 'vendor-operations',
      widgetType: 'service-category-breakdown',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'quality-trends-analysis',
      name: 'Quality Trends',
      description: 'Track vendor service quality over time',
      category: 'vendor-operations',
      widgetType: 'quality-trends-analysis',
      componentType: 'chart',
      group: 'charts-trends'
    },
    // Analysis Tools
    {
      id: 'vendor-scorecards',
      name: 'Vendor Scorecards',
      description: 'Comprehensive performance scorecards for each vendor',
      category: 'vendor-operations',
      widgetType: 'vendor-scorecards',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'vendor-contract-management',
      name: 'Contract Management',
      description: 'Track and manage vendor contracts and renewals',
      category: 'vendor-operations',
      widgetType: 'vendor-contract-management',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'vendor-optimization-insights',
      name: 'Optimization Insights',
      description: 'AI-powered suggestions for vendor optimization',
      category: 'vendor-operations',
      widgetType: 'vendor-optimization-insights',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // Comparative Analysis
    {
      id: 'vendor-cost-comparison',
      name: 'Cost Comparison',
      description: 'Compare vendor costs across similar services',
      category: 'vendor-operations',
      widgetType: 'vendor-cost-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'vendor-benchmarking',
      name: 'Industry Benchmarking',
      description: 'Compare vendor performance against industry standards',
      category: 'vendor-operations',
      widgetType: 'vendor-benchmarking',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'best-value-vendors',
      name: 'Best Value Analysis',
      description: 'Identify vendors offering best value for services',
      category: 'vendor-operations',
      widgetType: 'best-value-vendors',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  'tenant-lifecycle': [
    // Core Lifecycle Metrics
    {
      id: 'total-tenants',
      name: 'Total Tenants',
      description: 'Current total number of active tenants',
      category: 'tenant-lifecycle',
      widgetType: 'total-tenants',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'tenant-retention-rate',
      name: 'Tenant Retention Rate',
      description: 'Percentage of tenants who renewed their lease',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-retention-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'average-tenancy',
      name: 'Average Tenancy Duration',
      description: 'Average length of tenant stays in months',
      category: 'tenant-lifecycle',
      widgetType: 'average-tenancy',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'tenant-acquisition-cost',
      name: 'Tenant Acquisition Cost',
      description: 'Average cost to acquire a new tenant',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-acquisition-cost',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // Satisfaction Metrics (merged from tenant-satisfaction)
    {
      id: 'satisfaction-score',
      name: 'Tenant Satisfaction Score',
      description: 'Overall tenant satisfaction rating',
      category: 'tenant-lifecycle',
      widgetType: 'satisfaction-score',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'response-time',
      name: 'Average Response Time',
      description: 'Average time to respond to tenant inquiries',
      category: 'tenant-lifecycle',
      widgetType: 'response-time',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'complaint-resolution',
      name: 'Complaint Resolution Rate',
      description: 'Percentage of tenant complaints resolved',
      category: 'tenant-lifecycle',
      widgetType: 'complaint-resolution',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'at-risk-count',
      name: 'At Risk Tenants',
      description: 'Number of tenants requiring attention',
      category: 'tenant-lifecycle',
      widgetType: 'at-risk-count',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    // NEW CORE METRICS
    {
      id: 'new-tenants',
      name: 'New Tenants',
      description: 'Count of new tenants in last 6 months',
      category: 'tenant-lifecycle',
      widgetType: 'new-tenants',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'tenants-leaving',
      name: 'Tenants Leaving',
      description: 'Count of tenants leaving in next 3 months',
      category: 'tenant-lifecycle',
      widgetType: 'tenants-leaving',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'communication-score',
      name: 'Communication Score',
      description: 'Average tenant communication satisfaction',
      category: 'tenant-lifecycle',
      widgetType: 'communication-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'maintenance-score',
      name: 'Maintenance Score',
      description: 'Average maintenance satisfaction score',
      category: 'tenant-lifecycle',
      widgetType: 'maintenance-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'tenant-turnover-rate',
      name: 'Turnover Rate',
      description: 'Percentage turnover rate year-over-year',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-turnover-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'payment-delinquency-rate',
      name: 'Payment Delinquency',
      description: 'Percentage of late or missed payments',
      category: 'tenant-lifecycle',
      widgetType: 'payment-delinquency-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'tenant-lifetime-value',
      name: 'Tenant Lifetime Value',
      description: 'Average revenue per tenant over tenure',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-lifetime-value',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'tenant-profitability-score',
      name: 'Profitability Score',
      description: 'Net profitability per tenant',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-profitability-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'lease-violation-rate',
      name: 'Lease Violation Rate',
      description: 'Percentage of tenants with violations',
      category: 'tenant-lifecycle',
      widgetType: 'lease-violation-rate',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // CHARTS & TRENDS
    {
      id: 'satisfaction-breakdown',
      name: 'Satisfaction Breakdown',
      description: 'Detailed breakdown of satisfaction metrics',
      category: 'tenant-lifecycle',
      widgetType: 'satisfaction-breakdown',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'tenant-turnover-trends',
      name: 'Turnover Trends',
      description: 'Monthly tenant move-ins vs move-outs',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-turnover-trends',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'risk-level-distribution',
      name: 'Risk Distribution',
      description: 'Distribution of tenant risk levels',
      category: 'tenant-lifecycle',
      widgetType: 'risk-level-distribution',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'retention-rate-timeline',
      name: 'Retention Rate Timeline',
      description: 'Retention trends over time',
      category: 'tenant-lifecycle',
      widgetType: 'retention-rate-timeline',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'tenant-satisfaction-trends',
      name: 'Satisfaction Trends',
      description: 'Multi-line chart tracking satisfaction metrics',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-satisfaction-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'lease-expiration-calendar',
      name: 'Lease Expiration Calendar',
      description: 'Timeline visualization of upcoming expirations',
      category: 'tenant-lifecycle',
      widgetType: 'lease-expiration-calendar',
      componentType: 'chart',
      group: 'charts-trends'
    },
    // ANALYSIS TOOLS
    {
      id: 'risk-assessment',
      name: 'Tenant Risk Assessment',
      description: 'Combined lifecycle and satisfaction risk analysis',
      category: 'tenant-lifecycle',
      widgetType: 'risk-assessment',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'retention-strategy-recommendations',
      name: 'Retention Strategies',
      description: 'AI-powered retention strategy recommendations',
      category: 'tenant-lifecycle',
      widgetType: 'retention-strategy-recommendations',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'tenant-communication-log',
      name: 'Communication Log',
      description: 'Detailed communication history and insights',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-communication-log',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'tenant-profitability-analysis',
      name: 'Profitability Analysis',
      description: 'Cost/benefit analysis per tenant',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-profitability-analysis',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // COMPARATIVE ANALYSIS
    {
      id: 'property-retention-comparison',
      name: 'Property Retention Comparison',
      description: 'Compare retention rates across properties',
      category: 'tenant-lifecycle',
      widgetType: 'property-retention-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'tenant-age-distribution',
      name: 'Tenant Age Distribution',
      description: 'Demographics and tenure analysis',
      category: 'tenant-lifecycle',
      widgetType: 'tenant-age-distribution',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  'lease-rent-optimization': [
    // Core Metrics - Lease Management
    {
      id: 'renewal-rate',
      name: 'Lease Renewal Rate',
      description: 'Percentage of leases that were renewed',
      category: 'lease-rent-optimization',
      widgetType: 'renewal-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'rent-optimization-potential',
      name: 'Rent Optimization Potential',
      description: 'Total monthly optimization potential across all properties',
      category: 'lease-rent-optimization',
      widgetType: 'rent-optimization-potential',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'rent-increase-opportunities',
      name: 'Rent Increase Opportunities',
      description: 'Properties with rent increase potential',
      category: 'lease-rent-optimization',
      widgetType: 'rent-increase-opportunities',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'average-lease-term',
      name: 'Average Lease Term',
      description: 'Average length of lease agreements',
      category: 'lease-rent-optimization',
      widgetType: 'average-lease-term',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'lease-expiration-tracker',
      name: 'Expiring Soon',
      description: 'Leases expiring in next 90 days',
      category: 'lease-rent-optimization',
      widgetType: 'lease-expiration-tracker',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'pricing-strategy',
      name: 'Optimization Potential',
      description: 'Monthly rent increase potential',
      category: 'lease-rent-optimization',
      widgetType: 'pricing-strategy',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    // NEW CORE METRICS
    {
      id: 'total-leases',
      name: 'Total Leases',
      description: 'Total number of active leases',
      category: 'lease-rent-optimization',
      widgetType: 'total-leases',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'current-average-rent',
      name: 'Average Rent',
      description: 'Portfolio-wide average monthly rent',
      category: 'lease-rent-optimization',
      widgetType: 'current-average-rent',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'market-rent-gap',
      name: 'Market Rent Gap',
      description: 'Average $ difference vs market rates',
      category: 'lease-rent-optimization',
      widgetType: 'market-rent-gap',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'lease-renewal-success',
      name: 'Renewal Success',
      description: 'Percentage of successful renewals',
      category: 'lease-rent-optimization',
      widgetType: 'lease-renewal-success',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'rent-collection-efficiency',
      name: 'Collection Efficiency',
      description: 'On-time rent collection percentage',
      category: 'lease-rent-optimization',
      widgetType: 'rent-collection-efficiency',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'lease-compliance-score',
      name: 'Compliance Score',
      description: 'Compliance with lease terms rating',
      category: 'lease-rent-optimization',
      widgetType: 'lease-compliance-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // CHARTS & TRENDS
    {
      id: 'market-rent-comparison',
      name: 'Market Rent Comparison',
      description: 'Compare current rent to market rates',
      category: 'lease-rent-optimization',
      widgetType: 'market-rent-comparison',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'lease-performance-timeline',
      name: 'Lease Performance Timeline',
      description: 'Track lease performance metrics over time',
      category: 'lease-rent-optimization',
      widgetType: 'lease-performance-timeline',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'rent-trends-over-time',
      name: 'Rent Trends',
      description: 'Line chart showing rent changes over time',
      category: 'lease-rent-optimization',
      widgetType: 'rent-trends-over-time',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'lease-renewal-pipeline',
      name: 'Renewal Pipeline',
      description: 'Funnel chart of upcoming renewals',
      category: 'lease-rent-optimization',
      widgetType: 'lease-renewal-pipeline',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'rent-distribution-analysis',
      name: 'Rent Distribution',
      description: 'Histogram of rent amounts across portfolio',
      category: 'lease-rent-optimization',
      widgetType: 'rent-distribution-analysis',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'seasonal-renewal-patterns',
      name: 'Seasonal Patterns',
      description: 'Identify best/worst renewal seasons',
      category: 'lease-rent-optimization',
      widgetType: 'seasonal-renewal-patterns',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'lease-length-distribution',
      name: 'Lease Length Distribution',
      description: 'Bar chart of lease term lengths',
      category: 'lease-rent-optimization',
      widgetType: 'lease-length-distribution',
      componentType: 'chart',
      group: 'charts-trends'
    },
    // ANALYSIS TOOLS
    {
      id: 'market-rent-analyzer',
      name: 'Market Rent Analyzer',
      description: 'Detailed market comparison per property',
      category: 'lease-rent-optimization',
      widgetType: 'market-rent-analyzer',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'lease-negotiation-insights',
      name: 'Negotiation Insights',
      description: 'Historical negotiation success data',
      category: 'lease-rent-optimization',
      widgetType: 'lease-negotiation-insights',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'rent-increase-impact-simulator',
      name: 'Impact Simulator',
      description: 'Model impact of rent changes',
      category: 'lease-rent-optimization',
      widgetType: 'rent-increase-impact-simulator',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'tenant-rent-affordability',
      name: 'Rent Affordability',
      description: 'Analyze rent burden ratios',
      category: 'lease-rent-optimization',
      widgetType: 'tenant-rent-affordability',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'pricing-strategy-recommendations',
      name: 'Pricing Strategies',
      description: 'AI-powered pricing recommendations',
      category: 'lease-rent-optimization',
      widgetType: 'pricing-strategy-recommendations',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    // COMPARATIVE ANALYSIS
    {
      id: 'property-lease-performance',
      name: 'Property Performance',
      description: 'Compare lease metrics across properties',
      category: 'lease-rent-optimization',
      widgetType: 'property-lease-performance',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'portfolio-rent-benchmarks',
      name: 'Rent Benchmarks',
      description: 'Compare against industry standards',
      category: 'lease-rent-optimization',
      widgetType: 'portfolio-rent-benchmarks',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'year-over-year-lease-metrics',
      name: 'Year-over-Year Metrics',
      description: 'YoY comparison of key metrics',
      category: 'lease-rent-optimization',
      widgetType: 'year-over-year-lease-metrics',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'competitive-rent-positioning',
      name: 'Competitive Positioning',
      description: 'How your rents compare to competitors',
      category: 'lease-rent-optimization',
      widgetType: 'competitive-rent-positioning',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ],

  properties: [
    // Core Financial Metrics
    {
      id: 'properties-cap-rate',
      name: 'Cap Rate',
      description: 'Capitalization rate showing property return potential',
      category: 'properties',
      widgetType: 'cap-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'properties-cash-on-cash',
      name: 'Cash on Cash Return',
      description: 'Annual pre-tax cash flow as percentage of initial cash investment',
      category: 'properties',
      widgetType: 'cash-on-cash-return',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'properties-gross-rent-multiplier',
      name: 'Gross Rent Multiplier',
      description: 'Property price divided by annual rental income',
      category: 'properties',
      widgetType: 'gross-rent-multiplier',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'properties-debt-service-coverage',
      name: 'Debt Service Coverage',
      description: 'Net operating income divided by debt service payments',
      category: 'properties',
      widgetType: 'debt-service-coverage',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'properties-occupancy-rate',
      name: 'Occupancy Rate',
      description: 'Percentage of occupied units across all properties',
      category: 'properties',
      widgetType: 'occupancy-rate',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'properties-rent-growth',
      name: 'Rent Growth YoY',
      description: 'Year-over-year rental income growth percentage',
      category: 'properties',
      widgetType: 'rent-growth-yoy',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'properties-expense-ratio',
      name: 'Operating Expense Ratio',
      description: 'Operating expenses as percentage of gross rental income',
      category: 'properties',
      widgetType: 'operating-expense-ratio',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'properties-net-yield',
      name: 'Net Rental Yield',
      description: 'Net annual rental income as percentage of property value',
      category: 'properties',
      widgetType: 'net-rental-yield',
      componentType: 'metric',
      group: 'core-metrics'
    },
    // Charts & Analysis
    {
      id: 'properties-performance-breakdown',
      name: 'Property Performance Breakdown',
      description: 'Detailed performance analysis across all properties',
      category: 'properties',
      widgetType: 'property-performance-breakdown',
      componentType: 'panel',
      isCore: true,
      group: 'analysis-tools'
    },
    {
      id: 'properties-comparison-chart',
      name: 'Property Comparison Chart',
      description: 'Compare financial metrics across multiple properties',
      category: 'properties',
      widgetType: 'property-comparison-chart',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'properties-roi-trends',
      name: 'ROI Trends Analysis',
      description: 'Track return on investment trends over time',
      category: 'properties',
      widgetType: 'roi-trends-analysis',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'properties-market-analysis',
      name: 'Market Performance Analysis',
      description: 'Compare property performance against market benchmarks',
      category: 'properties',
      widgetType: 'market-performance-analysis',
      componentType: 'panel',
      group: 'comparative-analysis'
    },
    {
      id: 'properties-maintenance-analytics',
      name: 'Maintenance Cost Analytics',
      description: 'Analyze maintenance costs and efficiency across properties',
      category: 'properties',
      widgetType: 'maintenance-cost-analytics',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    {
      id: 'properties-unit-insights',
      name: 'Unit-Level Performance Insights',
      description: 'Detailed performance metrics for individual units',
      category: 'properties',
      widgetType: 'unit-level-insights',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'properties-risk-assessment',
      name: 'Investment Risk Assessment',
      description: 'Evaluate investment risk factors across properties',
      category: 'properties',
      widgetType: 'investment-risk-assessment',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'properties-cash-flow-forecast',
      name: 'Cash Flow Forecast',
      description: 'Predictive cash flow analysis for properties',
      category: 'properties',
      widgetType: 'cash-flow-forecast',
      componentType: 'chart',
      group: 'charts-trends'
    }
  ],

  'predictive-analytics': [
    // ========== CORE METRICS - Essential AI-Powered Metrics ==========
    {
      id: 'vacancy-risk-score',
      name: 'Vacancy Risk Score',
      description: 'AI-powered risk assessment for potential vacancies',
      category: 'predictive-analytics',
      widgetType: 'vacancy-risk-score',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'predicted-noi',
      name: 'Predicted NOI',
      description: 'AI forecast of Net Operating Income for next 12 months',
      category: 'predictive-analytics',
      widgetType: 'predicted-noi',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'market-rent-gap',
      name: 'Market Rent Gap',
      description: 'Gap between current rent and optimal market rate',
      category: 'predictive-analytics',
      widgetType: 'market-rent-gap',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'predictive-maintenance-cost',
      name: 'Predictive Maintenance Cost',
      description: 'AI forecast of upcoming maintenance expenses',
      category: 'predictive-analytics',
      widgetType: 'predictive-maintenance-cost',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    
    // Advanced Vacancy & Tenant Analytics Metrics
    {
      id: 'tenant-churn-prediction',
      name: 'Tenant Churn Prediction',
      description: 'AI model predicting which tenants are likely to leave',
      category: 'predictive-analytics',
      widgetType: 'tenant-churn-prediction',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'tenant-quality-score',
      name: 'Tenant Quality Score',
      description: 'Score tenants based on payment history and property care',
      category: 'predictive-analytics',
      widgetType: 'tenant-quality-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'tenant-satisfaction-predictor',
      name: 'Tenant Satisfaction Predictor',
      description: 'Predict tenant satisfaction based on various factors',
      category: 'predictive-analytics',
      widgetType: 'tenant-satisfaction-predictor',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'vacancy-cost-impact',
      name: 'Vacancy Cost Impact',
      description: 'Calculate total cost impact of each vacancy',
      category: 'predictive-analytics',
      widgetType: 'vacancy-cost-impact',
      componentType: 'metric',
      group: 'core-metrics'
    },

    // Advanced Financial Forecasting Metrics
    {
      id: 'portfolio-roi-projection',
      name: 'Portfolio ROI Projection',
      description: '5-year ROI predictions with scenario analysis',
      category: 'predictive-analytics',
      widgetType: 'portfolio-roi-projection',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'investment-risk-score',
      name: 'Investment Risk Score',
      description: 'Comprehensive risk assessment for each property',
      category: 'predictive-analytics',
      widgetType: 'investment-risk-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'property-appreciation-forecast',
      name: 'Property Appreciation Forecast',
      description: 'AI-powered property value predictions',
      category: 'predictive-analytics',
      widgetType: 'property-appreciation-forecast',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'refinancing-opportunity-score',
      name: 'Refinancing Opportunity Score',
      description: 'Score for optimal refinancing timing',
      category: 'predictive-analytics',
      widgetType: 'refinancing-opportunity-score',
      componentType: 'metric',
      group: 'core-metrics'
    },

    // Advanced Market Intelligence Metrics
    {
      id: 'dynamic-pricing-optimizer',
      name: 'Dynamic Pricing Optimizer',
      description: 'Real-time rent optimization based on demand',
      category: 'predictive-analytics',
      widgetType: 'dynamic-pricing-optimizer',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'market-saturation-indicator',
      name: 'Market Saturation Indicator',
      description: 'Identify over/under-supplied markets',
      category: 'predictive-analytics',
      widgetType: 'market-saturation-indicator',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'neighborhood-growth-score',
      name: 'Neighborhood Growth Score',
      description: 'Predict area development and gentrification',
      category: 'predictive-analytics',
      widgetType: 'neighborhood-growth-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'rental-demand-forecast',
      name: 'Rental Demand Forecast',
      description: 'Predict rental demand by property type/location',
      category: 'predictive-analytics',
      widgetType: 'rental-demand-forecast',
      componentType: 'metric',
      group: 'core-metrics'
    },

    // Advanced Risk Management Metrics
    {
      id: 'tenant-default-probability',
      name: 'Tenant Default Probability',
      description: 'Predict which tenants may default on rent',
      category: 'predictive-analytics',
      widgetType: 'tenant-default-probability',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'legal-risk-assessment',
      name: 'Legal Risk Assessment',
      description: 'Identify potential legal/compliance issues',
      category: 'predictive-analytics',
      widgetType: 'legal-risk-assessment',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'natural-disaster-risk',
      name: 'Natural Disaster Risk',
      description: 'Climate change impact on properties',
      category: 'predictive-analytics',
      widgetType: 'natural-disaster-risk',
      componentType: 'metric',
      group: 'core-metrics'
    },

    // ========== CHARTS & TRENDS - Visual Analytics ==========
    {
      id: 'vacancy-trend-analysis',
      name: 'Vacancy Trend Analysis',
      description: 'Visual analysis of vacancy patterns and seasonality',
      category: 'predictive-analytics',
      widgetType: 'vacancy-trend-analysis',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'revenue-forecast-chart',
      name: 'Revenue Forecast Chart',
      description: '12-month revenue predictions with confidence intervals',
      category: 'predictive-analytics',
      widgetType: 'revenue-forecast-chart',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'market-intelligence-chart',
      name: 'Market Intelligence Chart',
      description: 'Competitive market positioning and trends',
      category: 'predictive-analytics',
      widgetType: 'market-intelligence-chart',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'maintenance-timeline-forecast',
      name: 'Maintenance Timeline Forecast',
      description: 'Timeline of predicted maintenance needs',
      category: 'predictive-analytics',
      widgetType: 'maintenance-timeline-forecast',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },

    // Advanced Vacancy & Tenant Analytics Charts
    {
      id: 'seasonal-vacancy-patterns',
      name: 'Seasonal Vacancy Patterns',
      description: 'Identify when properties are most likely to become vacant',
      category: 'predictive-analytics',
      widgetType: 'seasonal-vacancy-patterns',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'move-out-risk-heatmap',
      name: 'Move-out Risk Heatmap',
      description: 'Visual heatmap showing move-out risk across properties',
      category: 'predictive-analytics',
      widgetType: 'move-out-risk-heatmap',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'tenant-renewal-trends',
      name: 'Tenant Renewal Trends',
      description: 'Historical and predicted tenant renewal patterns',
      category: 'predictive-analytics',
      widgetType: 'tenant-renewal-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },

    // Advanced Financial Forecasting Charts
    {
      id: 'cash-flow-sensitivity-chart',
      name: 'Cash Flow Sensitivity Analysis',
      description: 'How changes in key variables affect cash flow',
      category: 'predictive-analytics',
      widgetType: 'cash-flow-sensitivity-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'market-cycle-position',
      name: 'Market Cycle Position',
      description: 'Where we are in the real estate cycle',
      category: 'predictive-analytics',
      widgetType: 'market-cycle-position',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'stress-test-scenarios',
      name: 'Stress Test Scenarios',
      description: 'How portfolio performs under various economic scenarios',
      category: 'predictive-analytics',
      widgetType: 'stress-test-scenarios',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'portfolio-diversification-chart',
      name: 'Portfolio Diversification Analysis',
      description: 'Risk distribution across property types/locations',
      category: 'predictive-analytics',
      widgetType: 'portfolio-diversification-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },

    // Advanced Market Intelligence Charts
    {
      id: 'competitor-analysis-chart',
      name: 'Competitor Analysis Dashboard',
      description: 'Track competitor pricing and occupancy',
      category: 'predictive-analytics',
      widgetType: 'competitor-analysis-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'price-elasticity-chart',
      name: 'Price Elasticity Analysis',
      description: 'How rent changes affect occupancy rates',
      category: 'predictive-analytics',
      widgetType: 'price-elasticity-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'economic-impact-chart',
      name: 'Economic Impact Predictor',
      description: 'How economic changes affect local rental markets',
      category: 'predictive-analytics',
      widgetType: 'economic-impact-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },

    // Advanced Maintenance & Operations Charts
    {
      id: 'predictive-equipment-failure',
      name: 'Predictive Equipment Failure',
      description: 'When HVAC, appliances, systems will fail',
      category: 'predictive-analytics',
      widgetType: 'predictive-equipment-failure',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'maintenance-roi-chart',
      name: 'Maintenance ROI Calculator',
      description: 'Which maintenance provides best return',
      category: 'predictive-analytics',
      widgetType: 'maintenance-roi-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'energy-efficiency-chart',
      name: 'Energy Efficiency Optimizer',
      description: 'AI recommendations for energy savings',
      category: 'predictive-analytics',
      widgetType: 'energy-efficiency-chart',
      componentType: 'chart',
      group: 'charts-trends'
    },

    // ========== ANALYSIS TOOLS - Advanced Analytics ==========
    {
      id: 'property-risk-assessment',
      name: 'Property Risk Assessment',
      description: 'Comprehensive risk analysis with contributing factors',
      category: 'predictive-analytics',
      widgetType: 'property-risk-assessment',
      componentType: 'panel',
      isCore: true,
      group: 'analysis-tools'
    },
    {
      id: 'financial-health-analysis',
      name: 'Financial Health Analysis',
      description: 'Deep dive into portfolio financial performance',
      category: 'predictive-analytics',
      widgetType: 'financial-health-analysis',
      componentType: 'panel',
      isCore: true,
      group: 'analysis-tools'
    },
    {
      id: 'competitive-analysis-panel',
      name: 'Competitive Analysis',
      description: 'Market positioning vs competitors',
      category: 'predictive-analytics',
      widgetType: 'competitive-analysis-panel',
      componentType: 'panel',
      isCore: true,
      group: 'analysis-tools'
    },
    {
      id: 'maintenance-optimization',
      name: 'Maintenance Optimization',
      description: 'Optimize maintenance schedules and costs',
      category: 'predictive-analytics',
      widgetType: 'maintenance-optimization',
      componentType: 'panel',
      isCore: true,
      group: 'analysis-tools'
    },

    // Advanced Vacancy & Tenant Analytics Tools
    {
      id: 'optimal-lease-term-analysis',
      name: 'Optimal Lease Term Analysis',
      description: 'Recommend ideal lease lengths based on market conditions',
      category: 'predictive-analytics',
      widgetType: 'optimal-lease-term-analysis',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'lease-renewal-strategy',
      name: 'Lease Renewal Strategy',
      description: 'AI recommendations for renewal negotiations',
      category: 'predictive-analytics',
      widgetType: 'lease-renewal-strategy',
      componentType: 'panel',
      group: 'analysis-tools'
    },

    // Advanced Financial Forecasting Tools
    {
      id: 'optimal-capital-allocation',
      name: 'Optimal Capital Allocation',
      description: 'Where to invest next dollar for maximum return',
      category: 'predictive-analytics',
      widgetType: 'optimal-capital-allocation',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'tax-optimization-strategies',
      name: 'Tax Optimization Strategies',
      description: 'AI recommendations for tax-efficient strategies',
      category: 'predictive-analytics',
      widgetType: 'tax-optimization-strategies',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'refinancing-opportunity-tracker',
      name: 'Refinancing Opportunity Tracker',
      description: 'When to refinance based on market conditions',
      category: 'predictive-analytics',
      widgetType: 'refinancing-opportunity-tracker',
      componentType: 'panel',
      group: 'analysis-tools'
    },

    // Advanced Market Intelligence Tools
    {
      id: 'market-timing-advisor',
      name: 'Market Timing Advisor',
      description: 'Best times to buy/sell/raise rents',
      category: 'predictive-analytics',
      widgetType: 'market-timing-advisor',
      componentType: 'panel',
      group: 'analysis-tools'
    },

    // Advanced Maintenance & Operations Tools
    {
      id: 'vendor-performance-optimizer',
      name: 'Vendor Performance Optimizer',
      description: 'Best vendors for each type of work',
      category: 'predictive-analytics',
      widgetType: 'vendor-performance-optimizer',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'preventive-vs-reactive-analysis',
      name: 'Preventive vs Reactive Cost Analysis',
      description: 'Cost savings from preventive maintenance',
      category: 'predictive-analytics',
      widgetType: 'preventive-vs-reactive-analysis',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'property-condition-scoring',
      name: 'Property Condition Scoring',
      description: 'Overall condition assessment with improvement priorities',
      category: 'predictive-analytics',
      widgetType: 'property-condition-scoring',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'capital-expenditure-planner',
      name: 'Capital Expenditure Planner',
      description: 'When to replace vs repair major systems',
      category: 'predictive-analytics',
      widgetType: 'capital-expenditure-planner',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'emergency-response-predictor',
      name: 'Emergency Response Predictor',
      description: 'Predict likelihood of emergency maintenance calls',
      category: 'predictive-analytics',
      widgetType: 'emergency-response-predictor',
      componentType: 'panel',
      group: 'analysis-tools'
    },

    // Advanced Risk Management Tools
    {
      id: 'insurance-optimization',
      name: 'Insurance Optimization',
      description: 'Recommend optimal insurance coverage levels',
      category: 'predictive-analytics',
      widgetType: 'insurance-optimization',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'regulatory-change-impact',
      name: 'Regulatory Change Impact',
      description: 'How new laws/regulations affect operations',
      category: 'predictive-analytics',
      widgetType: 'regulatory-change-impact',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'portfolio-concentration-risk',
      name: 'Portfolio Concentration Risk',
      description: 'Identify over-concentration in markets/property types',
      category: 'predictive-analytics',
      widgetType: 'portfolio-concentration-risk',
      componentType: 'panel',
      group: 'analysis-tools'
    },

    // ========== COMPARATIVE ANALYSIS - Benchmarking ==========
    {
      id: 'peer-portfolio-comparison',
      name: 'Peer Portfolio Comparison',
      description: 'Compare against similar portfolios in market',
      category: 'predictive-analytics',
      widgetType: 'peer-portfolio-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'best-practice-identifier',
      name: 'Best Practice Identifier',
      description: 'What top-performing portfolios do differently',
      category: 'predictive-analytics',
      widgetType: 'best-practice-identifier',
      componentType: 'panel',
      group: 'comparative-analysis'
    },
    {
      id: 'performance-attribution-analysis',
      name: 'Performance Attribution Analysis',
      description: 'What drives outperformance',
      category: 'predictive-analytics',
      widgetType: 'performance-attribution-analysis',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'market-share-analysis',
      name: 'Market Share Analysis',
      description: 'Your share of local rental market',
      category: 'predictive-analytics',
      widgetType: 'market-share-analysis',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'efficiency-benchmarking',
      name: 'Efficiency Benchmarking',
      description: 'Operations efficiency vs competitors',
      category: 'predictive-analytics',
      widgetType: 'efficiency-benchmarking',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'innovation-opportunity-tracker',
      name: 'Innovation Opportunity Tracker',
      description: 'New technologies/strategies to consider',
      category: 'predictive-analytics',
      widgetType: 'innovation-opportunity-tracker',
      componentType: 'panel',
      group: 'comparative-analysis'
    }
  ],

  assets: [
    // Core Metrics
    {
      id: 'total-portfolio-value',
      name: 'Market Value',
      description: 'Current market value of all assets in portfolio',
      category: 'assets',
      widgetType: 'total-portfolio-value',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'portfolio-return',
      name: 'Annual Income',
      description: 'Total annual income from all assets',
      category: 'assets',
      widgetType: 'portfolio-return',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'asset-count',
      name: 'Total Assets',
      description: 'Total number of assets in portfolio',
      category: 'assets',
      widgetType: 'asset-count',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'portfolio-change-24h',
      name: 'Cost Basis',
      description: 'Total cost basis of all assets in portfolio',
      category: 'assets',
      widgetType: 'portfolio-change-24h',
      componentType: 'metric',
      isCore: true,
      group: 'core-metrics'
    },
    {
      id: 'total-gain-loss',
      name: 'Total Gain/Loss',
      description: 'Total unrealized gain or loss across all assets',
      category: 'assets',
      widgetType: 'total-gain-loss',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'diversification-score',
      name: 'Diversification Score',
      description: 'Portfolio diversification rating (0-100)',
      category: 'assets',
      widgetType: 'diversification-score',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'best-performer',
      name: 'Best Performer',
      description: 'Top performing asset in portfolio',
      category: 'assets',
      widgetType: 'best-performer',
      componentType: 'metric',
      group: 'core-metrics'
    },
    {
      id: 'worst-performer',
      name: 'Worst Performer',
      description: 'Lowest performing asset in portfolio',
      category: 'assets',
      widgetType: 'worst-performer',
      componentType: 'metric',
      group: 'core-metrics'
    },

    // Charts & Trends
    {
      id: 'asset-allocation-chart',
      name: 'Asset Allocation',
      description: 'Pie chart showing portfolio allocation by asset type',
      category: 'assets',
      widgetType: 'asset-allocation-chart',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'portfolio-performance-timeline',
      name: 'Portfolio Performance Over Time',
      description: 'Line chart showing portfolio value changes over time',
      category: 'assets',
      widgetType: 'portfolio-performance-timeline',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'asset-price-trends',
      name: 'Asset Price Trends',
      description: 'Multi-line chart comparing price movements of assets',
      category: 'assets',
      widgetType: 'asset-price-trends',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'top-movers-chart',
      name: 'Top Movers',
      description: 'Bar chart of biggest gainers and losers',
      category: 'assets',
      widgetType: 'top-movers-chart',
      componentType: 'chart',
      isCore: true,
      group: 'charts-trends'
    },
    {
      id: 'asset-class-distribution',
      name: 'Asset Class Distribution',
      description: 'Distribution across stocks, crypto, bonds, etc.',
      category: 'assets',
      widgetType: 'asset-class-distribution',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'sector-allocation',
      name: 'Sector Allocation',
      description: 'Portfolio allocation by market sector',
      category: 'assets',
      widgetType: 'sector-allocation',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'geographic-distribution',
      name: 'Geographic Distribution',
      description: 'Asset distribution by geographic region',
      category: 'assets',
      widgetType: 'geographic-distribution',
      componentType: 'chart',
      group: 'charts-trends'
    },
    {
      id: 'historical-performance-comparison',
      name: 'Historical Performance Comparison',
      description: 'Compare performance across different time periods',
      category: 'assets',
      widgetType: 'historical-performance-comparison',
      componentType: 'chart',
      group: 'charts-trends'
    },

    // Analysis Tools
    {
      id: 'correlation-matrix',
      name: 'Correlation Matrix',
      description: 'See which assets move together or oppositely',
      category: 'assets',
      widgetType: 'correlation-matrix',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'risk-return-scatter',
      name: 'Risk-Return Scatter Plot',
      description: 'Visualize risk vs return for each asset',
      category: 'assets',
      widgetType: 'risk-return-scatter',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    {
      id: 'volatility-analysis',
      name: 'Volatility Analysis',
      description: 'Track and compare asset volatility metrics',
      category: 'assets',
      widgetType: 'volatility-analysis',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'drawdown-analysis',
      name: 'Drawdown Analysis',
      description: 'Analyze maximum drawdown periods and recovery',
      category: 'assets',
      widgetType: 'drawdown-analysis',
      componentType: 'chart',
      group: 'analysis-tools'
    },
    {
      id: 'sharpe-ratio-calculator',
      name: 'Sharpe Ratio Calculator',
      description: 'Risk-adjusted return calculations for each asset',
      category: 'assets',
      widgetType: 'sharpe-ratio-calculator',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'portfolio-rebalancing',
      name: 'Rebalancing Suggestions',
      description: 'AI recommendations for portfolio rebalancing',
      category: 'assets',
      widgetType: 'portfolio-rebalancing',
      componentType: 'panel',
      group: 'analysis-tools'
    },
    {
      id: 'performance-attribution',
      name: 'Performance Attribution',
      description: 'Breakdown of what drove portfolio performance',
      category: 'assets',
      widgetType: 'performance-attribution',
      componentType: 'panel',
      group: 'analysis-tools'
    },

    // Market Intelligence
    {
      id: 'market-sentiment',
      name: 'Market Sentiment Indicator',
      description: 'Real-time market sentiment and fear/greed index',
      category: 'assets',
      widgetType: 'market-sentiment',
      componentType: 'metric',
      group: 'comparative-analysis'
    },
    {
      id: 'volume-analysis',
      name: 'Volume Analysis',
      description: 'Trading volume trends and liquidity metrics',
      category: 'assets',
      widgetType: 'volume-analysis',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'price-alerts-summary',
      name: 'Price Alerts Summary',
      description: 'Overview of triggered and pending price alerts',
      category: 'assets',
      widgetType: 'price-alerts-summary',
      componentType: 'panel',
      group: 'comparative-analysis'
    },
    {
      id: 'market-news-feed',
      name: 'Market News Feed',
      description: 'Latest market news affecting your assets',
      category: 'assets',
      widgetType: 'market-news-feed',
      componentType: 'panel',
      group: 'comparative-analysis'
    },
    {
      id: 'economic-calendar',
      name: 'Economic Calendar Impact',
      description: 'Upcoming economic events and potential impact',
      category: 'assets',
      widgetType: 'economic-calendar',
      componentType: 'panel',
      group: 'comparative-analysis'
    },
    {
      id: 'peer-portfolio-comparison',
      name: 'Peer Portfolio Comparison',
      description: 'Compare your portfolio with similar investors',
      category: 'assets',
      widgetType: 'peer-portfolio-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    },
    {
      id: 'benchmark-comparison',
      name: 'Benchmark Comparison',
      description: 'Performance vs S&P 500, Bitcoin, and other benchmarks',
      category: 'assets',
      widgetType: 'benchmark-comparison',
      componentType: 'chart',
      group: 'comparative-analysis'
    }
  ]
};

// Group widgets by category for the selection dialog
export const getWidgetGroups = (category: MockDataSection): WidgetGroup[] => {
  const categoryWidgets = WIDGET_CATALOG[category] || [];
  
  const groups: WidgetGroup[] = [
    {
      id: 'core-metrics',
      name: 'Core Metrics',
      description: 'Essential performance indicators and key metrics',
      widgets: categoryWidgets.filter(w => w.group === 'core-metrics')
    },
    {
      id: 'charts-trends',
      name: 'Charts & Trends',
      description: 'Visual charts and trend analysis',
      widgets: categoryWidgets.filter(w => w.group === 'charts-trends')
    },
    {
      id: 'analysis-tools',
      name: 'Analysis Tools',
      description: 'Advanced analysis and detailed breakdowns',
      widgets: categoryWidgets.filter(w => w.group === 'analysis-tools')
    },
    {
      id: 'comparative-analysis',
      name: 'Comparative Analysis',
      description: 'Compare performance across properties and benchmarks',
      widgets: categoryWidgets.filter(w => w.group === 'comparative-analysis')
    }
  ];

  return groups.filter(group => group.widgets.length > 0);
};

// Get all widgets for a category
export const getWidgetsForCategory = (category: MockDataSection): WidgetDefinition[] => {
  return WIDGET_CATALOG[category] || [];
};

// Get core widgets (default visible widgets) for a category
export const getCoreWidgets = (category: MockDataSection): string[] => {
  return (WIDGET_CATALOG[category] || [])
    .filter(widget => widget.isCore)
    .map(widget => widget.id);
};

// Get widget definition by ID
export const getWidgetDefinition = (widgetId: string, category: MockDataSection): WidgetDefinition | undefined => {
  return (WIDGET_CATALOG[category] || []).find(widget => widget.id === widgetId);
};