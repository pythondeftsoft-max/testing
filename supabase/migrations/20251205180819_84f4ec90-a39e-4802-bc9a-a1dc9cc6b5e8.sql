-- Populate platform_formulas with all widget formulas
-- Phase 1: Total Portfolio Formulas (19 formulas)
-- Phase 2: AI Forecast & Health Core Metrics (60+ formulas)

-- First, clear any existing system formulas to avoid duplicates (keep user-created ones)
DELETE FROM platform_formulas WHERE is_system = true;

-- ==========================================
-- PHASE 1: TOTAL PORTFOLIO FORMULAS
-- ==========================================

INSERT INTO platform_formulas (name, description, formula, category, variables, mock_example, used_in, is_system) VALUES

-- 1. Total Net Worth
('Total Net Worth', 
 'Calculates the overall net worth by summing all property values and asset values, then subtracting total liabilities.',
 'Total Net Worth = Σ(Property Values) + Σ(Asset Values) - Σ(Liabilities)',
 'financial',
 '[{"name": "Property Values", "description": "Sum of all property market values"}, {"name": "Asset Values", "description": "Sum of all non-property asset values (stocks, crypto, etc.)"}, {"name": "Liabilities", "description": "Sum of all mortgages, loans, and debts"}]'::jsonb,
 '{"inputs": {"propertyValues": 850000, "assetValues": 125000, "liabilities": 320000}, "calculation": "$850,000 + $125,000 - $320,000", "result": "$655,000"}'::jsonb,
 ARRAY['TotalNetWorthWidget', 'PortfolioSummary'],
 true),

-- 2. Total Monthly Cash Flow
('Total Monthly Cash Flow',
 'Net monthly income after all expenses, representing spendable income from all investments.',
 'Monthly Cash Flow = Total Monthly Income - Total Monthly Expenses',
 'financial',
 '[{"name": "Monthly Income", "description": "Sum of all rent payments, dividends, and other income"}, {"name": "Monthly Expenses", "description": "Sum of mortgages, maintenance, utilities, and operating costs"}]'::jsonb,
 '{"inputs": {"monthlyIncome": 12500, "monthlyExpenses": 8200}, "calculation": "$12,500 - $8,200", "result": "$4,300"}'::jsonb,
 ARRAY['TotalMonthlyCashFlowWidget', 'CashFlowChart'],
 true),

-- 3. Overall Portfolio ROI
('Overall Portfolio ROI',
 'Return on investment across the entire portfolio, measuring investment efficiency.',
 'Portfolio ROI = (Total Annual Income / Total Investment) × 100',
 'investment',
 '[{"name": "Annual Income", "description": "Total yearly income from all sources"}, {"name": "Total Investment", "description": "Total capital invested across all assets"}]'::jsonb,
 '{"inputs": {"annualIncome": 52000, "totalInvestment": 650000}, "calculation": "($52,000 / $650,000) × 100", "result": "8.0%"}'::jsonb,
 ARRAY['OverallPortfolioROIWidget', 'InvestmentPerformance'],
 true),

-- 4. Asset Allocation Percentage
('Asset Allocation',
 'Percentage breakdown of portfolio by asset class for diversification analysis.',
 'Allocation % = (Asset Class Value / Total Net Worth) × 100',
 'financial',
 '[{"name": "Asset Class Value", "description": "Value of assets in a specific category (real estate, stocks, etc.)"}, {"name": "Total Net Worth", "description": "Combined value of all assets minus liabilities"}]'::jsonb,
 '{"inputs": {"realEstateValue": 500000, "totalNetWorth": 655000}, "calculation": "($500,000 / $655,000) × 100", "result": "76.3% Real Estate"}'::jsonb,
 ARRAY['AssetAllocationWidget', 'PortfolioDiversification'],
 true),

-- 5. Income/Expense Ratio
('Income/Expense Ratio',
 'Measures financial health by comparing income to expenses. Values above 1.0 indicate positive cash flow.',
 'I/E Ratio = Total Income / Total Expenses',
 'financial',
 '[{"name": "Total Income", "description": "All revenue sources combined"}, {"name": "Total Expenses", "description": "All costs and expenditures combined"}]'::jsonb,
 '{"inputs": {"totalIncome": 15000, "totalExpenses": 9500}, "calculation": "$15,000 / $9,500", "result": "1.58"}'::jsonb,
 ARRAY['IncomeExpenseRatioWidget', 'FinancialHealthScore'],
 true),

-- 6. Annual Projected Income
('Annual Projected Income',
 'Forecasted yearly income based on current monthly income streams.',
 'Annual Projected = Monthly Income × 12',
 'financial',
 '[{"name": "Monthly Income", "description": "Current average monthly income from all sources"}]'::jsonb,
 '{"inputs": {"monthlyIncome": 12500}, "calculation": "$12,500 × 12", "result": "$150,000"}'::jsonb,
 ARRAY['AnnualProjectedIncomeWidget', 'IncomeProjection'],
 true),

-- 7. Portfolio Diversity Score
('Portfolio Diversity Score',
 'Measures portfolio diversification using the Herfindahl-Hirschman Index. Higher scores indicate better diversification.',
 'Diversity Score = (1 - Σ(Allocation%)²) × 100',
 'performance',
 '[{"name": "Allocation %", "description": "Percentage allocation to each asset class, expressed as decimal"}]'::jsonb,
 '{"inputs": {"realEstate": 0.60, "stocks": 0.25, "bonds": 0.15}, "calculation": "(1 - (0.60² + 0.25² + 0.15²)) × 100 = (1 - 0.445) × 100", "result": "55.5 (Moderately Diversified)"}'::jsonb,
 ARRAY['PortfolioDiversityScoreWidget', 'DiversificationAnalysis'],
 true),

