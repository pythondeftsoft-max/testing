import React from 'react';
import { useGrantExpiryAlerts } from '@/hooks/useGrantExpiryAlerts';
import { RequestAccessDialog } from '@/components/permissions/RequestAccessDialog';

/**
 * Global controller for grant expiry alerts and extension requests.
 * Mounts once in App.tsx to provide alerts across all routes.
 */
export const GrantAlertsController: React.FC = () => {
  const { extensionDialog, setExtensionDialog } = useGrantExpiryAlerts();

  return (
    <>
      {extensionDialog && (
        <RequestAccessDialog
          open={extensionDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setExtensionDialog(null);
            }
          }}
          scope={extensionDialog.scope}
          portfolioId={extensionDialog.portfolioId}
          objectName={extensionDialog.objectName}
          action={extensionDialog.action}
        />
      )}
    </>
  );
};