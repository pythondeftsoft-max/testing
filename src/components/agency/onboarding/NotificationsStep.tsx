import React from 'react';
import AgencyNotificationPreferencesPanel from '../AgencyNotificationPreferencesPanel';

interface Props {
  agencyId: string;
}

/**
 * Wraps the existing notification preferences panel which already
 * persists to the agency_notification_preferences table.
 */
export const NotificationsStep: React.FC<Props> = ({ agencyId }) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Set the default notifications your agency sends to tenants and landlords. You can change these anytime under Comms.
    </p>
    <AgencyNotificationPreferencesPanel agencyId={agencyId} />
  </div>
);

export default NotificationsStep;
