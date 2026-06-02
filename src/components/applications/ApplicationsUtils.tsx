
import { Badge } from '@/components/ui/badge';
import { PrimaryApplicantBadge } from '@/components/property/PrimaryApplicantBadge';

interface Application {
  status: string;
  priority_payment?: boolean;
  is_primary_applicant?: boolean;
  housing_status?: 'housed' | 'housed_and_paid' | null;
  move_in_checklist?: {
    lease_signed?: boolean;
  };
}

export const getStatusBadge = (application: Application) => {
  const { status, priority_payment, is_primary_applicant, housing_status, move_in_checklist } = application;
  
  // Get base status variant
  const getBaseVariant = () => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'withdrawn':
        return 'secondary';
      default:
        return 'secondary';
    }
  };
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Base Status Badge */}
      <Badge variant={getBaseVariant()}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
      
      {/* Primary Applicant Badge */}
      {is_primary_applicant && (
        <PrimaryApplicantBadge showIcon={true} />
      )}
      
      {/* Lease Signed Badge */}
      {move_in_checklist?.lease_signed && (
        <Badge className="bg-success text-success-foreground">
          📝 Lease Signed
        </Badge>
      )}
      
      {/* Housing Status Badge - Tenants only see "Housed" */}
      {housing_status && (
        <Badge className="bg-info text-info-foreground">
          🏠 Housed
        </Badge>
      )}
      
      {/* Priority Payment Badge */}
      {priority_payment && (
        <Badge className="bg-warning text-warning-foreground border-warning">
          🚀 Priority
        </Badge>
      )}
    </div>
  );
};


export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};
