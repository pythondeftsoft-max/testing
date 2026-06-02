import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Building2, LogOut } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AgencyAppSidebar } from '@/components/agency/shell/AgencyAppSidebar';
import { AgencyBreadcrumb } from '@/components/agency/shell/AgencyBreadcrumb';
import { buildAgencyNav, LEGACY_SUB_REDIRECT, LEGACY_TAB_REDIRECT } from '@/components/agency/shell/agencyNavConfig';
import { useAgencyDashboard } from '@/hooks/useAgencyDashboard';
import { useRftaPackets } from '@/hooks/useRftaPackets';
import { useInspections } from '@/hooks/useInspections';
import AgencyOverview from '@/components/agency/AgencyOverview';
import AgencyCaseloadGroup from '@/components/agency/AgencyCaseloadGroup';
import AgencyTeamGroup from '@/components/agency/AgencyTeamGroup';
import AgencyComplianceGroup from '@/components/agency/AgencyComplianceGroup';
import AgencyFinanceGroup from '@/components/agency/AgencyFinanceGroup';
import AgencyCommsGroup from '@/components/agency/AgencyCommsGroup';
import AgencyAdminGroup from '@/components/agency/AgencyAdminGroup';
import { useAgencyRoleAccess } from '@/hooks/useAgencyRoleAccess';
import { SetupHealthBanner } from '@/components/agency/SetupHealthBanner';
import { SupportWidget } from '@/components/agency/SupportWidget';
import { AgencyProductTour } from '@/components/agency/AgencyProductTour';
import HelpTrigger from '@/components/help/HelpTrigger';

interface AgencyStaffRecord {
  id: string;
  agency_id: string;
  role: string;
  housing_authorities: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    slug: string | null;
  };
}

const AgencyDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [staffRecord, setStaffRecord] = useState<AgencyStaffRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/agency/login'); return; }

    const checkAccess = async () => {
      const { data, error } = await supabase
        .from('agency_staff')
        .select('id, agency_id, role, housing_authorities(id, name, city, state, slug)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) { navigate('/agency/login'); return; }
      setStaffRecord(data as unknown as AgencyStaffRecord);
      setLoading(false);
    };
    checkAccess();
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/agency/login');
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!staffRecord) return null;

  const agency = staffRecord.housing_authorities;
  const role = staffRecord.role;
  const roleName = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <AgencyDashboardContent
      agency={agency}
      role={role}
      roleName={roleName}
      staffId={staffRecord.id}
      agencyId={agency.id}
      agencySlug={(agency as any).slug || undefined}
      onLogout={handleLogout}
    />
  );
};

interface ContentProps {
  agency: { id: string; name: string; city: string | null; state: string | null };
  role: string;
  roleName: string;
  staffId: string;
  agencyId: string;
  agencySlug?: string;
  onLogout: () => void;
}

