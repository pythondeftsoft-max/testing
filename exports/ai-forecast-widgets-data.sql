-- ============================================
-- AI FORECAST & HEALTH OVERVIEW WIDGETS DATA
-- Complete Dataset with 62 Widgets and Formulas
-- ============================================

-- ========== CORE METRICS WIDGETS (21 widgets) ==========

INSERT INTO ai_forecast_widgets (id, name, description, widget_type, component_type, group_name, is_core) VALUES
('vacancy-risk-score', 'Vacancy Risk Score', 'AI-powered risk assessment for potential vacancies', 'vacancy-risk-score', 'metric', 'core-metrics', TRUE),
('predicted-noi', 'Predicted NOI', 'AI forecast of Net Operating Income for next 12 months', 'predicted-noi', 'metric', 'core-metrics', TRUE),
('market-rent-gap', 'Market Rent Gap', 'Gap between current rent and optimal market rate', 'market-rent-gap', 'metric', 'core-metrics', TRUE),
('predictive-maintenance-cost', 'Predictive Maintenance Cost', 'AI forecast of upcoming maintenance expenses', 'predictive-maintenance-cost', 'metric', 'core-metrics', TRUE),
('tenant-churn-prediction', 'Tenant Churn Prediction', 'AI model predicting which tenants are likely to leave', 'tenant-churn-prediction', 'metric', 'core-metrics', FALSE),
('tenant-quality-score', 'Tenant Quality Score', 'Score tenants based on payment history and property care', 'tenant-quality-score', 'metric', 'core-metrics', FALSE),
('tenant-satisfaction-predictor', 'Tenant Satisfaction Predictor', 'Predict tenant satisfaction based on various factors', 'tenant-satisfaction-predictor', 'metric', 'core-metrics', FALSE),
('vacancy-cost-impact', 'Vacancy Cost Impact', 'Calculate total cost impact of each vacancy', 'vacancy-cost-impact', 'metric', 'core-metrics', FALSE),
('portfolio-roi-projection', 'Portfolio ROI Projection', '5-year ROI predictions with scenario analysis', 'portfolio-roi-projection', 'metric', 'core-metrics', FALSE),
('investment-risk-score', 'Investment Risk Score', 'Comprehensive risk assessment for each property', 'investment-risk-score', 'metric', 'core-metrics', FALSE),
('property-appreciation-forecast', 'Property Appreciation Forecast', 'AI-powered property value predictions', 'property-appreciation-forecast', 'metric', 'core-metrics', FALSE),
('refinancing-opportunity-score', 'Refinancing Opportunity Score', 'Score for optimal refinancing timing', 'refinancing-opportunity-score', 'metric', 'core-metrics', FALSE),
('dynamic-pricing-optimizer', 'Dynamic Pricing Optimizer', 'Real-time rent optimization based on demand', 'dynamic-pricing-optimizer', 'metric', 'core-metrics', FALSE),
('market-saturation-indicator', 'Market Saturation Indicator', 'Identify over/under-supplied markets', 'market-saturation-indicator', 'metric', 'core-metrics', FALSE),
('neighborhood-growth-score', 'Neighborhood Growth Score', 'Predict area development and gentrification', 'neighborhood-growth-score', 'metric', 'core-metrics', FALSE),
('rental-demand-forecast', 'Rental Demand Forecast', 'Predict rental demand by property type/location', 'rental-demand-forecast', 'metric', 'core-metrics', FALSE),
('tenant-default-probability', 'Tenant Default Probability', 'Predict which tenants may default on rent', 'tenant-default-probability', 'metric', 'core-metrics', FALSE),
('legal-risk-assessment', 'Legal Risk Assessment', 'Identify potential legal/compliance issues', 'legal-risk-assessment', 'metric', 'core-metrics', FALSE),
('natural-disaster-risk', 'Natural Disaster Risk', 'Climate change impact on properties', 'natural-disaster-risk', 'metric', 'core-metrics', FALSE);

-- ========== CHARTS & TRENDS WIDGETS (16 widgets) ==========

