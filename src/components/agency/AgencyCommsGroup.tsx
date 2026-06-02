import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import AgencyNotices from './AgencyNotices';
import AgencyCommunicationCenter from './AgencyCommunicationCenter';
import AgencyReportHub from './reports/AgencyReportHub';
import SEMAPExport from './reports/SEMAPExport';
import AgencyDocumentGenerator from './AgencyDocumentGenerator';
import { GroupSetupPanel } from './shared/GroupSetupTab';

interface AgencyCommsGroupProps {
  agencyId: string;
  agencyName: string;
  staffId: string;
  canManage: boolean;
  canEditReports: boolean;
  isAdmin: boolean;
  showNotices: boolean;
  showComms: boolean;
  showReports: boolean;
  value?: string;
  onValueChange?: (v: string) => void;
}

const AgencyCommsGroup: React.FC<AgencyCommsGroupProps> = ({
  agencyId, agencyName, staffId, canManage, canEditReports, isAdmin,
  showNotices, showComms, showReports,
  value, onValueChange,
}) => {
  const defaultTab = showNotices ? 'notices' : showComms ? 'comms' : 'reports';
  const tabsProps = value !== undefined ? { value, onValueChange } : { defaultValue: defaultTab };

  return (
    <Tabs {...tabsProps} className="space-y-4">
      {showNotices && (
        <TabsContent value="notices">
          <AgencyNotices agencyId={agencyId} agencyName={agencyName} staffId={staffId} canManage={canManage} />
        </TabsContent>
      )}
      {showComms && (
        <TabsContent value="comms">
          <AgencyCommunicationCenter agencyId={agencyId} staffId={staffId} isAdmin={isAdmin} />
        </TabsContent>
      )}
      {showReports && (
        <TabsContent value="reports">
          <AgencyReportHub agencyId={agencyId} agencyName={agencyName} canEdit={canEditReports} />
        </TabsContent>
      )}
      {showReports && (
        <TabsContent value="semap">
          <SEMAPExport agencyId={agencyId} agencyName={agencyName} />
        </TabsContent>
      )}
      {showNotices && (
        <TabsContent value="docgen">
          <AgencyDocumentGenerator agencyId={agencyId} agencyName={agencyName} />
        </TabsContent>
      )}
      {isAdmin && (
        <GroupSetupPanel
          agencyId={agencyId}
          categories={['Automation']}
          heading="Communications Setup — Templates, Reports, Demo"
        />
      )}
    </Tabs>
  );
};

export default AgencyCommsGroup;
