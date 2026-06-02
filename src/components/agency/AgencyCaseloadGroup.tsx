import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import CaseloadTenantsHub from './merged/CaseloadTenantsHub';
import AgencyWaitlist from './AgencyWaitlist';
import AgencyApplications from './AgencyApplications';
import CaseworkerSupervisorTab from './CaseworkerSupervisorTab';
import AgencyLeaseRenewalOverview from '@/components/renewal/AgencyLeaseRenewalOverview';
import { GroupSetupPanel } from './shared/GroupSetupTab';

interface AgencyCaseloadGroupProps {
  agencyId: string;
  agencySlug?: string;
  staffId: string;
  role: string;
  canManage: boolean;
  canViewWaitlist: boolean;
  canViewCaseload: boolean;
  canViewRfta: boolean;
  canViewPlacements: boolean;
  canViewRecerts: boolean;
  isCaseworker: boolean;
  isAdmin?: boolean;
  tenants: any[];
  dashLoading: boolean;
  packets: any[];
  rftaLoading: boolean;
  onUpdateRftaStatus: any;
  onRefreshDash: () => void;
  onRefreshRfta: () => void;
  value?: string;
  onValueChange?: (v: string) => void;
}

const AgencyCaseloadGroup: React.FC<AgencyCaseloadGroupProps> = ({
  agencyId, agencySlug, staffId, role, canManage,
  canViewWaitlist, canViewCaseload, canViewRfta, canViewPlacements, canViewRecerts,
  isCaseworker, isAdmin, tenants, dashLoading, packets, rftaLoading,
  onUpdateRftaStatus, onRefreshDash, onRefreshRfta,
  value, onValueChange,
}) => {
  const isSupervisor = role === 'caseworker_supervisor' || role === 'agency_admin' || role === 'executive_director';
  const adminRole = isAdmin ?? (role === 'agency_admin');
  const defaultTab = canViewWaitlist ? 'applications' : canViewCaseload ? 'tenants' : 'tenants';
  const tabsProps = value !== undefined ? { value, onValueChange } : { defaultValue: defaultTab };

  return (
    <Tabs {...tabsProps} className="space-y-4">
      {canViewWaitlist && (
        <TabsContent value="applications">
          <AgencyApplications agencyId={agencyId} agencySlug={agencySlug} canManage={canManage} />
        </TabsContent>
      )}

      {canViewWaitlist && (
        <TabsContent value="waitlist">
          <AgencyWaitlist agencyId={agencyId} agencySlug={agencySlug} canManage={canManage} />
        </TabsContent>
      )}

      {canViewCaseload && (
        <TabsContent value="tenants">
          <CaseloadTenantsHub
            agencyId={agencyId}
            staffId={staffId}
            canManage={canManage}
            isCaseworker={isCaseworker}
            canViewRfta={canViewRfta}
            canViewPlacements={canViewPlacements}
            canViewRecerts={canViewRecerts}
            tenants={tenants}
            dashLoading={dashLoading}
            packets={packets}
            rftaLoading={rftaLoading}
            onUpdateRftaStatus={onUpdateRftaStatus}
            onRefreshDash={onRefreshDash}
            onRefreshRfta={onRefreshRfta}
          />
        </TabsContent>
      )}

      {(canViewCaseload || adminRole) && (
        <TabsContent value="renewals">
          <AgencyLeaseRenewalOverview agencyId={agencyId} />
        </TabsContent>
      )}

      {isSupervisor && (
        <TabsContent value="workforce">
          <CaseworkerSupervisorTab agencyId={agencyId} />
        </TabsContent>
      )}

      {adminRole && (
        <GroupSetupPanel
          agencyId={agencyId}
          categories={['Programs']}
          heading="Caseload Setup"
        />
      )}
    </Tabs>
  );
};

export default AgencyCaseloadGroup;