-- 8. Net Monthly Cash Flow
('Net Monthly Cash Flow',
 'True monthly profit after all operating expenses and debt service payments.',
 'Net Cash Flow = Gross Income - Operating Expenses - Debt Service',
 'financial',
 '[{"name": "Gross Income", "description": "Total rent and other income before expenses"}, {"name": "Operating Expenses", "description": "Maintenance, utilities, insurance, taxes, management fees"}, {"name": "Debt Service", "description": "Monthly mortgage principal and interest payments"}]'::jsonb,
 '{"inputs": {"grossIncome": 8500, "operatingExpenses": 2800, "debtService": 3200}, "calculation": "$8,500 - $2,800 - $3,200", "result": "$2,500"}'::jsonb,
 ARRAY['NetMonthlyCashFlowWidget', 'PropertyCashFlow'],
 true),

-- 9. Property ROI
('Property ROI',
 'Annual return on investment for a specific property based on net operating income.',
 'Property ROI = (Annual NOI / Purchase Price) × 100',
 'investment',
 '[{"name": "Annual NOI", "description": "Net Operating Income: annual rent minus operating expenses (excluding mortgage)"}, {"name": "Purchase Price", "description": "Original acquisition cost of the property"}]'::jsonb,
 '{"inputs": {"annualNOI": 24000, "purchasePrice": 300000}, "calculation": "($24,000 / $300,000) × 100", "result": "8.0%"}'::jsonb,
 ARRAY['PropertyROIWidget', 'PropertyPerformance'],
 true),

-- 10. Asset ROI
('Asset ROI',
 'Return on investment for non-property assets like stocks, crypto, or other investments.',
 'Asset ROI = ((Current Value - Cost Basis) / Cost Basis) × 100',
 'investment',
 '[{"name": "Current Value", "description": "Present market value of the asset"}, {"name": "Cost Basis", "description": "Original purchase price plus any reinvested dividends or fees"}]'::jsonb,
 '{"inputs": {"currentValue": 15000, "costBasis": 12000}, "calculation": "(($15,000 - $12,000) / $12,000) × 100", "result": "25.0%"}'::jsonb,
 ARRAY['AssetROIWidget', 'AssetPerformance'],
 true),

-- 11. Gross Rent Multiplier
('Gross Rent Multiplier',
 'Quick property valuation metric comparing price to gross annual rent. Lower GRM suggests better value.',
 'GRM = Property Price / Annual Gross Rent',
 'investment',
 '[{"name": "Property Price", "description": "Purchase price or current market value"}, {"name": "Annual Gross Rent", "description": "Total yearly rent collected before any expenses"}]'::jsonb,
 '{"inputs": {"propertyPrice": 300000, "annualRent": 36000}, "calculation": "$300,000 / $36,000", "result": "8.33"}'::jsonb,
 ARRAY['GrossRentMultiplierWidget', 'PropertyValuation'],
 true),

-- 12. Debt-to-Equity Ratio
('Debt-to-Equity Ratio',
 'Measures financial leverage by comparing total debt to owner equity. Lower ratios indicate less risk.',
 'D/E Ratio = Total Liabilities / Total Equity',
 'financial',
 '[{"name": "Total Liabilities", "description": "Sum of all mortgages and loans"}, {"name": "Total Equity", "description": "Net worth or asset value minus liabilities"}]'::jsonb,
 '{"inputs": {"liabilities": 320000, "equity": 530000}, "calculation": "$320,000 / $530,000", "result": "0.60"}'::jsonb,
 ARRAY['DebtToEquityWidget', 'LeverageAnalysis'],
 true),

-- 13. Loan-to-Value Ratio
('Loan-to-Value Ratio',
 'Percentage of property value that is financed. Used by lenders to assess risk.',
 'LTV = (Loan Balance / Property Value) × 100',
 'financial',
 '[{"name": "Loan Balance", "description": "Current outstanding mortgage balance"}, {"name": "Property Value", "description": "Current market value of the property"}]'::jsonb,
 '{"inputs": {"loanBalance": 200000, "propertyValue": 300000}, "calculation": "($200,000 / $300,000) × 100", "result": "66.7%"}'::jsonb,
 ARRAY['LoanToValueWidget', 'MortgageAnalysis'],
 true),

-- 14. Operating Expense Ratio
('Operating Expense Ratio',
 'Percentage of income consumed by operating expenses. Lower is better for profitability.',
 'OER = (Operating Expenses / Gross Income) × 100',
 'financial',
 '[{"name": "Operating Expenses", "description": "All costs except mortgage (maintenance, taxes, insurance, management)"}, {"name": "Gross Income", "description": "Total rent and other income"}]'::jsonb,
 '{"inputs": {"operatingExpenses": 2800, "grossIncome": 8500}, "calculation": "($2,800 / $8,500) × 100", "result": "32.9%"}'::jsonb,
 ARRAY['OperatingExpenseRatioWidget', 'ExpenseAnalysis'],
 true),

-- 15. Debt Service Coverage Ratio
('Debt Service Coverage Ratio',
 'Ability to cover debt payments from income. Lenders typically require 1.25+ for approval.',
 'DSCR = Net Operating Income / Annual Debt Service',
 'financial',
 '[{"name": "Net Operating Income", "description": "Annual income minus operating expenses"}, {"name": "Annual Debt Service", "description": "Total yearly mortgage payments (principal + interest)"}]'::jsonb,
 '{"inputs": {"noi": 68400, "annualDebtService": 38400}, "calculation": "$68,400 / $38,400", "result": "1.78"}'::jsonb,
 ARRAY['DSCRWidget', 'DebtAnalysis'],
 true),

-- 16. Yield on Cost
('Yield on Cost',
 'Return based on total acquisition cost including improvements. Shows true investment yield.',
 'Yield on Cost = (Annual NOI / Total Cost) × 100',
 'investment',
 '[{"name": "Annual NOI", "description": "Net Operating Income per year"}, {"name": "Total Cost", "description": "Purchase price plus all improvements and closing costs"}]'::jsonb,
 '{"inputs": {"annualNOI": 28000, "totalCost": 340000}, "calculation": "($28,000 / $340,000) × 100", "result": "8.24%"}'::jsonb,
 ARRAY['YieldOnCostWidget', 'InvestmentYield'],
 true),

