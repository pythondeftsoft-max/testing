export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  category: 'total-portfolio' | 'ai-forecast-health' | 'health-metrics' | 'gauge-charts' | 'quick-stats' | 'properties';
  icon: string;
  component: string;
  defaultProps?: Record<string, any>;
  assetData?: any; // For individual asset widgets
  customizable: {
    name: boolean;
    description: boolean;
    size?: boolean;
  };
}

export const WIDGET_REGISTRY: WidgetConfig[] = [
  // Total Portfolio - Unified Metrics
  {
    id: 'total-net-worth',
    name: 'Total Net Worth',
    description: 'Combined value of all properties and financial assets',
    category: 'total-portfolio',
    icon: 'Home',
    component: 'TotalNetWorthCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-cash-flow',
    name: 'Total Monthly Cash Flow',
    description: 'Combined income and expenses from all holdings',
    category: 'total-portfolio',
    icon: 'DollarSign',
    component: 'TotalCashFlowCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'overall-roi',
    name: 'Overall Portfolio ROI',
    description: 'Weighted average return across all investments',
    category: 'total-portfolio',
    icon: 'TrendingUp',
    component: 'OverallROICard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'unified-asset-allocation',
    name: 'Asset Allocation',
    description: 'Distribution of wealth across all asset classes',
    category: 'total-portfolio',
    icon: 'PieChart',
    component: 'UnifiedAssetAllocationChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'income-sources-chart',
    name: 'Income Sources Breakdown',
    description: 'Visual breakdown of income by source',
    category: 'total-portfolio',
    icon: 'PieChart',
    component: 'IncomeSourcesChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'expense-categories-chart',
    name: 'Expense Categories',
    description: 'Breakdown of expenses by category',
    category: 'total-portfolio',
    icon: 'BarChart3',
    component: 'ExpenseCategoriesChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'properties-vs-assets-chart',
    name: 'Properties vs Assets',
    description: 'Wealth distribution comparison',
    category: 'total-portfolio',
    icon: 'BarChart3',
    component: 'PropertiesVsAssetsChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'roi-comparison-chart',
    name: 'ROI Comparison',
    description: 'Compare returns across properties and assets',
    category: 'total-portfolio',
    icon: 'TrendingUp',
    component: 'ROIComparisonChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'annual-projected-income',
    name: 'Annual Projected Income',
    description: 'Total projected annual income',
    category: 'total-portfolio',
    icon: 'CalendarDays',
    component: 'AnnualProjectedIncomeCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'portfolio-diversity-score',
    name: 'Portfolio Diversity Score',
    description: 'Asset diversification rating',
    category: 'total-portfolio',
    icon: 'Target',
    component: 'PortfolioDiversityScoreCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-holdings-count',
    name: 'Total Holdings Count',
    description: 'Total number of properties and assets',
    category: 'total-portfolio',
    icon: 'Building2',
    component: 'TotalHoldingsCountCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-monthly-income',
    name: 'Total Monthly Income',
    description: 'Combined income from all sources',
    category: 'total-portfolio',
    icon: 'DollarSign',
    component: 'TotalMonthlyIncomeCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-monthly-expenses',
    name: 'Total Monthly Expenses',
    description: 'Combined expenses from all sources',
    category: 'total-portfolio',
    icon: 'Receipt',
    component: 'TotalMonthlyExpensesCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-property-value',
    name: 'Total Property Value',
    description: 'Total real estate portfolio value',
    category: 'total-portfolio',
    icon: 'Building',
    component: 'TotalPropertyValueCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-asset-value',
    name: 'Total Asset Value',
    description: 'Total financial assets value',
    category: 'total-portfolio',
    icon: 'Coins',
    component: 'TotalAssetValueCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'net-monthly-cash-flow',
    name: 'Net Monthly Cash Flow',
    description: 'Income minus expenses',
    category: 'total-portfolio',
    icon: 'TrendingUp',
    component: 'NetMonthlyCashFlowCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'property-roi',
    name: 'Property ROI',
    description: 'Return on property investments',
    category: 'total-portfolio',
    icon: 'Home',
    component: 'PropertyROICard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'asset-roi',
    name: 'Asset ROI',
    description: 'Return on financial assets',
    category: 'total-portfolio',
    icon: 'TrendingUp',
    component: 'AssetROICard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'income-expense-ratio',
    name: 'Income/Expense Ratio',
    description: 'Income to expense ratio',
    category: 'total-portfolio',
    icon: 'Scale',
    component: 'IncomeExpenseRatioCard',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },

  // AI Forecast and Health - Core Metrics
  {
    id: 'vacancy-risk-score',
    name: 'Vacancy Risk Score',
    description: 'AI-powered risk assessment for potential vacancies',
    category: 'ai-forecast-health',
    icon: 'AlertCircle',
    component: 'VacancyRiskScore',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'predicted-noi',
    name: 'Predicted NOI',
    description: 'AI forecast of Net Operating Income for next 12 months',
    category: 'ai-forecast-health',
    icon: 'TrendingUp',
    component: 'PredictedNOI',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'market-rent-gap',
    name: 'Market Rent Gap',
    description: 'Gap between current rent and optimal market rate',
    category: 'ai-forecast-health',
    icon: 'DollarSign',
    component: 'MarketRentGap',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'predictive-maintenance-cost',
    name: 'Predictive Maintenance Cost',
    description: 'AI forecast of upcoming maintenance expenses',
    category: 'ai-forecast-health',
    icon: 'Wrench',
    component: 'PredictiveMaintenanceCost',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-churn-prediction',
    name: 'Tenant Churn Prediction',
    description: 'AI model predicting which tenants are likely to leave',
    category: 'ai-forecast-health',
    icon: 'Users',
    component: 'TenantChurnPrediction',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-quality-score',
    name: 'Tenant Quality Score',
    description: 'Score tenants based on payment history and property care',
    category: 'ai-forecast-health',
    icon: 'Target',
    component: 'TenantQualityScore',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-satisfaction-predictor',
    name: 'Tenant Satisfaction Predictor',
    description: 'Predict tenant satisfaction based on various factors',
    category: 'ai-forecast-health',
    icon: 'Users',
    component: 'TenantSatisfactionPredictor',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vacancy-cost-impact',
    name: 'Vacancy Cost Impact',
    description: 'Calculate total cost impact of each vacancy',
    category: 'ai-forecast-health',
    icon: 'DollarSign',
    component: 'VacancyCostImpact',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'portfolio-roi-projection',
    name: 'Portfolio ROI Projection',
    description: '5-year ROI predictions with scenario analysis',
    category: 'ai-forecast-health',
    icon: 'TrendingUp',
    component: 'PortfolioROIProjection',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'investment-risk-score',
    name: 'Investment Risk Score',
    description: 'Comprehensive risk assessment for each property',
    category: 'ai-forecast-health',
    icon: 'Shield',
    component: 'InvestmentRiskScore',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'property-appreciation-forecast',
    name: 'Property Appreciation Forecast',
    description: 'AI-powered property value predictions',
    category: 'ai-forecast-health',
    icon: 'TrendingUp',
    component: 'PropertyAppreciationForecast',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'refinancing-opportunity-score',
    name: 'Refinancing Opportunity Score',
    description: 'Score for optimal refinancing timing',
    category: 'ai-forecast-health',
    icon: 'Calculator',
    component: 'RefinancingOpportunityScore',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'dynamic-pricing-optimizer',
    name: 'Dynamic Pricing Optimizer',
    description: 'Real-time rent optimization based on demand',
    category: 'ai-forecast-health',
    icon: 'Zap',
    component: 'DynamicPricingOptimizer',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'market-saturation-indicator',
    name: 'Market Saturation Indicator',
    description: 'Identify over/under-supplied markets',
    category: 'ai-forecast-health',
    icon: 'BarChart3',
    component: 'MarketSaturationIndicator',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'neighborhood-growth-score',
    name: 'Neighborhood Growth Score',
    description: 'Predict area development and gentrification',
    category: 'ai-forecast-health',
    icon: 'Map',
    component: 'NeighborhoodGrowthScore',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'rental-demand-forecast',
    name: 'Rental Demand Forecast',
    description: 'Predict rental demand by property type/location',
    category: 'ai-forecast-health',
    icon: 'TrendingUp',
    component: 'RentalDemandForecast',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-default-probability',
    name: 'Tenant Default Probability',
    description: 'Predict which tenants may default on rent',
    category: 'ai-forecast-health',
    icon: 'AlertCircle',
    component: 'TenantDefaultProbability',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'legal-risk-assessment',
    name: 'Legal Risk Assessment',
    description: 'Identify potential legal/compliance issues',
    category: 'ai-forecast-health',
    icon: 'Shield',
    component: 'LegalRiskAssessment',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'natural-disaster-risk',
    name: 'Natural Disaster Risk',
    description: 'Climate change impact on properties',
    category: 'ai-forecast-health',
    icon: 'AlertCircle',
    component: 'NaturalDisasterRisk',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // AI Forecast and Health - Charts & Trends
  {
    id: 'vacancy-trend-analysis',
    name: 'Vacancy Trend Analysis',
    description: 'Visual analysis of vacancy patterns and seasonality',
    category: 'ai-forecast-health',
    icon: 'LineChart',
    component: 'VacancyTrendAnalysis',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'revenue-forecast-chart',
    name: 'Revenue Forecast Chart',
    description: '12-month revenue predictions with confidence intervals',
    category: 'ai-forecast-health',
    icon: 'LineChart',
    component: 'RevenueForecastChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'market-intelligence-chart',
    name: 'Market Intelligence Chart',
    description: 'Competitive market positioning and trends',
    category: 'ai-forecast-health',
    icon: 'BarChart3',
    component: 'MarketIntelligenceChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-timeline-forecast',
    name: 'Maintenance Timeline Forecast',
    description: 'Timeline of predicted maintenance needs',
    category: 'ai-forecast-health',
    icon: 'Calendar',
    component: 'MaintenanceTimelineForecast',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'seasonal-vacancy-patterns',
    name: 'Seasonal Vacancy Patterns',
    description: 'Identify when properties are most likely to become vacant',
    category: 'ai-forecast-health',
    icon: 'Calendar',
    component: 'SeasonalVacancyPatterns',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'move-out-risk-heatmap',
    name: 'Move-out Risk Heatmap',
    description: 'Visual heatmap showing move-out risk across properties',
    category: 'ai-forecast-health',
    icon: 'Map',
    component: 'MoveOutRiskHeatmap',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-renewal-trends',
    name: 'Tenant Renewal Trends',
    description: 'Historical and predicted tenant renewal patterns',
    category: 'ai-forecast-health',
    icon: 'TrendingUp',
    component: 'TenantRenewalTrends',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'cash-flow-sensitivity-chart',
    name: 'Cash Flow Sensitivity Analysis',
    description: 'How changes in key variables affect cash flow',
    category: 'ai-forecast-health',
    icon: 'BarChart3',
    component: 'CashFlowSensitivityChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'market-cycle-position',
    name: 'Market Cycle Position',
    description: 'Where we are in the real estate cycle',
    category: 'ai-forecast-health',
    icon: 'Activity',
    component: 'MarketCyclePosition',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'stress-test-scenarios',
    name: 'Stress Test Scenarios',
    description: 'How portfolio performs under various economic scenarios',
    category: 'ai-forecast-health',
    icon: 'AlertCircle',
    component: 'StressTestScenarios',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'portfolio-diversification-chart',
    name: 'Portfolio Diversification Analysis',
    description: 'Risk distribution across property types/locations',
    category: 'ai-forecast-health',
    icon: 'PieChart',
    component: 'PortfolioDiversificationChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'competitor-analysis-chart',
    name: 'Competitor Analysis Dashboard',
    description: 'Track competitor pricing and occupancy',
    category: 'ai-forecast-health',
    icon: 'BarChart3',
    component: 'CompetitorAnalysisChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'price-elasticity-chart',
    name: 'Price Elasticity Analysis',
    description: 'How rent changes affect occupancy rates',
    category: 'ai-forecast-health',
    icon: 'LineChart',
    component: 'PriceElasticityChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'economic-impact-chart',
    name: 'Economic Impact Predictor',
    description: 'How economic changes affect local rental markets',
    category: 'ai-forecast-health',
    icon: 'TrendingUp',
    component: 'EconomicImpactChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'predictive-equipment-failure',
    name: 'Predictive Equipment Failure',
    description: 'When HVAC, appliances, systems will fail',
    category: 'ai-forecast-health',
    icon: 'AlertCircle',
    component: 'PredictiveEquipmentFailure',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-roi-chart',
    name: 'Maintenance ROI Calculator',
    description: 'Which maintenance provides best return',
    category: 'ai-forecast-health',
    icon: 'Calculator',
    component: 'MaintenanceROIChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'energy-efficiency-chart',
    name: 'Energy Efficiency Optimizer',
    description: 'AI recommendations for energy savings',
    category: 'ai-forecast-health',
    icon: 'Zap',
    component: 'EnergyEfficiencyChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // AI Forecast and Health - Analysis Tools
  {
    id: 'property-risk-assessment',
    name: 'Property Risk Assessment',
    description: 'Comprehensive risk analysis with contributing factors',
    category: 'ai-forecast-health',
    icon: 'Shield',
    component: 'PropertyRiskAssessment',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'financial-health-analysis',
    name: 'Financial Health Analysis',
    description: 'Deep dive into portfolio financial performance',
    category: 'ai-forecast-health',
    icon: 'Activity',
    component: 'FinancialHealthAnalysis',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'competitive-analysis-panel',
    name: 'Competitive Analysis',
    description: 'Market positioning vs competitors',
    category: 'ai-forecast-health',
    icon: 'Target',
    component: 'CompetitiveAnalysisPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-optimization',
    name: 'Maintenance Optimization',
    description: 'Optimize maintenance schedules and costs',
    category: 'ai-forecast-health',
    icon: 'Wrench',
    component: 'MaintenanceOptimization',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'optimal-lease-term-analysis',
    name: 'Optimal Lease Term Analysis',
    description: 'Recommend ideal lease lengths based on market conditions',
    category: 'ai-forecast-health',
    icon: 'FileText',
    component: 'OptimalLeaseTermAnalysis',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-renewal-strategy',
    name: 'Lease Renewal Strategy',
    description: 'AI recommendations for renewal negotiations',
    category: 'ai-forecast-health',
    icon: 'FileText',
    component: 'LeaseRenewalStrategy',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'optimal-capital-allocation',
    name: 'Optimal Capital Allocation',
    description: 'Where to invest next dollar for maximum return',
    category: 'ai-forecast-health',
    icon: 'DollarSign',
    component: 'OptimalCapitalAllocation',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tax-optimization-strategies',
    name: 'Tax Optimization Strategies',
    description: 'AI recommendations for tax-efficient strategies',
    category: 'ai-forecast-health',
    icon: 'FileText',
    component: 'TaxOptimizationStrategies',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'refinancing-opportunity-tracker',
    name: 'Refinancing Opportunity Tracker',
    description: 'When to refinance based on market conditions',
    category: 'ai-forecast-health',
    icon: 'TrendingUp',
    component: 'RefinancingOpportunityTracker',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'market-timing-advisor',
    name: 'Market Timing Advisor',
    description: 'Best times to buy/sell/raise rents',
    category: 'ai-forecast-health',
    icon: 'Clock',
    component: 'MarketTimingAdvisor',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-performance-optimizer',
    name: 'Vendor Performance Optimizer',
    description: 'Best vendors for each type of work',
    category: 'ai-forecast-health',
    icon: 'Users',
    component: 'VendorPerformanceOptimizer',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'preventive-vs-reactive-analysis',
    name: 'Preventive vs Reactive Cost Analysis',
    description: 'Cost savings from preventive maintenance',
    category: 'ai-forecast-health',
    icon: 'Calculator',
    component: 'PreventiveVsReactiveAnalysis',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'property-condition-scoring',
    name: 'Property Condition Scoring',
    description: 'Overall condition assessment with improvement priorities',
    category: 'ai-forecast-health',
    icon: 'Home',
    component: 'PropertyConditionScoring',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'capital-expenditure-planner',
    name: 'Capital Expenditure Planner',
    description: 'When to replace vs repair major systems',
    category: 'ai-forecast-health',
    icon: 'Calculator',
    component: 'CapitalExpenditurePlanner',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'emergency-response-predictor',
    name: 'Emergency Response Predictor',
    description: 'Predict likelihood of emergency maintenance calls',
    category: 'ai-forecast-health',
    icon: 'AlertCircle',
    component: 'EmergencyResponsePredictor',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'insurance-optimization',
    name: 'Insurance Optimization',
    description: 'Recommend optimal insurance coverage levels',
    category: 'ai-forecast-health',
    icon: 'Shield',
    component: 'InsuranceOptimization',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'regulatory-change-impact',
    name: 'Regulatory Change Impact',
    description: 'How new laws/regulations affect operations',
    category: 'ai-forecast-health',
    icon: 'FileText',
    component: 'RegulatoryChangeImpact',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'portfolio-concentration-risk',
    name: 'Portfolio Concentration Risk',
    description: 'Identify over-concentration in markets/property types',
    category: 'ai-forecast-health',
    icon: 'AlertCircle',
    component: 'PortfolioConcentrationRisk',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // AI Forecast and Health - Comparative Analysis
  {
    id: 'peer-portfolio-comparison',
    name: 'Peer Portfolio Comparison',
    description: 'Compare against similar portfolios in market',
    category: 'ai-forecast-health',
    icon: 'BarChart3',
    component: 'PeerPortfolioComparison',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'best-practice-identifier',
    name: 'Best Practice Identifier',
    description: 'What top-performing portfolios do differently',
    category: 'ai-forecast-health',
    icon: 'Target',
    component: 'BestPracticeIdentifier',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'performance-attribution-analysis',
    name: 'Performance Attribution Analysis',
    description: 'What drives outperformance',
    category: 'ai-forecast-health',
    icon: 'TrendingUp',
    component: 'PerformanceAttributionAnalysis',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'market-share-analysis',
    name: 'Market Share Analysis',
    description: 'Your share of local rental market',
    category: 'ai-forecast-health',
    icon: 'PieChart',
    component: 'MarketShareAnalysis',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'efficiency-benchmarking',
    name: 'Efficiency Benchmarking',
    description: 'Operations efficiency vs competitors',
    category: 'ai-forecast-health',
    icon: 'BarChart3',
    component: 'EfficiencyBenchmarking',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'innovation-opportunity-tracker',
    name: 'Innovation Opportunity Tracker',
    description: 'New technologies/strategies to consider',
    category: 'ai-forecast-health',
    icon: 'Zap',
    component: 'InnovationOpportunityTracker',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  
  // Operational Performance - Charts
  {
    id: 'portfolio-health-gauge',
    name: 'Portfolio Health Score',
    description: 'Overall portfolio health gauge with scoring',
    category: 'gauge-charts',
    icon: 'Gauge',
    component: 'PremiumD3Gauge',
    defaultProps: {
      value: 85,
      maxValue: 100,
      title: 'Portfolio Health',
      color: 'hsl(var(--openkey-blue))'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  
  // Operational Performance - Maintenance Operations Metrics
  {
    id: 'maintenance-response-time',
    name: 'Maintenance Response Time',
    description: 'Average time to respond to maintenance requests',
    category: 'gauge-charts',
    icon: 'Clock',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Response Time',
      formatValue: 'number',
      icon: 'clock',
      subtitle: 'hours avg'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'first-call-resolution-rate',
    name: 'First Call Resolution Rate',
    description: 'Percentage of issues resolved on first contact',
    category: 'gauge-charts',
    icon: 'CheckCircle',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'First Call Resolution',
      formatValue: 'percentage',
      icon: 'check-circle'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'preventive-maintenance-ratio',
    name: 'Preventive Maintenance Ratio',
    description: 'Percentage of maintenance that is preventive vs reactive',
    category: 'gauge-charts',
    icon: 'Wrench',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Preventive Maintenance',
      formatValue: 'percentage',
      icon: 'wrench'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'complaint-resolution-time',
    name: 'Complaint Resolution Time',
    description: 'Average time to resolve tenant complaints',
    category: 'gauge-charts',
    icon: 'Clock',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Complaint Resolution Time',
      formatValue: 'number',
      icon: 'clock',
      subtitle: 'hours avg'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },

  // Operational Performance - Leasing & Tenant Performance Metrics
  {
    id: 'days-to-fill-vacancy',
    name: 'Days to Fill Vacancy',
    description: 'Average days required to fill vacant units',
    category: 'gauge-charts',
    icon: 'Building2',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Days to Fill Vacancy',
      formatValue: 'number',
      icon: 'building-2',
      subtitle: 'average days'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'leasing-velocity',
    name: 'Leasing Velocity',
    description: 'Rate of new lease signings per month',
    category: 'gauge-charts',
    icon: 'TrendingUp',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Leasing Velocity',
      formatValue: 'number',
      icon: 'trending-up',
      subtitle: 'units/month'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'application-to-lease-ratio',
    name: 'Application to Lease Ratio',
    description: 'Percentage of applications that convert to leases',
    category: 'gauge-charts',
    icon: 'Users',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Application to Lease Ratio',
      formatValue: 'percentage',
      icon: 'users'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'tenant-retention-rate',
    name: 'Tenant Retention Rate',
    description: 'Percentage of tenants that renew their leases',
    category: 'gauge-charts',
    icon: 'Users',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Tenant Retention Rate',
      formatValue: 'percentage',
      icon: 'users'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'renewal-rate',
    name: 'Lease Renewal Rate',
    description: 'Rate of successful lease renewals',
    category: 'gauge-charts',
    icon: 'RefreshCw',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Renewal Rate',
      formatValue: 'percentage',
      icon: 'refresh-cw'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'tenant-satisfaction-score',
    name: 'Tenant Satisfaction Score',
    description: 'Overall tenant satisfaction rating',
    category: 'gauge-charts',
    icon: 'Users',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Tenant Satisfaction',
      formatValue: 'number',
      icon: 'users',
      subtitle: 'score (1-100)'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },

  // Operational Performance - Risk Management & Compliance Metrics
  {
    id: 'inspection-compliance-rate',
    name: 'Inspection Compliance Rate',
    description: 'Percentage of properties passing compliance inspections',
    category: 'gauge-charts',
    icon: 'Building2',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Inspection Compliance',
      formatValue: 'percentage',
      icon: 'building-2'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'safety-incident-rate',
    name: 'Safety Incident Rate',
    description: 'Annual rate of safety incidents per property',
    category: 'gauge-charts',
    icon: 'AlertCircle',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Safety Incident Rate',
      formatValue: 'percentage',
      icon: 'alert-circle',
      subtitle: 'annual rate'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'insurance-claim-frequency',
    name: 'Insurance Claim Frequency',
    description: 'Frequency of insurance claims per year',
    category: 'gauge-charts',
    icon: 'AlertCircle',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Insurance Claims',
      formatValue: 'percentage',
      icon: 'alert-circle',
      subtitle: 'annual rate'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'vendor-performance-score-ops',
    name: 'Vendor Performance Score',
    description: 'Overall vendor performance and cost efficiency rating',
    category: 'gauge-charts',
    icon: 'Users',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Vendor Performance Score',
      formatValue: 'number',
      icon: 'users',
      subtitle: 'score (1-100)'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },

  // === LEASING WIDGETS (from widgetCatalog) ===
  // Core Metrics
  {
    id: 'tour-to-lease-ratio',
    name: 'Tour to Lease Ratio',
    description: 'Conversion rate from property tours to signed leases',
    category: 'gauge-charts',
    icon: 'TrendingUp',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 45,
      subtitle: 'conversion rate',
      icon: 'TrendingUp',
      iconColor: 'text-blue-500',
      formatValue: 'percentage'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lead-response-time',
    name: 'Lead Response Time',
    description: 'Average time to respond to leasing inquiries',
    category: 'gauge-charts',
    icon: 'Clock',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 2.5,
      subtitle: 'hours',
      icon: 'Clock',
      iconColor: 'text-green-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'average-lease-term',
    name: 'Average Lease Term',
    description: 'Average length of lease agreements in months',
    category: 'gauge-charts',
    icon: 'Calendar',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 12,
      subtitle: 'months',
      icon: 'Calendar',
      iconColor: 'text-purple-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-concession-rate',
    name: 'Lease Concession Rate',
    description: 'Percentage of leases with concessions or incentives',
    category: 'gauge-charts',
    icon: 'Tag',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 15,
      subtitle: 'with concessions',
      icon: 'Tag',
      iconColor: 'text-orange-500',
      formatValue: 'percentage'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'showing-activity-rate',
    name: 'Showing Activity Rate',
    description: 'Number of property showings per available unit',
    category: 'gauge-charts',
    icon: 'Eye',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 8,
      subtitle: 'per unit',
      icon: 'Eye',
      iconColor: 'text-indigo-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },

  // Leasing Charts & Trends
  {
    id: 'vacancy-trends',
    name: 'Vacancy Trends',
    description: 'Track vacancy rates over time',
    category: 'gauge-charts',
    icon: 'LineChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'renewal-rate-trends',
    name: 'Renewal Rate Trends',
    description: 'Track lease renewal rates over time',
    category: 'gauge-charts',
    icon: 'LineChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'leasing-pipeline',
    name: 'Leasing Pipeline',
    description: 'Funnel visualization of leasing stages from lead to lease',
    category: 'gauge-charts',
    icon: 'Filter',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-expiration-timeline',
    name: 'Lease Expiration Timeline',
    description: 'Timeline of upcoming lease expirations',
    category: 'gauge-charts',
    icon: 'Calendar',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-turnover-trends',
    name: 'Tenant Turnover Trends',
    description: 'Track tenant turnover patterns and seasonality',
    category: 'gauge-charts',
    icon: 'LineChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'application-volume-trends',
    name: 'Application Volume Trends',
    description: 'Track rental application volume over time',
    category: 'gauge-charts',
    icon: 'BarChart3',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'showing-activity-trends',
    name: 'Showing Activity Trends',
    description: 'Monitor property showing activity patterns',
    category: 'gauge-charts',
    icon: 'TrendingUp',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'move-in-move-out-calendar',
    name: 'Move-In/Move-Out Calendar',
    description: 'Calendar view of scheduled move-ins and move-outs',
    category: 'gauge-charts',
    icon: 'Calendar',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Leasing Analysis Tools
  {
    id: 'leasing-performance-scorecard',
    name: 'Leasing Performance Scorecard',
    description: 'Comprehensive leasing team performance metrics',
    category: 'gauge-charts',
    icon: 'ClipboardList',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-screening-analysis',
    name: 'Tenant Screening Analysis',
    description: 'Analysis of tenant screening effectiveness and approval rates',
    category: 'gauge-charts',
    icon: 'UserCheck',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'renewal-optimization-insights',
    name: 'Renewal Optimization Insights',
    description: 'AI-powered insights for improving renewal rates',
    category: 'gauge-charts',
    icon: 'Lightbulb',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-pricing-analyzer',
    name: 'Lease Pricing Analyzer',
    description: 'Analyze lease pricing effectiveness and market positioning',
    category: 'gauge-charts',
    icon: 'DollarSign',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-demographic-analysis',
    name: 'Tenant Demographic Analysis',
    description: 'Analyze tenant demographics and preferences',
    category: 'gauge-charts',
    icon: 'Users',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Leasing Comparative Analysis
  {
    id: 'property-leasing-comparison',
    name: 'Property Leasing Comparison',
    description: 'Compare leasing performance across properties',
    category: 'gauge-charts',
    icon: 'BarChart3',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'market-vacancy-benchmarks',
    name: 'Market Vacancy Benchmarks',
    description: 'Compare your vacancy rates to market benchmarks',
    category: 'gauge-charts',
    icon: 'Target',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'retention-rate-benchmarks',
    name: 'Retention Rate Benchmarks',
    description: 'Compare retention rates to industry standards',
    category: 'gauge-charts',
    icon: 'Award',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-term-comparison',
    name: 'Lease Term Comparison',
    description: 'Compare lease terms across properties and units',
    category: 'gauge-charts',
    icon: 'BarChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'concession-strategy-comparison',
    name: 'Concession Strategy Comparison',
    description: 'Compare effectiveness of different concession strategies',
    category: 'gauge-charts',
    icon: 'GitCompare',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // === MAINTENANCE WIDGETS (from widgetCatalog) ===
  // Core Metrics
  {
    id: 'work-order-response-time',
    name: 'Work Order Response Time',
    description: 'Average time to respond to maintenance requests',
    category: 'gauge-charts',
    icon: 'Clock',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 4,
      subtitle: 'hours avg',
      icon: 'Clock',
      iconColor: 'text-blue-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-cost-per-unit',
    name: 'Maintenance Cost per Unit',
    description: 'Average maintenance costs per property unit',
    category: 'gauge-charts',
    icon: 'DollarSign',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 1250,
      subtitle: 'per unit/year',
      icon: 'DollarSign',
      iconColor: 'text-green-500',
      formatValue: 'currency'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-completion-rate',
    name: 'Completion Rate',
    description: 'Percentage of maintenance requests completed on time',
    category: 'gauge-charts',
    icon: 'CheckCircle',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 92,
      subtitle: 'on-time completion',
      icon: 'CheckCircle',
      iconColor: 'text-green-500',
      formatValue: 'percentage'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'emergency-response-time',
    name: 'Emergency Response Time',
    description: 'Average response time for emergency requests',
    category: 'gauge-charts',
    icon: 'AlertCircle',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 1.5,
      subtitle: 'hours avg',
      icon: 'AlertCircle',
      iconColor: 'text-red-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-satisfaction-score',
    name: 'Maintenance Satisfaction',
    description: 'Tenant satisfaction with maintenance services',
    category: 'gauge-charts',
    icon: 'ThumbsUp',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 87,
      subtitle: 'satisfaction score',
      icon: 'ThumbsUp',
      iconColor: 'text-green-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'work-order-backlog',
    name: 'Work Order Backlog',
    description: 'Number of pending maintenance work orders',
    category: 'gauge-charts',
    icon: 'ListTodo',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 23,
      subtitle: 'pending requests',
      icon: 'ListTodo',
      iconColor: 'text-orange-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'average-repair-cost',
    name: 'Average Repair Cost',
    description: 'Average cost per maintenance repair',
    category: 'gauge-charts',
    icon: 'DollarSign',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 385,
      subtitle: 'per repair',
      icon: 'DollarSign',
      iconColor: 'text-blue-500',
      formatValue: 'currency'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-efficiency-ratio',
    name: 'Efficiency Ratio',
    description: 'Ratio of completed vs scheduled maintenance',
    category: 'gauge-charts',
    icon: 'Gauge',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 94,
      subtitle: 'efficiency',
      icon: 'Gauge',
      iconColor: 'text-green-500',
      formatValue: 'percentage'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'repeat-request-rate',
    name: 'Repeat Request Rate',
    description: 'Percentage of recurring maintenance issues',
    category: 'gauge-charts',
    icon: 'RefreshCw',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 8,
      subtitle: 'repeat requests',
      icon: 'RefreshCw',
      iconColor: 'text-orange-500',
      formatValue: 'percentage'
    },
    customizable: { name: true, description: true, size: true }
  },

  // Maintenance Charts & Trends
  {
    id: 'maintenance-backlog-trends',
    name: 'Maintenance Backlog',
    description: 'Track maintenance request backlog over time',
    category: 'gauge-charts',
    icon: 'LineChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'emergency-vs-routine',
    name: 'Emergency vs Routine',
    description: 'Breakdown of emergency vs routine maintenance',
    category: 'gauge-charts',
    icon: 'PieChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-request-trends',
    name: 'Request Trends',
    description: 'Track maintenance request volume over time',
    category: 'gauge-charts',
    icon: 'TrendingUp',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'category-breakdown-chart',
    name: 'Category Breakdown',
    description: 'Breakdown of maintenance by category type',
    category: 'gauge-charts',
    icon: 'PieChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'seasonal-maintenance-patterns',
    name: 'Seasonal Patterns',
    description: 'Identify seasonal maintenance trends',
    category: 'gauge-charts',
    icon: 'Calendar',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'response-time-trends',
    name: 'Response Time Trends',
    description: 'Track response time improvements over time',
    category: 'gauge-charts',
    icon: 'LineChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'cost-vs-budget-analysis',
    name: 'Cost vs Budget',
    description: 'Compare actual maintenance costs to budget',
    category: 'gauge-charts',
    icon: 'BarChart3',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'completion-rate-trends',
    name: 'Completion Rate Trends',
    description: 'Track on-time completion rate over time',
    category: 'gauge-charts',
    icon: 'LineChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Maintenance Analysis Tools
  {
    id: 'maintenance-cost-analysis',
    name: 'Cost Analysis',
    description: 'Detailed breakdown of maintenance costs',
    category: 'gauge-charts',
    icon: 'PieChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'property-maintenance-comparison',
    name: 'Property Comparison',
    description: 'Compare maintenance metrics across properties',
    category: 'gauge-charts',
    icon: 'BarChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'predictive-maintenance-insights',
    name: 'Predictive Insights',
    description: 'AI-powered predictive maintenance recommendations',
    category: 'gauge-charts',
    icon: 'Sparkles',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-priority-matrix',
    name: 'Priority Matrix',
    description: 'Prioritize maintenance requests by urgency and impact',
    category: 'gauge-charts',
    icon: 'Grid3x3',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Maintenance Comparative Analysis
  {
    id: 'maintenance-benchmarking',
    name: 'Industry Benchmarking',
    description: 'Compare maintenance metrics against industry standards',
    category: 'gauge-charts',
    icon: 'Target',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'year-over-year-maintenance',
    name: 'Year-over-Year Analysis',
    description: 'Compare maintenance performance year-over-year',
    category: 'gauge-charts',
    icon: 'Calendar',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // === VENDOR OPERATIONS WIDGETS (from widgetCatalog) ===
  // Core Metrics
  {
    id: 'vendor-performance-score',
    name: 'Vendor Performance Score',
    description: 'Overall vendor performance rating',
    category: 'gauge-charts',
    icon: 'Award',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 88,
      subtitle: 'performance score',
      icon: 'Award',
      iconColor: 'text-purple-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'service-quality-rating',
    name: 'Service Quality Rating',
    description: 'Quality rating of vendor services',
    category: 'gauge-charts',
    icon: 'Star',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 4.5,
      subtitle: 'out of 5',
      icon: 'Star',
      iconColor: 'text-yellow-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-cost-efficiency',
    name: 'Cost Efficiency',
    description: 'Cost effectiveness of vendor services',
    category: 'gauge-charts',
    icon: 'TrendingDown',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 91,
      subtitle: 'efficiency score',
      icon: 'TrendingDown',
      iconColor: 'text-green-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'active-vendors-count',
    name: 'Active Vendors',
    description: 'Number of currently active vendors',
    category: 'gauge-charts',
    icon: 'Users',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 24,
      subtitle: 'active vendors',
      icon: 'Users',
      iconColor: 'text-blue-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-response-time',
    name: 'Vendor Response Time',
    description: 'Average time for vendors to respond to requests',
    category: 'gauge-charts',
    icon: 'Clock',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 3.2,
      subtitle: 'hours avg',
      icon: 'Clock',
      iconColor: 'text-orange-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-reliability-score',
    name: 'Reliability Score',
    description: 'Vendor reliability based on completion rates',
    category: 'gauge-charts',
    icon: 'Shield',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 95,
      subtitle: 'reliability',
      icon: 'Shield',
      iconColor: 'text-green-500',
      formatValue: 'percentage'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'average-job-completion-time',
    name: 'Avg Job Completion',
    description: 'Average time for vendors to complete jobs',
    category: 'gauge-charts',
    icon: 'Clock',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 5.8,
      subtitle: 'days avg',
      icon: 'Clock',
      iconColor: 'text-blue-500',
      formatValue: 'number'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-cost-per-job',
    name: 'Cost Per Job',
    description: 'Average vendor cost per completed job',
    category: 'gauge-charts',
    icon: 'DollarSign',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 425,
      subtitle: 'per job',
      icon: 'DollarSign',
      iconColor: 'text-green-500',
      formatValue: 'currency'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-compliance-rate',
    name: 'Compliance Rate',
    description: 'Percentage of vendors meeting compliance standards',
    category: 'gauge-charts',
    icon: 'CheckCircle',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 98,
      subtitle: 'compliant',
      icon: 'CheckCircle',
      iconColor: 'text-green-500',
      formatValue: 'percentage'
    },
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'contract-renewal-rate',
    name: 'Contract Renewal Rate',
    description: 'Percentage of vendor contracts renewed',
    category: 'gauge-charts',
    icon: 'RefreshCw',
    component: 'ModernMetricCard',
    defaultProps: {
      value: 85,
      subtitle: 'renewed',
      icon: 'RefreshCw',
      iconColor: 'text-purple-500',
      formatValue: 'percentage'
    },
    customizable: { name: true, description: true, size: true }
  },

  // Vendor Charts & Trends
  {
    id: 'service-request-trends',
    name: 'Service Request Trends',
    description: 'Track vendor service requests over time',
    category: 'gauge-charts',
    icon: 'LineChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-cost-trends',
    name: 'Cost Trends',
    description: 'Track vendor costs and spending patterns over time',
    category: 'gauge-charts',
    icon: 'TrendingUp',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-utilization-chart',
    name: 'Vendor Utilization',
    description: 'Track which vendors are most frequently used',
    category: 'gauge-charts',
    icon: 'BarChart3',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'service-category-breakdown',
    name: 'Service Category Breakdown',
    description: 'Breakdown of vendor services by category',
    category: 'gauge-charts',
    icon: 'PieChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'quality-trends-analysis',
    name: 'Quality Trends',
    description: 'Track vendor service quality over time',
    category: 'gauge-charts',
    icon: 'LineChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Vendor Analysis Tools
  {
    id: 'vendor-scorecards',
    name: 'Vendor Scorecards',
    description: 'Comprehensive performance scorecards for each vendor',
    category: 'gauge-charts',
    icon: 'ClipboardList',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-contract-management',
    name: 'Contract Management',
    description: 'Track and manage vendor contracts and renewals',
    category: 'gauge-charts',
    icon: 'FileText',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-optimization-insights',
    name: 'Optimization Insights',
    description: 'AI-powered suggestions for vendor optimization',
    category: 'gauge-charts',
    icon: 'Lightbulb',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Vendor Comparative Analysis
  {
    id: 'vendor-performance-comparison',
    name: 'Vendor Performance Comparison',
    description: 'Compare performance across different vendors',
    category: 'gauge-charts',
    icon: 'BarChart',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-cost-comparison',
    name: 'Cost Comparison',
    description: 'Compare vendor costs across similar services',
    category: 'gauge-charts',
    icon: 'DollarSign',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'vendor-benchmarking',
    name: 'Industry Benchmarking',
    description: 'Compare vendor performance against industry standards',
    category: 'gauge-charts',
    icon: 'Target',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'best-value-vendors',
    name: 'Best Value Analysis',
    description: 'Identify vendors offering best value for services',
    category: 'gauge-charts',
    icon: 'Award',
    component: 'OperationalMetricCard',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  {
    id: 'occupancy-metric',
    name: 'Occupancy Rate',
    description: 'Track your property occupancy percentage',
    category: 'health-metrics',
    icon: 'Home',
    component: 'InteractiveMetricCard',
    defaultProps: {
      label: 'Occupancy Rate',
      status: 'excellent',
      color: 'hsl(var(--health-excellent))'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'financial-metric',
    name: 'Financial Performance',
    description: 'Monitor revenue and collection rates',
    category: 'health-metrics',
    icon: 'DollarSign',
    component: 'InteractiveMetricCard',
    defaultProps: {
      label: 'Financial Performance',
      status: 'good',
      color: 'hsl(var(--health-good))'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'maintenance-metric',
    name: 'Maintenance Efficiency',
    description: 'Track maintenance response times',
    category: 'health-metrics',
    icon: 'Wrench',
    component: 'InteractiveMetricCard',
    defaultProps: {
      label: 'Maintenance Efficiency',
      status: 'good',
      color: 'hsl(var(--health-good))'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'tenant-relations-metric',
    name: 'Tenant Relations',
    description: 'Monitor tenant satisfaction and relations',
    category: 'health-metrics',
    icon: 'Users',
    component: 'InteractiveMetricCard',
    defaultProps: {
      label: 'Tenant Relations',
      status: 'excellent',
      color: 'hsl(var(--health-excellent))'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  // Income & Cash Flow Management Widgets
  {
    id: 'avg-monthly-operating',
    name: 'Avg Monthly Operating',
    description: 'Average monthly operating cash flow',
    category: 'health-metrics',
    icon: 'DollarSign',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Avg Monthly Operating',
      formatValue: 'currency',
      icon: 'dollar-sign'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'avg-monthly-net',
    name: 'Avg Monthly Net',
    description: 'Average monthly net cash flow',
    category: 'health-metrics',
    icon: 'TrendingUp',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Avg Monthly Net',
      formatValue: 'currency',
      icon: 'trending-up'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'operating-change',
    name: 'Operating Change',
    description: 'Monthly operating cash flow change',
    category: 'health-metrics',
    icon: 'ArrowUpDown',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Operating Change',
      formatValue: 'percentage',
      icon: 'arrow-up-down'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-operating-12mo',
    name: 'Total Operating (12mo)',
    description: 'Total operating cash flow over 12 months',
    category: 'health-metrics',
    icon: 'Calculator',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Total Operating (12mo)',
      formatValue: 'currency',
      icon: 'calculator'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'rental-income-velocity',
    name: 'Rental Income Velocity',
    description: 'Rate of rental income collection',
    category: 'health-metrics',
    icon: 'Zap',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Rental Income Velocity',
      formatValue: 'percentage',
      icon: 'zap'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'collection-rate',
    name: 'Collection Rate',
    description: 'Percentage of rent successfully collected',
    category: 'health-metrics',
    icon: 'Target',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Collection Rate',
      formatValue: 'percentage',
      icon: 'target'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'income-per-unit',
    name: 'Income Per Unit',
    description: 'Average income generated per unit',
    category: 'health-metrics',
    icon: 'Home',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Income Per Unit',
      formatValue: 'currency',
      icon: 'home'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'cash-flow-trends',
    name: 'Cash Flow Trends',
    description: 'Historical cash flow trend analysis',
    category: 'health-metrics',
    icon: 'LineChart',
    component: 'CashFlowAnalysis',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'current-month-waterfall',
    name: 'Current Month Waterfall',
    description: 'Current month income and expense waterfall',
    category: 'health-metrics',
    icon: 'BarChart3',
    component: 'WaterfallChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'rental-income-trends',
    name: 'Rental Income Trends',
    description: 'Monthly rental income trends and patterns',
    category: 'health-metrics',
    icon: 'TrendingUp',
    component: 'RentalIncomeTrends',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'seasonal-income-patterns',
    name: 'Seasonal Income Patterns',
    description: 'Seasonal rental income analysis',
    category: 'health-metrics',
    icon: 'Calendar',
    component: 'SeasonalIncomeChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'income-source-breakdown',
    name: 'Income Source Breakdown',
    description: 'Breakdown of income by source',
    category: 'health-metrics',
    icon: 'PieChart',
    component: 'IncomeSourceBreakdown',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'rent-roll-timeline',
    name: 'Rent Roll Timeline',
    description: 'Timeline view of rent roll changes',
    category: 'health-metrics',
    icon: 'Clock',
    component: 'RentRollTimeline',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'cash-flow-forecasting',
    name: 'Cash Flow Forecasting',
    description: 'Predictive cash flow analysis',
    category: 'health-metrics',
    icon: 'TrendingUp',
    component: 'FinancialForecasting',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'income-heat-map',
    name: 'Income Heat Map',
    description: 'Visual heat map of income by property',
    category: 'health-metrics',
    icon: 'Map',
    component: 'IncomeHeatMap',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'rent-increase-tracker',
    name: 'Rent Increase Tracker',
    description: 'Track rent increases and their impact',
    category: 'health-metrics',
    icon: 'ArrowUp',
    component: 'RentIncreaseTracker',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'late-payment-trends',
    name: 'Late Payment Trends',
    description: 'Analysis of late payment patterns',
    category: 'health-metrics',
    icon: 'AlertTriangle',
    component: 'LatePaymentTrends',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'vacancy-impact-analysis',
    name: 'Vacancy Impact Analysis',
    description: 'Financial impact of unit vacancies',
    category: 'health-metrics',
    icon: 'AlertCircle',
    component: 'VacancyImpactAnalysis',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'rent-roll-summary',
    name: 'Rent Roll Summary',
    description: 'Comprehensive rent roll overview',
    category: 'health-metrics',
    icon: 'FileText',
    component: 'RentRollSummary',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'tenant-payment-reliability',
    name: 'Tenant Payment Reliability',
    description: 'Tenant payment history and reliability score',
    category: 'health-metrics',
    icon: 'Shield',
    component: 'TenantPaymentReliability',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'market-rent-analyzer',
    name: 'Market Rent Analyzer',
    description: 'Compare actual vs market rent rates',
    category: 'health-metrics',
    icon: 'BarChart2',
    component: 'MarketRentAnalyzer',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  // Expenses & Profitability Control Widgets
  {
    id: 'profit-margin',
    name: 'Profit Margin',
    description: 'Net profit margin percentage',
    category: 'health-metrics',
    icon: 'Percent',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Profit Margin',
      formatValue: 'percentage',
      icon: 'percent'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'expense-ratio',
    name: 'Expense Ratio',
    description: 'Operating expenses as percentage of income',
    category: 'health-metrics',
    icon: 'Calculator',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Expense Ratio',
      formatValue: 'percentage',
      icon: 'calculator'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-revenue-12mo',
    name: 'Total Revenue (12mo)',
    description: 'Total revenue over 12 months',
    category: 'health-metrics',
    icon: 'DollarSign',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Total Revenue (12mo)',
      formatValue: 'currency',
      icon: 'dollar-sign'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-expenses-12mo',
    name: 'Total Expenses (12mo)',
    description: 'Total expenses over 12 months',
    category: 'health-metrics',
    icon: 'Receipt',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Total Expenses (12mo)',
      formatValue: 'currency',
      icon: 'receipt'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'monthly-noi-trend',
    name: 'Monthly NOI Trend',
    description: 'Net operating income trend over time',
    category: 'health-metrics',
    icon: 'LineChart',
    component: 'MonthlyNOITrend',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'expense-breakdown',
    name: 'Expense Breakdown',
    description: 'Detailed breakdown of operating expenses',
    category: 'health-metrics',
    icon: 'PieChart',
    component: 'ExpenseBreakdown',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'budget-vs-actual',
    name: 'Budget vs Actual',
    description: 'Compare budgeted vs actual expenses',
    category: 'health-metrics',
    icon: 'BarChart3',
    component: 'BudgetVsActual',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'expense-per-unit',
    name: 'Expense Per Unit',
    description: 'Average operating expense per unit',
    category: 'health-metrics',
    icon: 'Home',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Expense Per Unit',
      formatValue: 'currency',
      icon: 'home'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'expense-per-sqft',
    name: 'Expense Per Sq Ft',
    description: 'Operating expense per square foot',
    category: 'health-metrics',
    icon: 'Square',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Expense Per Sq Ft',
      formatValue: 'currency',
      icon: 'square'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'vendor-performance-score',
    name: 'Vendor Performance Score',
    description: 'Vendor cost efficiency and performance',
    category: 'health-metrics',
    icon: 'Users',
    component: 'VendorPerformanceScore',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  // Investment & Portfolio Performance Widgets
  {
    id: 'portfolio-value',
    name: 'Portfolio Value',
    description: 'Total estimated portfolio value',
    category: 'health-metrics',
    icon: 'Building2',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Portfolio Value',
      formatValue: 'currency',
      icon: 'building-2'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-equity',
    name: 'Total Equity',
    description: 'Total equity across all properties',
    category: 'health-metrics',
    icon: 'PiggyBank',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Total Equity',
      formatValue: 'currency',
      icon: 'piggy-bank'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'roi-performance',
    name: 'ROI Performance',
    description: 'Return on investment performance metrics',
    category: 'health-metrics',
    icon: 'TrendingUp',
    component: 'ROIMetricsPanel',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'investment-growth-timeline',
    name: 'Investment Growth Timeline',
    description: 'Timeline of investment growth and milestones',
    category: 'health-metrics',
    icon: 'Clock',
    component: 'InvestmentGrowthTimeline',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'property-appreciation',
    name: 'Property Appreciation',
    description: 'Property value appreciation over time',
    category: 'health-metrics',
    icon: 'ArrowUp',
    component: 'PropertyAppreciation',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'equity-growth-chart',
    name: 'Equity Growth Chart',
    description: 'Visual representation of equity growth',
    category: 'health-metrics',
    icon: 'LineChart',
    component: 'EquityGrowthChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'portfolio-composition',
    name: 'Portfolio Composition',
    description: 'Breakdown of portfolio by property type',
    category: 'health-metrics',
    icon: 'PieChart',
    component: 'PortfolioComposition',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-units-stat',
    name: 'Total Units',
    description: 'Quick overview of total property units',
    category: 'quick-stats',
    icon: 'Building',
    component: 'QuickStatCard',
    defaultProps: {
      title: 'Total Units',
      icon: 'Building'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'maintenance-requests-stat',
    name: 'Open Maintenance Requests',
    description: 'Track pending maintenance requests',
    category: 'quick-stats',
    icon: 'AlertCircle',
    component: 'QuickStatCard',
    defaultProps: {
      title: 'Open Maintenance Requests',
      icon: 'AlertCircle'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },

  // ============= Tenant Lifecycle Metrics =============
  // Core Metrics
  {
    id: 'total-tenants',
    name: 'Total Tenants',
    description: 'Current total number of active tenants',
    category: 'quick-stats',
    icon: 'Users',
    component: 'TotalTenantsMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-retention-rate',
    name: 'Tenant Retention Rate',
    description: 'Percentage of tenants who renewed their lease',
    category: 'quick-stats',
    icon: 'UserCheck',
    component: 'TenantRetentionRateMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'average-tenancy',
    name: 'Average Tenancy Duration',
    description: 'Average length of tenant stays in months',
    category: 'quick-stats',
    icon: 'Calendar',
    component: 'AverageTenancyMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-acquisition-cost',
    name: 'Tenant Acquisition Cost',
    description: 'Average cost to acquire a new tenant',
    category: 'quick-stats',
    icon: 'DollarSign',
    component: 'TenantAcquisitionCostMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'satisfaction-score',
    name: 'Tenant Satisfaction Score',
    description: 'Overall tenant satisfaction rating',
    category: 'quick-stats',
    icon: 'Heart',
    component: 'SatisfactionScoreMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'response-time',
    name: 'Average Response Time',
    description: 'Average time to respond to tenant inquiries',
    category: 'quick-stats',
    icon: 'Clock',
    component: 'ResponseTimeMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'complaint-resolution',
    name: 'Complaint Resolution Rate',
    description: 'Percentage of tenant complaints resolved',
    category: 'quick-stats',
    icon: 'CheckCircle',
    component: 'ComplaintResolutionMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'at-risk-count',
    name: 'At Risk Tenants',
    description: 'Number of tenants requiring attention',
    category: 'quick-stats',
    icon: 'AlertTriangle',
    component: 'AtRiskCountMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'new-tenants',
    name: 'New Tenants',
    description: 'Count of new tenants in last 6 months',
    category: 'quick-stats',
    icon: 'UserPlus',
    component: 'NewTenantsMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenants-leaving',
    name: 'Tenants Leaving',
    description: 'Count of tenants leaving in next 3 months',
    category: 'quick-stats',
    icon: 'UserMinus',
    component: 'TenantsLeavingMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'communication-score',
    name: 'Communication Score',
    description: 'Average tenant communication satisfaction',
    category: 'quick-stats',
    icon: 'MessageSquare',
    component: 'CommunicationScoreMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'maintenance-score',
    name: 'Maintenance Score',
    description: 'Average maintenance satisfaction score',
    category: 'quick-stats',
    icon: 'Wrench',
    component: 'MaintenanceScoreMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-turnover-rate',
    name: 'Turnover Rate',
    description: 'Percentage turnover rate year-over-year',
    category: 'quick-stats',
    icon: 'RefreshCw',
    component: 'TenantTurnoverRateMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'payment-delinquency-rate',
    name: 'Payment Delinquency',
    description: 'Percentage of late or missed payments',
    category: 'quick-stats',
    icon: 'AlertCircle',
    component: 'PaymentDelinquencyRateMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-lifetime-value',
    name: 'Tenant Lifetime Value',
    description: 'Average revenue per tenant over tenure',
    category: 'quick-stats',
    icon: 'TrendingUp',
    component: 'TenantLifetimeValueMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-profitability-score',
    name: 'Profitability Score',
    description: 'Net profitability per tenant',
    category: 'quick-stats',
    icon: 'DollarSign',
    component: 'TenantProfitabilityScoreMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-violation-rate',
    name: 'Lease Violation Rate',
    description: 'Percentage of tenants with violations',
    category: 'quick-stats',
    icon: 'XCircle',
    component: 'LeaseViolationRateMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Charts & Trends
  {
    id: 'satisfaction-breakdown',
    name: 'Satisfaction Breakdown',
    description: 'Detailed breakdown of satisfaction metrics',
    category: 'quick-stats',
    icon: 'PieChart',
    component: 'SatisfactionBreakdownChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-turnover-trends',
    name: 'Turnover Trends',
    description: 'Monthly tenant move-ins vs move-outs',
    category: 'quick-stats',
    icon: 'LineChart',
    component: 'TenantTurnoverTrendsChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'risk-level-distribution',
    name: 'Risk Distribution',
    description: 'Distribution of tenant risk levels',
    category: 'quick-stats',
    icon: 'BarChart3',
    component: 'RiskLevelDistributionChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'retention-rate-timeline',
    name: 'Retention Rate Timeline',
    description: 'Retention trends over time',
    category: 'quick-stats',
    icon: 'LineChart',
    component: 'RetentionRateTimelineChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-satisfaction-trends',
    name: 'Satisfaction Trends',
    description: 'Multi-line chart tracking satisfaction metrics',
    category: 'quick-stats',
    icon: 'TrendingUp',
    component: 'TenantSatisfactionTrendsChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-expiration-calendar',
    name: 'Lease Expiration Calendar',
    description: 'Timeline visualization of upcoming expirations',
    category: 'quick-stats',
    icon: 'Calendar',
    component: 'LeaseExpirationCalendarChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Analysis Tools
  {
    id: 'risk-assessment',
    name: 'Tenant Risk Assessment',
    description: 'Combined lifecycle and satisfaction risk analysis',
    category: 'quick-stats',
    icon: 'Shield',
    component: 'RiskAssessmentPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'retention-strategy-recommendations',
    name: 'Retention Strategies',
    description: 'AI-powered retention strategy recommendations',
    category: 'quick-stats',
    icon: 'Lightbulb',
    component: 'RetentionStrategyRecommendationsPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-communication-log',
    name: 'Communication Log',
    description: 'Detailed communication history and insights',
    category: 'quick-stats',
    icon: 'MessageSquare',
    component: 'TenantCommunicationLogPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-profitability-analysis',
    name: 'Profitability Analysis',
    description: 'Cost/benefit analysis per tenant',
    category: 'quick-stats',
    icon: 'Calculator',
    component: 'TenantProfitabilityAnalysisPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Comparative Analysis
  {
    id: 'property-retention-comparison',
    name: 'Property Retention Comparison',
    description: 'Compare retention rates across properties',
    category: 'quick-stats',
    icon: 'BarChart3',
    component: 'PropertyRetentionComparisonChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-age-distribution',
    name: 'Tenant Age Distribution',
    description: 'Demographics and tenure analysis',
    category: 'quick-stats',
    icon: 'Users',
    component: 'TenantAgeDistributionChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // ============= Lease & Rent Optimization =============
  // Core Metrics
  {
    id: 'renewal-rate',
    name: 'Lease Renewal Rate',
    description: 'Percentage of leases that were renewed',
    category: 'quick-stats',
    icon: 'RefreshCw',
    component: 'RenewalRateMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'rent-optimization-potential',
    name: 'Rent Optimization Potential',
    description: 'Total monthly optimization potential across all properties',
    category: 'quick-stats',
    icon: 'TrendingUp',
    component: 'RentOptimizationPotentialMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'rent-increase-opportunities',
    name: 'Rent Increase Opportunities',
    description: 'Properties with rent increase potential',
    category: 'quick-stats',
    icon: 'ArrowUpCircle',
    component: 'RentIncreaseOpportunitiesMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'average-lease-term',
    name: 'Average Lease Term',
    description: 'Average length of lease agreements',
    category: 'quick-stats',
    icon: 'Calendar',
    component: 'AverageLeaseTermMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-expiration-tracker',
    name: 'Expiring Soon',
    description: 'Leases expiring in next 90 days',
    category: 'quick-stats',
    icon: 'AlertCircle',
    component: 'LeaseExpirationTrackerMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'pricing-strategy',
    name: 'Optimization Potential',
    description: 'Monthly rent increase potential',
    category: 'quick-stats',
    icon: 'DollarSign',
    component: 'PricingStrategyMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'total-leases',
    name: 'Total Leases',
    description: 'Total number of active leases',
    category: 'quick-stats',
    icon: 'FileText',
    component: 'TotalLeasesMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'current-average-rent',
    name: 'Average Rent',
    description: 'Portfolio-wide average monthly rent',
    category: 'quick-stats',
    icon: 'DollarSign',
    component: 'CurrentAverageRentMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'market-rent-gap',
    name: 'Market Rent Gap',
    description: 'Average $ difference vs market rates',
    category: 'quick-stats',
    icon: 'TrendingDown',
    component: 'MarketRentGapMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-renewal-success',
    name: 'Renewal Success',
    description: 'Percentage of successful renewals',
    category: 'quick-stats',
    icon: 'CheckCircle',
    component: 'LeaseRenewalSuccessMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'rent-collection-efficiency',
    name: 'Collection Efficiency',
    description: 'On-time rent collection percentage',
    category: 'quick-stats',
    icon: 'Percent',
    component: 'RentCollectionEfficiencyMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-compliance-score',
    name: 'Compliance Score',
    description: 'Compliance with lease terms rating',
    category: 'quick-stats',
    icon: 'Shield',
    component: 'LeaseComplianceScoreMetric',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Charts & Trends
  {
    id: 'market-rent-comparison',
    name: 'Market Rent Comparison',
    description: 'Compare current rent to market rates',
    category: 'quick-stats',
    icon: 'BarChart3',
    component: 'MarketRentComparisonChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-performance-timeline',
    name: 'Lease Performance Timeline',
    description: 'Track lease performance metrics over time',
    category: 'quick-stats',
    icon: 'LineChart',
    component: 'LeasePerformanceTimelineChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'rent-trends-over-time',
    name: 'Rent Trends',
    description: 'Line chart showing rent changes over time',
    category: 'quick-stats',
    icon: 'TrendingUp',
    component: 'RentTrendsOverTimeChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-renewal-pipeline',
    name: 'Renewal Pipeline',
    description: 'Funnel chart of upcoming renewals',
    category: 'quick-stats',
    icon: 'GitBranch',
    component: 'LeaseRenewalPipelineChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'rent-distribution-analysis',
    name: 'Rent Distribution',
    description: 'Histogram of rent amounts across portfolio',
    category: 'quick-stats',
    icon: 'BarChart3',
    component: 'RentDistributionAnalysisChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'seasonal-renewal-patterns',
    name: 'Seasonal Patterns',
    description: 'Identify best/worst renewal seasons',
    category: 'quick-stats',
    icon: 'Calendar',
    component: 'SeasonalRenewalPatternsChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-length-distribution',
    name: 'Lease Length Distribution',
    description: 'Bar chart of lease term lengths',
    category: 'quick-stats',
    icon: 'BarChart3',
    component: 'LeaseLengthDistributionChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Analysis Tools
  {
    id: 'market-rent-analyzer',
    name: 'Market Rent Analyzer',
    description: 'Detailed market comparison per property',
    category: 'quick-stats',
    icon: 'Search',
    component: 'MarketRentAnalyzerPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'lease-negotiation-insights',
    name: 'Negotiation Insights',
    description: 'Historical negotiation success data',
    category: 'quick-stats',
    icon: 'Users',
    component: 'LeaseNegotiationInsightsPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'rent-increase-impact-simulator',
    name: 'Impact Simulator',
    description: 'Model impact of rent changes',
    category: 'quick-stats',
    icon: 'Calculator',
    component: 'RentIncreaseImpactSimulatorPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'tenant-rent-affordability',
    name: 'Rent Affordability',
    description: 'Analyze rent burden ratios',
    category: 'quick-stats',
    icon: 'DollarSign',
    component: 'TenantRentAffordabilityPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'pricing-strategy-recommendations',
    name: 'Pricing Strategies',
    description: 'AI-powered pricing recommendations',
    category: 'quick-stats',
    icon: 'Lightbulb',
    component: 'PricingStrategyRecommendationsPanel',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // Comparative Analysis
  {
    id: 'property-lease-performance',
    name: 'Property Performance',
    description: 'Compare lease metrics across properties',
    category: 'quick-stats',
    icon: 'BarChart3',
    component: 'PropertyLeasePerformanceChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'portfolio-rent-benchmarks',
    name: 'Rent Benchmarks',
    description: 'Compare against industry standards',
    category: 'quick-stats',
    icon: 'Target',
    component: 'PortfolioRentBenchmarksChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },
  {
    id: 'year-over-year-lease-metrics',
    name: 'Year-over-Year Metrics',
    description: 'YoY comparison of key metrics',
    category: 'quick-stats',
    icon: 'TrendingUp',
    component: 'YearOverYearLeaseMetricsChart',
    defaultProps: {},
    customizable: { name: true, description: true, size: true }
  },

  // ============= Assets Section =============
  // Core Metrics
  {
    id: 'total-portfolio-value',
    name: 'Market Value',
    description: 'Current market value of all assets in portfolio',
    category: 'properties',
    icon: 'DollarSign',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Market Value',
      formatValue: 'currency',
      icon: 'dollar-sign'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'portfolio-return',
    name: 'Annual Income',
    description: 'Total annual income from all assets',
    category: 'properties',
    icon: 'TrendingUp',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Annual Income',
      formatValue: 'currency',
      icon: 'trending-up'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'asset-count',
    name: 'Total Assets',
    description: 'Total number of assets in portfolio',
    category: 'properties',
    icon: 'Package',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Total Assets',
      formatValue: 'number',
      icon: 'package'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'portfolio-change-24h',
    name: 'Cost Basis',
    description: 'Total cost basis of all assets in portfolio',
    category: 'properties',
    icon: 'DollarSign',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Cost Basis',
      formatValue: 'currency',
      icon: 'dollar-sign'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'total-gain-loss',
    name: 'Total Gain/Loss',
    description: 'Total unrealized gain or loss across all assets',
    category: 'properties',
    icon: 'TrendingUp',
    component: 'TotalGainLossWidget',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'diversification-score',
    name: 'Diversification Score',
    description: 'Portfolio diversification rating (0-100)',
    category: 'properties',
    icon: 'PieChart',
    component: 'DiversificationScoreWidget',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'best-performer',
    name: 'Best Performer',
    description: 'Top performing asset in portfolio',
    category: 'properties',
    icon: 'TrendingUp',
    component: 'BestPerformerWidget',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'worst-performer',
    name: 'Worst Performer',
    description: 'Lowest performing asset in portfolio',
    category: 'properties',
    icon: 'TrendingDown',
    component: 'WorstPerformerWidget',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },

  // Charts & Trends
  {
    id: 'asset-allocation-chart',
    name: 'Asset Allocation',
    description: 'Pie chart showing portfolio allocation by asset type',
    category: 'properties',
    icon: 'PieChart',
    component: 'AssetAllocationChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'portfolio-performance-timeline',
    name: 'Portfolio Performance Over Time',
    description: 'Line chart showing portfolio value changes over time',
    category: 'properties',
    icon: 'LineChart',
    component: 'PortfolioPerformanceTimeline',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'asset-price-trends',
    name: 'Asset Price Trends',
    description: 'Multi-line chart comparing price movements of assets',
    category: 'properties',
    icon: 'LineChart',
    component: 'AssetPriceTrends',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'top-movers-chart',
    name: 'Top Movers',
    description: 'Bar chart of biggest gainers and losers',
    category: 'properties',
    icon: 'BarChart3',
    component: 'TopMoversChart',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'asset-class-distribution',
    name: 'Asset Class Distribution',
    description: 'Distribution across stocks, crypto, bonds, etc.',
    category: 'properties',
    icon: 'PieChart',
    component: 'AssetClassDistribution',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'sector-allocation',
    name: 'Sector Allocation',
    description: 'Portfolio allocation by market sector',
    category: 'properties',
    icon: 'PieChart',
    component: 'SectorAllocation',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'geographic-distribution',
    name: 'Geographic Distribution',
    description: 'Asset distribution by geographic region',
    category: 'properties',
    icon: 'Map',
    component: 'GeographicDistribution',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'historical-performance-comparison',
    name: 'Historical Performance Comparison',
    description: 'Compare performance across different time periods',
    category: 'properties',
    icon: 'BarChart3',
    component: 'HistoricalPerformanceComparison',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },

  // Analysis Tools
  {
    id: 'correlation-matrix',
    name: 'Correlation Matrix',
    description: 'See which assets move together or oppositely',
    category: 'properties',
    icon: 'Grid',
    component: 'CorrelationMatrix',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'risk-return-scatter',
    name: 'Risk-Return Scatter Plot',
    description: 'Visualize risk vs return for each asset',
    category: 'properties',
    icon: 'ScatterChart',
    component: 'RiskReturnScatter',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'volatility-analysis',
    name: 'Volatility Analysis',
    description: 'Track and compare asset volatility metrics',
    category: 'properties',
    icon: 'Activity',
    component: 'VolatilityAnalysis',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'drawdown-analysis',
    name: 'Drawdown Analysis',
    description: 'Analyze maximum drawdown periods and recovery',
    category: 'properties',
    icon: 'TrendingDown',
    component: 'DrawdownAnalysis',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'sharpe-ratio-calculator',
    name: 'Sharpe Ratio Calculator',
    description: 'Risk-adjusted return calculations for each asset',
    category: 'properties',
    icon: 'Calculator',
    component: 'SharpeRatioCalculator',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'portfolio-rebalancing',
    name: 'Rebalancing Suggestions',
    description: 'AI recommendations for portfolio rebalancing',
    category: 'properties',
    icon: 'RefreshCw',
    component: 'PortfolioRebalancing',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'performance-attribution',
    name: 'Performance Attribution',
    description: 'Breakdown of what drove portfolio performance',
    category: 'properties',
    icon: 'PieChart',
    component: 'PerformanceAttribution',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },

  // Market Intelligence & Comparative Analysis
  {
    id: 'market-sentiment',
    name: 'Market Sentiment Indicator',
    description: 'Real-time market sentiment and fear/greed index',
    category: 'properties',
    icon: 'TrendingUp',
    component: 'ModernMetricCard',
    defaultProps: {
      label: 'Market Sentiment',
      formatValue: 'number',
      icon: 'trending-up'
    },
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'volume-analysis',
    name: 'Volume Analysis',
    description: 'Trading volume trends and liquidity metrics',
    category: 'properties',
    icon: 'BarChart3',
    component: 'VolumeAnalysis',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'price-alerts-summary',
    name: 'Price Alerts Summary',
    description: 'Overview of triggered and pending price alerts',
    category: 'properties',
    icon: 'Bell',
    component: 'PriceAlertsSummary',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'market-news-feed',
    name: 'Market News Feed',
    description: 'Latest market news affecting your assets',
    category: 'properties',
    icon: 'Newspaper',
    component: 'MarketNewsFeed',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'economic-calendar',
    name: 'Economic Calendar Impact',
    description: 'Upcoming economic events and potential impact',
    category: 'properties',
    icon: 'Calendar',
    component: 'EconomicCalendar',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'peer-portfolio-comparison',
    name: 'Peer Portfolio Comparison',
    description: 'Compare your portfolio with similar investors',
    category: 'properties',
    icon: 'Users',
    component: 'PeerPortfolioComparison',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  },
  {
    id: 'benchmark-comparison',
    name: 'Benchmark Comparison',
    description: 'Performance vs S&P 500, Bitcoin, and other benchmarks',
    category: 'properties',
    icon: 'BarChart3',
    component: 'BenchmarkComparison',
    defaultProps: {},
    customizable: {
      name: true,
      description: true,
      size: true
    }
  }
];

export const WIDGET_CATEGORIES = {
  'total-portfolio': {
    name: 'Total Portfolio',
    description: 'Unified metrics combining all properties and financial assets',
    icon: 'Briefcase'
  },
  'ai-forecast-health': {
    name: 'AI Forecast and Health',
    description: 'AI-powered predictions and portfolio health insights',
    icon: 'Brain'
  },
  'health-metrics': {
    name: 'Financial Performance',
    description: 'Revenue, expenses, and financial health indicators',
    icon: 'DollarSign'
  },
  'gauge-charts': {
    name: 'Operational Performance',
    description: 'Efficiency gauges and operational metrics',
    icon: 'Gauge'
  },
  'quick-stats': {
    name: 'Tenant Metrics',
    description: 'Comprehensive tenant lifecycle, satisfaction, lease management, and rent optimization metrics',
    icon: 'Users'
  },
  'properties': {
    name: 'Assets',
    description: 'Property-specific financial and performance metrics',
    icon: 'Building'
  }
} as const;