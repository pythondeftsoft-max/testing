import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  FileText,
  Crown,
  Lock,
  Star
} from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { TenantAvatar } from '@/components/enhanced/TenantAvatar';
import { ApplicationLimitBadge } from './ApplicationLimitBadge';
import { PrimaryApplicantBadge } from './PrimaryApplicantBadge';
import { maskEmail, maskPhone, shouldMaskContact, getUnlockMessage } from '@/utils/contactInfoMasking';

interface ApplicantCardProps {
  application: any;
  isPrimary?: boolean;
  applicationLimit?: {
    currentCount: number;
    maxAllowed: number;
    isAtLimit: boolean;
  };
  onViewProfile: () => void;
  onMessage: () => void;
  onSetAsPrimary?: () => void;
  showPrimaryAction?: boolean;
}

export const ApplicantCard: React.FC<ApplicantCardProps> = ({
  application,
  isPrimary = false,
  applicationLimit,
  onViewProfile,
  onMessage,
  onSetAsPrimary,
  showPrimaryAction = true
}) => {
  const shouldMask = shouldMaskContact(isPrimary);
  const email = application.profiles?.email || '';
  const phone = application.profiles?.phone || '';

  return (
    <CardEnhanced variant="command" hover className="command-card">
      <CardEnhancedHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <TenantAvatar
              firstName={application.profiles?.first_name}
              lastName={application.profiles?.last_name}
              email={application.profiles?.email}
              size="md"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardEnhancedTitle>
                  {application.profiles?.first_name && application.profiles?.last_name 
                    ? `${application.profiles.first_name} ${application.profiles.last_name}`
                    : 'Applicant'
                  }
                </CardEnhancedTitle>
                {isPrimary && <PrimaryApplicantBadge />}
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {application.properties?.address || 'Property Address'}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${application.properties?.monthly_rent || 0}/month
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {application.priority_payment_made && (
              <Badge className="bg-openkey-gold text-white flex items-center gap-1">
                <Star className="h-3 w-3" />
                Priority
              </Badge>
            )}
            {applicationLimit && (
              <ApplicationLimitBadge
                currentCount={applicationLimit.currentCount}
                maxAllowed={applicationLimit.maxAllowed}
              />
            )}
          </div>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent>
        <div className="space-y-4">
          {/* Contact Information with Masking */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-foreground">
              <User className="h-4 w-4" />
              Contact Information
              {shouldMask && <Lock className="h-3 w-3 text-muted-foreground" />}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className={shouldMask ? 'text-muted-foreground' : ''}>
                  {shouldMask ? maskEmail(email) : email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className={shouldMask ? 'text-muted-foreground' : ''}>
                  {shouldMask ? maskPhone(phone) : phone}
                </span>
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

          {/* Financial Summary */}
          {application.tenant_profiles && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Monthly Income</span>
                <p className="font-medium">
                  ${application.tenant_profiles.monthly_income?.toLocaleString() || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Credit Score</span>
                <p className="font-medium">
                  {application.tenant_profiles.credit_score || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewProfile}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
            >
              <User className="h-4 w-4 mr-1" />
              {shouldMask ? 'Unlock Profile' : 'View Profile'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onMessage}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
            >
              <FileText className="h-4 w-4 mr-1" />
              Message
            </Button>
            {showPrimaryAction && !isPrimary && onSetAsPrimary && (
              <Button
                variant="gold"
                size="sm"
                onClick={onSetAsPrimary}
                className="ml-auto"
              >
                <Crown className="h-4 w-4 mr-1" />
                Set as Primary
              </Button>
            )}
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};