-- 17. Monthly Income per Unit
('Monthly Income per Unit',
 'Average rent collected per unit across all properties.',
 'Income per Unit = Total Monthly Rent / Number of Units',
 'financial',
 '[{"name": "Total Monthly Rent", "description": "Combined rent from all units"}, {"name": "Number of Units", "description": "Total count of rentable units"}]'::jsonb,
 '{"inputs": {"totalRent": 15000, "units": 12}, "calculation": "$15,000 / 12", "result": "$1,250 per unit"}'::jsonb,
 ARRAY['IncomePerUnitWidget', 'RentAnalysis'],
 true),

-- 18. Price per Square Foot
('Price per Square Foot',
 'Property value normalized by size for comparison across different properties.',
 'Price/SqFt = Property Value / Total Square Footage',
 'investment',
 '[{"name": "Property Value", "description": "Current market value or purchase price"}, {"name": "Square Footage", "description": "Total rentable square feet"}]'::jsonb,
 '{"inputs": {"propertyValue": 300000, "sqft": 1800}, "calculation": "$300,000 / 1,800", "result": "$166.67 per sqft"}'::jsonb,
 ARRAY['PricePerSqFtWidget', 'PropertyComparison'],
 true),

-- 19. Rent per Square Foot
('Rent per Square Foot',
 'Monthly rent normalized by unit size for market comparison.',
 'Rent/SqFt = Monthly Rent / Square Footage',
 'financial',
 '[{"name": "Monthly Rent", "description": "Current monthly rent amount"}, {"name": "Square Footage", "description": "Unit size in square feet"}]'::jsonb,
 '{"inputs": {"monthlyRent": 2200, "sqft": 1100}, "calculation": "$2,200 / 1,100", "result": "$2.00 per sqft"}'::jsonb,
 ARRAY['RentPerSqFtWidget', 'RentComparison'],
 true),

-- ==========================================
-- PHASE 2: AI FORECAST & HEALTH FORMULAS
-- ==========================================

-- 20. Vacancy Risk Score
('Vacancy Risk Score',
 'AI-predicted probability of vacancy based on lease term, market conditions, and tenant behavior.',
 'Risk Score = Base Risk × (1 - Lease Term Remaining%) × Market Factor × (1 - Tenant Score)',
 'performance',
 '[{"name": "Base Risk", "description": "Historical vacancy rate for property type and location"}, {"name": "Lease Term Remaining", "description": "Percentage of lease term remaining (0-1)"}, {"name": "Market Factor", "description": "Local market conditions multiplier (0.5-2.0)"}, {"name": "Tenant Score", "description": "Tenant quality score based on payment history (0-1)"}]'::jsonb,
 '{"inputs": {"baseRisk": 0.15, "leaseRemaining": 0.25, "marketFactor": 1.2, "tenantScore": 0.85}, "calculation": "0.15 × (1 - 0.25) × 1.2 × (1 - 0.85)", "result": "0.020 (2% risk)"}'::jsonb,
 ARRAY['VacancyRiskScoreWidget', 'RiskAnalysis', 'TenantChurnWidget'],
 true),

-- 21. Predicted NOI
('Predicted NOI',
 'AI-forecasted Net Operating Income based on historical trends and market projections.',
 'Predicted NOI = Historical NOI × (1 + Growth Rate) - Predicted Expense Increase',
 'financial',
 '[{"name": "Historical NOI", "description": "Average NOI over past 12 months"}, {"name": "Growth Rate", "description": "Expected annual rent growth percentage"}, {"name": "Expense Increase", "description": "Predicted increase in operating expenses"}]'::jsonb,
 '{"inputs": {"historicalNOI": 65000, "growthRate": 0.03, "expenseIncrease": 1500}, "calculation": "$65,000 × 1.03 - $1,500", "result": "$65,450"}'::jsonb,
 ARRAY['PredictedNOIWidget', 'FinancialForecast', 'NOITrendChart'],
 true),

-- 22. Market Rent Gap
('Market Rent Gap',
 'Percentage difference between current rent and estimated market rent. Positive indicates below-market.',
 'Rent Gap = ((Market Rent - Current Rent) / Current Rent) × 100',
 'financial',
 '[{"name": "Market Rent", "description": "Estimated fair market rent based on comparables"}, {"name": "Current Rent", "description": "Actual rent being charged"}]'::jsonb,
 '{"inputs": {"marketRent": 2400, "currentRent": 2000}, "calculation": "(($2,400 - $2,000) / $2,000) × 100", "result": "20% below market"}'::jsonb,
 ARRAY['MarketRentGapWidget', 'RentOptimization', 'MarketAnalysis'],
 true),

-- 23. Predictive Maintenance Cost
('Predictive Maintenance Cost',
 'AI-estimated maintenance expenses based on equipment age and failure probability.',
 'Predicted Cost = Σ(Equipment Age Factor × Failure Probability × Replacement Cost)',
 'financial',
 '[{"name": "Equipment Age Factor", "description": "Multiplier based on age relative to expected lifespan (age/lifespan)"}, {"name": "Failure Probability", "description": "Statistical likelihood of failure in next 12 months"}, {"name": "Replacement Cost", "description": "Cost to repair or replace the equipment"}]'::jsonb,
 '{"inputs": {"hvacAge": 0.8, "hvacFailure": 0.3, "hvacCost": 8000, "roofAge": 0.5, "roofFailure": 0.1, "roofCost": 15000}, "calculation": "(0.8 × 0.3 × $8,000) + (0.5 × 0.1 × $15,000)", "result": "$2,670 predicted"}'::jsonb,
 ARRAY['PredictiveMaintenanceWidget', 'MaintenanceForecast', 'CapExPlanning'],
 true),

