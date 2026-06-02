import React, { useState, useMemo } from 'react';
import { Users, FileText, Home, RefreshCw, GraduationCap, ClipboardCheck } from 'lucide-react';
import { HubTabs, HubTabsList, HubTabsTrigger, HubTabsContent } from './HubTabs';
import AgencyTenantsTable from '../AgencyTenantsTable';
import CaseworkerCaseload from '../CaseworkerCaseload';
import AgencyRftaPackets from '../AgencyRftaPackets';
import AgencyPlacements from '../AgencyPlacements';
import AgencyRecertifications from '../AgencyRecertifications';
import AgencyFSSDashboard from '../fss/AgencyFSSDashboard';
import CaseworkerInspectionsTab from '../inspections/CaseworkerInspectionsTab';

interface Props {
  agencyId: string;
  staffId: string;
  canManage: boolean;
  isCaseworker: boolean;
  canViewRfta: boolean;
  canViewPlacements: boolean;
  canViewRecerts: boolean;
  tenants: any[];
  dashLoading: boolean;
  packets: any[];
  rftaLoading: boolean;
  onUpdateRftaStatus: any;
  onRefreshDash: () => void;
  onRefreshRfta: () => void;
}

/**
 * Tenants Hub — single entry point that collapses what used to be
 * Caseload / RFTA / Placements / Recerts / FSS into one workflow surface.
 * Each is a tab inside; the "Roster" tab is the default starting point.
 */
const CaseloadTenantsHub: React.FC<Props> = ({
  agencyId, staffId, canManage, isCaseworker,
  canViewRfta, canViewPlacements, canViewRecerts,
  tenants, dashLoading, packets, rftaLoading,
  onUpdateRftaStatus, onRefreshDash, onRefreshRfta,
}) => {
  const [tab, setTab] = useState('roster');

  const fssTenants = useMemo(
    () => tenants.map((t: any) => ({
      id: t.tenant_id || t.id,
      name: t.tenant_name || `${t.first_name || ''} ${t.last_name || ''}`.trim(),
    })),
    [tenants],
  );

  return (
    <HubTabs value={tab} onValueChange={setTab} className="space-y-4">
      <HubTabsList>
        <HubTabsTrigger value="roster">
          <Users className="w-4 h-4" /> {isCaseworker ? 'My Roster' : 'Roster'}
        </HubTabsTrigger>
        {canViewRfta && (
          <HubTabsTrigger value="rfta"><FileText className="w-4 h-4" /> RFTA</HubTabsTrigger>
        )}
        {canViewPlacements && (
          <HubTabsTrigger value="placements"><Home className="w-4 h-4" /> Placements</HubTabsTrigger>
        )}
        {canViewRecerts && (
          <HubTabsTrigger value="recerts"><RefreshCw className="w-4 h-4" /> Recerts</HubTabsTrigger>
        )}
        <HubTabsTrigger value="fss"><GraduationCap className="w-4 h-4" /> FSS</HubTabsTrigger>
        {isCaseworker && (
          <HubTabsTrigger value="inspections">
            <ClipboardCheck className="w-4 h-4" /> Inspections
          </HubTabsTrigger>
        )}
      </HubTabsList>

      <HubTabsContent value="roster">
        {isCaseworker ? (
          <CaseworkerCaseload agencyId={agencyId} staffId={staffId} />
        ) : (
          <AgencyTenantsTable
            tenants={tenants}
            loading={dashLoading}
            agencyId={agencyId}
            canManage={canManage}
            onRefresh={onRefreshDash}
          />
        )}
      </HubTabsContent>

      {canViewRfta && (
        <HubTabsContent value="rfta">
          <AgencyRftaPackets
            packets={packets}
            loading={rftaLoading}
            canManage={canManage}
            agencyId={agencyId}
            staffId={staffId}
            onUpdateStatus={onUpdateRftaStatus}
            onRefresh={onRefreshRfta}
          />
        </HubTabsContent>
      )}

      {canViewPlacements && (
        <HubTabsContent value="placements">
          <AgencyPlacements agencyId={agencyId} />
        </HubTabsContent>
      )}

      {canViewRecerts && (
        <HubTabsContent value="recerts">
          <AgencyRecertifications agencyId={agencyId} canManage={canManage} />
        </HubTabsContent>
      )}

      <HubTabsContent value="fss">
        <AgencyFSSDashboard agencyId={agencyId} canManage={canManage} tenants={fssTenants} />
      </HubTabsContent>

      {isCaseworker && (
        <HubTabsContent value="inspections">
          <CaseworkerInspectionsTab agencyId={agencyId} staffId={staffId} />
        </HubTabsContent>
      )}
    </HubTabs>
  );
};

export default CaseloadTenantsHub;
