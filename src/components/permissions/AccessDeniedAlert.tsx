import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Clock } from 'lucide-react';
import { RequestAccessDialog } from './RequestAccessDialog';

interface AccessDeniedAlertProps {
  object: string;
  action: 'view' | 'edit' | 'delete' | 'create';
  scope: 'account' | 'portfolio';
  portfolioId?: string | null;
  highestAccountRole?: string | null;
}

export const AccessDeniedAlert: React.FC<AccessDeniedAlertProps> = ({
  object,
  action,
  scope,
  portfolioId,
  highestAccountRole,
}) => {
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  return (
    <>
      <Alert className="border-destructive/50 text-destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3">
          <div>
            You don't have permission to {action} {object} at the {scope} level.
            {highestAccountRole && (
              <span className="block mt-1 text-sm text-muted-foreground">
                Your current role: {highestAccountRole}
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRequestDialog(true)}
            className="self-start"
          >
            <Clock className="h-4 w-4 mr-2" />
            Request Access
          </Button>
        </AlertDescription>
      </Alert>

      <RequestAccessDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        scope={scope}
        portfolioId={portfolioId}
        objectName={object}
        action={action}
      />
    </>
  );
};