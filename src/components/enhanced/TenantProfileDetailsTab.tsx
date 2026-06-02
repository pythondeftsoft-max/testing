import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  DollarSign, 
  Home, 
  MapPin, 
  CreditCard, 
  Briefcase,
  PawPrint,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { EnhancedTenantProfileData } from '@/hooks/useEnhancedTenantProfile';

interface TenantProfileDetailsTabProps {
  tenantData: EnhancedTenantProfileData;
}

export const TenantProfileDetailsTab = ({ tenantData }: TenantProfileDetailsTabProps) => {
  const profile = tenantData.tenantProfile;
  
  if (!profile) {
    return (
      <div className="text-center py-12 text-gray-500">
        <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">No Extended Profile Data</h3>
        <p className="text-sm">Extended tenant profile information is not available for this tenant.</p>
      </div>
    );
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCreditScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    if (score >= 750) return 'bg-green-100 text-green-800';
    if (score >= 650) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getCreditScoreLabel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 750) return 'Excellent';
    if (score >= 650) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Credit Score</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{profile.creditScore || 'N/A'}</span>
                <Badge className={getCreditScoreColor(profile.creditScore)}>
                  {getCreditScoreLabel(profile.creditScore)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Briefcase className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Yearly Income</p>
              <span className="text-2xl font-bold">{formatCurrency(profile.monthlyIncome)}</span>
              <p className="text-xs text-gray-500">{profile.employmentStatus || 'Status unknown'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Home className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Max Rent Budget</p>
              <span className="text-2xl font-bold">{formatCurrency(profile.maxRent)}</span>
              {profile.voucherHolder && (
                <p className="text-xs text-blue-600 font-medium">Voucher Holder</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Employment Status</label>
              <p className="text-sm">{profile.employmentStatus || 'Not specified'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Location Preferences</label>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                <p className="text-sm">
                  {profile.city || profile.zipCode ? 
                    `${profile.city || 'Unknown City'}${profile.zipCode ? `, ${profile.zipCode}` : ''}` : 
                    'Not specified'
                  }
                </p>
              </div>
              {profile.preferredLocations && profile.preferredLocations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {profile.preferredLocations.map((location, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {location}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Account Status</label>
              <div className="flex items-center gap-2 mt-1">
                {profile.isPlusSubscriber ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge className="bg-green-100 text-green-800">Plus Subscriber</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Standard Account</span>
                  </>
                )}
              </div>
              {typeof profile.messageCredits === 'number' && (
                <p className="text-xs text-gray-500 mt-1">
                  Message Credits: {profile.messageCredits}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Move-in Timeline</label>
              <p className="text-sm">{profile.moveInWindow || 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voucher Information */}
      {profile.voucherHolder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Housing Voucher Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600">Voucher Amount</label>
              <p className="text-xl font-semibold text-blue-600">
                {formatCurrency(profile.voucherAmount)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Housing Authority</label>
              <p className="text-sm">{profile.housingAuthority || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Considerations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Special Considerations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pets */}
          <div className="flex items-start gap-3">
            <PawPrint className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Pets:</span>
                {profile.hasPets === true ? (
                  <Badge className="bg-orange-100 text-orange-800">Has Pets</Badge>
                ) : profile.hasPets === false ? (
                  <Badge variant="outline">No Pets</Badge>
                ) : (
                  <span className="text-sm text-gray-600">Not specified</span>
                )}
              </div>
              {profile.hasPets && profile.petType && (
                <p className="text-sm text-gray-600 mt-1">{profile.petType}</p>
              )}
            </div>
          </div>

          {/* Accessibility Needs */}
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Accessibility Needs:</span>
                {profile.hasAccessibilityNeeds === true ? (
                  <Badge className="bg-blue-100 text-blue-800">Has Needs</Badge>
                ) : profile.hasAccessibilityNeeds === false ? (
                  <Badge variant="outline">None Specified</Badge>
                ) : (
                  <span className="text-sm text-gray-600">Not specified</span>
                )}
              </div>
              {profile.hasAccessibilityNeeds && profile.accessibilityDetails && (
                <p className="text-sm text-gray-600 mt-1">{profile.accessibilityDetails}</p>
              )}
            </div>
          </div>

          {/* Background Concerns */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-gray-900">Background Information</h4>
            
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Eviction History:</span>
                  {profile.hasEviction === true ? (
                    <Badge className="bg-red-100 text-red-800">Has History</Badge>
                  ) : profile.hasEviction === false ? (
                    <Badge className="bg-green-100 text-green-800">Clean Record</Badge>
                  ) : (
                    <span className="text-sm text-gray-600">Not specified</span>
                  )}
                </div>
                {profile.hasEviction && profile.evictionDetails && (
                  <p className="text-sm text-gray-600 mt-1">{profile.evictionDetails}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Criminal History:</span>
                  {profile.hasFelonies === true ? (
                    <Badge className="bg-red-100 text-red-800">Has History</Badge>
                  ) : profile.hasFelonies === false ? (
                    <Badge className="bg-green-100 text-green-800">Clean Record</Badge>
                  ) : (
                    <span className="text-sm text-gray-600">Not specified</span>
                  )}
                </div>
                {profile.hasFelonies && profile.felonyDetails && (
                  <p className="text-sm text-gray-600 mt-1">{profile.felonyDetails}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income-to-Rent Ratio */}
      {profile.monthlyIncome && profile.maxRent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Financial Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Income-to-Rent Ratio</span>
                  <span className="text-sm text-gray-600">
                    {((profile.maxRent / profile.monthlyIncome) * 100).toFixed(1)}% of income
                  </span>
                </div>
                <Progress 
                  value={Math.min((profile.maxRent / profile.monthlyIncome) * 100, 100)} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 30% or less • Current budget: {((profile.maxRent / profile.monthlyIncome) * 100).toFixed(1)}%
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-gray-500">Yearly Income</p>
                  <p className="font-semibold">{formatCurrency(profile.monthlyIncome)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max Rent Budget</p>
                  <p className="font-semibold">{formatCurrency(profile.maxRent)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Remaining Income</p>
                  <p className="font-semibold">{formatCurrency(profile.monthlyIncome - profile.maxRent)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};