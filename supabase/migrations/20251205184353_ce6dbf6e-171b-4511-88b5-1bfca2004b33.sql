-- Add missing operational formulas to platform_formulas table
-- These cover payment fees, Payment Overview KPIs, and marketplace metrics

INSERT INTO public.platform_formulas (name, description, formula, category, variables, mock_example, used_in, is_system) VALUES

-- Payment & Fee Calculations (7)
('Placement Fee', 'One-time fee charged when a tenant is successfully placed in a property', 'First Month Rent × Fee Percentage', 'financial', 
  '[{"name": "First Month Rent", "description": "Monthly rent amount for the property/unit"}, {"name": "Fee Percentage", "description": "Placement fee rate (typically 40%)"}]'::jsonb,
  '{"inputs": {"first_month_rent": 1500, "fee_percentage": 0.40}, "calculation": "1500 × 0.40", "result": "$600"}'::jsonb,
  ARRAY['Placement Agreement', 'Client Services', 'Landlord Payouts'], true),

('Stripe Card Processing Fee', 'Fee charged by Stripe for credit/debit card payments', 'Payment Amount × 2.9% + $0.30', 'financial',
  '[{"name": "Payment Amount", "description": "Total payment amount being processed"}, {"name": "Card Rate", "description": "Stripe card processing rate (2.9%)"}, {"name": "Fixed Fee", "description": "Per-transaction fixed fee ($0.30)"}]'::jsonb,
  '{"inputs": {"payment_amount": 1500, "card_rate": 0.029, "fixed_fee": 0.30}, "calculation": "(1500 × 0.029) + 0.30", "result": "$43.80"}'::jsonb,
  ARRAY['Payment Processing', 'Rent Collection', 'Fee Summary'], true),

('Stripe ACH Processing Fee', 'Fee charged by Stripe for ACH bank transfer payments', 'Payment Amount × 0.8% (max $5)', 'financial',
  '[{"name": "Payment Amount", "description": "Total payment amount being processed"}, {"name": "ACH Rate", "description": "Stripe ACH processing rate (0.8%)"}, {"name": "Max Fee", "description": "Maximum fee cap ($5)"}]'::jsonb,
  '{"inputs": {"payment_amount": 1500, "ach_rate": 0.008, "max_fee": 5}, "calculation": "min(1500 × 0.008, 5)", "result": "$5.00"}'::jsonb,
  ARRAY['Payment Processing', 'Rent Collection', 'Fee Summary'], true),

('Platform Revenue Fee', 'OpenKey platform fee on each transaction', 'Payment Amount × Platform Rate', 'financial',
  '[{"name": "Payment Amount", "description": "Total payment amount being processed"}, {"name": "Platform Rate", "description": "OpenKey platform fee rate (0.5%)"}]'::jsonb,
  '{"inputs": {"payment_amount": 1500, "platform_rate": 0.005}, "calculation": "1500 × 0.005", "result": "$7.50"}'::jsonb,
  ARRAY['Payment Processing', 'Revenue Tracking', 'Platform Analytics'], true),

('Fee Split Calculation', 'How processing fees are split between tenant and landlord', 'Total Fees × Split Percentage', 'financial',
  '[{"name": "Total Fees", "description": "Combined processing and platform fees"}, {"name": "Split Percentage", "description": "Percentage paid by each party (default 50/50)"}]'::jsonb,
  '{"inputs": {"total_fees": 50, "tenant_split": 0.50, "landlord_split": 0.50}, "calculation": "50 × 0.50 each", "result": "Tenant: $25, Landlord: $25"}'::jsonb,
  ARRAY['Payment Settings', 'Fee Configuration', 'Rent Collection'], true),