export const AgencyDashboardContent: React.FC<ContentProps> = ({
  agency, role, roleName, staffId, agencyId, agencySlug, onLogout,
}) => {
  const { stats, tenants, loading: dashLoading, refetch: refetchDash } = useAgencyDashboard(agencyId, role, staffId);
  const { packets, loading: rftaLoading, updateStatus, refetch: refetchRfta } = useRftaPackets(agencyId, role, staffId);
  const { inspections, loading: inspLoading, updateInspection, refetch: refetchInsp } = useInspections(agencyId, role, staffId);
  const access = useAgencyRoleAccess(role);
  const {
    canView, canEdit,
    isInspector, isCaseworker, isAdmin,
    canManage,
    showCaseload, showCompliance, showFinance, showComms, showAdmin,
    defaultTab,
  } = access;

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [activeSub, setActiveSub] = useState<string>('');

  // Sub-tab gate flags (derived once, used by both sidebar and groups)
  const isED = role === 'executive_director';
  const isInspectionSupervisor = role === 'inspection_supervisor';
  const isCaseworkerSupervisor = role === 'caseworker_supervisor';
  const isSupervisor = isCaseworkerSupervisor || isAdmin || isED;
  const showTeamCaseworkers = isCaseworkerSupervisor || isAdmin || isED;
  const showTeamInspectors  = isInspectionSupervisor || isAdmin || isED;
  const showTeam = showTeamCaseworkers || showTeamInspectors;

  const canViewWaitlist   = canView('waitlist');
  const canViewCaseload   = canView('caseload');
  const canViewRfta       = canView('rfta');
  const canViewPlacements = canView('placements');
  const canViewRecerts    = canView('recertifications');
  const canViewInspections = canView('inspections');
  const canViewProperties  = canView('properties');
  const canViewHearings    = isAdmin || canView('caseload');
  const canViewOversight   = ['agency_admin','executive_director','inspection_supervisor'].includes(role);
  const canManageInspectors = canViewOversight;
  const showHAPContracts = isAdmin || canView('placements');
  const showHAPBatching  = canView('hap_batching') || isAdmin;
  const showRentCalc     = canView('caseload') || isAdmin;
  const showBilling      = isAdmin || role === 'agency_admin' || role === 'finance';
  const showNotices      = canView('caseload') || isAdmin;
  const showCommsTab     = canView('caseload') || isAdmin;
  const showReports      = canView('reports');
  const showOperations   = isAdmin;

  const navItems = buildAgencyNav({
    showCaseload, showCompliance, showFinance, showComms, showAdmin,
    canViewWaitlist, canViewCaseload, canViewRfta, canViewPlacements, canViewRecerts,
    isCaseworker, isSupervisor,
    showTeam, showTeamCaseworkers, showTeamInspectors,
    canViewInspections, canViewProperties, canViewHearings,
    canViewOversight, canManageInspectors, isInspector,
    showHAPContracts, showHAPBatching, showRentCalc, showComparables: false, showBilling,
    showNotices, showCommsTab, showReports,
    isAdmin, showOperations,
  });

  const handleNavSelect = (tab: string, sub?: string) => {
    if (sub !== undefined) {
      // Phase J: cross-group redirect (e.g. operations:utility_schedules → finance:_setup)
      const crossKey = `${tab}:${sub}`;
      const crossHit = LEGACY_TAB_REDIRECT[crossKey];
      if (crossHit) {
        setActiveTab(crossHit.tab);
        setActiveSub(crossHit.sub);
        return;
      }
      setActiveTab(tab);
      // Phase G: redirect legacy sub values (e.g. "rfta") to their new hub sub (e.g. "tenants")
      setActiveSub(LEGACY_SUB_REDIRECT[sub] ?? sub);
    } else {
      setActiveTab(tab);
      const item = navItems.find(i => i.value === tab);
      setActiveSub(item?.defaultSub ?? '');
    }
  };

  // Helper: only pass controlled value to a group if its tab is currently active and we have a sub
  const subFor = (tab: string) => (activeTab === tab && activeSub ? activeSub : undefined);
  const setSubFor = (tab: string) => (v: string) => {
    setActiveTab(tab);
    setActiveSub(v);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AgencyAppSidebar
          items={navItems}
          activeTab={activeTab}
          activeSub={activeSub}
          onSelect={handleNavSelect}
          agencyName={agency.name}
          roleName={roleName}
          role={role}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b bg-card px-4 py-3 sticky top-0 z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger />
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-semibold text-foreground text-sm truncate">{agency.name}</h1>
                  <p className="text-xs text-muted-foreground truncate">
                    {agency.city && agency.state ? `${agency.city}, ${agency.state}` : 'Agency Portal'} • {roleName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <HelpTrigger />
                <Button variant="outline" size="sm" onClick={onLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto min-w-0">
            {role === 'agency_admin' && (
              <div className="mb-6">
                <SetupHealthBanner agencyId={agencyId} onTabChange={setActiveTab} />
              </div>
            )}

            <AgencyBreadcrumb
              items={navItems}
              activeTab={activeTab}
              activeSub={activeSub}
              onSelect={handleNavSelect}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsContent value="overview">
                <AgencyOverview stats={stats} roleName={roleName} role={role} agencyId={agencyId} agencyCity={agency.city ?? null} agencyState={agency.state ?? null} onTabChange={setActiveTab} />
              </TabsContent>

              {showCaseload && (
                <TabsContent value="caseload">
                  <AgencyCaseloadGroup
                    agencyId={agencyId}
                    agencySlug={agencySlug}
                    staffId={staffId}
                    role={role}
                    canManage={canManage}
                    canViewWaitlist={canViewWaitlist}
                    canViewCaseload={canViewCaseload}
                    canViewRfta={canViewRfta}
                    canViewPlacements={canViewPlacements}
                    canViewRecerts={canViewRecerts}
                    isCaseworker={isCaseworker}
                    isAdmin={isAdmin}
                    tenants={tenants}
                    dashLoading={dashLoading}
                    packets={packets}
                    rftaLoading={rftaLoading}
                    onUpdateRftaStatus={updateStatus}
                    onRefreshDash={refetchDash}
                    onRefreshRfta={refetchRfta}
                    value={subFor('caseload')}
                    onValueChange={setSubFor('caseload')}
                  />
                </TabsContent>
              )}

              {showTeam && (
                <TabsContent value="team">
                  <AgencyTeamGroup
                    agencyId={agencyId}
                    showCaseworkers={showTeamCaseworkers}
                    showInspectors={showTeamInspectors}
                    isAdmin={isAdmin}
                    value={subFor('team')}
                    onValueChange={setSubFor('team')}
                  />
                </TabsContent>
              )}

              {showCompliance && (
                <TabsContent value="compliance">
                  <AgencyComplianceGroup
                    agencyId={agencyId}
                    role={role}
                    staffId={staffId}
                    canManage={canManage}
                    canViewInspections={canViewInspections}
                    canViewProperties={canViewProperties}
                    canViewHearings={canViewHearings}
                    isInspector={isInspector}
                    inspections={inspections}
                    inspLoading={inspLoading}
                    onUpdateInspection={updateInspection}
                    onRefreshInsp={refetchInsp}
                    value={subFor('compliance')}
                    onValueChange={setSubFor('compliance')}
                  />
                </TabsContent>
              )}

              {showFinance && (
                <TabsContent value="finance">
                  <AgencyFinanceGroup
                    agencyId={agencyId}
                    agencyName={agency.name}
                    staffId={staffId}
                    canManage={canManage}
                    canEditHAP={canEdit('hap_batching') || isAdmin}
                    showHAPContracts={showHAPContracts}
                    showHAPBatching={showHAPBatching}
                    showRentCalc={showRentCalc}
                    showBilling={showBilling}
                    isAdmin={isAdmin}
                    value={subFor('finance')}
                    onValueChange={setSubFor('finance')}
                  />
                </TabsContent>
              )}

              {showComms && (
                <TabsContent value="comms">
                  <AgencyCommsGroup
                    agencyId={agencyId}
                    agencyName={agency.name}
                    staffId={staffId}
                    canManage={canManage}
                    canEditReports={canEdit('reports')}
                    isAdmin={isAdmin}
                    showNotices={showNotices}
                    showComms={showCommsTab}
                    showReports={showReports}
                    value={subFor('comms')}
                    onValueChange={setSubFor('comms')}
                  />
                </TabsContent>
              )}

              {showAdmin && (
                <TabsContent value="admin">
                  <AgencyAdminGroup
                    agencyId={agencyId}
                    agencySlug={agencySlug}
                    agencyName={agency.name}
                    staffId={staffId}
                    role={role}
                    showOperations={showOperations}
                    isAdmin={isAdmin}
                    canManage={canManage}
                    value={subFor('admin')}
                    onValueChange={setSubFor('admin')}
                  />
                </TabsContent>
              )}
            </Tabs>
          </main>
        </div>

        {role === 'agency_admin' && (
          <AgencyProductTour agencyId={agencyId} agencyName={agency.name} />
        )}
        <SupportWidget agencyId={agencyId} />
      </div>
    </SidebarProvider>
  );
};

export default AgencyDashboard;

