
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building
} from 'lucide-react';
import { EnhancedTenantProfileData } from '@/hooks/useEnhancedTenantProfile';

interface TenantOverviewTabProps {
  tenantData: EnhancedTenantProfileData;
}

export const TenantOverviewTab = ({ tenantData }: TenantOverviewTabProps) => {
  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBadgeColor = (score: number) => {
    if (score <= 30) return 'bg-green-100 text-green-800 border-green-300';
    if (score <= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 30) return 'Low Risk';
    if (score <= 60) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {tenantData.analytics.onTimePaymentRate?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-sm text-gray-600">On-Time Payment Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {tenantData.analytics.maintenanceRequestCount || 0}
                </div>
                <div className="text-sm text-gray-600">Maintenance Requests</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${getRiskColor(tenantData.analytics.riskScore || 50)}`}>
                  {tenantData.analytics.riskScore || 50}
                </div>
                <div className="text-sm text-gray-600">Risk Score</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {tenantData.analytics.renewalProbability?.toFixed(0) || '0'}%
                </div>
                <div className="text-sm text-gray-600">Renewal Probability</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information and Property Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{tenantData.phone || 'No phone number provided'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{tenantData.email || 'No email provided'}</span>
            </div>
            {tenantData.currentProperty && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{tenantData.currentProperty.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Current Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenantData.currentProperty ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Bedrooms:</span>
                    <div className="font-medium">{tenantData.currentProperty.bedrooms}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Bathrooms:</span>
                    <div className="font-medium">{tenantData.currentProperty.bathrooms}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span>Monthly Rent: ${tenantData.currentProperty.monthlyRent?.toLocaleString() || 'N/A'}</span>
                </div>
                {tenantData.currentProperty.leaseStartDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Lease Start: {new Date(tenantData.currentProperty.leaseStartDate).toLocaleDateString()}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 text-center py-4">
                No current property information available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Risk Score</span>
            <Badge className={getRiskBadgeColor(tenantData.analytics.riskScore || 50)}>
              {getRiskLabel(tenantData.analytics.riskScore || 50)}
            </Badge>
          </div>
          <Progress 
            value={tenantData.analytics.riskScore || 50} 
            className="w-full" 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <h4 className="font-medium">Payment History</h4>
              <div className="text-sm text-gray-600">
                On-time rate: {tenantData.analytics.onTimePaymentRate?.toFixed(1) || '0.0'}%
              </div>
              <Progress 
                value={tenantData.analytics.onTimePaymentRate || 0} 
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Renewal Probability</h4>
              <div className="text-sm text-gray-600">
                Likelihood: {tenantData.analytics.renewalProbability?.toFixed(0) || '0'}%
              </div>
              <Progress 
                value={tenantData.analytics.renewalProbability || 0} 
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {tenantData.communications.length}
              </div>
              <div className="text-sm text-gray-600">Total Messages</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {tenantData.maintenanceRequests.length}
              </div>
              <div className="text-sm text-gray-600">Maintenance Requests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {tenantData.housingHistory.length}
              </div>
              <div className="text-sm text-gray-600">Properties Lived</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {tenantData.paymentHistory.length}
              </div>
              <div className="text-sm text-gray-600">Payment Records</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