-- 24. Tenant Churn Prediction
('Tenant Churn Prediction',
 'ML-based probability that a tenant will not renew their lease.',
 'Churn Probability = ML Model(Payment History, Lease Term, Satisfaction, Market Rent Delta)',
 'performance',
 '[{"name": "Payment History", "description": "On-time payment percentage (0-1)"}, {"name": "Lease Term", "description": "Number of months tenant has been in place"}, {"name": "Satisfaction", "description": "Tenant satisfaction score from surveys (0-1)"}, {"name": "Market Rent Delta", "description": "Current rent vs market rent percentage"}]'::jsonb,
 '{"inputs": {"paymentHistory": 0.95, "leaseTerm": 24, "satisfaction": 0.8, "rentDelta": 0.1}, "calculation": "ML weighted factors: 0.95×0.3 + (24/36)×0.2 + 0.8×0.3 + (1-0.1)×0.2", "result": "18% churn risk"}'::jsonb,
 ARRAY['TenantChurnWidget', 'RetentionAnalysis', 'TenantRiskScore'],
 true),

-- 25. Tenant Quality Score
('Tenant Quality Score',
 'Composite score evaluating tenant reliability based on payment behavior, property care, and tenure.',
 'Quality Score = (Payment Score × 0.4) + (Care Score × 0.3) + (Tenure Score × 0.3)',
 'performance',
 '[{"name": "Payment Score", "description": "On-time payment percentage converted to 0-100"}, {"name": "Care Score", "description": "Property care rating from inspections (0-100)"}, {"name": "Tenure Score", "description": "Length of tenancy score (longer = higher, max 100)"}]'::jsonb,
 '{"inputs": {"paymentScore": 95, "careScore": 85, "tenureScore": 70}, "calculation": "(95 × 0.4) + (85 × 0.3) + (70 × 0.3)", "result": "84.5"}'::jsonb,
 ARRAY['TenantQualityScoreWidget', 'TenantAnalysis', 'TenantDashboard'],
 true),

-- 26. Vacancy Cost Impact
('Vacancy Cost Impact',
 'Total financial impact of a vacancy including lost rent, turnover costs, and marketing.',
 'Vacancy Cost = (Days Vacant × Daily Rent) + Turn Costs + Marketing Costs',
 'financial',
 '[{"name": "Days Vacant", "description": "Expected or actual vacancy duration"}, {"name": "Daily Rent", "description": "Monthly rent divided by 30"}, {"name": "Turn Costs", "description": "Cleaning, repairs, and preparation costs"}, {"name": "Marketing Costs", "description": "Listing fees and advertising expenses"}]'::jsonb,
 '{"inputs": {"daysVacant": 30, "dailyRent": 73, "turnCosts": 1500, "marketingCosts": 300}, "calculation": "(30 × $73) + $1,500 + $300", "result": "$3,990"}'::jsonb,
 ARRAY['VacancyCostWidget', 'VacancyAnalysis', 'TurnoverCost'],
 true),

-- 27. Investment Risk Score
('Investment Risk Score',
 'Composite risk assessment combining market, tenant, maintenance, and economic factors.',
 'Risk Score = (Market Risk × 0.3) + (Tenant Risk × 0.25) + (Maintenance Risk × 0.25) + (Economic Risk × 0.2)',
 'investment',
 '[{"name": "Market Risk", "description": "Local real estate market volatility (0-100)"}, {"name": "Tenant Risk", "description": "Tenant default and turnover probability (0-100)"}, {"name": "Maintenance Risk", "description": "Deferred maintenance and capex needs (0-100)"}, {"name": "Economic Risk", "description": "Economic indicators and job market health (0-100)"}]'::jsonb,
 '{"inputs": {"marketRisk": 25, "tenantRisk": 15, "maintenanceRisk": 40, "economicRisk": 20}, "calculation": "(25 × 0.3) + (15 × 0.25) + (40 × 0.25) + (20 × 0.2)", "result": "25.25 (Low-Medium Risk)"}'::jsonb,
 ARRAY['InvestmentRiskWidget', 'RiskDashboard', 'PortfolioRisk'],
 true),

-- 28. Property Appreciation Forecast
('Property Appreciation Forecast',
 'Projected future property value based on historical appreciation rates.',
 'Future Value = Current Value × (1 + Annual Appreciation Rate)^Years',
 'investment',
 '[{"name": "Current Value", "description": "Present market value of property"}, {"name": "Appreciation Rate", "description": "Historical or projected annual appreciation (decimal)"}, {"name": "Years", "description": "Forecast time horizon"}]'::jsonb,
 '{"inputs": {"currentValue": 300000, "appreciationRate": 0.04, "years": 5}, "calculation": "$300,000 × (1.04)^5", "result": "$364,996"}'::jsonb,
 ARRAY['AppreciationForecastWidget', 'ValueProjection', 'InvestmentGrowth'],
 true),

-- 29. Refinancing Opportunity Score
('Refinancing Opportunity Score',
 'Potential savings from refinancing based on rate differential and loan balance.',
 'Savings = (Current Rate - Market Rate) × Remaining Balance × Remaining Years',
 'investment',
 '[{"name": "Current Rate", "description": "Existing mortgage interest rate"}, {"name": "Market Rate", "description": "Current available mortgage rates"}, {"name": "Remaining Balance", "description": "Outstanding loan amount"}, {"name": "Remaining Years", "description": "Years left on current mortgage"}]'::jsonb,
 '{"inputs": {"currentRate": 0.065, "marketRate": 0.055, "balance": 200000, "years": 20}, "calculation": "(0.065 - 0.055) × $200,000 × 20", "result": "$40,000 potential savings"}'::jsonb,
 ARRAY['RefinancingWidget', 'MortgageOptimization', 'DebtManagement'],
 true),

