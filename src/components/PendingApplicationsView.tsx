
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, User, Phone, MapPin, DollarSign, MessageCircle, Calendar, CheckCircle, XCircle, Filter, X, Clock, Star, Lock, Crown } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { TenantAvatar } from '@/components/enhanced/TenantAvatar';
import { ProgressTracker } from '@/components/enhanced/ProgressTracker';
import { PrimaryApplicantBadge } from '@/components/property/PrimaryApplicantBadge';
import { maskEmail, maskPhone, shouldMaskContact, getUnlockMessage } from '@/utils/contactInfoMasking';

interface PendingApplicationsViewProps {
  applications: any[];
  selectedPropertyId?: string;
  primaryApplicants?: Record<string, { id: string; name: string; unitId?: string }>;
  onClearPropertyFilter?: () => void;
  onViewProfile: (tenantId: string, propertyId: string) => void;
  onMessage: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, tenantId: string, propertyId: string) => void;
  onApprove: (application: any) => void;
  onDeny: (applicationId: string) => void;
  onResendContract: (applicationId: string, tenantId: string) => void;
  onSetAsPrimary?: (application: any) => void;
}

const PendingApplicationsView = ({ 
  applications, 
  selectedPropertyId,
  primaryApplicants = {},
  onClearPropertyFilter,
  onViewProfile,
  onMessage,
  onScheduleInterview,
  onApprove,
  onDeny,
  onResendContract,
  onSetAsPrimary
}: PendingApplicationsViewProps) => {
  const pendingApplications = applications.filter(app => app.status === 'pending');

  const isPrimaryApplicant = (application: any): boolean => {
    const propertyPrimary = primaryApplicants[application.property_id];
    if (!propertyPrimary) return false;
    
    // Check if this applicant matches the primary
    if (application.unit_id) {
      return propertyPrimary.unitId === application.unit_id && 
             propertyPrimary.id === application.tenant_id;
    }
    return propertyPrimary.id === application.tenant_id;
  };

  const getApplicationSteps = (application: any) => {
    return [
      {
        id: 'submitted',
        label: 'Submitted',
        status: 'completed' as const
      },
      {
        id: 'review',
        label: 'Under Review',
        status: application.status === 'pending' ? 'current' as const : 'completed' as const
      },
      {
        id: 'decision',
        label: 'Decision',
        status: 'pending' as const
      }
    ];
  };

  if (pendingApplications.length === 0) {
    return (
      <CardEnhanced variant="outlined" className="card-hover-gold">
        <CardEnhancedHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardEnhancedTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Applications
                {selectedPropertyId && (
                  <Badge className="bg-openkey-gold text-white flex items-center gap-1 ml-2">
                    <Star className="h-3 w-3" />
                    Filtered
                  </Badge>
                )}
              </CardEnhancedTitle>
              <CardEnhancedDescription>
                No pending applications found
                {selectedPropertyId && ' for selected property'}
              </CardEnhancedDescription>
            </div>
            {selectedPropertyId && onClearPropertyFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearPropertyFilter}
                className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
            )}
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Pending Applications</h3>
          <p className="text-muted-foreground">
            You don't have any pending applications to review.
          </p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <div className="space-y-6">
      {pendingApplications.map((application) => {
        const isPrimary = isPrimaryApplicant(application);
        const shouldMask = shouldMaskContact(isPrimary);
        const email = application.profiles?.email || '';
        const phone = application.profiles?.phone || '';

        return (
        <CardEnhanced key={application.id} variant="elevated" hover className="card-hover-gold">
          <CardEnhancedHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 flex-1">
                <TenantAvatar
                  firstName={application.profiles?.first_name}
                  lastName={application.profiles?.last_name}
                  email={application.profiles?.email}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardEnhancedTitle>
                      {application.profiles?.first_name && application.profiles?.last_name 
                        ? `${application.profiles.first_name} ${application.profiles.last_name}`
                        : application.tenant_profiles?.user_id 
                          ? 'Tenant Application'
                          : 'Pending Application'
                      }
                    </CardEnhancedTitle>
                    {isPrimary && <PrimaryApplicantBadge />}
                  </div>
                  <CardEnhancedDescription className="space-y-1">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {application.properties?.address || 'Property Address'}
                        {application.unit_number && (
                          <Badge variant="outline" className="ml-2">
                            Unit {application.unit_number}
                          </Badge>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${application.properties?.monthly_rent || 0}/month
                      </span>
                    </div>
                  </CardEnhancedDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {application.priority_payment_made && (
                  <Badge className="bg-openkey-gold text-white flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Priority
                  </Badge>
                )}
                <Badge variant="warning" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              </div>
            </div>
            
            {/* Progress Tracker */}
            <div className="mt-4 pt-4 border-t border-border">
              <ProgressTracker 
                steps={getApplicationSteps(application)}
                orientation="horizontal"
                size="sm"
              />
            </div>
          </CardEnhancedHeader>
          
          <CardEnhancedContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Applicant Information */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4" />
                  Applicant Information
                  {shouldMask && <Lock className="h-3 w-3 text-muted-foreground" />}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className={shouldMask ? 'text-muted-foreground' : ''}>
                      {shouldMask ? maskPhone(phone) : (phone || 'Not provided')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span>Yearly Income: ${application.tenant_profiles?.monthly_income?.toLocaleString() || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span>Credit Score: {application.tenant_profiles?.credit_score || 'Not provided'}</span>
                  </div>
                  {shouldMask && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {getUnlockMessage('view')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Property Details */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4" />
                  Property Details
                </h4>
                <div className="space-y-2 text-sm">
                  <p>{application.properties?.bedrooms || 'N/A'} bed, {application.properties?.bathrooms || 'N/A'} bath</p>
                  <p>Applied: {new Date(application.created_at).toLocaleDateString()}</p>
                  <p className="text-muted-foreground">Application Score: {application.tenant_score}/10</p>
                </div>
              </div>
            </div>

            {/* Tenant Qualifications Summary */}
            {application.tenant_profiles && (
              <div className="bg-muted/30 rounded-lg p-4 mb-4 border border-border">
                <h4 className="font-medium mb-2 text-foreground">Qualification Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {application.tenant_profiles.voucher_holder ? 
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Voucher Holder
                      </Badge> : 
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        No Voucher
                      </Badge>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    {!application.tenant_profiles.has_eviction ? 
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        No Evictions
                      </Badge> : 
                      <Badge variant="danger" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Has Evictions
                      </Badge>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    {!application.tenant_profiles.has_felonies ? 
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        No Felonies
                      </Badge> : 
                      <Badge variant="danger" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Has Felonies
                      </Badge>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    {application.tenant_profiles.employment_status === 'employed' ? 
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Employed
                      </Badge> : 
                      <Badge variant="warning" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Unemployed
                      </Badge>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProfile(application.tenant_id, application.property_id)}
                className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
              >
                <User className="h-4 w-4 mr-1" />
                {shouldMask ? 'Unlock Profile' : 'View Full Profile'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMessage(application.id)}
                className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Message Applicant
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onScheduleInterview(application.id, application.tenant_id, application.property_id)}
                className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule Meeting
              </Button>

              {!isPrimary && onSetAsPrimary && (
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => onSetAsPrimary(application)}
                  className="ml-auto"
                >
                  <Crown className="h-4 w-4 mr-1" />
                  Set as Primary
                </Button>
              )}

              {application.status === 'pending' && (
                <>
                  <Button
                    variant="blue"
                    size="sm"
                    onClick={() => onApprove(application)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeny(application.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Deny
                  </Button>
                </>
              )}
              
              {application.status === 'approved' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onResendContract(application.id, application.tenant_id)}
                  className="border-green-600/20 text-green-600 hover:bg-green-600 hover:text-white"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Resend Contract
                </Button>
              )}
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
        );
      })}
    </div>
  );
};

export default PendingApplicationsView;
