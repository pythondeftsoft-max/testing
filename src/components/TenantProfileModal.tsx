
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Home, 
  FileText, 
  DollarSign, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Briefcase, 
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Users,
  Heart,
  TrendingUp,
  Building,
  AlertTriangle,
  Lock,
  Crown
} from 'lucide-react';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { Button } from '@/components/ui/button';
import { maskEmail, maskPhone, getUnlockMessage } from '@/utils/contactInfoMasking';
import { formatIncomeRange } from '@/lib/formatters';
import { PrimaryApplicantBadge } from '@/components/property/PrimaryApplicantBadge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { TenantPaymentHistory } from '@/components/tenant/TenantPaymentHistory';
import { LockedFinancialSection } from '@/components/tenant/LockedFinancialSection';

interface TenantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  propertyId: string;
  isPrimary?: boolean;
  showPrimaryBadge?: boolean;
  onSetAsPrimary?: () => void;
}

const TenantProfileModal = ({ isOpen, onClose, tenantId, propertyId, isPrimary = false, showPrimaryBadge, onSetAsPrimary }: TenantProfileModalProps) => {
  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();
  const { tenantData, loading, canViewDocuments } = useTenantProfile(tenantId, propertyId, user?.id);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Admins can always see full details; landlords need primary status
  const shouldMask = !isPrimary && !isAdmin;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Tenant Profile...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading tenant information...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!tenantData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tenant Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Unable to load tenant information.</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getCreditScoreColor = (score: string) => {
    if (score.includes('750') || score.includes('800')) return 'text-green-600';
    if (score.includes('670') || score.includes('700')) return 'text-blue-600';
    if (score.includes('580') || score.includes('600')) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCreditScoreLabel = (score: string) => {
    if (score.includes('750') || score.includes('800')) return 'Excellent';
    if (score.includes('670') || score.includes('700')) return 'Good';
    if (score.includes('580') || score.includes('600')) return 'Fair';
    return 'Poor';
  };

  // Currency formatting is handled by CurrencyDisplay component

  const getVoucherStatusBadge = () => {
    switch (tenantData?.voucherStatus) {
      case 'yes':
        return <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active Voucher
        </Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          No Voucher
        </Badge>;
    }
  };

  const getBackgroundStatus = () => {
    const hasIssues = tenantData?.hasEviction || tenantData?.hasFelonies;
    if (hasIssues) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Background Issues
      </Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200">
      <CheckCircle className="h-3 w-3 mr-1" />
      Clean Background
    </Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 animate-scale-in">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <div>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                      <User className="h-6 w-6" />
                      Tenant Profile
                      {(showPrimaryBadge ?? isPrimary) && <PrimaryApplicantBadge className="ml-2" />}
                    </DialogTitle>
                    <p className="text-muted-foreground mt-1">
                      {tenantData.firstName} {tenantData.lastName} • {shouldMask ? maskEmail(tenantData.email) : tenantData.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getVoucherStatusBadge()}
                    {getBackgroundStatus()}
                  </div>
                </div>
                {!isPrimary && onSetAsPrimary && (
                  <Button variant="gold" onClick={onSetAsPrimary}>
                    <Crown className="h-4 w-4 mr-2" />
                    Set as Primary to Unlock
                  </Button>
                )}
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="sticky top-0 z-10 bg-background border-b">
                <TabsList className={`grid w-full ${tenantData.lease ? (canViewDocuments ? 'grid-cols-6' : 'grid-cols-5') : (canViewDocuments ? 'grid-cols-5' : 'grid-cols-4')}`}>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                  <TabsTrigger value="background">Background</TabsTrigger>
                  {tenantData.lease && (
                    <TabsTrigger value="lease">Lease Details</TabsTrigger>
                  )}
                  {canViewDocuments && (
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  )}
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              </div>

          <div className="overflow-y-auto max-h-[60vh] mt-4">
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Top Section - 2 Cards */}
              <div className="grid grid-cols-1 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4" />
                    Contact
                    {shouldMask && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <div className={`text-xs ${shouldMask ? 'text-muted-foreground' : ''} truncate`}>
                      {shouldMask ? maskEmail(tenantData.email) : tenantData.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <div className={`text-xs ${shouldMask ? 'text-muted-foreground' : ''}`}>
                      {shouldMask ? maskPhone(tenantData.phone) : tenantData.phone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <div className="text-xs text-muted-foreground">{[tenantData.city, tenantData.state].filter(Boolean).join(', ')} {tenantData.zipCode}</div>
                  </div>
                  {shouldMask && (
                    <>
                      <Separator />
                      <div className="p-2 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {getUnlockMessage('access')}
                        </p>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Voucher</span>
                    {getVoucherStatusBadge()}
                  </div>
                </CardContent>
              </Card>

              </div>

              {/* Application Details - Full Signup Form Data */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Application Details</h3>
                
                {/* Housing Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Housing Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tenantData.bedroomsApproved && tenantData.bedroomsApproved.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Bedrooms Approved</span>
                        <div className="flex gap-2">
                          {tenantData.bedroomsApproved.map((bed: string) => (
                            <Badge key={bed} variant="secondary">{bed}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Rent Range</span>
                      <span className="text-sm font-semibold">
                        <CurrencyDisplay amount={tenantData.rentRangeMin} /> - <CurrencyDisplay amount={tenantData.rentRangeMax} />
                      </span>
                    </div>
                    {tenantData.housingAuthority && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Housing Authority</span>
                        <span className="text-sm">{tenantData.housingAuthority}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Preferred Location</span>
                      <span className="text-sm">{[tenantData.city, tenantData.state].filter(Boolean).join(', ')} {tenantData.zipCode}</span>
                    </div>
                    {tenantData.moveInWindow && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Move-in Window</span>
                        <span className="text-sm">{tenantData.moveInWindow}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Information */}
                {!shouldMask ? (
                  tenantData.creditScore ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          Financial Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Credit Score Range</span>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${getCreditScoreColor(tenantData.creditScore)}`}>
                              {tenantData.creditScore}
                            </div>
                            <div className={`text-xs ${getCreditScoreColor(tenantData.creditScore)}`}>
                              {getCreditScoreLabel(tenantData.creditScore)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null
                ) : (
                  <LockedFinancialSection 
                    title="Financial Information" 
                    icon={CreditCard}
                  />
                )}

                {/* Background & Screening */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Background & Screening
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Eviction History</span>
                      <Badge variant={tenantData.hasEviction ? 'destructive' : 'success'}>
                        {tenantData.hasEviction ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {tenantData.hasEviction && tenantData.evictionDetails && (
                      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <div className="text-sm font-medium text-destructive flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Eviction Details
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{tenantData.evictionDetails}</div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Criminal Background</span>
                      <Badge variant={tenantData.hasFelonies ? 'destructive' : 'success'}>
                        {tenantData.hasFelonies ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {tenantData.hasFelonies && tenantData.felonyDetails && (
                      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <div className="text-sm font-medium text-destructive flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Criminal Background Details
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{tenantData.felonyDetails}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pets</span>
                      <Badge variant={tenantData.hasPets ? 'warning' : 'secondary'}>
                        {tenantData.hasPets ? `Yes - ${tenantData.petType || 'Not specified'}` : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Accessibility Needs</span>
                      <Badge variant={tenantData.hasAccessibilityNeeds ? 'warning' : 'secondary'}>
                        {tenantData.hasAccessibilityNeeds ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {tenantData.hasAccessibilityNeeds && tenantData.accessibilityDetails && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-sm font-medium text-blue-800 dark:text-blue-400">Accessibility Details</div>
                        <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">{tenantData.accessibilityDetails}</div>
                      </div>
                    )}
                    {tenantData.phoneType && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Phone Type</span>
                        <Badge variant="secondary">{tenantData.phoneType}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!shouldMask ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Income & Employment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Yearly Income</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatIncomeRange(tenantData.monthlyIncome)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Employment Status</span>
                        <Badge variant={
                          tenantData.employmentStatus === 'employed' || 
                          tenantData.employmentStatus === 'full-time' 
                            ? 'success' 
                            : tenantData.employmentStatus === 'self-employed' 
                              ? 'secondary' 
                              : 'outline'
                        }>
                          {tenantData.employmentStatus 
                            ? tenantData.employmentStatus.charAt(0).toUpperCase() + 
                              tenantData.employmentStatus.slice(1).replace('-', ' ')
                            : 'Not specified'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <LockedFinancialSection title="Income & Employment" icon={Briefcase} />
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Rent Capacity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Min Rent</span>
                      <span className="text-sm font-semibold">${tenantData.rentRangeMin}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Max Rent</span>
                      <span className="text-sm font-semibold">${tenantData.rentRangeMax}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {!shouldMask ? (
                tenantData.creditScore && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Credit Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Credit Score Range</span>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${getCreditScoreColor(tenantData.creditScore)}`}>
                            {tenantData.creditScore}
                          </div>
                          <div className={`text-xs ${getCreditScoreColor(tenantData.creditScore)}`}>
                            {getCreditScoreLabel(tenantData.creditScore)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <LockedFinancialSection title="Credit Information" icon={CreditCard} />
              )}
            </TabsContent>

            <TabsContent value="background" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Background Checks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Eviction History</span>
                      <Badge variant={tenantData.hasEviction ? 'destructive' : 'success'}>
                        {tenantData.hasEviction ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Criminal Background</span>
                      <Badge variant={tenantData.hasFelonies ? 'destructive' : 'success'}>
                        {tenantData.hasFelonies ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {tenantData.hasEviction && tenantData.evictionDetails && (
                      <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                        <div className="text-sm font-medium text-destructive">Eviction Details</div>
                        <div className="text-sm text-muted-foreground mt-1">{tenantData.evictionDetails}</div>
                      </div>
                    )}
                    {tenantData.hasFelonies && tenantData.felonyDetails && (
                      <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                        <div className="text-sm font-medium text-destructive">Criminal Background Details</div>
                        <div className="text-sm text-muted-foreground mt-1">{tenantData.felonyDetails}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pets</span>
                      <Badge variant={tenantData.hasPets ? 'warning' : 'secondary'}>
                        {tenantData.hasPets ? `Yes - ${tenantData.petType}` : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Accessibility Needs</span>
                      <Badge variant={tenantData.hasAccessibilityNeeds ? 'warning' : 'secondary'}>
                        {tenantData.hasAccessibilityNeeds ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {tenantData.hasAccessibilityNeeds && tenantData.accessibilityDetails && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-800">Accessibility Details</div>
                        <div className="text-sm text-blue-700 mt-1">{tenantData.accessibilityDetails}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="lease" className="space-y-6 mt-0">
              {tenantData.lease ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        Property Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div><strong>Address:</strong> {tenantData.lease.propertyAddress}</div>
                      <div><strong>Unit:</strong> {tenantData.lease.unitNumber}</div>
                      <div><strong>Bedrooms:</strong> {tenantData.lease.bedrooms}</div>
                      <div><strong>Bathrooms:</strong> {tenantData.lease.bathrooms}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Rent Structure
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Rent:</span>
                        <span className="font-semibold">${tenantData.lease.totalRent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HAP Portion:</span>
                        <span>${tenantData.lease.hapPortion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tenant Portion:</span>
                        <span>${tenantData.lease.tenantPortion}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Lease Terms
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div><strong>Start Date:</strong> {tenantData.lease.startDate}</div>
                      <div><strong>End Date:</strong> {tenantData.lease.endDate}</div>
                    </CardContent>
                  </Card>

                  {tenantData.voucher && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          HAP Contract
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div><strong>Voucher Number:</strong> {tenantData.voucher.number}</div>
                        <div><strong>Type:</strong> {tenantData.voucher.type}</div>
                        <div><strong>PHA:</strong> {tenantData.voucher.pha}</div>
                        <div><strong>Caseworker:</strong> {tenantData.voucher.caseworker.name}</div>
                        <div><strong>Contact:</strong> {tenantData.voucher.caseworker.phone}</div>
                        <div><strong>Email:</strong> {tenantData.voucher.caseworker.email}</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No lease information available for this tenant.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Personal Documents
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Private documents visible only to the tenant and administrators
                  </p>
                </CardHeader>
                <CardContent>
                  {tenantData.documents.length > 0 ? (
                    <div className="space-y-3">
                      {tenantData.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{doc.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {doc.type} • Uploaded {doc.uploadDate}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No personal documents uploaded yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-0">
              <TenantPaymentHistory tenantId={tenantId} isPrimary={isPrimary} />
            </TabsContent>
          </div>
        </Tabs>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TenantProfileModal;