-- 30. Revenue Forecast
('Revenue Forecast',
 'Projected revenue incorporating seasonal patterns and growth trends.',
 'Forecast = Historical Revenue × Seasonal Factor × (1 + Growth Trend)',
 'financial',
 '[{"name": "Historical Revenue", "description": "Average monthly revenue over past period"}, {"name": "Seasonal Factor", "description": "Month-specific multiplier based on historical patterns"}, {"name": "Growth Trend", "description": "Year-over-year growth rate"}]'::jsonb,
 '{"inputs": {"historicalRevenue": 12000, "seasonalFactor": 1.05, "growthTrend": 0.03}, "calculation": "$12,000 × 1.05 × 1.03", "result": "$12,978"}'::jsonb,
 ARRAY['RevenueForecastWidget', 'IncomeProjection', 'CashFlowForecast'],
 true),

-- 31. Cash Flow Sensitivity
('Cash Flow Sensitivity',
 'Measures how cash flow changes in response to key variable changes.',
 'Sensitivity = ∂Cash Flow / ∂Variable (partial derivative)',
 'financial',
 '[{"name": "Cash Flow", "description": "Current monthly or annual cash flow"}, {"name": "Variable", "description": "Input being tested (rent, vacancy, expenses, interest rate)"}]'::jsonb,
 '{"inputs": {"baseCashFlow": 4000, "rentIncrease": 100, "newCashFlow": 4085}, "calculation": "ΔCash Flow / ΔRent = $85 / $100", "result": "0.85 sensitivity (85% of rent increase flows to cash)"}'::jsonb,
 ARRAY['CashFlowSensitivityWidget', 'ScenarioAnalysis', 'StressTest'],
 true),

-- 32. Price Elasticity of Rent
('Price Elasticity of Rent',
 'Measures how occupancy changes when rent is adjusted. Helps optimize pricing.',
 'Elasticity = % Change in Occupancy / % Change in Rent',
 'performance',
 '[{"name": "Occupancy Change", "description": "Percentage point change in occupancy rate"}, {"name": "Rent Change", "description": "Percentage change in rent price"}]'::jsonb,
 '{"inputs": {"occupancyChange": -2, "rentChange": 5}, "calculation": "-2% / 5%", "result": "-0.4 (Inelastic)"}'::jsonb,
 ARRAY['PriceElasticityWidget', 'RentOptimization', 'PricingStrategy'],
 true),

-- 33. Market Cycle Position
('Market Cycle Position',
 'Identifies current position in the real estate market cycle based on multiple indicators.',
 'Position = Weighted(Vacancy Rate Trend, Rent Growth, Supply Pipeline, Economic Indicators)',
 'performance',
 '[{"name": "Vacancy Trend", "description": "Rising or falling vacancy rates"}, {"name": "Rent Growth", "description": "Year-over-year rent appreciation"}, {"name": "Supply Pipeline", "description": "New construction as % of existing stock"}, {"name": "Economic Indicators", "description": "Employment, GDP, interest rates"}]'::jsonb,
 '{"inputs": {"vacancyTrend": "falling", "rentGrowth": 0.04, "supplyPipeline": 0.02, "economicScore": 75}, "calculation": "Composite scoring model", "result": "Expansion Phase (3 of 4)"}'::jsonb,
 ARRAY['MarketCycleWidget', 'MarketAnalysis', 'EconomicIndicators'],
 true),

-- 34. Optimal Lease Term
('Optimal Lease Term',
 'Calculates the lease duration that maximizes NPV considering renewal probability and vacancy risk.',
 'Optimal Term = argmax(NPV(Lease Revenue) - Vacancy Risk Cost)',
 'financial',
 '[{"name": "Monthly Rent", "description": "Expected monthly rent amount"}, {"name": "Renewal Probability", "description": "Likelihood of tenant renewing at each term length"}, {"name": "Vacancy Risk", "description": "Probability and cost of vacancy between tenants"}, {"name": "Discount Rate", "description": "Time value of money factor"}]'::jsonb,
 '{"inputs": {"monthlyRent": 2000, "renewalProb12mo": 0.7, "renewalProb24mo": 0.5, "vacancyCost": 4000}, "calculation": "NPV comparison across 6, 12, 18, 24 month terms", "result": "12 months optimal"}'::jsonb,
 ARRAY['OptimalLeaseWidget', 'LeaseAnalysis', 'TenantRetention'],
 true),

-- 35. Tax Optimization Score
('Tax Optimization Score',
 'Measures effectiveness of tax strategies including depreciation and deductions.',
 'Tax Savings = Depreciation Deduction + Interest Deduction + Operating Expense Deductions + 1031 Potential',
 'financial',
 '[{"name": "Depreciation", "description": "Annual depreciation expense (building value / 27.5 years)"}, {"name": "Interest", "description": "Mortgage interest paid (deductible)"}, {"name": "Operating Expenses", "description": "Deductible operating costs"}, {"name": "1031 Potential", "description": "Estimated tax deferral from exchange eligibility"}]'::jsonb,
 '{"inputs": {"depreciation": 8000, "interest": 9600, "operatingExpenses": 12000, "taxRate": 0.32}, "calculation": "($8,000 + $9,600 + $12,000) × 0.32", "result": "$9,472 tax savings"}'::jsonb,
 ARRAY['TaxOptimizationWidget', 'TaxPlanning', 'FinancialPlanning'],
 true),

-- 36. Preventive vs Reactive Maintenance
('Preventive vs Reactive Ratio',
 'Compares cost-effectiveness of preventive maintenance versus reactive repairs.',
 'Value Ratio = Preventive Cost / (Reactive Cost + Downtime Cost)',
 'financial',
 '[{"name": "Preventive Cost", "description": "Annual cost of scheduled maintenance"}, {"name": "Reactive Cost", "description": "Average cost of emergency repairs"}, {"name": "Downtime Cost", "description": "Lost rent and tenant impact from breakdowns"}]'::jsonb,
 '{"inputs": {"preventiveCost": 2000, "reactiveCost": 3500, "downtimeCost": 1500}, "calculation": "$2,000 / ($3,500 + $1,500)", "result": "0.40 (Preventive is 60% cheaper)"}'::jsonb,
 ARRAY['MaintenanceRatioWidget', 'MaintenanceAnalysis', 'CostOptimization'],
 true),

