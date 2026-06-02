import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Home, DollarSign, User, Calendar, Search, Filter, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface UnitLevelInsightsProps {
  portfolioId: string;
  currentUserId: string;
  properties: any[];
}

export const UnitLevelInsights: React.FC<UnitLevelInsightsProps> = ({
  portfolioId,
  currentUserId,
  properties
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('revenue');

  // Get all units from properties
  const allUnits = properties.flatMap(property => 
    (property.property_units || []).map((unit: any) => ({
      ...unit,
      propertyId: property.id,
      propertyAddress: property.address,
      // Calculate unit performance metrics
      performance: {
        revenue: unit.monthly_rent || 0,
        occupancyDays: unit.status === 'occupied' ? 30 : 0,
        maintenanceRequests: Math.floor(Math.random() * 5), // Mock data
        tenantSatisfaction: Math.floor(Math.random() * 40) + 60, // Mock 60-100%
        lastMaintenanceDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        rentOptimization: {
          currentRent: unit.monthly_rent || 0,
          marketRent: (unit.monthly_rent || 0) * (0.95 + Math.random() * 0.1),
          potential: Math.random() > 0.7 ? 'increase' : Math.random() > 0.4 ? 'maintain' : 'decrease'
        }
      }
    }))
  );

  // Filter and sort units
  const filteredUnits = allUnits
    .filter(unit => {
      const matchesSearch = unit.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           unit.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return (b.performance.revenue || 0) - (a.performance.revenue || 0);
        case 'satisfaction':
          return b.performance.tenantSatisfaction - a.performance.tenantSatisfaction;
        case 'maintenance':
          return a.performance.maintenanceRequests - b.performance.maintenanceRequests;
        default:
          return 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800 border-green-200';
      case 'vacant': return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOptimizationColor = (potential: string) => {
    switch (potential) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getOptimizationIcon = (potential: string) => {
    switch (potential) {
      case 'increase': return <TrendingUp className="h-4 w-4" />;
      case 'decrease': return <TrendingDown className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  // Calculate summary metrics
  const totalUnits = allUnits.length;
  const occupiedUnits = allUnits.filter(u => u.status === 'occupied').length;
  const vacantUnits = allUnits.filter(u => u.status === 'vacant').length;
  const averageRent = allUnits.reduce((sum, unit) => sum + (unit.performance.revenue || 0), 0) / totalUnits;
  const totalRevenue = allUnits.reduce((sum, unit) => sum + (unit.performance.revenue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Unit Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Units</p>
                <p className="text-2xl font-bold text-blue-900">{totalUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Occupied</p>
                <p className="text-2xl font-bold text-green-900">{occupiedUnits}</p>
                <p className="text-xs text-green-600">
                  {totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0}% occupancy
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-700">Vacant</p>
                <p className="text-2xl font-bold text-red-900">{vacantUnits}</p>
                <p className="text-xs text-red-600">Need attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Avg Rent</p>
                <p className="text-2xl font-bold text-purple-900">
                  ${Math.round(averageRent).toLocaleString()}
                </p>
                <p className="text-xs text-purple-600">
                  ${totalRevenue.toLocaleString()} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Search className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-blue">Unit-Level Analysis</h3>
                <p className="text-sm text-navy-blue/70">Individual unit performance and insights</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                placeholder="Search units or properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="satisfaction">Satisfaction</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredUnits.slice(0, 20).map((unit) => (
          <Card key={`${unit.propertyId}-${unit.id}`} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Home className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-navy-blue">
                      Unit {unit.unit_number}
                    </h4>
                    <p className="text-sm text-navy-blue/70">
                      {unit.propertyAddress.split(',')[0]}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(unit.status)}>
                  {unit.status || 'Unknown'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Monthly Rent</div>
                  <div className="font-bold text-foreground">
                    ${(unit.performance.revenue || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Maintenance Requests</div>
                  <div className="font-bold text-foreground">
                    {unit.performance.maintenanceRequests}
                  </div>
                </div>
              </div>

              {/* Tenant Satisfaction */}
              {unit.status === 'occupied' && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Tenant Satisfaction</span>
                    <span>{unit.performance.tenantSatisfaction}%</span>
                  </div>
                  <Progress value={unit.performance.tenantSatisfaction} className="h-2" />
                </div>
              )}

              {/* Rent Optimization */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Rent Optimization</span>
                  <div className={`flex items-center gap-1 ${getOptimizationColor(unit.performance.rentOptimization.potential)}`}>
                    {getOptimizationIcon(unit.performance.rentOptimization.potential)}
                    <span className="text-sm font-medium capitalize">
                      {unit.performance.rentOptimization.potential}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium ml-1">
                      ${unit.performance.rentOptimization.currentRent.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Market:</span>
                    <span className="font-medium ml-1">
                      ${Math.round(unit.performance.rentOptimization.marketRent).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Last Maintenance */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Last maintenance:</span>
                  <span className="font-medium">
                    {unit.performance.lastMaintenanceDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No units found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filters to find units.
            </p>
          </CardContent>
        </Card>
      )}

      {filteredUnits.length > 20 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">
              Showing first 20 of {filteredUnits.length} units
            </p>
            <Button variant="outline" onClick={() => {}}>
              Load More Units
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};