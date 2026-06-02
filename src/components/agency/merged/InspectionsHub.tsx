import React from 'react';
import { ClipboardCheck, FileSignature, Activity, Users } from 'lucide-react';
import { HubTabs, HubTabsList, HubTabsTrigger, HubTabsContent } from './HubTabs';
import AgencyInspections from '../AgencyInspections';
import InspectionToLeasePipeline from '../InspectionToLeasePipeline';
import InspectionOversightCenter from '../inspections/InspectionOversightCenter';
import InspectorManagementTab from '../inspections/InspectorManagementTab';
import InspectorDesktopShell from '../inspector/InspectorDesktopShell';

interface Props {
  agencyId: string;
  staffId: string;
  canManage: boolean;
  isInspector: boolean;
  canViewOversight: boolean;
  canManageInspectors: boolean;
  inspections: any[];
  inspLoading: boolean;
  onUpdateInspection: any;
  onRefreshInsp: () => void;
}

/**
 * Inspections Hub — collapses Inspections / Lease Pipeline / Oversight / Inspector Mgmt
 * into a single sidebar entry with internal tabs.
 */
const InspectionsHub: React.FC<Props> = ({
  agencyId, staffId, canManage, isInspector, canViewOversight, canManageInspectors,
  inspections, inspLoading, onUpdateInspection, onRefreshInsp,
}) => {
  return (
    <HubTabs defaultValue="active" className="space-y-4">
      <HubTabsList>
        <HubTabsTrigger value="active">
          <ClipboardCheck className="w-4 h-4" /> {isInspector ? 'My Inspections' : 'Active'}
        </HubTabsTrigger>
        <HubTabsTrigger value="pipeline">
          <FileSignature className="w-4 h-4" /> Lease Pipeline
        </HubTabsTrigger>
        {canViewOversight && (
          <HubTabsTrigger value="oversight">
            <Activity className="w-4 h-4" /> Oversight
          </HubTabsTrigger>
        )}
        {canManageInspectors && (
          <HubTabsTrigger value="inspectors">
            <Users className="w-4 h-4" /> Inspectors
          </HubTabsTrigger>
        )}
      </HubTabsList>

      <HubTabsContent value="active">
        {isInspector ? (
          <InspectorDesktopShell agencyId={agencyId} staffId={staffId} onUpdate={onUpdateInspection} />
        ) : (
          <AgencyInspections
            inspections={inspections}
            loading={inspLoading}
            canManage={canManage}
            agencyId={agencyId}
            onUpdate={onUpdateInspection}
            onRefresh={onRefreshInsp}
          />
        )}
      </HubTabsContent>

      <HubTabsContent value="pipeline">
        <InspectionToLeasePipeline agencyId={agencyId} />
      </HubTabsContent>

      {canViewOversight && (
        <HubTabsContent value="oversight">
          <InspectionOversightCenter agencyId={agencyId} />
        </HubTabsContent>
      )}

      {canManageInspectors && (
        <HubTabsContent value="inspectors">
          <InspectorManagementTab agencyId={agencyId} />
        </HubTabsContent>
      )}
    </HubTabs>
  );
};

export default InspectionsHub;
