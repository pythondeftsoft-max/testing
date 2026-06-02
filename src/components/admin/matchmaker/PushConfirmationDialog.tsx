import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { XCircle, Clock, Send, CheckCircle, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface PreviousPush {
  status: string;
  created_at: string;
  expires_at: string;
}

interface PushConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tenantName: string;
  propertyAddress: string;
  previousPush: PreviousPush | null;
  isLoading: boolean;
}

export const PushConfirmationDialog: React.FC<PushConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tenantName,
  propertyAddress,
  previousPush,
  isLoading,
}) => {
  const getStatusDisplay = () => {
    if (!previousPush) return null;

    const isExpired = new Date(previousPush.expires_at) < new Date();
    const status = previousPush.status;

    // Handle mapped statuses from useTenantMatchHistory
    if (status === 'tenant_declined' || status === 'denied') {
      return {
        icon: <XCircle className="w-4 h-4" />,
        label: 'Denied',
        className: 'bg-red-100 text-red-700 border-red-200',
      };
    }

    if (isExpired) {
      return {
        icon: <Clock className="w-4 h-4" />,
        label: 'Expired',
        className: 'bg-muted text-muted-foreground border-border',
      };
    }

    if (status === 'tenant_interested' || status === 'interested') {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Interested',
        className: 'bg-green-100 text-green-700 border-green-200',
      };
    }

    if (status === 'pending_landlord' || status === 'landlord_review') {
      return {
        icon: <Clock className="w-4 h-4" />,
        label: 'Landlord Review',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      };
    }

    if (status === 'primary_applicant') {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Primary Applicant',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
      };
    }

    // Default: Active/Pending push
    return {
      icon: <Send className="w-4 h-4" />,
      label: 'Active Push',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            Previous Push Found
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                This property was previously pushed to <strong>{tenantName}</strong>
              </p>

              {previousPush && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="font-medium text-foreground">{propertyAddress}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      {statusDisplay && (
                        <Badge 
                          variant="outline" 
                          className={`ml-2 ${statusDisplay.className}`}
                        >
                          {statusDisplay.icon}
                          <span className="ml-1">{statusDisplay.label}</span>
                        </Badge>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pushed:</span>
                      <span className="ml-2 text-foreground">
                        {format(new Date(previousPush.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="ml-2 text-foreground">
                        {format(new Date(previousPush.expires_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm">
                Are you sure you want to push this property again?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Pushing...' : 'Push Again'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
