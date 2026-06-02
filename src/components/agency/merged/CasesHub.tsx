import React from 'react';
import { Gavel, Accessibility } from 'lucide-react';
import { HubTabs, HubTabsList, HubTabsTrigger, HubTabsContent } from './HubTabs';
import AgencyHearingsTracker from '../AgencyHearingsTracker';
import AccommodationRequestQueue from '../accommodations/AccommodationRequestQueue';

interface Props {
  agencyId: string;
  canManage: boolean;
  canViewHearings: boolean;
}

const CasesHub: React.FC<Props> = ({ agencyId, canManage, canViewHearings }) => {
  const defaultTab = canViewHearings ? 'hearings' : 'accommodations';
  return (
    <HubTabs defaultValue={defaultTab} className="space-y-4">
      <HubTabsList>
        {canViewHearings && (
          <HubTabsTrigger value="hearings"><Gavel className="w-4 h-4" /> Hearings</HubTabsTrigger>
        )}
        <HubTabsTrigger value="accommodations"><Accessibility className="w-4 h-4" /> Accommodations</HubTabsTrigger>
      </HubTabsList>
      {canViewHearings && (
        <HubTabsContent value="hearings">
          <AgencyHearingsTracker agencyId={agencyId} canManage={canManage} />
        </HubTabsContent>
      )}
      <HubTabsContent value="accommodations">
        <AccommodationRequestQueue agencyId={agencyId} canManage={canManage} />
      </HubTabsContent>
    </HubTabs>
  );
};

export default CasesHub;
