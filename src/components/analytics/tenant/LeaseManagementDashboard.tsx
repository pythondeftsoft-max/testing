import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, DollarSign, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { format, addDays, addMonths, isAfter, isBefore } from 'date-fns';

interface LeaseManagementDashboardProps {
  landlordId: string;
  portfolioId?: string;
}

interface LeaseData {
  propertyId: string;
  address: string;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  status: string;
  daysUntilExpiry: number;
}

const LeaseManagementDashboard: React.FC<LeaseManagementDashboardProps> = ({
  landlordId,
  portfolioId
}) => {
  const [leases, setLeases] = useState<LeaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired' | 'active'>('all');

  useEffect(() => {
    fetchLeaseData();
  }, [landlordId, portfolioId]);

  const fetchLeaseData = async () => {
    try {
      let query = supabase
        .from('properties')
        .select(`
          id, address, lease_start_date, lease_end_date, monthly_rent, status,
          property_applications!inner(
            tenant_id, status,
            profiles!property_applications_tenant_id_fkey(first_name, last_name)
          )
        `)
        .eq('owner_id', landlordId)
        .eq('property_applications.status', 'approved')
        .not('lease_end_date', 'is', null);

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data: properties } = await query;

      if (properties) {
        const today = new Date();
        const leaseData: LeaseData[] = properties.map(property => {
          const tenant = property.property_applications[0]?.profiles;
          const leaseEnd = new Date(property.lease_end_date);
          const daysUntilExpiry = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            propertyId: property.id,
            address: property.address,
            tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown Tenant',
            leaseStart: property.lease_start_date,
            leaseEnd: property.lease_end_date,
            monthlyRent: property.monthly_rent || 0,
            status: property.status,
            daysUntilExpiry
          };
        });

        setLeases(leaseData);
      }
    } catch (error) {
      console.error('Error fetching lease data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLeases = () => {
    switch (filter) {
      case 'expiring':
        return leases.filter(lease => lease.daysUntilExpiry > 0 && lease.daysUntilExpiry <= 60);
      case 'expired':
        return leases.filter(lease => lease.daysUntilExpiry <= 0);
      case 'active':
        return leases.filter(lease => lease.daysUntilExpiry > 60);
      default:
        return leases;
    }
  };

  const filteredLeases = getFilteredLeases();

  const metrics = {
    total: leases.length,
    expiring: leases.filter(l => l.daysUntilExpiry > 0 && l.daysUntilExpiry <= 60).length,
    expired: leases.filter(l => l.daysUntilExpiry <= 0).length,
    avgRent: leases.reduce((acc, l) => acc + l.monthlyRent, 0) / (leases.length || 1)
  };

  const getExpiryStatus = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 0) return { color: 'destructive', label: 'Expired' };
    if (daysUntilExpiry <= 30) return { color: 'destructive', label: 'Urgent' };
    if (daysUntilExpiry <= 60) return { color: 'warning', label: 'Soon' };
    return { color: 'secondary', label: 'Active' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse card-hover-gold">
              <div className="h-4 bg-openkey-blue/20 rounded mb-2"></div>
              <div className="h-8 bg-openkey-gold/20 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 card-hover-gold animate-fade-in border-openkey-blue/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Leases</p>
              <p className="text-2xl font-bold text-gradient-blue-gold">{metrics.total}</p>
            </div>
            <div className="p-2 rounded-lg bg-gradient-subtle-blue border border-openkey-blue/20">
              <FileText className="h-6 w-6 text-openkey-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-warning/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold text-warning">{metrics.expiring}</p>
            </div>
            <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
              <Clock className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-danger/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold text-danger">{metrics.expired}</p>
            </div>
            <div className="p-2 rounded-lg bg-danger/10 border border-danger/20">
              <AlertTriangle className="h-6 w-6 text-danger" />
            </div>
          </div>
        </Card>

        <Card className="p-4 card-hover-gold animate-fade-in border-success/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Rent</p>
              <p className="text-2xl font-bold text-success">${metrics.avgRent.toFixed(0)}</p>
            </div>
            <div className="p-2 rounded-lg bg-success/10 border border-success/20">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 card-hover-gold border-openkey-blue/20">
        <div className="bg-gradient-blue-gold p-4 -m-6 mb-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Lease Overview</h3>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'gold' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="bg-white/20 text-white border-white/20 hover:bg-white/30"
              >
                All ({leases.length})
              </Button>
              <Button
                variant={filter === 'expiring' ? 'gold' : 'outline'}
                size="sm"
                onClick={() => setFilter('expiring')}
                className="bg-white/20 text-white border-white/20 hover:bg-white/30"
              >
                Expiring ({metrics.expiring})
              </Button>
              <Button
                variant={filter === 'expired' ? 'gold' : 'outline'}
                size="sm"
                onClick={() => setFilter('expired')}
                className="bg-white/20 text-white border-white/20 hover:bg-white/30"
              >
                Expired ({metrics.expired})
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredLeases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leases found for the selected filter.
            </div>
          ) : (
            filteredLeases.map((lease, index) => {
              const expiryStatus = getExpiryStatus(lease.daysUntilExpiry);
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-subtle-blue rounded-lg hover:bg-openkey-blue/10 transition-all duration-200 border border-openkey-blue/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-openkey-blue">{lease.address}</p>
                        <p className="text-sm text-muted-foreground">{lease.tenantName}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-openkey-gold">${lease.monthlyRent.toLocaleString()}/mo</p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {format(new Date(lease.leaseEnd), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    
                    <Badge variant={expiryStatus.color as any} className="border border-openkey-gold/20">
                      {expiryStatus.label}
                      {lease.daysUntilExpiry > 0 && ` (${lease.daysUntilExpiry}d)`}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {metrics.expiring > 0 && (
        <Card className="p-6 border-warning/20 bg-warning/10 card-hover-gold">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <h4 className="font-medium text-warning">Lease Renewal Alert</h4>
              <p className="text-sm text-warning/80 mt-1">
                You have {metrics.expiring} lease{metrics.expiring > 1 ? 's' : ''} expiring within the next 60 days. 
                Consider reaching out to tenants for renewal discussions.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LeaseManagementDashboard;