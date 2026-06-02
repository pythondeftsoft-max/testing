import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Settings as SettingsIcon } from 'lucide-react';
import AgencySettings from '@/components/agency/AgencySettings';

export const GROUP_SETUP_VALUE = '_setup';

interface Props {
  agencyId: string;
  /** Settings category labels (must match SETTINGS_GROUPS in AgencySettings) */
  categories: string[];
  heading?: string;
}

/**
 * Shared TabsContent panel rendered inside each group's ⚙ Setup tab.
 * Scopes AgencySettings down to the categories relevant for that group.
 *
 * The matching <TabsTrigger value="_setup"> must be added to the parent's
 * tab row separately (right-aligned, muted styling) — see <GroupSetupTrigger>.
 */
export const GroupSetupPanel: React.FC<Props> = ({ agencyId, categories, heading }) => (
  <TabsContent value={GROUP_SETUP_VALUE}>
    <AgencySettings
      agencyId={agencyId}
      categoryFilter={categories}
      heading={heading}
      hideHeading={false}
    />
  </TabsContent>
);

/**
 * Right-aligned ⚙ Setup trigger styled muted so it reads as "config", not work.
 * Use inside the parent's <TabsList> with a flex-spacer before it.
 */
export const GroupSetupTriggerLabel: React.FC = () => (
  <span className="inline-flex items-center gap-1">
    <SettingsIcon className="w-3.5 h-3.5" />
    <span className="text-xs">Setup</span>
  </span>
);

export default GroupSetupPanel;
