-- Phase 2: Advanced Property Management Database Schema

-- ===== MAINTENANCE ENHANCEMENT TABLES =====

-- Smart Maintenance Workflows
CREATE TABLE IF NOT EXISTS public.maintenance_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.maintenance_vendors(id) ON DELETE SET NULL,
  workflow_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'emergency', 'preventive', 'predictive'
  status TEXT NOT NULL DEFAULT 'created', -- 'created', 'assigned', 'in_progress', 'completed', 'cancelled'
  priority INTEGER NOT NULL DEFAULT 2, -- 1=low, 2=medium, 3=high, 4=emergency
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  estimated_completion_date DATE,
  actual_completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  completed_by UUID,
  notes TEXT,
  workflow_data JSONB DEFAULT '{}',
  auto_assigned BOOLEAN DEFAULT false
);

-- Predictive Maintenance Insights
CREATE TABLE IF NOT EXISTS public.predictive_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'hvac', 'plumbing', 'electrical', 'roof', 'appliance'
  asset_identifier TEXT, -- specific unit/system identifier
  predicted_issue TEXT NOT NULL,
  prediction_confidence NUMERIC(3,2) CHECK (prediction_confidence >= 0 AND prediction_confidence <= 1),
  predicted_failure_date DATE,
  urgency_level INTEGER DEFAULT 2, -- 1=low, 2=medium, 3=high, 4=critical
  estimated_repair_cost NUMERIC(10,2),
  prevention_cost NUMERIC(10,2),
  cost_savings NUMERIC(10,2),
  data_sources JSONB DEFAULT '{}', -- sensor data, historical patterns, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_maintenance_id UUID REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active', -- 'active', 'scheduled', 'resolved', 'false_positive'
  ai_model_version TEXT,
  confidence_factors JSONB DEFAULT '{}'
);

-- Maintenance Budget Tracking
CREATE TABLE IF NOT EXISTS public.maintenance_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  budget_year INTEGER NOT NULL,
  budget_month INTEGER, -- NULL for annual budgets, 1-12 for monthly
  allocated_amount NUMERIC(10,2) NOT NULL,
  spent_amount NUMERIC(10,2) DEFAULT 0,
  committed_amount NUMERIC(10,2) DEFAULT 0, -- pending/approved but not spent
  remaining_amount NUMERIC(10,2) GENERATED ALWAYS AS (allocated_amount - spent_amount - committed_amount) STORED,
  category TEXT, -- 'emergency', 'preventive', 'routine', 'capital_improvement'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  notes TEXT
);

-- ===== FINANCIAL MANAGEMENT TABLES =====

-- Enhanced Expense Tracking
CREATE TABLE IF NOT EXISTS public.expense_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL, -- 'maintenance', 'utilities', 'insurance', 'taxes', 'management', 'marketing', 'legal'
  subcategory TEXT,
  vendor_name TEXT,
  vendor_id UUID REFERENCES public.maintenance_vendors(id) ON DELETE SET NULL,
  description TEXT,
  receipt_url TEXT,
  is_tax_deductible BOOLEAN DEFAULT true,
  tax_category TEXT,
  payment_method TEXT, -- 'cash', 'check', 'credit_card', 'bank_transfer', 'ach'
  payment_reference TEXT, -- transaction ID, check number, etc.
  recurring_expense_id UUID, -- for recurring expenses
  plaid_transaction_id TEXT,
  plaid_account_id TEXT,
  auto_categorized BOOLEAN DEFAULT false,
  categorization_confidence NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID,
  approved_by UUID,
  approval_date TIMESTAMP WITH TIME ZONE
);

-- Cash Flow Forecasting
CREATE TABLE IF NOT EXISTS public.cash_flow_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_type TEXT DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annual'
  projected_income NUMERIC(10,2),
  projected_expenses NUMERIC(10,2),
  projected_cash_flow NUMERIC(10,2) GENERATED ALWAYS AS (projected_income - projected_expenses) STORED,
  confidence_level NUMERIC(3,2), -- 0.0 to 1.0
  model_version TEXT,
  input_parameters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID,
  actual_income NUMERIC(10,2), -- filled in after the period
  actual_expenses NUMERIC(10,2),
  variance_income NUMERIC(10,2) GENERATED ALWAYS AS (actual_income - projected_income) STORED,
  variance_expenses NUMERIC(10,2) GENERATED ALWAYS AS (actual_expenses - projected_expenses) STORED
);

-- Tax Document Generation
CREATE TABLE IF NOT EXISTS public.tax_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  document_type TEXT NOT NULL, -- '1099', 'schedule_e', 'depreciation_schedule', 'expense_summary'
  document_status TEXT DEFAULT 'draft', -- 'draft', 'generated', 'reviewed', 'filed'
  file_url TEXT,
  generated_data JSONB DEFAULT '{}',
  total_income NUMERIC(10,2),
  total_expenses NUMERIC(10,2),
  depreciation_amount NUMERIC(10,2),
  net_income NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID,
  reviewed_by UUID,
  review_date TIMESTAMP WITH TIME ZONE,
  filing_date DATE,
  notes TEXT
);

-- Budget Alerts System
CREATE TABLE IF NOT EXISTS public.budget_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.maintenance_budgets(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'approaching_limit', 'exceeded_budget', 'underspending', 'forecast_overrun'
  threshold_percentage NUMERIC(5,2), -- percentage that triggered the alert
  current_spent NUMERIC(10,2),
  budget_amount NUMERIC(10,2),
  alert_message TEXT,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' -- 'active', 'acknowledged', 'resolved', 'dismissed'
);

