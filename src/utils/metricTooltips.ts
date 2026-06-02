export interface MetricTooltip {
  description: string;
  formula?: string;
  dataRequired: string[];
  benchmark?: string;
}

export const metricTooltips: Record<string, MetricTooltip> = {
  // ========== INCOME & CASH FLOW WIDGETS ==========
  
  // Core Income Metrics
  'avg-monthly-operating': {
    description: "Average monthly operating cash flow across all properties in your portfolio",
    formula: "Sum of (Monthly Rent - Operating Expenses) / Number of Properties",
    dataRequired: ["Monthly rent per property", "Operating expenses (maintenance, management, taxes, insurance)"],
    benchmark: "Should be positive and grow 3-5% annually. Target: $200-500+ per unit depending on market"
  },
  
  'avg-monthly-net': {
    description: "Average monthly net cash flow after all expenses including debt service",
    formula: "Sum of (Monthly Rent - Total Expenses - Mortgage Payment) / Number of Properties",
    dataRequired: ["Monthly rent", "All operating expenses", "Mortgage payments"],
    benchmark: "Positive cash flow preferred. Good: $100-300+ per property per month"
  },
  
  'operating-change': {
    description: "Month-over-month percentage change in operating cash flow performance",
    formula: "((Current Month Operating CF - Previous Month Operating CF) / Previous Month Operating CF) × 100",
    dataRequired: ["Current and previous month operating cash flow data"],
    benchmark: "Consistent positive growth preferred. Good: 0-5% monthly growth"
  },
  
  'total-operating': {
    description: "Total operating cash flow generated across all properties in the last 12 months",
    formula: "Sum of (Annual Rent - Annual Operating Expenses) for all properties",
    dataRequired: ["12 months of rental income", "12 months of operating expenses"],
    benchmark: "Should cover 6-12 months of expenses as buffer. Growth rate: 3-8% annually"
  },
  
  // Income Charts & Analysis
  'cash-flow-trends': {
    description: "Visual timeline showing monthly cash flow patterns and trends across your portfolio",
    dataRequired: ["Monthly cash flow data for 12+ months", "Property-level income and expense tracking"],
    benchmark: "Look for consistent upward trends with minimal seasonal volatility"
  },
  
  'current-month-waterfall': {
    description: "Waterfall chart breaking down current month's cash flow from gross rent to net cash flow",
    dataRequired: ["Current month gross rent", "Itemized expenses by category", "Net cash flow calculation"],
    benchmark: "Operating expenses should be 35-50% of gross rent, leaving positive net cash flow"
  },
  
  'rental-income-trends': {
    description: "Monthly rental income patterns showing growth rates and seasonal variations",
    dataRequired: ["Monthly rental income history", "Rent roll data", "Vacancy tracking"],
    benchmark: "Steady 2-5% annual growth with occupancy rates above 90%"
  },
  
  'seasonal-patterns': {
    description: "Analysis of seasonal trends in rental income to identify peak and low periods",
    dataRequired: ["2+ years of monthly income data", "Local market seasonality factors"],
    benchmark: "Variance should be <20% between peak and low seasons"
  },
  
  'vacancy-analysis': {
    description: "Comprehensive analysis of vacancy rates, duration, and impact on cash flow",
    dataRequired: ["Vacancy periods", "Days to fill units", "Lost rent calculations"],
    benchmark: "Vacancy rate <5% annually, average days vacant <30 days"
  },
  
  'rent-roll-summary': {
    description: "Overview of rent collection patterns, payment timing, and tenant payment behavior",
    dataRequired: ["Monthly rent collection data", "Payment dates", "Late payment tracking"],
    benchmark: "On-time collection rate >95%, average collection period <5 days"
  },
  
  'income-variance-analysis': {
    description: "Statistical analysis of income variations across different properties and time periods",
    dataRequired: ["Property-level income data", "Market comparisons", "Historical performance"],
    benchmark: "Income variance <15% from projected amounts, consistent performance"
  },
  
  'property-income-comparison': {
    description: "Side-by-side comparison of income performance across different properties in portfolio",
    dataRequired: ["Per-property income statements", "Rent per square foot", "Occupancy rates"],
    benchmark: "Top performers should be within 10-20% of market rate maximums"
  },

  // ========== EXPENSES & PROFITABILITY WIDGETS ==========
  
  // Core Expense Metrics
  'profit-margin': {
    description: "Average profit margin across all properties showing percentage of revenue retained as profit",
    formula: "(Total Revenue - Total Expenses) / Total Revenue × 100",
    dataRequired: ["Monthly rental income", "All operating expenses", "Property-level P&L statements"],
    benchmark: "Good: 40-60%, Excellent: >60%, Concerning: <30%"
  },
  
  'expense-ratio': {
    description: "Total operating expenses as a percentage of gross rental income",
    formula: "Total Operating Expenses / Gross Rental Income × 100",
    dataRequired: ["Operating expenses (maintenance, management, taxes, insurance)", "Gross rental income"],
    benchmark: "Excellent: <35%, Good: 35-45%, High: 45-55%, Concerning: >55%"
  },
  
  'total-revenue': {
    description: "Total rental revenue generated across all properties over the last 12 months",
    formula: "Sum of monthly rent × 12 months + additional income sources",
    dataRequired: ["Monthly rent roll", "Additional income (parking, laundry, etc.)", "12 months of data"],
    benchmark: "Should grow 3-5% annually and match or exceed local market growth rates"
  },
  
  'total-expenses': {
    description: "Total operating expenses incurred across all properties over the last 12 months",
    formula: "Sum of (Maintenance + Management + Taxes + Insurance + Utilities + Other Operating Expenses)",
    dataRequired: ["12 months of expense records", "Categorized expense tracking", "Property-level expenses"],
    benchmark: "Should be 35-50% of gross income and grow slower than revenue"
  },
  
  // Expense Charts & Analysis
  'monthly-noi-trend': {
    description: "Net Operating Income trends showing profitability patterns over time",
    formula: "Monthly Gross Income - Monthly Operating Expenses",
    dataRequired: ["Monthly income statements", "Operating expense tracking", "NOI calculations"],
    benchmark: "Consistent upward trend with NOI margins of 50-65%"
  },
  
  'expense-breakdown': {
    description: "Pie chart visualization showing distribution of expenses across different categories",
    dataRequired: ["Categorized expense data", "Maintenance, management, tax, insurance, and utility costs"],
    benchmark: "Maintenance: 15-25%, Management: 8-12%, Taxes: 10-25%, Insurance: 5-15%"
  },
  
  'expense-control-trends': {
    description: "Track expense control effectiveness and identify areas for cost optimization",
    dataRequired: ["Historical expense data", "Budget vs actual comparisons", "Cost control measures"],
    benchmark: "Expenses should grow slower than income, with year-over-year expense ratio improvement"
  },
  
  'maintenance-cost-trends': {
    description: "Analysis of maintenance expenses to identify patterns and predict future costs",
    dataRequired: ["Maintenance expense history", "Property age and condition", "Preventive vs reactive costs"],
    benchmark: "Maintenance costs: 1-3% of property value annually, trend toward preventive maintenance"
  },
  
  'utility-expense-analysis': {
    description: "Breakdown of utility costs across properties with efficiency analysis",
    dataRequired: ["Utility bills by property", "Property square footage", "Utility cost per sq ft"],
    benchmark: "Utility costs: $1-3 per sq ft annually depending on property type and location"
  },
  
  'property-profitability-ranking': {
    description: "Ranking of properties by various profitability metrics to identify top and bottom performers",
    dataRequired: ["Property-level NOI", "Cash flow per property", "ROI calculations"],
    benchmark: "Top quartile properties should outperform bottom quartile by 20-50%"
  },
  
  'budget-vs-actual': {
    description: "Compare planned expenses against actual spending to track budget performance",
    dataRequired: ["Annual budgets by category", "Actual expense tracking", "Variance analysis"],
    benchmark: "Variance should be within 10-15% of budgeted amounts for most categories"
  },
  
  'property-expense-comparison': {
    description: "Side-by-side comparison of expenses across different properties to identify outliers",
    dataRequired: ["Property-level expense statements", "Expenses per square foot", "Expense ratios"],
    benchmark: "Similar properties should have expense ratios within 10-20% of each other"
  },
  
  'cost-per-unit-analysis': {
    description: "Analysis of operating costs on a per-unit basis to normalize across different property sizes",
    formula: "Total Operating Expenses / Number of Units",
    dataRequired: ["Operating expenses by property", "Unit counts", "Property-level cost allocation"],
    benchmark: "Cost per unit should be consistent across similar property types and locations"
  },

  // ========== INVESTMENT & PORTFOLIO WIDGETS ==========
  
  // Core Investment Metrics
  'total-properties-metric': {
    description: "Total number of investment properties in your real estate portfolio",
    dataRequired: ["Property database records", "Active property status tracking"],
    benchmark: "No specific benchmark - depends on investment strategy and capital availability"
  },
  
  'total-investment-metric': {
    description: "Total capital invested across all properties including purchase price and improvements",
    formula: "Sum of (Purchase Price + Closing Costs + Capital Improvements) for all properties",
    dataRequired: ["Purchase prices", "Closing costs", "Capital improvement tracking"],
    benchmark: "Should be diversified across markets and property types for risk management"
  },
  
  'avg-property-value-metric': {
    description: "Average current market value per property in the portfolio",
    formula: "Total Portfolio Value / Number of Properties",
    dataRequired: ["Current property valuations", "Recent appraisals or market estimates"],
    benchmark: "Should appreciate 3-5% annually and align with local market appreciation rates"
  },
  
  'monthly-cash-flow-metric': {
    description: "Current monthly cash flow generated from all properties combined",
    formula: "Sum of (Monthly Rent - Monthly Expenses - Debt Service) for all properties",
    dataRequired: ["Monthly rent roll", "Operating expenses", "Mortgage payments"],
    benchmark: "Positive cash flow preferred. Good: $100-300+ per property per month"
  },
  
  // Performance Indicators (Speedometers)
  'cap-rate-speedometer': {
    description: "Capitalization rate gauge showing current portfolio yield performance",
    formula: "Net Operating Income / Current Property Value × 100",
    dataRequired: ["Annual NOI", "Current property values or recent appraisals"],
    benchmark: "Good: 6-10% (varies by market). Higher cap rates in secondary markets, lower in primary markets"
  },
  
  'cash-on-cash-speedometer': {
    description: "Cash-on-cash return gauge measuring return on actual cash invested",
    formula: "Annual Cash Flow / Total Cash Invested × 100",
    dataRequired: ["Annual cash flow after debt service", "Down payment + closing costs + improvements"],
    benchmark: "Good: 8-12%, Excellent: >12%, Minimum acceptable: 6-8%"
  },
  
  'rent-to-value-speedometer': {
    description: "Monthly rent to property value ratio gauge showing rental yield efficiency",
    formula: "Monthly Rent / Property Value × 100",
    dataRequired: ["Monthly rent amount", "Current property value"],
    benchmark: "Good: 1-2% monthly (12-24% annually), varies significantly by market"
  },
  
  // Investment Charts & Analysis
  'portfolio-growth-timeline': {
    description: "Timeline visualization showing portfolio expansion and acquisition history",
    dataRequired: ["Property acquisition dates", "Purchase prices", "Portfolio value over time"],
    benchmark: "Steady growth with strategic timing. Avoid over-leverage during market peaks"
  },
  
  'property-type-distribution': {
    description: "Distribution chart showing portfolio composition by property type and category",
    dataRequired: ["Property types (SFR, multifamily, commercial)", "Property classifications", "Value allocation"],
    benchmark: "Diversification recommended: not more than 60% in any single property type"
  },
  
  'market-value-trends': {
    description: "Track property value changes over time to monitor appreciation and market performance",
    dataRequired: ["Historical property values", "Market appraisals", "Comparable sales data"],
    benchmark: "Should track or exceed local market appreciation rates (typically 3-5% annually)"
  },
  
  'appreciation-tracking': {
    description: "Monitor property appreciation rates across the portfolio to identify trends",
    formula: "((Current Value - Purchase Price) / Purchase Price) / Years Owned × 100",
    dataRequired: ["Purchase prices", "Current values", "Acquisition dates"],
    benchmark: "Target: 3-5% annual appreciation, compounding over time"
  },
  
  'yield-analysis': {
    description: "Comprehensive analysis of rental yields and investment returns across properties",
    formula: "Annual Rental Income / Property Value × 100",
    dataRequired: ["Annual rental income", "Current property values", "Investment returns"],
    benchmark: "Gross yield: 6-12%, Net yield: 4-8% depending on market and property type"
  },
  
  'property-performance-overview': {
    description: "Comprehensive dashboard showing individual property performance metrics and comparisons",
    dataRequired: ["Property-level financial statements", "Performance metrics", "Benchmark comparisons"],
    benchmark: "Each property should meet minimum return thresholds and contribute to portfolio goals"
  },
  
  'benchmark-comparison': {
    description: "Compare portfolio performance against relevant market benchmarks and indices",
    dataRequired: ["Portfolio returns", "Market index data", "Comparable investment performance"],
    benchmark: "Should meet or exceed relevant real estate investment benchmarks (REITs, market averages)"
  },
  
  'roi-comparison': {
    description: "Compare return on investment across different properties and investment opportunities",
    formula: "((Current Value + Cash Flow - Initial Investment) / Initial Investment) × 100",
    dataRequired: ["Initial investment amounts", "Current values", "Cash flow history"],
    benchmark: "Target: 12-20% total annual return including appreciation and cash flow"
  },
  
  'risk-assessment': {
    description: "Analysis of investment risks including market, tenant, and financial risk factors",
    dataRequired: ["Market volatility data", "Tenant stability metrics", "Financial leverage ratios"],
    benchmark: "Diversified risk exposure with no single factor representing >30% of total risk"
  },

  // ========== LEGACY OVERVIEW METRICS (for backwards compatibility) ==========
  
  totalProperties: {
    description: "Total number of properties in your portfolio or filtered selection",
    dataRequired: ["Property records in database"],
    benchmark: "No specific benchmark - depends on portfolio strategy"
  },
  
  totalRevenue: {
    description: "Combined monthly rental income from all properties",
    formula: "Sum of monthly_rent for all properties",
    dataRequired: ["Monthly rent amount per property"],
    benchmark: "Should grow 3-5% annually in stable markets"
  },
  
  occupancyRate: {
    description: "Percentage of properties currently occupied by tenants",
    formula: "(Occupied Units / Total Units) × 100",
    dataRequired: ["Property status (occupied/vacant)"],
    benchmark: "Good: >95%, Average: 90-95%, Needs attention: <90%"
  },
  
  averageRent: {
    description: "Mean monthly rent across all properties in scope",
    formula: "Total Monthly Rent / Number of Properties",
    dataRequired: ["Monthly rent per property"],
    benchmark: "Compare to local market rates (should be within 5-10%)"
  },
  
  capRate: {
    description: "Capitalization rate - measures property investment return",
    formula: "Net Operating Income / Property Value",
    dataRequired: ["Annual NOI", "Current property value/purchase price"],
    benchmark: "Good: 6-10% (varies by market and property type)"
  },
  
  cashOnCashReturn: {
    description: "Annual cash flow return on cash invested",
    formula: "Annual Cash Flow / Total Cash Invested",
    dataRequired: ["Annual cash flow", "Down payment + closing costs"],
    benchmark: "Good: 8-12%, Excellent: >12%"
  },
  
  rentGrowthYoY: {
    description: "Year-over-year percentage increase in rental income",
    formula: "(Current Year Rent - Previous Year Rent) / Previous Year Rent × 100",
    dataRequired: ["Current rent amounts", "Historical rent data"],
    benchmark: "Should match or exceed inflation (2-4% annually)"
  },
  
  operatingExpenseRatio: {
    description: "Operating expenses as percentage of gross rental income",
    formula: "Total Operating Expenses / Gross Rental Income × 100",
    dataRequired: ["Monthly operating expenses", "Gross rental income"],
    benchmark: "Good: 35-45%, Excellent: <35%, High: >50%"
  },
  
  revenuePerSqFt: {
    description: "Annual rental income per square foot of property",
    formula: "Annual Rental Income / Total Square Footage",
    dataRequired: ["Monthly rent", "Property square footage"],
    benchmark: "Compare to similar properties in your market area"
  },
  
  grossRentMultiplier: {
    description: "Property value relative to annual gross rental income",
    formula: "Property Value / Annual Gross Rent",
    dataRequired: ["Current property value", "Annual rental income"],
    benchmark: "Good investment: 4-7x, Higher ratios indicate expensive markets"
  },
  
  vacancyRiskScore: {
    description: "Predicted likelihood of vacancy based on market and property factors",
    dataRequired: ["Tenant lease terms", "Market trends", "Property condition"],
    benchmark: "Low: <20%, Moderate: 20-40%, High: >40%"
  },
  
  predictedMaintenanceCosts: {
    description: "Estimated upcoming maintenance expenses",
    dataRequired: ["Property age", "Historical maintenance", "Property condition"],
    benchmark: "Budget 1-3% of property value annually"
  },
  
  renewalProbability: {
    description: "Likelihood that current tenants will renew their lease",
    formula: "Based on tenant satisfaction, market rates, lease terms",
    dataRequired: ["Lease expiration dates", "Tenant history", "Market rates"],
    benchmark: "Good: >80%, Average: 60-80%, Concerning: <60%"
  },
  
  daysToFillVacancy: {
    description: "Average time to find new tenant for vacant properties",
    dataRequired: ["Vacancy start dates", "New lease start dates"],
    benchmark: "Good: <30 days, Average: 30-45 days, Needs improvement: >45 days"
  },
  
  maintenanceResponseTime: {
    description: "Average time to respond to tenant maintenance requests",
    dataRequired: ["Maintenance request logs", "Response timestamps"],
    benchmark: "Emergency: <24 hours, Urgent: <48 hours, Routine: <7 days"
  },
  
  tenantSatisfactionScore: {
    description: "Overall tenant satisfaction rating from surveys/feedback",
    dataRequired: ["Tenant surveys", "Feedback scores", "Renewal rates"],
    benchmark: "Excellent: >4.5/5, Good: 4.0-4.5/5, Needs improvement: <4.0/5"
  },
  
  tenantRetentionRate: {
    description: "Percentage of tenants who renew their leases",
    formula: "Renewed Leases / Expiring Leases × 100",
    dataRequired: ["Lease renewal data", "Lease expiration records"],
    benchmark: "Excellent: >85%, Good: 75-85%, Needs improvement: <75%"
  }
};

