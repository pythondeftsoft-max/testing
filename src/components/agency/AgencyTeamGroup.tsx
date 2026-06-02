import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import CaseworkerSupervisorTab from './CaseworkerSupervisorTab';
import InspectorManagementTab from './inspections/InspectorManagementTab';
import InspectorWorkloadCard from './InspectorWorkloadCard';
import AgencyStaffManagement from './AgencyStaffManagement';
import StaffPermissionOverridesPanel from './team/StaffPermissionOverridesPanel';
import AgencySettings from './AgencySettings';

interface AgencyTeamGroupProps {
  agencyId: string;
  showCaseworkers: boolean;
  showInspectors: boolean;
  isAdmin?: boolean;
  value?: string;
  onValueChange?: (v: string) => void;
}

const AgencyTeamGroup: React.FC<AgencyTeamGroupProps> = ({
  agencyId, showCaseworkers, showInspectors, isAdmin, value, onValueChange,
}) => {
  const defaultTab = isAdmin ? 'people' : (showCaseworkers ? 'caseworkers' : 'inspectors');
  const tabsProps = value !== undefined ? { value, onValueChange } : { defaultValue: defaultTab };

  return (
    <Tabs {...tabsProps} className="space-y-4">
      {isAdmin && (
        <TabsContent value="people">
          <AgencyStaffManagement agencyId={agencyId} />
        </TabsContent>
      )}
      {showCaseworkers && (
        <TabsContent value="caseworkers">
          <CaseworkerSupervisorTab agencyId={agencyId} />
        </TabsContent>
      )}
      {showInspectors && (
        <TabsContent value="inspectors">
          <div className="space-y-4">
            <InspectorWorkloadCard agencyId={agencyId} />
            <InspectorManagementTab agencyId={agencyId} />
          </div>
        </TabsContent>
      )}
      {isAdmin && (
        <TabsContent value="_setup">
          <div className="space-y-4">
            <AgencySettings
              agencyId={agencyId}
              categoryFilter={['Access']}
              heading="Team Setup — Permissions, Notifications, Retention"
            />
            <StaffPermissionOverridesPanel agencyId={agencyId} />
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
};

export default AgencyTeamGroup;