-- ===== ENHANCED TENANT MANAGEMENT TABLES =====

-- Comprehensive Lease Lifecycle Tracking
CREATE TABLE IF NOT EXISTS public.lease_lifecycle_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID,
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent NUMERIC(10,2),
  security_deposit NUMERIC(10,2),
  lease_status TEXT DEFAULT 'active', -- 'pending', 'active', 'expiring', 'expired', 'renewed', 'terminated'
  renewal_notice_sent BOOLEAN DEFAULT false,
  renewal_notice_date DATE,
  renewal_deadline DATE,
  renewal_terms JSONB DEFAULT '{}',
  termination_notice_date DATE,
  termination_reason TEXT,
  move_out_date DATE,
  deposit_returned BOOLEAN DEFAULT false,
  deposit_return_amount NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lease_document_url TEXT,
  auto_renewal BOOLEAN DEFAULT false,
  rent_increase_percentage NUMERIC(5,2),
  special_terms JSONB DEFAULT '{}'
);

-- Tenant Communication Threading
CREATE TABLE IF NOT EXISTS public.tenant_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID,
  landlord_id UUID,
  thread_id UUID, -- groups related messages
  message_type TEXT DEFAULT 'general', -- 'general', 'maintenance', 'payment', 'lease', 'notice'
  subject TEXT,
  message_content TEXT,
  sender_type TEXT, -- 'landlord', 'tenant', 'system'
  sender_id UUID,
  recipient_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  attachments JSONB DEFAULT '[]',
  automated BOOLEAN DEFAULT false,
  template_used TEXT,
  status TEXT DEFAULT 'sent' -- 'draft', 'sent', 'delivered', 'read', 'replied'
);

-- Advanced Rent Collection Alerts
CREATE TABLE IF NOT EXISTS public.rent_collection_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID,
  due_date DATE NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  days_late INTEGER DEFAULT 0,
  alert_level INTEGER DEFAULT 1, -- 1=gentle reminder, 2=firm notice, 3=final notice, 4=legal action
  last_reminder_sent DATE,
  next_reminder_due DATE,
  auto_reminder_enabled BOOLEAN DEFAULT true,
  custom_message TEXT,
  late_fee_applied NUMERIC(10,2) DEFAULT 0,
  payment_plan_active BOOLEAN DEFAULT false,
  payment_plan_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_type TEXT, -- 'paid_full', 'payment_plan', 'eviction_started', 'tenant_moved'
  escalation_date DATE
);

-- Detailed Tenant Screening Results
CREATE TABLE IF NOT EXISTS public.tenant_screening_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.property_applications(id) ON DELETE CASCADE,
  tenant_id UUID,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  background_check_id UUID REFERENCES public.background_checks(id) ON DELETE SET NULL,
  credit_score INTEGER,
  credit_report_url TEXT,
  income_verification BOOLEAN DEFAULT false,
  employment_verification BOOLEAN DEFAULT false,
  rental_history_check BOOLEAN DEFAULT false,
  criminal_background_clear BOOLEAN DEFAULT false,
  eviction_history_clear BOOLEAN DEFAULT false,
  references_verified BOOLEAN DEFAULT false,
  overall_score NUMERIC(3,1), -- 0.0 to 10.0
  recommendation TEXT, -- 'approve', 'conditional_approve', 'decline'
  screening_date DATE NOT NULL,
  screening_cost NUMERIC(6,2),
  screening_provider TEXT,
  external_reference_id TEXT,
  detailed_results JSONB DEFAULT '{}',
  red_flags JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  screened_by UUID,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- ===== INDEXES FOR PERFORMANCE =====

-- Maintenance workflow indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_workflows_request_id ON public.maintenance_workflows(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_workflows_status ON public.maintenance_workflows(status);
CREATE INDEX IF NOT EXISTS idx_predictive_maintenance_property_id ON public.predictive_maintenance(property_id);
CREATE INDEX IF NOT EXISTS idx_predictive_maintenance_status ON public.predictive_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_budgets_property_id ON public.maintenance_budgets(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_budgets_year ON public.maintenance_budgets(budget_year);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_expense_tracking_property_id ON public.expense_tracking(property_id);
CREATE INDEX IF NOT EXISTS idx_expense_tracking_date ON public.expense_tracking(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_tracking_category ON public.expense_tracking(category);
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecasts_property_id ON public.cash_flow_forecasts(property_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecasts_date ON public.cash_flow_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_tax_documents_property_id ON public.tax_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_year ON public.tax_documents(tax_year);

-- Tenant management indexes
CREATE INDEX IF NOT EXISTS idx_lease_lifecycle_property_id ON public.lease_lifecycle_tracking(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_lifecycle_status ON public.lease_lifecycle_tracking(lease_status);
CREATE INDEX IF NOT EXISTS idx_tenant_communications_property_id ON public.tenant_communications(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_communications_thread_id ON public.tenant_communications(thread_id);
CREATE INDEX IF NOT EXISTS idx_rent_collection_alerts_property_id ON public.rent_collection_alerts(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_collection_alerts_due_date ON public.rent_collection_alerts(due_date);
CREATE INDEX IF NOT EXISTS idx_tenant_screening_application_id ON public.tenant_screening_results(application_id);

-- ===== ENABLE ROW LEVEL SECURITY =====

ALTER TABLE public.maintenance_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_lifecycle_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_collection_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_screening_results ENABLE ROW LEVEL SECURITY;