-- 37. Capital Expenditure Planning
('Capital Expenditure Planning',
 'Forecasts major repairs and replacements based on component age and useful life.',
 'CapEx Reserve = Σ(Replacement Cost × (Component Age / Expected Life))',
 'financial',
 '[{"name": "Replacement Cost", "description": "Cost to replace the component"}, {"name": "Component Age", "description": "Current age of the component in years"}, {"name": "Expected Life", "description": "Typical lifespan of the component"}]'::jsonb,
 '{"inputs": {"roofCost": 15000, "roofAge": 12, "roofLife": 25, "hvacCost": 8000, "hvacAge": 8, "hvacLife": 15}, "calculation": "($15,000 × 12/25) + ($8,000 × 8/15)", "result": "$11,467 reserve needed"}'::jsonb,
 ARRAY['CapExWidget', 'ReservePlanning', 'MaintenanceBudget'],
 true),

-- 38. Rent Health Score
('Rent Health Score',
 'Overall score measuring rent collection performance and payment reliability.',
 'Score = (Collection Rate × 0.4) + (On-Time Rate × 0.3) + (Trend Score × 0.3) × 100',
 'health',
 '[{"name": "Collection Rate", "description": "Percentage of rent collected vs expected (0-1)"}, {"name": "On-Time Rate", "description": "Percentage of payments received on time (0-1)"}, {"name": "Trend Score", "description": "Improvement or decline in collection over time (0-1)"}]'::jsonb,
 '{"inputs": {"collectionRate": 0.98, "onTimeRate": 0.92, "trendScore": 0.85}, "calculation": "(0.98 × 0.4) + (0.92 × 0.3) + (0.85 × 0.3) × 100", "result": "92.3"}'::jsonb,
 ARRAY['RentHealthWidget', 'PaymentOverview', 'CollectionMetrics'],
 true),

-- 39. Portfolio Health Score
('Portfolio Health Score',
 'Comprehensive portfolio performance metric combining financial, operational, and risk factors.',
 'Score = (Financial Score × 0.35) + (Occupancy Score × 0.25) + (Maintenance Score × 0.20) + (Risk Score × 0.20)',
 'health',
 '[{"name": "Financial Score", "description": "Cash flow, ROI, and collection metrics (0-100)"}, {"name": "Occupancy Score", "description": "Occupancy rate and tenant retention (0-100)"}, {"name": "Maintenance Score", "description": "Property condition and maintenance responsiveness (0-100)"}, {"name": "Risk Score", "description": "Inverse of portfolio risk level (0-100)"}]'::jsonb,
 '{"inputs": {"financialScore": 85, "occupancyScore": 92, "maintenanceScore": 78, "riskScore": 88}, "calculation": "(85 × 0.35) + (92 × 0.25) + (78 × 0.20) + (88 × 0.20)", "result": "85.55"}'::jsonb,
 ARRAY['PortfolioHealthWidget', 'HealthDashboard', 'PerformanceOverview'],
 true),

-- 40. Occupancy Rate
('Occupancy Rate',
 'Percentage of available units that are currently occupied by paying tenants.',
 'Occupancy Rate = (Occupied Units / Total Units) × 100',
 'occupancy',
 '[{"name": "Occupied Units", "description": "Number of units with active, paying tenants"}, {"name": "Total Units", "description": "Total rentable units in portfolio"}]'::jsonb,
 '{"inputs": {"occupiedUnits": 23, "totalUnits": 25}, "calculation": "(23 / 25) × 100", "result": "92%"}'::jsonb,
 ARRAY['OccupancyRateWidget', 'PortfolioMetrics', 'DashboardKPI'],
 true),

-- 41. Collection Rate
('Collection Rate',
 'Percentage of expected rent that was actually collected in a given period.',
 'Collection Rate = (Rent Collected / Rent Expected) × 100',
 'financial',
 '[{"name": "Rent Collected", "description": "Total rent payments received"}, {"name": "Rent Expected", "description": "Total rent due from all occupied units"}]'::jsonb,
 '{"inputs": {"rentCollected": 48500, "rentExpected": 50000}, "calculation": "($48,500 / $50,000) × 100", "result": "97%"}'::jsonb,
 ARRAY['CollectionRateWidget', 'PaymentMetrics', 'FinancialHealth'],
 true),

-- 42. Cap Rate
('Capitalization Rate',
 'Rate of return on a property based on expected income. Key metric for property valuation.',
 'Cap Rate = (Net Operating Income / Current Market Value) × 100',
 'investment',
 '[{"name": "NOI", "description": "Annual Net Operating Income"}, {"name": "Market Value", "description": "Current property market value"}]'::jsonb,
 '{"inputs": {"noi": 24000, "marketValue": 320000}, "calculation": "($24,000 / $320,000) × 100", "result": "7.5%"}'::jsonb,
 ARRAY['CapRateWidget', 'PropertyValuation', 'InvestmentMetrics'],
 true),

-- 43. Break-even Occupancy
('Break-even Occupancy',
 'Minimum occupancy rate needed to cover all expenses including debt service.',
 'Break-even = (Operating Expenses + Debt Service) / Potential Gross Income × 100',
 'occupancy',
 '[{"name": "Operating Expenses", "description": "Annual operating costs"}, {"name": "Debt Service", "description": "Annual mortgage payments"}, {"name": "Potential Gross Income", "description": "Income if 100% occupied at market rents"}]'::jsonb,
 '{"inputs": {"operatingExpenses": 36000, "debtService": 38400, "pgi": 102000}, "calculation": "($36,000 + $38,400) / $102,000 × 100", "result": "72.9%"}'::jsonb,
 ARRAY['BreakevenWidget', 'OccupancyAnalysis', 'RiskMetrics'],
 true),

