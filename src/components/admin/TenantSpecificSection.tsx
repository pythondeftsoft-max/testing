
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Building, 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Mail, 
  Phone,
  FileText,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useTenantHousingDetails } from '@/hooks/useTenantHousingDetails';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';

interface TenantSpecificSectionProps {
  userId: string;
}

const TenantSpecificSection = ({ userId }: TenantSpecificSectionProps) => {
  const { data: housingDetails, isLoading, error } = useTenantHousingDetails(userId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <MetricSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !housingDetails) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading housing information</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'qualified':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'qualified':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Housing Status Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Housing Status</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(housingDetails.housing_status)}>
                {housingDetails.housing_status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {housingDetails.housing_status === 'housed' ? 'Currently housed' : 'Actively searching'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{housingDetails.applications.length}</div>
            <p className="text-xs text-muted-foreground">
              {housingDetails.applications.filter(app => app.status === 'approved').length} approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Housing */}
      {housingDetails.current_housing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Current Housing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">{housingDetails.current_housing.property_address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Monthly Rent</p>
                      <p className="text-sm text-muted-foreground">${housingDetails.current_housing.rent_amount}/month</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Landlord</p>
                      <p className="text-sm text-muted-foreground">{housingDetails.current_housing.landlord_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Lease Period</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(housingDetails.current_housing.lease_start).toLocaleDateString()} - 
                        {new Date(housingDetails.current_housing.lease_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Housing Vouchers */}
      {housingDetails.vouchers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Housing Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {housingDetails.vouchers.map((voucher) => (
                <div key={voucher.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{voucher.voucher_type}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Max Rent: ${voucher.max_rent}</span>
                      <span>Expires: {new Date(voucher.expiry_date).toLocaleDateString()}</span>
                    </div>
                    {voucher.case_worker && (
                      <p className="text-xs text-muted-foreground">Case Worker: {voucher.case_worker}</p>
                    )}
                  </div>
                  <Badge className={getStatusColor(voucher.status)}>
                    {voucher.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Application History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {housingDetails.applications.map((application) => (
              <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{application.property_address}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Landlord: {application.landlord_name}</span>
                    <span>Rent: ${application.rent_amount}</span>
                    <span>{new Date(application.application_date).toLocaleDateString()}</span>
                  </div>
                  {application.notes && (
                    <p className="text-xs text-muted-foreground">{application.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(application.status)}
                  <Badge className={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Housing Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            Housing Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium mb-2">Budget & Location</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Max Rent:</span>
                    <span className="font-medium">${housingDetails.housing_preferences.max_rent}</span>
                  </div>
                  <div>
                    <span>Preferred Areas:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {housingDetails.housing_preferences.preferred_areas.map((area, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">Property Types</p>
                <div className="flex flex-wrap gap-1">
                  {housingDetails.housing_preferences.property_type.map((type, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
                {housingDetails.housing_preferences.accessibility_needs && (
                  <div className="mt-3">
                    <p className="font-medium mb-1">Accessibility Needs</p>
                    <div className="flex flex-wrap gap-1">
                      {housingDetails.housing_preferences.accessibility_needs.map((need, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          {need}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Housing Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Housing History Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{housingDetails.housing_history.total_applications}</p>
              <p className="text-sm text-muted-foreground">Total Applications</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{housingDetails.housing_history.successful_placements}</p>
              <p className="text-sm text-muted-foreground">Successful Placements</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{housingDetails.housing_history.average_search_time}</p>
              <p className="text-sm text-muted-foreground">Avg Search Time (days)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantSpecificSection;
