-- Phase 2: RLS Policies for Advanced Property Management Tables

-- ===== MAINTENANCE WORKFLOW RLS POLICIES =====

-- Maintenance Workflows Policies
CREATE POLICY "Property owners can manage maintenance workflows"
ON public.maintenance_workflows
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests mr
    JOIN public.properties p ON mr.property_id = p.id
    WHERE mr.id = maintenance_workflows.maintenance_request_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

-- Predictive Maintenance Policies
CREATE POLICY "Property owners can manage predictive maintenance"
ON public.predictive_maintenance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = predictive_maintenance.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

-- Maintenance Budgets Policies
CREATE POLICY "Property owners can manage maintenance budgets"
ON public.maintenance_budgets
FOR ALL
USING (
  (property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = maintenance_budgets.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )) OR
  (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
);

-- ===== FINANCIAL MANAGEMENT RLS POLICIES =====

-- Expense Tracking Policies
CREATE POLICY "Property owners can manage expense tracking"
ON public.expense_tracking
FOR ALL
USING (
  (property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = expense_tracking.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )) OR
  (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
);

-- Cash Flow Forecasts Policies
CREATE POLICY "Property owners can manage cash flow forecasts"
ON public.cash_flow_forecasts
FOR ALL
USING (
  (property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = cash_flow_forecasts.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )) OR
  (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
);

-- Tax Documents Policies
CREATE POLICY "Property owners can manage tax documents"
ON public.tax_documents
FOR ALL
USING (
  (property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = tax_documents.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )) OR
  (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
);

-- Budget Alerts Policies
CREATE POLICY "Property owners can manage budget alerts"
ON public.budget_alerts
FOR ALL
USING (
  (property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = budget_alerts.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )) OR
  (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
);

-- ===== TENANT MANAGEMENT RLS POLICIES =====

-- Lease Lifecycle Tracking Policies
CREATE POLICY "Property owners can manage lease lifecycle"
ON public.lease_lifecycle_tracking
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = lease_lifecycle_tracking.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

CREATE POLICY "Tenants can view their own lease lifecycle"
ON public.lease_lifecycle_tracking
FOR SELECT
USING (tenant_id = auth.uid());

-- Tenant Communications Policies
CREATE POLICY "Property owners can manage tenant communications"
ON public.tenant_communications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = tenant_communications.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

CREATE POLICY "Tenants can view their own communications"
ON public.tenant_communications
FOR SELECT
USING (tenant_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Tenants can send communications to their landlords"
ON public.tenant_communications
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.property_applications pa
    WHERE pa.tenant_id = auth.uid()
    AND pa.property_id = tenant_communications.property_id
    AND pa.status = 'approved'
  )
);

-- Rent Collection Alerts Policies
CREATE POLICY "Property owners can manage rent collection alerts"
ON public.rent_collection_alerts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = rent_collection_alerts.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

CREATE POLICY "Tenants can view their own rent alerts"
ON public.rent_collection_alerts
FOR SELECT
USING (tenant_id = auth.uid());

-- Tenant Screening Results Policies
CREATE POLICY "Property owners can manage tenant screening results"
ON public.tenant_screening_results
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = tenant_screening_results.property_id
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
  )
);

-- Tenants can view their own screening results
CREATE POLICY "Tenants can view their own screening results"
ON public.tenant_screening_results
FOR SELECT
USING (tenant_id = auth.uid());

-- ===== TRIGGER FUNCTIONS FOR AUTOMATIC UPDATES =====

-- Update updated_at columns automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for updated_at columns
CREATE TRIGGER update_maintenance_workflows_updated_at
  BEFORE UPDATE ON public.maintenance_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_predictive_maintenance_updated_at
  BEFORE UPDATE ON public.predictive_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_budgets_updated_at
  BEFORE UPDATE ON public.maintenance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_tracking_updated_at
  BEFORE UPDATE ON public.expense_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_flow_forecasts_updated_at
  BEFORE UPDATE ON public.cash_flow_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_documents_updated_at
  BEFORE UPDATE ON public.tax_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lease_lifecycle_tracking_updated_at
  BEFORE UPDATE ON public.lease_lifecycle_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rent_collection_alerts_updated_at
  BEFORE UPDATE ON public.rent_collection_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_screening_results_updated_at
  BEFORE UPDATE ON public.tenant_screening_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();