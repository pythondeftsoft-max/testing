-- Create database functions for comprehensive reporting using actual property data

-- Profit & Loss Statement Function
CREATE OR REPLACE FUNCTION public.get_portfolio_profit_loss(
  p_portfolio_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  -- Revenue
  total_rental_income numeric,
  total_late_fees numeric,
  total_application_fees numeric,
  total_other_income numeric,
  total_revenue numeric,
  -- Operating Expenses
  total_management_fees numeric,
  total_maintenance_costs numeric,
  total_insurance_costs numeric,
  total_property_taxes numeric,
  total_utilities numeric,
  total_professional_fees numeric,
  total_marketing_costs numeric,
  total_office_expenses numeric,
  total_operating_expenses numeric,
  -- Net Operating Income
  net_operating_income numeric,
  -- Other Income/Expenses
  total_interest_income numeric,
  total_interest_expense numeric,
  total_depreciation numeric,
  total_other_expenses numeric,
  -- Net Income
  net_income numeric,
  -- Property Count
  property_count integer
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH property_financials AS (
    SELECT 
      p.id,
      -- Revenue calculations
      COALESCE(p.monthly_rent, 0) * 
        CASE 
          WHEN p_end_date >= p_start_date THEN 
            EXTRACT(EPOCH FROM (p_end_date::date - p_start_date::date + 1)) / EXTRACT(EPOCH FROM INTERVAL '1 month')
          ELSE 1
        END as rental_income_period,
      COALESCE(p.late_fee_amount, 0) as late_fees,
      COALESCE(p.application_fee, 0) as application_fees,
      COALESCE(p.other_income, 0) as other_income,
      -- Operating Expenses
      COALESCE(p.management_fee, 0) as management_fees,
      COALESCE(p.repair_costs, 0) as maintenance_costs,
      COALESCE(p.insurance_cost, 0) as insurance_costs,
      COALESCE(p.property_taxes, 0) as property_taxes,
      COALESCE(p.utility_costs, 0) as utilities,
      COALESCE(p.legal_fees, 0) + COALESCE(p.accounting_fees, 0) + COALESCE(p.professional_fees, 0) as professional_fees,
      COALESCE(p.marketing_costs, 0) as marketing_costs,
      COALESCE(p.office_expenses, 0) as office_expenses,
      -- Other Income/Expenses
      COALESCE(p.interest_income, 0) as interest_income,
      COALESCE(p.mortgage_interest, 0) as interest_expense,
      COALESCE(p.depreciation_annual, 0) / 12 * 
        CASE 
          WHEN p_end_date >= p_start_date THEN 
            EXTRACT(EPOCH FROM (p_end_date::date - p_start_date::date + 1)) / EXTRACT(EPOCH FROM INTERVAL '1 month')
          ELSE 1
        END as depreciation_period
    FROM properties p
    WHERE p.portfolio_id = p_portfolio_id 
      AND p.deleted_at IS NULL
  )
  SELECT 
    -- Revenue
    SUM(pf.rental_income_period)::numeric as total_rental_income,
    SUM(pf.late_fees)::numeric as total_late_fees,
    SUM(pf.application_fees)::numeric as total_application_fees,
    SUM(pf.other_income)::numeric as total_other_income,
    (SUM(pf.rental_income_period) + SUM(pf.late_fees) + SUM(pf.application_fees) + SUM(pf.other_income))::numeric as total_revenue,
    -- Operating Expenses
    SUM(pf.management_fees)::numeric as total_management_fees,
    SUM(pf.maintenance_costs)::numeric as total_maintenance_costs,
    SUM(pf.insurance_costs)::numeric as total_insurance_costs,
    SUM(pf.property_taxes)::numeric as total_property_taxes,
    SUM(pf.utilities)::numeric as total_utilities,
    SUM(pf.professional_fees)::numeric as total_professional_fees,
    SUM(pf.marketing_costs)::numeric as total_marketing_costs,
    SUM(pf.office_expenses)::numeric as total_office_expenses,
    (SUM(pf.management_fees) + SUM(pf.maintenance_costs) + SUM(pf.insurance_costs) + 
     SUM(pf.property_taxes) + SUM(pf.utilities) + SUM(pf.professional_fees) + 
     SUM(pf.marketing_costs) + SUM(pf.office_expenses))::numeric as total_operating_expenses,
    -- Net Operating Income
    ((SUM(pf.rental_income_period) + SUM(pf.late_fees) + SUM(pf.application_fees) + SUM(pf.other_income)) -
     (SUM(pf.management_fees) + SUM(pf.maintenance_costs) + SUM(pf.insurance_costs) + 
      SUM(pf.property_taxes) + SUM(pf.utilities) + SUM(pf.professional_fees) + 
      SUM(pf.marketing_costs) + SUM(pf.office_expenses)))::numeric as net_operating_income,
    -- Other Income/Expenses
    SUM(pf.interest_income)::numeric as total_interest_income,
    SUM(pf.interest_expense)::numeric as total_interest_expense,
    SUM(pf.depreciation_period)::numeric as total_depreciation,
    (SUM(pf.interest_expense) + SUM(pf.depreciation_period))::numeric as total_other_expenses,
    -- Net Income
    ((SUM(pf.rental_income_period) + SUM(pf.late_fees) + SUM(pf.application_fees) + SUM(pf.other_income)) -
     (SUM(pf.management_fees) + SUM(pf.maintenance_costs) + SUM(pf.insurance_costs) + 
      SUM(pf.property_taxes) + SUM(pf.utilities) + SUM(pf.professional_fees) + 
      SUM(pf.marketing_costs) + SUM(pf.office_expenses)) -
     (SUM(pf.interest_expense) + SUM(pf.depreciation_period)) +
     SUM(pf.interest_income))::numeric as net_income,
    -- Property Count
    COUNT(*)::integer as property_count
  FROM property_financials pf;
END;
$$;

-- Owner Statement Function
CREATE OR REPLACE FUNCTION public.get_portfolio_owner_statement(
  p_portfolio_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  -- Property Info
  property_count integer,
  total_units integer,
  -- Income
  total_rental_collected numeric,
  total_late_fees numeric,
  total_application_fees numeric,
  total_other_income numeric,
  total_income numeric,
  -- Expenses
  total_management_fees numeric,
  total_maintenance numeric,
  total_landscaping numeric,
  total_utilities numeric,
  total_insurance numeric,
  total_other_expenses numeric,
  total_expenses numeric,
  -- Net Income
  net_income numeric,
  -- Distribution Info
  previous_balance numeric,
  reserve_allocation numeric,
  available_for_distribution numeric,
  recommended_distribution numeric,
  -- Performance Metrics
  occupancy_rate numeric,
  average_rent numeric,
  management_fee_rate numeric
) LANGUAGE plpgsql AS $$
DECLARE
  v_reserve_rate numeric := 0.05; -- 5% reserve allocation
BEGIN
  RETURN QUERY
  WITH portfolio_summary AS (
    SELECT 
      COUNT(*)::integer as prop_count,
      SUM(CASE WHEN p.unit_count IS NOT NULL THEN p.unit_count ELSE 1 END)::integer as unit_count,
      -- Income calculations for the period
      SUM(COALESCE(p.monthly_rent, 0) * 
        CASE 
          WHEN p_end_date >= p_start_date THEN 
            EXTRACT(EPOCH FROM (p_end_date::date - p_start_date::date + 1)) / EXTRACT(EPOCH FROM INTERVAL '1 month')
          ELSE 1
        END) as rental_income,
      SUM(COALESCE(p.late_fee_amount, 0)) as late_fees,
      SUM(COALESCE(p.application_fee, 0)) as app_fees,
      SUM(COALESCE(p.other_income, 0)) as other_income,
      -- Expenses
      SUM(COALESCE(p.management_fee, 0)) as mgmt_fees,
      SUM(COALESCE(p.repair_costs, 0)) as maintenance,
      SUM(COALESCE(p.landscaping_costs, 0)) as landscaping,
      SUM(COALESCE(p.utility_costs, 0)) as utilities,
      SUM(COALESCE(p.insurance_cost, 0)) as insurance,
      SUM(COALESCE(p.legal_fees, 0) + COALESCE(p.accounting_fees, 0) + COALESCE(p.office_expenses, 0)) as other_exp,
      -- Performance metrics
      COUNT(CASE WHEN p.status = 'occupied' THEN 1 END)::numeric as occupied_count,
      AVG(COALESCE(p.monthly_rent, 0)) as avg_rent,
      -- Management fee rate calculation
      CASE 
        WHEN SUM(COALESCE(p.monthly_rent, 0)) > 0 THEN 
          SUM(COALESCE(p.management_fee, 0)) / SUM(COALESCE(p.monthly_rent, 0)) * 100
        ELSE 0 
      END as mgmt_rate
    FROM properties p
    WHERE p.portfolio_id = p_portfolio_id 
      AND p.deleted_at IS NULL
  )
  SELECT 
    ps.prop_count,
    ps.unit_count,
    -- Income
    ps.rental_income::numeric,
    ps.late_fees::numeric,
    ps.app_fees::numeric,
    ps.other_income::numeric,
    (ps.rental_income + ps.late_fees + ps.app_fees + ps.other_income)::numeric as total_income,
    -- Expenses
    ps.mgmt_fees::numeric,
    ps.maintenance::numeric,
    ps.landscaping::numeric,
    ps.utilities::numeric,
    ps.insurance::numeric,
    ps.other_exp::numeric,
    (ps.mgmt_fees + ps.maintenance + ps.landscaping + ps.utilities + ps.insurance + ps.other_exp)::numeric as total_expenses,
    -- Net Income
    ((ps.rental_income + ps.late_fees + ps.app_fees + ps.other_income) -
     (ps.mgmt_fees + ps.maintenance + ps.landscaping + ps.utilities + ps.insurance + ps.other_exp))::numeric as net_income,
    -- Distribution Info (simplified - would need actual portfolio_distributions table for real data)
    1000.00::numeric as previous_balance, -- This would come from portfolio_distributions table
    ((ps.rental_income + ps.late_fees + ps.app_fees + ps.other_income) -
     (ps.mgmt_fees + ps.maintenance + ps.landscaping + ps.utilities + ps.insurance + ps.other_exp)) * v_reserve_rate as reserve_allocation,
    (1000.00 + (ps.rental_income + ps.late_fees + ps.app_fees + ps.other_income) -
     (ps.mgmt_fees + ps.maintenance + ps.landscaping + ps.utilities + ps.insurance + ps.other_exp) -
     ((ps.rental_income + ps.late_fees + ps.app_fees + ps.other_income) -
      (ps.mgmt_fees + ps.maintenance + ps.landscaping + ps.utilities + ps.insurance + ps.other_exp)) * v_reserve_rate)::numeric as available_for_distribution,
    (1000.00 + (ps.rental_income + ps.late_fees + ps.app_fees + ps.other_income) -
     (ps.mgmt_fees + ps.maintenance + ps.landscaping + ps.utilities + ps.insurance + ps.other_exp) -
     ((ps.rental_income + ps.late_fees + ps.app_fees + ps.other_income) -
      (ps.mgmt_fees + ps.maintenance + ps.landscaping + ps.utilities + ps.insurance + ps.other_exp)) * v_reserve_rate)::numeric as recommended_distribution,
    -- Performance Metrics
    CASE 
      WHEN ps.unit_count > 0 THEN (ps.occupied_count / ps.unit_count * 100)::numeric
      ELSE 0::numeric 
    END as occupancy_rate,
    ps.avg_rent::numeric,
    ps.mgmt_rate::numeric
  FROM portfolio_summary ps;
END;
$$;

-- Management Fees Function
CREATE OR REPLACE FUNCTION public.get_portfolio_management_fees(
  p_portfolio_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  property_id uuid,
  property_address text,
  unit_count integer,
  collected_rent numeric,
  base_management_fee numeric,
  leasing_fees numeric,
  renewal_fees numeric,
  other_fees numeric,
  total_fees numeric,
  management_fee_rate numeric
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.address,
    COALESCE(p.unit_count, 1)::integer,
    -- Calculate collected rent for the period
    (COALESCE(p.monthly_rent, 0) * 
      CASE 
        WHEN p_end_date >= p_start_date THEN 
          EXTRACT(EPOCH FROM (p_end_date::date - p_start_date::date + 1)) / EXTRACT(EPOCH FROM INTERVAL '1 month')
        ELSE 1
      END)::numeric as collected_rent,
    -- Base management fee (typically percentage of rent)
    COALESCE(p.management_fee, 0)::numeric as base_mgmt_fee,
    -- Leasing fees (for new leases - would typically come from lease_transactions table)
    COALESCE(p.leasing_fee, 0)::numeric as leasing_fees,
    -- Renewal fees 
    COALESCE(p.renewal_fee, 0)::numeric as renewal_fees,
    -- Other fees
    (COALESCE(p.late_fee_amount, 0) + COALESCE(p.pet_fee, 0))::numeric as other_fees,
    -- Total fees
    (COALESCE(p.management_fee, 0) + COALESCE(p.leasing_fee, 0) + 
     COALESCE(p.renewal_fee, 0) + COALESCE(p.late_fee_amount, 0) + 
     COALESCE(p.pet_fee, 0))::numeric as total_fees,
    -- Fee rate calculation
    CASE 
      WHEN COALESCE(p.monthly_rent, 0) > 0 THEN 
        (COALESCE(p.management_fee, 0) / COALESCE(p.monthly_rent, 0) * 100)::numeric
      ELSE 0::numeric
    END as fee_rate
  FROM properties p
  WHERE p.portfolio_id = p_portfolio_id 
    AND p.deleted_at IS NULL
  ORDER BY p.address;
END;
$$;