
-- Phase 4: Advanced Integration & Business Expansion

-- Add business type hierarchies and cross-referral configurations
CREATE TABLE IF NOT EXISTS public.business_type_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_type text NOT NULL UNIQUE,
  referral_bonus_base numeric NOT NULL DEFAULT 100.00,
  cross_referral_multiplier numeric NOT NULL DEFAULT 1.0,
  priority_level integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default business type configurations
INSERT INTO public.business_type_configs (business_type, referral_bonus_base, cross_referral_multiplier, priority_level) VALUES
('residential', 100.00, 1.0, 1),
('commercial', 250.00, 1.5, 2),
('industrial', 500.00, 2.0, 3),
('mixed_use', 200.00, 1.3, 2),
('short_term_rental', 150.00, 1.2, 1)
ON CONFLICT (business_type) DO NOTHING;

-- Create referral campaigns table for advanced management
CREATE TABLE IF NOT EXISTS public.referral_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name text NOT NULL,
  campaign_code text NOT NULL UNIQUE,
  portfolio_id uuid REFERENCES public.portfolios(id),
  business_type text NOT NULL,
  bonus_multiplier numeric NOT NULL DEFAULT 1.0,
  start_date date NOT NULL,
  end_date date,
  max_referrals integer,
  current_referrals integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  campaign_metadata jsonb DEFAULT '{}'::jsonb
);

-- Add campaign tracking to referrals
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.referral_campaigns(id),
ADD COLUMN IF NOT EXISTS cross_business_bonus numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS attribution_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS partner_source text,
ADD COLUMN IF NOT EXISTS tracking_code text;

-- Create partner integrations table
CREATE TABLE IF NOT EXISTS public.partner_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name text NOT NULL,
  api_key_hash text NOT NULL UNIQUE,
  webhook_url text,
  active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '["read_referrals", "create_referrals"]'::jsonb,
  rate_limit_per_hour integer NOT NULL DEFAULT 100,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referral attribution tracking
CREATE TABLE IF NOT EXISTS public.referral_attribution_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id uuid NOT NULL REFERENCES public.referrals(id),
  event_type text NOT NULL,
  source text NOT NULL,
  attribution_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create advanced analytics materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS public.referral_performance_analytics AS
WITH business_type_performance AS (
  SELECT 
    r.business_type,
    r.source_portfolio_id,
    COUNT(*) as total_referrals,
    COUNT(CASE WHEN r.status = 'qualified' THEN 1 END) as qualified_referrals,
    AVG(CASE WHEN r.status = 'qualified' THEN 
      EXTRACT(EPOCH FROM (r.sixty_day_milestone_at - r.invitation_sent_at)) / 86400 
    END) as avg_qualification_days,
    SUM(COALESCE(rr.reward_amount, 0)) as total_rewards,
    DATE_TRUNC('month', r.created_at) as month_year
  FROM public.referrals r
  LEFT JOIN public.referral_rewards rr ON r.id = rr.referral_id
  WHERE r.created_at >= CURRENT_DATE - INTERVAL '24 months'
  GROUP BY r.business_type, r.source_portfolio_id, DATE_TRUNC('month', r.created_at)
),
cross_business_analytics AS (
  SELECT 
    r1.business_type as source_business_type,
    r2.business_type as target_business_type,
    COUNT(*) as cross_referral_count,
    AVG(r1.cross_business_bonus) as avg_cross_bonus
  FROM public.referrals r1
  JOIN public.referrals r2 ON r1.referrer_id = r2.referred_user_id
  WHERE r1.business_type != r2.business_type
  GROUP BY r1.business_type, r2.business_type
)
SELECT 
  btp.*,
  cba.target_business_type,
  cba.cross_referral_count,
  cba.avg_cross_bonus