-- 44. Cash-on-Cash Return
('Cash-on-Cash Return',
 'Annual return on actual cash invested, accounting for leverage.',
 'CoC Return = (Annual Cash Flow / Cash Invested) × 100',
 'investment',
 '[{"name": "Annual Cash Flow", "description": "Net cash after all expenses and debt service"}, {"name": "Cash Invested", "description": "Down payment plus closing costs and improvements"}]'::jsonb,
 '{"inputs": {"annualCashFlow": 12000, "cashInvested": 80000}, "calculation": "($12,000 / $80,000) × 100", "result": "15%"}'::jsonb,
 ARRAY['CashOnCashWidget', 'ReturnMetrics', 'InvestmentPerformance'],
 true),

-- 45. Expense Ratio
('Expense Ratio',
 'Operating expenses as a percentage of effective gross income.',
 'Expense Ratio = (Operating Expenses / Effective Gross Income) × 100',
 'financial',
 '[{"name": "Operating Expenses", "description": "Total operating costs excluding debt"}, {"name": "Effective Gross Income", "description": "Actual collected income after vacancy"}]'::jsonb,
 '{"inputs": {"operatingExpenses": 36000, "egi": 94000}, "calculation": "($36,000 / $94,000) × 100", "result": "38.3%"}'::jsonb,
 ARRAY['ExpenseRatioWidget', 'CostAnalysis', 'FinancialMetrics'],
 true),

-- 46. Lease Expiration Forecast
('Lease Expiration Forecast',
 'Predicts upcoming lease expirations and associated revenue risk.',
 'At-Risk Revenue = Σ(Expiring Rent × (1 - Renewal Probability))',
 'performance',
 '[{"name": "Expiring Rent", "description": "Monthly rent of units with upcoming expirations"}, {"name": "Renewal Probability", "description": "Likelihood of tenant renewal based on history"}]'::jsonb,
 '{"inputs": {"unit1Rent": 1500, "unit1Renewal": 0.8, "unit2Rent": 2000, "unit2Renewal": 0.6}, "calculation": "($1,500 × 0.2) + ($2,000 × 0.4)", "result": "$1,100 at-risk monthly"}'::jsonb,
 ARRAY['LeaseExpirationWidget', 'RenewalForecast', 'RevenueRisk'],
 true),

-- 47. Maintenance Response Time
('Maintenance Response Time',
 'Average time from maintenance request submission to first response or action.',
 'Response Time = Avg(Response Timestamp - Request Timestamp)',
 'performance',
 '[{"name": "Response Timestamp", "description": "When maintenance team first responded"}, {"name": "Request Timestamp", "description": "When tenant submitted the request"}]'::jsonb,
 '{"inputs": {"totalRequests": 45, "totalResponseHours": 540}, "calculation": "540 hours / 45 requests", "result": "12 hours average"}'::jsonb,
 ARRAY['MaintenanceResponseWidget', 'OperationalMetrics', 'ServiceLevel'],
 true),

-- 48. Tenant Retention Rate
('Tenant Retention Rate',
 'Percentage of tenants who renew their lease when it expires.',
 'Retention Rate = (Renewed Leases / Expiring Leases) × 100',
 'occupancy',
 '[{"name": "Renewed Leases", "description": "Number of tenants who renewed"}, {"name": "Expiring Leases", "description": "Total leases that came up for renewal"}]'::jsonb,
 '{"inputs": {"renewedLeases": 18, "expiringLeases": 22}, "calculation": "(18 / 22) × 100", "result": "81.8%"}'::jsonb,
 ARRAY['TenantRetentionWidget', 'RetentionMetrics', 'TenantAnalysis'],
 true),

-- 49. Days to Fill Vacancy
('Days to Fill Vacancy',
 'Average time to lease a vacant unit from move-out to new tenant move-in.',
 'Days to Fill = Avg(New Lease Start - Previous Lease End)',
 'occupancy',
 '[{"name": "New Lease Start", "description": "Move-in date of new tenant"}, {"name": "Previous Lease End", "description": "Move-out date of previous tenant"}]'::jsonb,
 '{"inputs": {"totalVacancies": 8, "totalDaysVacant": 240}, "calculation": "240 days / 8 vacancies", "result": "30 days average"}'::jsonb,
 ARRAY['DaysToFillWidget', 'VacancyMetrics', 'LeasingVelocity'],
 true),

-- 50. Application to Lease Ratio
('Application to Lease Ratio',
 'Conversion rate from rental applications to signed leases.',
 'Conversion = (Signed Leases / Applications Received) × 100',
 'performance',
 '[{"name": "Signed Leases", "description": "Applications that became executed leases"}, {"name": "Applications", "description": "Total rental applications received"}]'::jsonb,
 '{"inputs": {"signedLeases": 15, "applications": 42}, "calculation": "(15 / 42) × 100", "result": "35.7%"}'::jsonb,
 ARRAY['ApplicationRatioWidget', 'LeasingMetrics', 'ConversionAnalysis'],
 true),

-- 51. Net Operating Income
('Net Operating Income',
 'Property income after operating expenses but before debt service and taxes.',
 'NOI = Gross Operating Income - Operating Expenses',
 'financial',
 '[{"name": "Gross Operating Income", "description": "All rental income plus other income"}, {"name": "Operating Expenses", "description": "All expenses except mortgage and income taxes"}]'::jsonb,
 '{"inputs": {"grossIncome": 96000, "operatingExpenses": 36000}, "calculation": "$96,000 - $36,000", "result": "$60,000"}'::jsonb,
 ARRAY['NOIWidget', 'PropertyFinancials', 'IncomeStatement'],
 true),

-- 52. Effective Gross Income
('Effective Gross Income',
 'Actual collected income accounting for vacancy and collection losses.',
 'EGI = Potential Gross Income - Vacancy Loss - Collection Loss',
 'financial',
 '[{"name": "Potential Gross Income", "description": "Maximum possible income at full occupancy"}, {"name": "Vacancy Loss", "description": "Income lost due to vacant units"}, {"name": "Collection Loss", "description": "Income lost due to non-payment"}]'::jsonb,
 '{"inputs": {"pgi": 102000, "vacancyLoss": 6000, "collectionLoss": 2000}, "calculation": "$102,000 - $6,000 - $2,000", "result": "$94,000"}'::jsonb,
 ARRAY['EGIWidget', 'IncomeAnalysis', 'RevenueMetrics'],
 true),