INSERT INTO ai_forecast_widgets (id, name, description, widget_type, component_type, group_name, is_core) VALUES
('vacancy-trend-analysis', 'Vacancy Trend Analysis', 'Visual analysis of vacancy patterns and seasonality', 'vacancy-trend-analysis', 'chart', 'charts-trends', TRUE),
('revenue-forecast-chart', 'Revenue Forecast Chart', '12-month revenue predictions with confidence intervals', 'revenue-forecast-chart', 'chart', 'charts-trends', TRUE),
('market-intelligence-chart', 'Market Intelligence Chart', 'Competitive market positioning and trends', 'market-intelligence-chart', 'chart', 'charts-trends', TRUE),
('maintenance-timeline-forecast', 'Maintenance Timeline Forecast', 'Timeline of predicted maintenance needs', 'maintenance-timeline-forecast', 'chart', 'charts-trends', TRUE),
('seasonal-vacancy-patterns', 'Seasonal Vacancy Patterns', 'Identify when properties are most likely to become vacant', 'seasonal-vacancy-patterns', 'chart', 'charts-trends', FALSE),
('move-out-risk-heatmap', 'Move-out Risk Heatmap', 'Visual heatmap showing move-out risk across properties', 'move-out-risk-heatmap', 'chart', 'charts-trends', FALSE),
('tenant-renewal-trends', 'Tenant Renewal Trends', 'Historical and predicted tenant renewal patterns', 'tenant-renewal-trends', 'chart', 'charts-trends', FALSE),
('cash-flow-sensitivity-chart', 'Cash Flow Sensitivity Analysis', 'How changes in key variables affect cash flow', 'cash-flow-sensitivity-chart', 'chart', 'charts-trends', FALSE),
('market-cycle-position', 'Market Cycle Position', 'Where we are in the real estate cycle', 'market-cycle-position', 'chart', 'charts-trends', FALSE),
('stress-test-scenarios', 'Stress Test Scenarios', 'How portfolio performs under various economic scenarios', 'stress-test-scenarios', 'chart', 'charts-trends', FALSE),
('portfolio-diversification-chart', 'Portfolio Diversification Analysis', 'Risk distribution across property types/locations', 'portfolio-diversification-chart', 'chart', 'charts-trends', FALSE),
('competitor-analysis-chart', 'Competitor Analysis Dashboard', 'Track competitor pricing and occupancy', 'competitor-analysis-chart', 'chart', 'charts-trends', FALSE),
('price-elasticity-chart', 'Price Elasticity Analysis', 'How rent changes affect occupancy rates', 'price-elasticity-chart', 'chart', 'charts-trends', FALSE),
('economic-impact-chart', 'Economic Impact Predictor', 'How economic changes affect local rental markets', 'economic-impact-chart', 'chart', 'charts-trends', FALSE),
('predictive-equipment-failure', 'Predictive Equipment Failure', 'When HVAC, appliances, systems will fail', 'predictive-equipment-failure', 'chart', 'charts-trends', FALSE),
('maintenance-roi-chart', 'Maintenance ROI Calculator', 'Which maintenance provides best return', 'maintenance-roi-chart', 'chart', 'charts-trends', FALSE),
('energy-efficiency-chart', 'Energy Efficiency Optimizer', 'AI recommendations for energy savings', 'energy-efficiency-chart', 'chart', 'charts-trends', FALSE);

-- ========== ANALYSIS TOOLS WIDGETS (19 widgets) ==========