FROM business_type_performance btp
LEFT JOIN cross_business_analytics cba ON btp.business_type = cba.source_business_type;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_campaign_id ON public.referrals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_referrals_tracking_code ON public.referrals(tracking_code);
CREATE INDEX IF NOT EXISTS idx_referrals_partner_source ON public.referrals(partner_source);
CREATE INDEX IF NOT EXISTS idx_attribution_events_referral_id ON public.referral_attribution_events(referral_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_code ON public.referral_campaigns(campaign_code);

-- Enhanced function for cross-business referral bonus calculation
CREATE OR REPLACE FUNCTION public.calculate_cross_business_bonus(
  p_source_business_type text,
  p_target_business_type text,
  p_base_amount numeric DEFAULT 100.00
) RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  source_multiplier numeric;
  target_multiplier numeric;
  cross_bonus numeric;
BEGIN
  -- Get multipliers for both business types
  SELECT cross_referral_multiplier INTO source_multiplier
  FROM public.business_type_configs 
  WHERE business_type = p_source_business_type AND active = true;
  
  SELECT cross_referral_multiplier INTO target_multiplier
  FROM public.business_type_configs 
  WHERE business_type = p_target_business_type AND active = true;
  
  -- Default to 1.0 if not found
  source_multiplier := COALESCE(source_multiplier, 1.0);
  target_multiplier := COALESCE(target_multiplier, 1.0);
  
  -- Calculate cross-business bonus (higher target type gets more bonus)
  IF p_source_business_type != p_target_business_type THEN
    cross_bonus := p_base_amount * (target_multiplier - 1.0) * 0.5;
  ELSE
    cross_bonus := 0;
  END IF;
  
  RETURN GREATEST(cross_bonus, 0);
END;
$$;

-- Advanced cohort analysis function
CREATE OR REPLACE FUNCTION public.get_referral_cohort_analysis(
  p_portfolio_id uuid,
  p_cohort_period text DEFAULT 'month',
  p_analysis_months integer DEFAULT 12
) RETURNS TABLE(
  cohort_period text,
  total_referrals integer,
  qualified_referrals integer,
  qualification_rate numeric,
  avg_time_to_qualify numeric,
  total_value numeric,
  avg_referral_value numeric,
  retention_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH cohort_data AS (
    SELECT 
      TO_CHAR(r.invitation_sent_at, 
        CASE 
          WHEN p_cohort_period = 'week' THEN 'YYYY-"W"WW'
          WHEN p_cohort_period = 'quarter' THEN 'YYYY-"Q"Q'
          ELSE 'YYYY-MM'
        END
      ) as cohort,
      r.id,
      r.status,
      r.invitation_sent_at,
      r.sixty_day_milestone_at,
      COALESCE(rr.reward_amount, 0) as reward_value,
      CASE WHEN r.sixty_day_milestone_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (r.sixty_day_milestone_at - r.invitation_sent_at)) / 86400
      END as days_to_qualify
    FROM public.referrals r
    LEFT JOIN public.referral_rewards rr ON r.id = rr.referral_id
    WHERE r.source_portfolio_id = p_portfolio_id
    AND r.invitation_sent_at >= CURRENT_DATE - (p_analysis_months || ' months')::INTERVAL
  ),
  cohort_metrics AS (
    SELECT 
      cohort,
      COUNT(*) as total_refs,
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_refs,
      AVG(days_to_qualify) as avg_qualify_time,
      SUM(reward_value) as total_reward_value,
      COUNT(CASE WHEN status IN ('qualified', 'first_payment', 'approved') THEN 1 END) as retained_refs
    FROM cohort_data
    GROUP BY cohort
  )
  SELECT 
    cm.cohort,
    cm.total_refs::integer,
    cm.qualified_refs::integer,
    CASE WHEN cm.total_refs > 0 THEN 
      (cm.qualified_refs::numeric / cm.total_refs::numeric * 100) 
    ELSE 0 END as qual_rate,
    COALESCE(cm.avg_qualify_time, 0)::numeric,
    cm.total_reward_value::numeric,
    CASE WHEN cm.qualified_refs > 0 THEN 
      (cm.total_reward_value / cm.qualified_refs) 
    ELSE 0 END as avg_ref_value,
    CASE WHEN cm.total_refs > 0 THEN 
      (cm.retained_refs::numeric / cm.total_refs::numeric * 100) 
    ELSE 0 END as retention
  FROM cohort_metrics cm
  ORDER BY cm.cohort DESC;
END;
$$;

-- Function for predictive referral scoring
CREATE OR REPLACE FUNCTION public.calculate_referral_success_probability(
  p_referrer_id uuid,
  p_business_type text DEFAULT 'residential'
) RETURNS TABLE(
  success_probability numeric,
  recommended_bonus numeric,
  risk_factors jsonb,
  success_indicators jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  referrer_history RECORD;
  business_performance RECORD;
  base_probability numeric := 0.3; -- 30% base success rate
  probability_score numeric;
  bonus_recommendation numeric;
BEGIN
  -- Get referrer's historical performance
  SELECT 
    COUNT(*) as total_referrals,
    COUNT(CASE WHEN status = 'qualified' THEN 1 END) as successful_referrals,
    AVG(CASE WHEN status = 'qualified' THEN 
      EXTRACT(EPOCH FROM (sixty_day_milestone_at - invitation_sent_at)) / 86400 
    END) as avg_qualification_days,
    MAX(created_at) as last_referral_date
  INTO referrer_history
  FROM public.referrals 
  WHERE referrer_id = p_referrer_id;
  
  -- Get business type performance metrics
  SELECT 
    AVG(CASE WHEN status = 'qualified' THEN 1.0 ELSE 0.0 END) as business_success_rate,
    COUNT(*) as business_total_referrals
  INTO business_performance
  FROM public.referrals 
  WHERE business_type = p_business_type
  AND created_at >= CURRENT_DATE - INTERVAL '12 months';
  
  -- Calculate probability based on multiple factors
  probability_score := base_probability;
  
  -- Adjust based on referrer history
  IF referrer_history.total_referrals > 0 THEN
    probability_score := probability_score * 
      (referrer_history.successful_referrals::numeric / referrer_history.total_referrals::numeric + 0.5);
  END IF;
  
  -- Adjust based on business type performance
  IF business_performance.business_success_rate IS NOT NULL THEN
    probability_score := probability_score * (business_performance.business_success_rate + 0.5);
  END IF;
  
  -- Adjust based on recency
  IF referrer_history.last_referral_date IS NOT NULL AND 
     referrer_history.last_referral_date < CURRENT_DATE - INTERVAL '6 months' THEN
    probability_score := probability_score * 0.8; -- Decay factor
  END IF;
  
  -- Cap probability between 10% and 90%
  probability_score := GREATEST(0.1, LEAST(0.9, probability_score));
  
  -- Calculate recommended bonus (higher for lower probability)
  bonus_recommendation := 100 + (50 * (1 - probability_score));
  
  RETURN QUERY SELECT 
    probability_score,
    bonus_recommendation,
    jsonb_build_object(
      'low_historical_success', CASE WHEN referrer_history.total_referrals > 0 AND 
        (referrer_history.successful_referrals::numeric / referrer_history.total_referrals::numeric) < 0.2 
        THEN true ELSE false END,
      'inactive_referrer', CASE WHEN referrer_history.last_referral_date < CURRENT_DATE - INTERVAL '6 months' 
        THEN true ELSE false END,
      'low_business_performance', CASE WHEN business_performance.business_success_rate < 0.3 
        THEN true ELSE false END
    ),
    jsonb_build_object(
      'experienced_referrer', CASE WHEN referrer_history.total_referrals >= 5 THEN true ELSE false END,
      'high_success_rate', CASE WHEN referrer_history.total_referrals > 0 AND 
        (referrer_history.successful_referrals::numeric / referrer_history.total_referrals::numeric) > 0.5 
        THEN true ELSE false END,
      'fast_qualification', CASE WHEN referrer_history.avg_qualification_days < 45 
        THEN true ELSE false END
    );
END;
$$;

-- Function for bulk referral processing
CREATE OR REPLACE FUNCTION public.process_bulk_referrals(
  p_referrer_id uuid,
  p_referral_list jsonb,
  p_campaign_id uuid DEFAULT NULL
) RETURNS TABLE(
  success_count integer,
  error_count integer,
  processing_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referral_item jsonb;
  success_counter integer := 0;
  error_counter integer := 0;
  processing_log jsonb := '[]'::jsonb;
  new_referral_id uuid;
  referral_code_generated text;
BEGIN
  -- Process each referral in the list
  FOR referral_item IN SELECT * FROM jsonb_array_elements(p_referral_list)
  LOOP
    BEGIN
      -- Generate referral code
      referral_code_generated := 'REF-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
      
      -- Insert new referral
      INSERT INTO public.referrals (
        referrer_id,
        referral_code,
        referred_email,
        referred_name,
        referred_phone,
        business_type,
        campaign_id,
        invitation_sent_at,
        status
      ) VALUES (
        p_referrer_id,
        referral_code_generated,
        referral_item->>'email',
        referral_item->>'name',
        referral_item->>'phone',
        COALESCE(referral_item->>'business_type', 'residential'),
        p_campaign_id,
        now(),
        'invitation_sent'
      ) RETURNING id INTO new_referral_id;
      
      success_counter := success_counter + 1;
      processing_log := processing_log || jsonb_build_object(
        'email', referral_item->>'email',
        'status', 'success',
        'referral_id', new_referral_id,
        'referral_code', referral_code_generated
      );
      
    EXCEPTION WHEN OTHERS THEN
      error_counter := error_counter + 1;
      processing_log := processing_log || jsonb_build_object(
        'email', referral_item->>'email',
        'status', 'error',
        'error_message', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT success_counter, error_counter, processing_log;
END;
$$;

-- Create RLS policies for new tables
ALTER TABLE public.business_type_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attribution_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view business type configs" ON public.business_type_configs
  FOR SELECT USING (active = true);

CREATE POLICY "Portfolio members can view campaigns" ON public.referral_campaigns
  FOR SELECT USING (
    portfolio_id IS NULL OR 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[])
  );

CREATE POLICY "Portfolio admin_partners can manage campaigns" ON public.referral_campaigns
  FOR ALL USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner']::portfolio_role_type[])
  );

CREATE POLICY "Admins can manage partner integrations" ON public.partner_integrations
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view attribution events for their referrals" ON public.referral_attribution_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.referrals r 
      WHERE r.id = referral_attribution_events.referral_id 
      AND (r.referrer_id = auth.uid() OR r.referred_user_id = auth.uid())
    )
  );

-- Create triggers for updated_at columns
CREATE TRIGGER update_business_type_configs_updated_at
  BEFORE UPDATE ON public.business_type_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_campaigns_updated_at
  BEFORE UPDATE ON public.referral_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_integrations_updated_at
  BEFORE UPDATE ON public.partner_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Refresh the materialized view initially
REFRESH MATERIALIZED VIEW public.referral_performance_analytics;