('Net to Landlord', 'Final amount landlord receives after all fees', 'Rent - Processing Fee - Platform Fee + Tenant Fee Contribution', 'financial',
  '[{"name": "Rent", "description": "Total rent payment amount"}, {"name": "Processing Fee", "description": "Stripe processing fee"}, {"name": "Platform Fee", "description": "OpenKey platform fee"}, {"name": "Tenant Fee Contribution", "description": "Portion of fees paid by tenant"}]'::jsonb,
  '{"inputs": {"rent": 1500, "processing_fee": 43.80, "platform_fee": 7.50, "tenant_contribution": 25.65}, "calculation": "1500 - 43.80 - 7.50 + 25.65", "result": "$1,474.35"}'::jsonb,
  ARRAY['Landlord Dashboard', 'Payment Details', 'Financial Reports'], true),

('Late Fee Calculation', 'Fee charged when rent payment is overdue past grace period', 'Fixed Amount OR (Monthly Rent × Late Fee Rate)', 'financial',
  '[{"name": "Monthly Rent", "description": "Regular monthly rent amount"}, {"name": "Late Fee Rate", "description": "Percentage-based late fee (e.g., 5%)"}, {"name": "Fixed Amount", "description": "Flat late fee amount if not percentage-based"}]'::jsonb,
  '{"inputs": {"monthly_rent": 1500, "late_fee_rate": 0.05}, "calculation": "1500 × 0.05", "result": "$75"}'::jsonb,
  ARRAY['Rent Collection', 'Tenant Dashboard', 'Payment Tracking'], true),

-- Payment Overview KPIs (6)
('Collection Percentage', 'Percentage of expected rent that has been collected', '(Total Collected / Total Expected) × 100', 'performance',
  '[{"name": "Total Collected", "description": "Sum of all payments received (Stripe + HAP + Tagged)"}, {"name": "Total Expected", "description": "Sum of monthly rent from all occupied units"}]'::jsonb,
  '{"inputs": {"total_collected": 45000, "total_expected": 50000}, "calculation": "(45000 / 50000) × 100", "result": "90%"}'::jsonb,
  ARRAY['Payment Overview', 'Dashboard KPIs', 'Financial Reports'], true),

('Units Paid Count', 'Number of occupied units with completed payment for the period', 'Count(units WHERE payment_status = completed)', 'performance',
  '[{"name": "Occupied Units", "description": "Total units with active tenants"}, {"name": "Payment Status", "description": "Whether unit has completed payment for current period"}]'::jsonb,
  '{"inputs": {"occupied_units": 25, "units_with_payment": 22}, "calculation": "Count of units with completed payments", "result": "22 of 25 units"}'::jsonb,
  ARRAY['Payment Overview', 'Dashboard KPIs', 'Collection Tracking'], true),

('Total Accounted For', 'Units where payment collection method is tracked', 'Units with (HAP + Stripe) OR (HAP + External Tagged)', 'performance',
  '[{"name": "HAP Units", "description": "Units receiving housing assistance"}, {"name": "Stripe Units", "description": "Units with tenant paying via Stripe"}, {"name": "External Tagged", "description": "Units with external payments tagged in Plaid"}]'::jsonb,
  '{"inputs": {"total_occupied": 25, "stripe_units": 15, "external_tagged": 8, "unaccounted": 2}, "calculation": "15 + 8 = 23 accounted", "result": "23 of 25 units (92%)"}'::jsonb,
  ARRAY['Payment Overview', 'Payment Tagging', 'Collection Tracking'], true),

('On-Time Payment Rate', 'Percentage of payments received before or on due date', '(On-Time Payments / Total Payments) × 100', 'performance',
  '[{"name": "On-Time Payments", "description": "Payments received by due date + grace period"}, {"name": "Total Payments", "description": "All payments received in the period"}]'::jsonb,
  '{"inputs": {"on_time_payments": 20, "total_payments": 25}, "calculation": "(20 / 25) × 100", "result": "80%"}'::jsonb,
  ARRAY['Payment Overview', 'Tenant Performance', 'Collection Analytics'], true),

('Grace Period Status', 'Determines if payment is within grace period or officially late', 'IF days_past_due <= grace_days THEN grace ELSE late', 'performance',
  '[{"name": "Days Past Due", "description": "Days since rent due date"}, {"name": "Grace Days", "description": "Number of grace period days allowed (typically 5)"}]'::jsonb,
  '{"inputs": {"days_past_due": 3, "grace_days": 5}, "calculation": "3 <= 5", "result": "Within Grace Period"}'::jsonb,
  ARRAY['Rent Collection', 'Late Fee Processing', 'Tenant Dashboard'], true),

