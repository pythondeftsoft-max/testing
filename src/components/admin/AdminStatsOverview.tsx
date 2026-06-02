
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Home, DollarSign, TrendingUp, UserCheck, UserX, Building, Calendar } from 'lucide-react';

interface AdminStatsOverviewProps {
  stats: {
    totalTenants: number;
    totalProperties: number;
    totalLandlords: number;
    housedTenants: number;
    unhousedTenants: number;
    occupiedProperties: number;
    vacantProperties: number;
    totalApplications: number;
    monthlyRevenue: number;
  };
}

const AdminStatsOverview = ({ stats }: AdminStatsOverviewProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTenants}</div>
          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-green-600" />
              {stats.housedTenants} housed
            </span>
            <span className="flex items-center gap-1">
              <UserX className="h-3 w-3 text-orange-600" />
              {stats.unhousedTenants} seeking
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProperties}</div>
          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
            <span className="text-green-600">{stats.occupiedProperties} occupied</span>
            <span className="text-orange-600">{stats.vacantProperties} vacant</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Landlords</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLandlords}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Property owners & managers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
            <Calendar className="h-3 w-3" />
            <span>{stats.totalApplications} applications</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatsOverview;
