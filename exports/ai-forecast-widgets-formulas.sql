-- ============================================
-- AI FORECAST WIDGETS - DETAILED FORMULAS
-- Complete Mathematical Expressions and Calculations
-- ============================================

-- ========== CORE METRICS FORMULAS ==========

-- Vacancy Risk Score
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('vacancy-risk-score', 'ML Vacancy Risk Model', 'P(Vacancy) = β₀ + β₁(Payment_History_Score) + β₂(Lease_Expiration_Days) + β₃(Market_Vacancy_Rate) + β₄(Property_Condition_Score) + β₅(Tenant_Communication_Score)', 'Logistic regression model predicting vacancy probability', ARRAY['payment_history', 'lease_expiration', 'market_vacancy_rate', 'property_condition', 'tenant_communication'], 'Logistic Regression with Gradient Boosting', 'Gradient Boosting Classifier', '24 months');

-- Predicted NOI
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('predicted-noi', 'NOI Forecast Model', 'Predicted_NOI = Historical_NOI × (1 + Rent_Growth_Rate - Expense_Inflation_Rate) × Occupancy_Forecast × Seasonal_Adjustment × Market_Trend_Multiplier', 'Time series forecasting with seasonal adjustments and market factors', ARRAY['historical_noi', 'rent_growth_rate', 'expense_inflation', 'occupancy_forecast', 'seasonal_factors', 'market_trends'], 'ARIMA with External Regressors', 'ARIMA-X Model', '36 months');

-- Market Rent Gap
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('market-rent-gap', 'Market Rent Optimization', 'Market_Rent_Gap = Market_Median_Rent - Current_Rent; Optimization_Opportunity = Gap × Annual_Months × Probability_of_Acceptance', 'Comparative market analysis for rent optimization', ARRAY['market_median_rent', 'current_rent', 'comparable_properties', 'tenant_price_sensitivity'], 'Hedonic Pricing Model', 'Random Forest Regressor', '12 months');

-- Predictive Maintenance Cost
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('predictive-maintenance-cost', 'Maintenance Cost Forecast', 'Predicted_Cost = Σ(Equipment_Age_Factor × Usage_Patterns × Failure_Probability × Average_Repair_Cost) + Emergency_Risk_Premium', 'Predictive model for maintenance expenses based on equipment lifecycle', ARRAY['equipment_age', 'usage_patterns', 'failure_history', 'repair_costs', 'seasonal_factors'], 'Survival Analysis with Cost Modeling', 'Cox Proportional Hazards', '60 months');

-- Tenant Churn Prediction
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('tenant-churn-prediction', 'Tenant Churn Model', 'P(Churn) = 1/(1+e^-(score)) where score = Σ(βᵢ × Payment_Delays + βⱼ × Maintenance_Requests + βₖ × Lease_Renewal_History + βₗ × Market_Rent_Differential)', 'Logistic regression predicting tenant departure probability', ARRAY['payment_delays', 'maintenance_requests', 'lease_history', 'rent_differential', 'tenant_communications'], 'Logistic Regression with Feature Engineering', 'Logistic Regression', '18 months');

-- Tenant Quality Score
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('tenant-quality-score', 'Tenant Scoring Model', 'Quality_Score = Payment_History_Weight(40%) × Payment_Score + Property_Care_Weight(30%) × Care_Score + Longevity_Weight(20%) × Tenure_Score + Communication_Weight(10%) × Communication_Score', 'Weighted scoring model for tenant quality assessment', ARRAY['payment_history', 'property_care_incidents', 'tenure_length', 'communication_quality', 'lease_compliance'], 'Weighted Scoring Algorithm', 'Composite Score Model', '24 months');

-- Investment Risk Score
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('investment-risk-score', 'Portfolio Risk Assessment', 'Risk_Score = √(Market_Risk² + Property_Risk² + Tenant_Risk² + Financial_Risk²) where each component uses sub-factor analysis', 'Multi-factor risk assessment model', ARRAY['market_volatility', 'property_condition', 'tenant_stability', 'financial_leverage', 'liquidity_metrics'], 'Monte Carlo Risk Simulation', 'Value at Risk Model', '60 months');

-- Dynamic Pricing Optimizer
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('dynamic-pricing-optimizer', 'Optimal Rent Calculator', 'Optimal_Rent = Base_Rent × (1 + Demand_Multiplier) × Seasonal_Factor × Competition_Adjustment × Amenity_Premium', 'Real-time rent optimization based on market dynamics', ARRAY['base_rent', 'demand_indicators', 'seasonal_patterns', 'competitor_pricing', 'amenity_scores'], 'Dynamic Programming with ML', 'Neural Network', '18 months');

-- Portfolio ROI Projection
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('portfolio-roi-projection', '5-Year ROI Forecast', 'Projected_ROI = (Net_Income + Appreciation + Tax_Benefits - Total_Investment) / Total_Investment; includes Monte Carlo scenarios', '5-year return projection with scenario analysis', ARRAY['net_income_projection', 'appreciation_forecast', 'tax_benefits', 'total_investment', 'market_scenarios'], 'Monte Carlo Simulation', 'Stochastic Process Model', '120 months');

-- ========== CHARTS & TRENDS FORMULAS ==========

-- Vacancy Trend Analysis
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('vacancy-trend-analysis', 'Seasonal Vacancy Decomposition', 'Vacancy_Trend = Seasonal_Decomposition(Historical_Vacancy_Data) + ARIMA_Forecast(p,d,q) with confidence intervals', 'Time series analysis of vacancy patterns with seasonality', ARRAY['historical_vacancy_rates', 'seasonal_indicators', 'market_events', 'economic_indicators'], 'Seasonal ARIMA', 'SARIMA Model', '36 months');

