import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  User, 
  DollarSign, 
  Phone, 
  Home, 
  Eye, 
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail
} from 'lucide-react';
import { TenantQuotaResetButton } from '@/components/admin/TenantQuotaResetButton';
import { AdminMessageDialog } from '@/components/admin/AdminMessageDialog';
import { format } from 'date-fns';

interface HousedTenant {
  id: string;
  user_id: string;
  property_id: string;
  property_address: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  monthly_rent: number;
  lease_start_date: string;
  lease_end_date: string;
  voucher_holder: boolean;
  voucher_amount: number;
  rent_due_day: number;
  city: string;
  zip_code: string;
  credit_score: number;
  employment_status: string;
  monthly_income: number;
  max_rent: number;
  preferred_locations: string[];
  message_credits: number;
  is_plus_subscriber: boolean;
  housing_authority?: string;
  move_in_window?: string;
  has_pets?: boolean;
  pet_type?: string;
  has_accessibility_needs?: boolean;
  accessibility_details?: string;
  has_eviction?: boolean;
  eviction_details?: string;
  has_felonies?: boolean;
  felony_details?: string;
  landlord_id: string;
  landlord_name: string;
  landlord_email: string;
  landlord_phone: string;
  placement_fee_amount: number;
  placement_fee_percentage: number;
  bedrooms?: number;
  bathrooms?: number;
  created_at: string;
  worker_assigned_at?: string | null;
  search_duration_days?: number;
}

interface AdminHousedTenantCardProps {
  tenant: HousedTenant;
  onViewProfile: (tenant: HousedTenant) => void;
  onMessage?: (tenantId: string) => void;
  showQuotaResetButton?: boolean;
}

export const AdminHousedTenantCard: React.FC<AdminHousedTenantCardProps> = ({
  tenant,
  onViewProfile,
  onMessage,
  showQuotaResetButton = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getDaysUntilLeaseEnd = () => {
    if (!tenant.lease_end_date) return null;
    const today = new Date();
    const leaseEnd = new Date(tenant.lease_end_date);
    const diffTime = leaseEnd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatSearchDuration = (days?: number) => {
    if (days === undefined || days === null) return 'N/A';
    
    if (days === 0) return 'Same day';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return weeks === 1 ? '1 week' : `${weeks} weeks`;
    }
    if (days < 365) {
      const months = Math.floor(days / 30);
      return months === 1 ? '1 month' : `${months} months`;
    }
    const years = Math.floor(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
  };

  const daysLeft = getDaysUntilLeaseEnd();
  const leaseStatus = daysLeft === null ? { variant: 'secondary' as const, days: 0, text: 'N/A' }
    : daysLeft < 0 ? { variant: 'danger' as const, days: daysLeft, text: 'Expired' }
    : daysLeft < 30 ? { variant: 'danger' as const, days: daysLeft, text: `${daysLeft} days` }
    : daysLeft < 90 ? { variant: 'warning' as const, days: daysLeft, text: `${daysLeft} days` }
    : { variant: 'success' as const, days: daysLeft, text: `${daysLeft} days` };

  return (
    <>
      <Card className="p-4 space-y-2">
        {/* Row 1: Property Address + Lease Status */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Home className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="font-semibold text-lg break-words">
              {tenant.property_address}
            </span>
          </div>
          <Badge variant={leaseStatus.variant} className="whitespace-nowrap">
            <Clock className="h-3 w-3 mr-1" />
            {leaseStatus.text}
          </Badge>
        </div>

        {/* Row 2: Landlord + Placement Fee (2 columns) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Landlord Info */}
          <div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              {tenant.landlord_name || 'Unknown Landlord'}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate">{tenant.landlord_email}</span>
              </div>
              {tenant.landlord_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {tenant.landlord_phone}
                </div>
              )}
            </div>
          </div>

          {/* Right: Placement Fee */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(tenant.placement_fee_amount)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {tenant.placement_fee_percentage}% of {formatCurrency(tenant.monthly_rent)}
            </div>
          </div>
        </div>

        {/* Row 3: Property Stats (Inline) */}
        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>{tenant.bedrooms || 'N/A'} Beds</span>
          <span>•</span>
          <span>{tenant.bathrooms || 'N/A'} Baths</span>
          <span>•</span>
          <span>{formatCurrency(tenant.monthly_rent)}/mo</span>
          <span>•</span>
          <span>Lease End: {formatDate(tenant.lease_end_date)}</span>
        </div>

        {/* Row 4: Tenant Collapsible */}
        <div className="border-t pt-2">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full flex justify-between items-center text-sm font-medium hover:bg-muted/50 rounded p-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Tenant: {tenant.tenant_name}</span>
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatSearchDuration(tenant.search_duration_days)} search
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {showQuotaResetButton && (
                <TenantQuotaResetButton tenantId={tenant.user_id} />
              )}
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setMessageDialogOpen(true);
                }}
                className="h-8 w-8 p-0"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(tenant);
                }}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </button>

          {expanded && (
            <div className="mt-2 text-xs space-y-2 pl-6 bg-muted/20 rounded p-3">
              {/* Contact */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="break-all">{tenant.tenant_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{tenant.tenant_phone || 'N/A'}</span>
                </div>
              </div>

              {/* Financial */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Score:</span>
                  <span className="font-medium">{tenant.credit_score || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Yearly Income:</span>
                  <span className="font-medium">{formatCurrency(tenant.monthly_income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employment:</span>
                  <span className="font-medium">{tenant.employment_status || 'N/A'}</span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1 pt-1">
                {tenant.is_plus_subscriber && (
                  <Badge variant="outline" className="text-xs py-0">
                    Plus Subscriber
                  </Badge>
                )}
                {tenant.voucher_holder && (
                  <Badge variant="success" className="text-xs py-0">
                    Voucher ({formatCurrency(tenant.voucher_amount)})
                  </Badge>
                )}
                {tenant.has_pets && (
                  <Badge variant="outline" className="text-xs py-0">
                    Pets: {tenant.pet_type || 'Yes'}
                  </Badge>
                )}
              </div>

              {/* Lease Details */}
              <div className="pt-1 border-t text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lease Start:</span>
                  <span>{formatDate(tenant.lease_start_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rent Due:</span>
                  <span>Day {tenant.rent_due_day}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span>{tenant.city}, {tenant.zip_code}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <AdminMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        recipientUserId={tenant.user_id}
        recipientName={tenant.tenant_name}
        recipientEmail={tenant.tenant_email}
      />
    </>
  );
};
