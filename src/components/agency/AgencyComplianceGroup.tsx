import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import InspectionsHub from './merged/InspectionsHub';
import PropertiesHub from './merged/PropertiesHub';
import CasesHub from './merged/CasesHub';
import { GroupSetupPanel } from './shared/GroupSetupTab';

interface AgencyComplianceGroupProps {
  agencyId: string;
  role: string;
  staffId: string;
  canManage: boolean;
  canViewInspections: boolean;
  canViewProperties: boolean;
  canViewHearings: boolean;
  isInspector: boolean;
  inspections: any[];
  inspLoading: boolean;
  onUpdateInspection: any;
  onRefreshInsp: () => void;
  value?: string;
  onValueChange?: (v: string) => void;
}

const OVERSIGHT_ROLES = ['agency_admin', 'executive_director', 'inspection_supervisor'];
const SUPERVISOR_ROLES = ['agency_admin', 'executive_director', 'inspection_supervisor'];

const AgencyComplianceGroup: React.FC<AgencyComplianceGroupProps> = ({
  agencyId, role, staffId, canManage,
  canViewInspections, canViewProperties, canViewHearings,
  isInspector, inspections, inspLoading, onUpdateInspection, onRefreshInsp,
  value, onValueChange,
}) => {
  const canViewOversight = OVERSIGHT_ROLES.includes(role);
  const canManageInspectors = SUPERVISOR_ROLES.includes(role);
  const isAdmin = role === 'agency_admin';
  const defaultTab = canViewInspections ? 'inspections' : canViewProperties ? 'properties' : 'cases';
  const tabsProps = value !== undefined ? { value, onValueChange } : { defaultValue: defaultTab };

  return (
    <Tabs {...tabsProps} className="space-y-4">
      {canViewInspections && (
        <TabsContent value="inspections">
          <InspectionsHub
            agencyId={agencyId}
            staffId={staffId}
            canManage={canManage}
            isInspector={isInspector}
            canViewOversight={canViewOversight}
            canManageInspectors={canManageInspectors}
            inspections={inspections}
            inspLoading={inspLoading}
            onUpdateInspection={onUpdateInspection}
            onRefreshInsp={onRefreshInsp}
          />
        </TabsContent>
      )}

      {canViewProperties && (
        <TabsContent value="properties">
          <PropertiesHub agencyId={agencyId} canManage={canManage} />
        </TabsContent>
      )}

      <TabsContent value="cases">
        <CasesHub agencyId={agencyId} canManage={canManage} canViewHearings={canViewHearings} />
      </TabsContent>

      {isAdmin && (
        <GroupSetupPanel
          agencyId={agencyId}
          categories={['Money']}
          heading="Compliance Setup — Inspection Fees & Standards"
        />
      )}
    </Tabs>
  );
};

export default AgencyComplianceGroup;
