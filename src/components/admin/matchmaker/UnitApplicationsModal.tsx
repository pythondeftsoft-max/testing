import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useUnitApplications } from '@/hooks/useUnitApplications';
import { usePrimaryApplicantActions } from '@/hooks/usePrimaryApplicantActions';
import { PrimaryApplicantBadge } from '@/components/property/PrimaryApplicantBadge';
import { Button } from '@/components/ui/button';
import { Crown, Mail, Phone, DollarSign, Calendar, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UnitApplicationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string | null;
  propertyAddress: string;
}

export const UnitApplicationsModal: React.FC<UnitApplicationsModalProps> = ({
  open,
  onOpenChange,
  unitId,
  propertyAddress,
}) => {
  const { data: applications, isLoading } = useUnitApplications(unitId);
  const { setAsPrimaryApplicant, rejectPrimaryApplicant } = usePrimaryApplicantActions();

  const handleSetPrimary = (tenantId: string) => {
    if (!unitId) return;
    setAsPrimaryApplicant.mutate({ unitId, tenantId });
  };

  const handleRemovePrimary = () => {
    if (!unitId) return;
    rejectPrimaryApplicant.mutate({ unitId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Applications for {propertyAddress}</DialogTitle>
          <DialogDescription>
            {applications?.length || 0} active application{applications?.length !== 1 ? 's' : ''} 
            {applications?.length === 6 && ' (listing auto-paused at 6)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : applications && applications.length > 0 ? (
            applications.map((app) => (
              <div
                key={app.id}
                className={`p-4 border rounded-lg space-y-3 ${
                  app.is_primary_applicant
                    ? 'border-openkey-gold bg-openkey-gold/5'
                    : 'border-border'
                }`}
              >
                {/* Header with name and primary badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">
                        {app.tenant.first_name} {app.tenant.last_name}
                      </h3>
                      {app.is_primary_applicant && <PrimaryApplicantBadge />}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {app.is_primary_applicant ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRemovePrimary}
                        disabled={rejectPrimaryApplicant.isPending}
                      >
                        Remove Primary
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSetPrimary(app.tenant_id)}
                        disabled={setAsPrimaryApplicant.isPending}
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        Set as Primary
                      </Button>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {app.tenant.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{app.tenant.email}</span>
                    </div>
                  )}
                  {app.tenant.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{app.tenant.phone}</span>
                    </div>
                  )}
                </div>

                {/* Tenant details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t text-sm">
                  {(app.tenant.rent_range_min || app.tenant.rent_range_max) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        ${app.tenant.rent_range_min || 0} - ${app.tenant.rent_range_max || 0}/mo
                      </span>
                    </div>
                  )}
                  {app.tenant.move_in_window && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground capitalize">
                        {app.tenant.move_in_window}
                      </span>
                    </div>
                  )}
                  {app.tenant.housing_status && (
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground capitalize">
                        {app.tenant.housing_status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No applications yet
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