-- Revenue Forecast Chart
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('revenue-forecast-chart', 'Revenue Prediction Model', 'Revenue_Forecast = Base_Revenue × (1 + Growth_Rate) × Occupancy_Rate × Seasonal_Adjustment ± Confidence_Interval', '12-month revenue predictions with uncertainty quantification', ARRAY['base_revenue', 'growth_rates', 'occupancy_forecasts', 'seasonal_factors', 'market_uncertainty'], 'Bayesian Forecasting', 'Bayesian Structural Time Series', '24 months');

-- Cash Flow Sensitivity Analysis
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('cash-flow-sensitivity-chart', 'Sensitivity Analysis Model', '∂(Cash_Flow)/∂(Variable) for key inputs: rent, vacancy, expenses, interest rates; Tornado diagram visualization', 'Partial derivatives showing cash flow sensitivity to key variables', ARRAY['rent_rates', 'vacancy_rates', 'operating_expenses', 'interest_rates', 'cap_ex'], 'Partial Derivative Analysis', 'Sensitivity Analysis Framework', '12 months');

-- Stress Test Scenarios
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('stress-test-scenarios', 'Economic Scenario Testing', 'Portfolio_Performance = Base_Case × Economic_Scenario_Multipliers for Recession(-20%), Inflation(+15%), Interest_Rate_Shock(+300bps)', 'Portfolio performance under various economic stress scenarios', ARRAY['base_case_metrics', 'recession_factors', 'inflation_impacts', 'interest_rate_changes', 'unemployment_rates'], 'Scenario Analysis', 'Economic Stress Test Model', '240 months');

-- ========== ANALYSIS TOOLS FORMULAS ==========

-- Property Risk Assessment
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('property-risk-assessment', 'Comprehensive Risk Model', 'Total_Risk = Financial_Risk × 0.3 + Operational_Risk × 0.25 + Market_Risk × 0.25 + Regulatory_Risk × 0.2', 'Multi-dimensional risk assessment with weighted factors', ARRAY['financial_metrics', 'operational_issues', 'market_volatility', 'regulatory_changes', 'insurance_claims'], 'Multi-Factor Risk Model', 'Principal Component Analysis', '36 months');

-- Optimal Capital Allocation
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('optimal-capital-allocation', 'Capital Optimization Model', 'Maximize: Σ(NPV_i × Investment_i) subject to Budget_Constraint and Risk_Limits', 'Portfolio optimization for maximum risk-adjusted returns', ARRAY['investment_opportunities', 'expected_returns', 'risk_metrics', 'budget_constraints', 'correlation_matrix'], 'Portfolio Optimization', 'Mean-Variance Optimization', '60 months');

-- Tax Optimization Strategies
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('tax-optimization-strategies', 'Tax Efficiency Model', 'Tax_Savings = Depreciation_Benefits + Expense_Timing_Optimization + 1031_Exchange_Benefits - Recapture_Costs', 'Comprehensive tax strategy optimization', ARRAY['depreciation_schedules', 'expense_timing', 'exchange_opportunities', 'tax_rates', 'holding_periods'], 'Tax Optimization Algorithm', 'Linear Programming', '60 months');

-- Maintenance Optimization
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('maintenance-optimization', 'Maintenance ROI Model', 'Maintenance_ROI = (Emergency_Costs_Avoided + Efficiency_Gains + Tenant_Satisfaction_Value - Preventive_Costs) / Preventive_Costs', 'Optimize maintenance schedules for maximum ROI', ARRAY['preventive_costs', 'emergency_costs', 'equipment_reliability', 'tenant_satisfaction', 'energy_efficiency'], 'Operations Research', 'Linear Programming', '36 months');

-- ========== COMPARATIVE ANALYSIS FORMULAS ==========

-- Peer Portfolio Comparison
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('peer-portfolio-comparison', 'Benchmark Analysis Model', 'Performance_Percentile = RANK(Portfolio_Metric) / COUNT(All_Portfolios) × 100 for each metric vs similar portfolios', 'Statistical ranking against peer portfolios', ARRAY['portfolio_metrics', 'peer_data', 'market_segments', 'property_types', 'geographic_regions'], 'Statistical Benchmarking', 'Percentile Ranking', '24 months');

-- Market Share Analysis
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('market-share-analysis', 'Market Share Calculator', 'Market_Share = (Your_Rental_Units / Total_Rental_Units_in_Market) × 100; includes market penetration analysis', 'Calculate and track market share by geography and property type', ARRAY['portfolio_units', 'total_market_units', 'geographic_boundaries', 'property_classifications', 'competitor_portfolios'], 'Market Analysis', 'Market Share Model', '12 months');

-- Efficiency Benchmarking
INSERT INTO widget_formulas (widget_id, formula_name, formula_expression, formula_description, variables_used, calculation_method, ml_model_type, training_data_period) VALUES
('efficiency-benchmarking', 'Operational Efficiency Model', 'Efficiency_Score = Weighted_Average(Cost_per_Unit_Percentile × 0.4 + Occupancy_Percentile × 0.3 + Maintenance_Efficiency_Percentile × 0.3)', 'Multi-factor operational efficiency comparison', ARRAY['cost_per_unit', 'occupancy_rates', 'maintenance_metrics', 'peer_benchmarks', 'industry_standards'], 'Efficiency Analysis', 'Data Envelopment Analysis', '24 months');