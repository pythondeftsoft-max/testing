import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, Globe, DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { type DomainInfo } from '@/hooks/useWhiteLabelDomains';
import { formatMonthlyCost, getTierDisplayName, getTierColor } from '@/utils/whiteLabelPricing';
import { formatLastChecked, getDomainDisplay } from '@/utils/domainHelpers';
import { buildSubdomainUrl } from '@/utils/baseDomain';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface DomainDetailsModalProps {
  domain: DomainInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const DomainDetailsModal: React.FC<DomainDetailsModalProps> = ({
  domain,
  isOpen,
  onClose,
}) => {
  const { value, type } = getDomainDisplay({
    custom_domain: domain.domain_type === 'domain' ? domain.domain_value : null,
    custom_subdomain: domain.domain_type === 'subdomain' ? domain.domain_value : null,
  });

  const getVerificationBadge = () => {
    switch (domain.domain_verification_status) {
      case 'verified':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Not Verified</Badge>;
    }
  };

  const getApprovalBadge = () => {
    switch (domain.approval_status) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{domain.approval_status}</Badge>;
    }
  };

  const previewUrl = domain.domain_type === 'domain' 
    ? `https://${domain.domain_value}` 
    : buildSubdomainUrl(domain.domain_value);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Globe className="h-5 w-5" />
            Domain Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Domain Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Domain Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Domain Type</p>
                  <Badge variant="outline" className="mt-1">{type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Domain Value</p>
                  <p className="font-mono text-sm mt-1">{value}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Verification Status</p>
                  <div className="mt-1">{getVerificationBadge()}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approval Status</p>
                  <div className="mt-1">{getApprovalBadge()}</div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Preview URL</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {previewUrl}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Company Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium mt-1">{domain.company_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner Email</p>
                <p className="text-sm mt-1">{domain.owner_email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="text-sm font-mono mt-1 text-xs">{domain.user_id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Tier</p>
                  <Badge className="mt-1" variant="outline">
                    {getTierDisplayName(domain.subscription_tier)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className={`font-semibold mt-1 ${getTierColor(domain.subscription_tier)}`}>
                    {formatMonthlyCost(domain.monthly_cost, domain.billing_cycle)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Billing Cycle</p>
                  <p className="text-sm mt-1 capitalize">{domain.billing_cycle}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getApprovalBadge()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Traffic Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Traffic Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Page Views (30d)</p>
                  <p className="text-2xl font-bold mt-1">{domain.page_views_30d.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unique Visitors (30d)</p>
                  <p className="text-2xl font-bold mt-1">{domain.unique_visitors_30d.toLocaleString()}</p>
                </div>
              </div>
              {domain.last_activity_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Activity</p>
                  <p className="text-sm mt-1">{formatLastChecked(domain.last_activity_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {domain.created_at ? format(new Date(domain.created_at), 'MMM d, yyyy h:mm a') : 'Unknown'}
                </span>
              </div>
              {domain.approved_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Approved:</span>
                  <span className="font-medium">
                    {format(new Date(domain.approved_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              )}
              {domain.verified_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Verified:</span>
                  <span className="font-medium">
                    {format(new Date(domain.verified_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Checked:</span>
                <span className="font-medium">{formatLastChecked(domain.last_checked_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
