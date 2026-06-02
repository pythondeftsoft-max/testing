import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgencyDashboardContent } from '@/pages/AgencyDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, DollarSign } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DualApprovalAdminOverride from '@/components/admin/DualApprovalAdminOverride';
import { AgencyBriefDownload } from '@/components/admin/AgencyBriefDownload';
import { ViewAsNewPHAToggle } from '@/components/admin/ViewAsNewPHAToggle';

const STAFF_ROLES = [
  { value: 'agency_admin', label: 'Agency Admin' },
  { value: 'caseworker', label: 'Caseworker' },
  { value: 'caseworker_supervisor', label: 'Caseworker Supervisor' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'inspection_supervisor', label: 'Inspection Supervisor' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'finance', label: 'Finance' },
  { value: 'executive_director', label: 'Executive Director' },
  { value: 'intake_clerk', label: 'Intake Clerk' },
  { value: 'porting_coordinator', label: 'Porting Coordinator' },
];

const AgencyDetailPage = () => {
  const { agencyId } = useParams<{ agencyId: string }>();
  const navigate = useNavigate();
  const [previewRole, setPreviewRole] = useState('agency_admin');

  const { data: agency, isLoading, error } = useQuery({
    queryKey: ['housing-authority', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('housing_authorities')
        .select('id, slug, name, city, state, country, website, address, zipcode, zip, pha_code, latitude, longitude, is_active, is_onboarded, onboarding_completed, onboarding_step, onboarding_completed_at, tenant_count, metadata, default_required_docs, accepted_payment_methods, default_requirements_notes, tenant_enrollment_requirements, porting_requirements, auto_batch_enabled, auto_batch_day_of_month, dual_approval_platform_mode, dual_approval_enabled, dual_approval_threshold_amount, public_waitlist_open, public_waitlist_message, public_waitlist_required_fields, direct_apply_open, direct_apply_message, direct_apply_intake_modes, direct_apply_eligibility_criteria, hap_block_unready_landlords, registry_status, is_archived, created_at, updated_at')
        .eq('id', agencyId!)
        .single();
      if (error) throw error;
      const { data: contact } = await (supabase as any).rpc('admin_get_housing_authority_contacts', { _ids: [agencyId!] });
      const c = Array.isArray(contact) ? contact[0] : null;
      return data ? { ...data, email: c?.email ?? null, phone: c?.phone ?? null } : null;
    }
  });

  const { data: activeContract } = useQuery({
    queryKey: ['agency-active-contract', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('agency_contracts')
        .select('monthly_rate, status')
        .eq('agency_id', agencyId!)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Agency not found.</p>
        <Button variant="outline" onClick={() => navigate('/admin?tab=agency-map')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Agency Map
        </Button>
      </div>
    );
  }

  const roleName = previewRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const canManage = previewRole === 'agency_admin' || previewRole === 'caseworker';
  const metadata = (agency as any).metadata || {};
  const onboardingStatus = (agency as any).onboarding_status || metadata.onboarding_status || 'unknown';
  const isOnboarded = onboardingStatus === 'onboarded' || onboardingStatus === 'active';

  return (
    <div className="min-h-screen bg-background">
      {/* Admin toolbar */}
      <div className="border-b bg-muted/30 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin?tab=agency-map')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <h2 className="font-semibold text-foreground">{agency.name}</h2>
            <Badge variant={isOnboarded ? 'default' : 'secondary'}>
              {onboardingStatus}
            </Badge>
            {agency.state && (
              <span className="text-xs text-muted-foreground">{agency.city}, {agency.state}</span>
            )}
            {activeContract ? (
              <Badge variant="outline" className="font-mono text-xs">
                <DollarSign className="w-3 h-3 mr-0.5" />
                {activeContract.monthly_rate?.toLocaleString()}/mo
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">No Contract</Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ViewAsNewPHAToggle />
            <div className="h-6 w-px bg-border" />
            <AgencyBriefDownload agencyId={agency.id} agencyName={agency.name} />
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">View as:</span>
              <Select value={previewRole} onValueChange={setPreviewRole}>
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Platform-only override panel */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <DualApprovalAdminOverride agencyId={agency.id} />
        </div>
      </div>

      {/* Full agency portal content */}
      <AgencyDashboardContent
        agency={{
          id: agency.id,
          name: agency.name,
          city: agency.city,
          state: agency.state,
        }}
        role={previewRole}
        roleName={roleName}
        staffId={`admin-preview-${previewRole}`}
        agencyId={agency.id}
        agencySlug={agency.slug || undefined}

        onLogout={() => navigate('/admin?tab=agency-map')}
      />
    </div>
  );
};

export default AgencyDetailPage;