export const getMetricTooltip = (metricKey: string): MetricTooltip | undefined => {
  return metricTooltips[metricKey];
};

// Get widget tooltip by widget ID (maps widget IDs to metric tooltips)
export const getWidgetTooltip = (widgetId: string): MetricTooltip | undefined => {
  // Direct widget ID mapping first
  if (metricTooltips[widgetId]) {
    return metricTooltips[widgetId];
  }
  
  // Fallback for widgets without detailed tooltips
  return undefined;
};

// Get data source explanation for mock data generation
export const getDataSourceInfo = (widgetId: string): string => {
  const dataSourceMap: Record<string, string> = {
    // Income widgets
    'avg-monthly-operating': 'Generated from mock property rental income and operating expense data using realistic market scenarios',
    'avg-monthly-net': 'Calculated from mock rental income minus all expenses including simulated mortgage payments',
    'operating-change': 'Computed from month-over-month variations in mock operating cash flow data',
    'total-operating': 'Aggregated from 12 months of simulated property income and expense records',
    'cash-flow-trends': 'Time series data generated from mock monthly cash flow scenarios with seasonal variations',
    'current-month-waterfall': 'Mock waterfall showing rent collection minus categorized expenses for current simulation period',
    'rental-income-trends': 'Simulated rental income with market-based growth patterns and vacancy impacts',
    'seasonal-patterns': 'Mock seasonal rental data based on typical real estate market patterns',
    'vacancy-analysis': 'Generated vacancy periods and impacts based on realistic market turnover rates',
    'rent-roll-summary': 'Mock rent roll with simulated tenant payment patterns and collection efficiency',
    'income-variance-analysis': 'Statistical analysis of mock income variations across simulated properties',
    'property-income-comparison': 'Comparative analysis using mock property performance data',
    
    // Expense widgets  
    'profit-margin': 'Calculated from mock revenue and expense data across simulated property portfolio',
    'expense-ratio': 'Mock operating expense ratios based on industry-standard expense categories',
    'total-revenue': 'Aggregated mock rental revenue with additional income sources simulation',
    'total-expenses': 'Simulated operating expenses across maintenance, management, taxes, and insurance categories',
    'monthly-noi-trend': 'Mock Net Operating Income trends with realistic expense and revenue patterns',
    'expense-breakdown': 'Categorized mock expense data distributed across typical real estate expense types',
    'expense-control-trends': 'Simulated expense efficiency improvements and cost control measures',
    'maintenance-cost-trends': 'Mock maintenance expenses based on property age and condition factors',
    'utility-expense-analysis': 'Simulated utility costs with seasonal variations and efficiency factors',
    'property-profitability-ranking': 'Mock profitability ranking based on simulated property performance metrics',
    'budget-vs-actual': 'Comparison of mock budgeted amounts against simulated actual expenses',
    'property-expense-comparison': 'Mock expense comparisons normalized across different property types',
    'cost-per-unit-analysis': 'Per-unit cost calculations using mock expense and unit count data',
    
    // Investment widgets
    'total-properties-metric': 'Count of properties in mock portfolio database',
    'total-investment-metric': 'Aggregated mock investment amounts including purchase prices and improvements',
    'avg-property-value-metric': 'Average of mock property values with market appreciation factors',
    'monthly-cash-flow-metric': 'Current mock monthly cash flow aggregated across portfolio',
    'cap-rate-speedometer': 'Mock capitalization rates based on simulated NOI and property values',
    'cash-on-cash-speedometer': 'Mock cash-on-cash returns using simulated cash flow and investment data',
    'rent-to-value-speedometer': 'Mock rent-to-value ratios calculated from simulated rents and property values',
    'portfolio-growth-timeline': 'Mock acquisition timeline with simulated purchase dates and values',
    'property-type-distribution': 'Distribution of mock properties across different asset types',
    'market-value-trends': 'Simulated property value appreciation based on market factors',
    'appreciation-tracking': 'Mock appreciation calculations using purchase and current values',
    'yield-analysis': 'Mock rental yield analysis across different property types',
    'property-performance-overview': 'Comprehensive mock performance metrics per property',
    'benchmark-comparison': 'Mock portfolio performance compared to simulated market benchmarks',
    'roi-comparison': 'Mock ROI calculations across different investment scenarios',
    'risk-assessment': 'Simulated risk factors and diversification analysis'
  };
  
  return dataSourceMap[widgetId] || 'Generated from mock real estate data for demonstration purposes';
};