('Days Overdue', 'Number of days a payment is past due after grace period', 'Today - Due Date - Grace Period Days', 'performance',
  '[{"name": "Today", "description": "Current date"}, {"name": "Due Date", "description": "Original rent due date"}, {"name": "Grace Period Days", "description": "Grace period before late status"}]'::jsonb,
  '{"inputs": {"today": "2025-01-15", "due_date": "2025-01-01", "grace_days": 5}, "calculation": "15 - 1 - 5", "result": "9 days overdue"}'::jsonb,
  ARRAY['Rent Collection', 'Late Fee Processing', 'At-Risk Tracking'], true),

-- Marketplace & Property Metrics (5)
('Days Listed', 'Number of days a property/unit has been on the marketplace', 'Today - On Market Date', 'performance',
  '[{"name": "Today", "description": "Current date"}, {"name": "On Market Date", "description": "Date property was listed to marketplace"}]'::jsonb,
  '{"inputs": {"today": "2025-01-15", "on_market_date": "2024-12-01"}, "calculation": "January 15 - December 1", "result": "45 days"}'::jsonb,
  ARRAY['Marketplace', 'Property Cards', 'Listing Analytics'], true),

('Portfolio Total Monthly Rent', 'Sum of monthly rent across all occupied units in portfolio', 'Sum(monthly_rent) FROM occupied_units', 'financial',
  '[{"name": "Occupied Units", "description": "All units with active tenants"}, {"name": "Monthly Rent", "description": "Rent amount for each unit"}]'::jsonb,
  '{"inputs": {"unit_rents": [1500, 1200, 1800, 2000, 1350]}, "calculation": "1500 + 1200 + 1800 + 2000 + 1350", "result": "$7,850"}'::jsonb,
  ARRAY['Dashboard', 'Portfolio Overview', 'Financial Reports'], true),

('Total Maintenance Cost', 'Sum of all vendor payments for property maintenance', 'Sum(vendor_payment_records.amount) WHERE property_id = target', 'financial',
  '[{"name": "Vendor Payments", "description": "All payments made to vendors for property"}, {"name": "Property ID", "description": "Target property for cost calculation"}]'::jsonb,
  '{"inputs": {"payments": [500, 1200, 350, 275]}, "calculation": "500 + 1200 + 350 + 275", "result": "$2,325"}'::jsonb,
  ARRAY['Property Financials', 'Expense Tracking', 'Budget Analysis'], true),

('Total Late Fees Collected', 'Sum of late fees charged and collected for property', 'Sum(rent_payments.late_fee_amount) WHERE property_id = target', 'financial',
  '[{"name": "Late Fee Amounts", "description": "Late fees from each payment"}, {"name": "Property ID", "description": "Target property for fee calculation"}]'::jsonb,
  '{"inputs": {"late_fees": [75, 75, 50, 100]}, "calculation": "75 + 75 + 50 + 100", "result": "$300"}'::jsonb,
  ARRAY['Property Financials', 'Rent Collection', 'Revenue Reports'], true),

('HAP vs Tenant Portion Split', 'Breakdown of rent between housing assistance and tenant responsibility', 'Total Rent = HAP Portion + Tenant Portion', 'financial',
  '[{"name": "Total Rent", "description": "Full monthly rent amount"}, {"name": "HAP Portion", "description": "Amount paid by housing authority"}, {"name": "Tenant Portion", "description": "Amount paid by tenant"}]'::jsonb,
  '{"inputs": {"total_rent": 1500, "hap_portion": 1200, "tenant_portion": 300}, "calculation": "1500 = 1200 + 300", "result": "HAP: $1,200 (80%), Tenant: $300 (20%)"}'::jsonb,
  ARRAY['Rent Setup', 'Payment Overview', 'Voucher Management'], true)

ON CONFLICT DO NOTHING;