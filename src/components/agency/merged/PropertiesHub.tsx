import React from 'react';
import { Building, UserCheck } from 'lucide-react';
import { HubTabs, HubTabsList, HubTabsTrigger, HubTabsContent } from './HubTabs';
import AgencyProperties from '../AgencyProperties';
import AgencyLandlordRegistry from '../AgencyLandlordRegistry';

interface Props {
  agencyId: string;
  canManage: boolean;
}

const PropertiesHub: React.FC<Props> = ({ agencyId, canManage }) => (
  <HubTabs defaultValue="properties" className="space-y-4">
    <HubTabsList>
      <HubTabsTrigger value="properties"><Building className="w-4 h-4" /> Properties</HubTabsTrigger>
      <HubTabsTrigger value="landlords"><UserCheck className="w-4 h-4" /> Landlords</HubTabsTrigger>
    </HubTabsList>
    <HubTabsContent value="properties">
      <AgencyProperties agencyId={agencyId} />
    </HubTabsContent>
    <HubTabsContent value="landlords">
      <AgencyLandlordRegistry agencyId={agencyId} canManage={canManage} />
    </HubTabsContent>
  </HubTabs>
);

export default PropertiesHub;