INSERT INTO ai_forecast_widgets (id, name, description, widget_type, component_type, group_name, is_core) VALUES
('property-risk-assessment', 'Property Risk Assessment', 'Comprehensive risk analysis with contributing factors', 'property-risk-assessment', 'panel', 'analysis-tools', TRUE),
('financial-health-analysis', 'Financial Health Analysis', 'Deep dive into portfolio financial performance', 'financial-health-analysis', 'panel', 'analysis-tools', TRUE),
('competitive-analysis-panel', 'Competitive Analysis', 'Market positioning vs competitors', 'competitive-analysis-panel', 'panel', 'analysis-tools', TRUE),
('maintenance-optimization', 'Maintenance Optimization', 'Optimize maintenance schedules and costs', 'maintenance-optimization', 'panel', 'analysis-tools', TRUE),
('optimal-lease-term-analysis', 'Optimal Lease Term Analysis', 'Recommend ideal lease lengths based on market conditions', 'optimal-lease-term-analysis', 'panel', 'analysis-tools', FALSE),
('lease-renewal-strategy', 'Lease Renewal Strategy', 'AI recommendations for renewal negotiations', 'lease-renewal-strategy', 'panel', 'analysis-tools', FALSE),
('optimal-capital-allocation', 'Optimal Capital Allocation', 'Where to invest next dollar for maximum return', 'optimal-capital-allocation', 'panel', 'analysis-tools', FALSE),
('tax-optimization-strategies', 'Tax Optimization Strategies', 'AI recommendations for tax-efficient strategies', 'tax-optimization-strategies', 'panel', 'analysis-tools', FALSE),
('refinancing-opportunity-tracker', 'Refinancing Opportunity Tracker', 'When to refinance based on market conditions', 'refinancing-opportunity-tracker', 'panel', 'analysis-tools', FALSE),
('market-timing-advisor', 'Market Timing Advisor', 'Best times to buy/sell/raise rents', 'market-timing-advisor', 'panel', 'analysis-tools', FALSE),
('vendor-performance-optimizer', 'Vendor Performance Optimizer', 'Best vendors for each type of work', 'vendor-performance-optimizer', 'panel', 'analysis-tools', FALSE),
('preventive-vs-reactive-analysis', 'Preventive vs Reactive Cost Analysis', 'Cost savings from preventive maintenance', 'preventive-vs-reactive-analysis', 'panel', 'analysis-tools', FALSE),
('property-condition-scoring', 'Property Condition Scoring', 'Overall condition assessment with improvement priorities', 'property-condition-scoring', 'panel', 'analysis-tools', FALSE),
('capital-expenditure-planner', 'Capital Expenditure Planner', 'When to replace vs repair major systems', 'capital-expenditure-planner', 'panel', 'analysis-tools', FALSE),
('emergency-response-predictor', 'Emergency Response Predictor', 'Predict likelihood of emergency maintenance calls', 'emergency-response-predictor', 'panel', 'analysis-tools', FALSE),
('insurance-optimization', 'Insurance Optimization', 'Recommend optimal insurance coverage levels', 'insurance-optimization', 'panel', 'analysis-tools', FALSE),
('regulatory-change-impact', 'Regulatory Change Impact', 'How new laws/regulations affect operations', 'regulatory-change-impact', 'panel', 'analysis-tools', FALSE),
('portfolio-concentration-risk', 'Portfolio Concentration Risk', 'Identify over-concentration in markets/property types', 'portfolio-concentration-risk', 'panel', 'analysis-tools', FALSE);

-- ========== COMPARATIVE ANALYSIS WIDGETS (6 widgets) ==========

INSERT INTO ai_forecast_widgets (id, name, description, widget_type, component_type, group_name, is_core) VALUES
('peer-portfolio-comparison', 'Peer Portfolio Comparison', 'Compare against similar portfolios in market', 'peer-portfolio-comparison', 'chart', 'comparative-analysis', FALSE),
('best-practice-identifier', 'Best Practice Identifier', 'What top-performing portfolios do differently', 'best-practice-identifier', 'panel', 'comparative-analysis', FALSE),
('performance-attribution-analysis', 'Performance Attribution Analysis', 'What drives outperformance', 'performance-attribution-analysis', 'chart', 'comparative-analysis', FALSE),
('market-share-analysis', 'Market Share Analysis', 'Your share of local rental market', 'market-share-analysis', 'chart', 'comparative-analysis', FALSE),
('efficiency-benchmarking', 'Efficiency Benchmarking', 'Operations efficiency vs competitors', 'efficiency-benchmarking', 'chart', 'comparative-analysis', FALSE),
('innovation-opportunity-tracker', 'Innovation Opportunity Tracker', 'New technologies/strategies to consider', 'innovation-opportunity-tracker', 'panel', 'comparative-analysis', FALSE);