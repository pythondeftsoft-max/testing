import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building, 
  Users, 
  DollarSign, 
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Briefcase
} from 'lucide-react';
import { useLandlordAdminProfile } from '@/hooks/useLandlordAdminProfile';

interface LandlordSpecificSectionProps {
  userId: string;
}

const LandlordSpecificSection = ({ userId }: LandlordSpecificSectionProps) => {
  const { portfolios, properties, tenants, maintenance, financials, isLoading, error } = useLandlordAdminProfile(userId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'ending_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <AlertTriangle className="h-5 w-5 mr-2" />
        <span>Error loading landlord data</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolios.length}</div>
            <p className="text-xs text-muted-foreground">Total portfolios</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-muted-foreground">Active properties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-muted-foreground">Current tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financials.occupancy_rate}%</div>
            <p className="text-xs text-muted-foreground">Current occupancy</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolios */}
      {portfolios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              Portfolios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolios.map((portfolio) => (
                <div key={portfolio.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{portfolio.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {portfolio.properties_count} {portfolio.properties_count === 1 ? 'property' : 'properties'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Properties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            Property Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No properties found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map((property) => (
                <div key={property.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{property.address}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{property.type}</span>
                      <span>{property.occupied_units}/{property.units} units occupied</span>
                      {property.monthly_revenue > 0 && (
                        <span>${property.monthly_revenue.toLocaleString()}/month</span>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(property.status)}>
                    {property.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Tenants */}
      {tenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Current Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{tenant.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{tenant.property}</span>
                      {tenant.lease_end && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Lease ends: {new Date(tenant.lease_end).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(tenant.status)}>
                    {tenant.status === 'ending_soon' ? 'Ending Soon' : tenant.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Requests */}
      {maintenance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Recent Maintenance Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {maintenance.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{request.issue}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{request.property}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(request.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {request.status === 'pending' && <Clock className="h-4 w-4 text-orange-600" />}
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      {financials.total_revenue > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">${financials.total_revenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">${financials.expenses.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Expenses</p>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">${financials.net_income.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Net Income</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LandlordSpecificSection;