-- 53. Internal Rate of Return
('Internal Rate of Return',
 'Discount rate that makes NPV of all cash flows equal to zero. Key investment metric.',
 'IRR = rate where Σ(Cash Flow / (1 + rate)^t) = Initial Investment',
 'investment',
 '[{"name": "Initial Investment", "description": "Cash paid at acquisition"}, {"name": "Annual Cash Flows", "description": "Net cash each year including final sale"}, {"name": "Holding Period", "description": "Investment duration in years"}]'::jsonb,
 '{"inputs": {"initialInvestment": 80000, "annualCashFlow": 9600, "saleProceeds": 120000, "years": 5}, "calculation": "Iterative calculation solving for discount rate", "result": "18.2% IRR"}'::jsonb,
 ARRAY['IRRWidget', 'InvestmentReturns', 'PerformanceMetrics'],
 true),

-- 54. Total Return
('Total Return',
 'Combined return from cash flow and appreciation over the investment period.',
 'Total Return = ((Cash Flow + Appreciation) / Initial Investment) × 100',
 'investment',
 '[{"name": "Total Cash Flow", "description": "Sum of all net cash flows during holding"}, {"name": "Appreciation", "description": "Increase in property value"}, {"name": "Initial Investment", "description": "Cash invested at purchase"}]'::jsonb,
 '{"inputs": {"totalCashFlow": 48000, "appreciation": 65000, "initialInvestment": 80000}, "calculation": "(($48,000 + $65,000) / $80,000) × 100", "result": "141.25%"}'::jsonb,
 ARRAY['TotalReturnWidget', 'InvestmentSummary', 'PerformanceOverview'],
 true),

-- 55. Equity Build Rate
('Equity Build Rate',
 'Annual increase in equity from mortgage principal paydown and appreciation.',
 'Equity Build = Annual Principal Paid + Annual Appreciation',
 'investment',
 '[{"name": "Principal Paid", "description": "Annual mortgage principal reduction"}, {"name": "Appreciation", "description": "Annual property value increase"}]'::jsonb,
 '{"inputs": {"principalPaid": 4800, "appreciation": 12000}, "calculation": "$4,800 + $12,000", "result": "$16,800 per year"}'::jsonb,
 ARRAY['EquityBuildWidget', 'WealthGrowth', 'EquityAnalysis'],
 true),

-- 56. Vacancy Rate
('Vacancy Rate',
 'Percentage of units that are currently vacant and not generating income.',
 'Vacancy Rate = (Vacant Units / Total Units) × 100',
 'occupancy',
 '[{"name": "Vacant Units", "description": "Number of unoccupied units"}, {"name": "Total Units", "description": "Total rentable units"}]'::jsonb,
 '{"inputs": {"vacantUnits": 2, "totalUnits": 25}, "calculation": "(2 / 25) × 100", "result": "8%"}'::jsonb,
 ARRAY['VacancyRateWidget', 'OccupancyMetrics', 'PortfolioHealth'],
 true),

-- 57. Average Rent
('Average Rent',
 'Mean rent across all occupied units in the portfolio.',
 'Average Rent = Total Rent Collected / Number of Occupied Units',
 'financial',
 '[{"name": "Total Rent", "description": "Sum of all monthly rents"}, {"name": "Occupied Units", "description": "Number of units generating rent"}]'::jsonb,
 '{"inputs": {"totalRent": 46000, "occupiedUnits": 23}, "calculation": "$46,000 / 23", "result": "$2,000"}'::jsonb,
 ARRAY['AverageRentWidget', 'RentMetrics', 'PortfolioSummary'],
 true),

-- 58. Rent Growth Rate
('Rent Growth Rate',
 'Year-over-year percentage increase in average rent.',
 'Rent Growth = ((Current Avg Rent - Prior Year Avg Rent) / Prior Year Avg Rent) × 100',
 'financial',
 '[{"name": "Current Rent", "description": "Current period average rent"}, {"name": "Prior Rent", "description": "Same period last year average rent"}]'::jsonb,
 '{"inputs": {"currentRent": 2000, "priorRent": 1900}, "calculation": "(($2,000 - $1,900) / $1,900) × 100", "result": "5.26%"}'::jsonb,
 ARRAY['RentGrowthWidget', 'TrendAnalysis', 'MarketMetrics'],
 true),

-- 59. Delinquency Rate
('Delinquency Rate',
 'Percentage of rent that is past due beyond the grace period.',
 'Delinquency Rate = (Past Due Rent / Total Expected Rent) × 100',
 'financial',
 '[{"name": "Past Due Rent", "description": "Rent outstanding beyond grace period"}, {"name": "Expected Rent", "description": "Total rent due for the period"}]'::jsonb,
 '{"inputs": {"pastDueRent": 3000, "expectedRent": 50000}, "calculation": "($3,000 / $50,000) × 100", "result": "6%"}'::jsonb,
 ARRAY['DelinquencyWidget', 'CollectionMetrics', 'RiskIndicators'],
 true),

-- 60. Rent-to-Income Ratio
('Rent-to-Income Ratio',
 'Tenant affordability metric comparing rent to their gross income.',
 'Rent/Income = (Monthly Rent / Monthly Gross Income) × 100',
 'performance',
 '[{"name": "Monthly Rent", "description": "Rent charged to tenant"}, {"name": "Gross Income", "description": "Tenant reported monthly income"}]'::jsonb,
 '{"inputs": {"monthlyRent": 1800, "monthlyIncome": 6000}, "calculation": "($1,800 / $6,000) × 100", "result": "30%"}'::jsonb,
 ARRAY['RentToIncomeWidget', 'TenantScreening', 'AffordabilityAnalysis'],
 true);
