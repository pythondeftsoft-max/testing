import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserMinus, TrendingUp, TrendingDown, Users, Clock } from 'lucide-react';

interface TenantLifecycleAnalysisProps {
  landlordId: string;
  portfolioId?: string;
}

interface TenantMetrics {
  totalTenants: number;
  newTenants: number;
  leavingTenants: number;
  retentionRate: number;
  avgTenancy: number;
  acquisitionCost: number;
}

const TenantLifecycleAnalysis: React.FC<TenantLifecycleAnalysisProps> = ({
  landlordId,
  portfolioId
}) => {
  const [metrics, setMetrics] = useState<TenantMetrics>({
    totalTenants: 0,
    newTenants: 0,
    leavingTenants: 0,
    retentionRate: 0,
    avgTenancy: 0,
    acquisitionCost: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenantMetrics();
  }, [landlordId, portfolioId]);

  const fetchTenantMetrics = async () => {
    try {
      let query = supabase
        .from('properties')
        .select(`
          id, lease_start_date, lease_end_date, status,
          property_applications!inner(
            id, tenant_id, status, created_at,
            profiles(first_name, last_name)
          )
        `)
        .eq('owner_id', landlordId)
        .eq('property_applications.status', 'approved');

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data: properties } = await query;

      if (properties) {
        const totalTenants = properties.length;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newTenants = properties.filter(p => 
          new Date(p.lease_start_date || p.property_applications[0]?.created_at) > thirtyDaysAgo
        ).length;

        const leavingTenants = properties.filter(p => 
          p.lease_end_date && new Date(p.lease_end_date) < new Date() && new Date(p.lease_end_date) > thirtyDaysAgo
        ).length;

        const retentionRate = totalTenants > 0 ? ((totalTenants - leavingTenants) / totalTenants) * 100 : 0;

        const avgTenancy = properties.reduce((acc, p) => {
          const start = new Date(p.lease_start_date || p.property_applications[0]?.created_at);
          const end = p.lease_end_date ? new Date(p.lease_end_date) : new Date();
          const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
          return acc + months;
        }, 0) / (totalTenants || 1);

        setMetrics({
          totalTenants,
          newTenants,
          leavingTenants,
          retentionRate,
          avgTenancy,
          acquisitionCost: 150 // Placeholder - could be calculated from marketing costs
        });
      }
    } catch (error) {
      console.error('Error fetching tenant metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Active Tenants',
      value: metrics.totalTenants.toString(),
      icon: Users,
      color: 'text-openkey-blue',
      bgColor: 'bg-gradient-subtle-blue'
    },
    {
      title: 'New Tenants (30 days)',
      value: metrics.newTenants.toString(),
      icon: UserPlus,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: 'Departing Tenants',
      value: metrics.leavingTenants.toString(),
      icon: UserMinus,
      color: 'text-danger',
      bgColor: 'bg-danger/10'
    },
    {
      title: 'Retention Rate',
      value: `${metrics.retentionRate.toFixed(1)}%`,
      icon: metrics.retentionRate >= 85 ? TrendingUp : TrendingDown,
      color: metrics.retentionRate >= 85 ? 'text-success' : 'text-danger',
      bgColor: metrics.retentionRate >= 85 ? 'bg-success/10' : 'bg-danger/10'
    },
    {
      title: 'Avg. Tenancy Length',
      value: `${metrics.avgTenancy.toFixed(1)} months`,
      icon: Clock,
      color: 'text-openkey-gold',
      bgColor: 'bg-gradient-subtle-gold'
    },
    {
      title: 'Acquisition Cost',
      value: `$${metrics.acquisitionCost}`,
      icon: TrendingUp,
      color: 'text-info',
      bgColor: 'bg-info/10'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse card-hover-gold">
            <div className="h-4 bg-openkey-blue/20 rounded mb-2"></div>
            <div className="h-8 bg-openkey-gold/20 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((metric, index) => (
          <Card key={index} className="p-4 card-hover-gold animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{metric.title}</p>
                <p className="text-2xl font-bold text-gradient-blue-gold">{metric.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${metric.bgColor} border border-openkey-gold/20`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 card-hover-gold border-openkey-blue/20">
          <div className="bg-gradient-blue-gold p-4 -m-6 mb-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">Tenant Lifecycle Insights</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gradient-subtle-blue rounded-lg border border-openkey-blue/20">
              <span className="text-sm font-medium text-openkey-blue">Active Lease Rate</span>
              <Badge variant="secondary" className="bg-openkey-gold text-white">{((metrics.totalTenants / (metrics.totalTenants + metrics.leavingTenants || 1)) * 100).toFixed(1)}%</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
              <span className="text-sm font-medium text-success">Growth Rate</span>
              <Badge variant="secondary" className="bg-success text-white">
                +{((metrics.newTenants / (metrics.totalTenants || 1)) * 100).toFixed(1)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gradient-subtle-gold rounded-lg border border-openkey-gold/20">
              <span className="text-sm font-medium text-openkey-gold">Turnover Impact</span>
              <Badge variant="secondary" className="bg-openkey-blue text-white">
                ${(metrics.leavingTenants * metrics.acquisitionCost).toLocaleString()}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 card-hover-gold border-openkey-gold/20">
          <div className="bg-gradient-gold p-4 -m-6 mb-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">Performance Recommendations</h3>
          </div>
          <div className="space-y-3">
            {metrics.retentionRate < 85 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm font-medium text-warning">Retention Alert</p>
                <p className="text-sm text-warning/80">Consider tenant satisfaction surveys and retention programs</p>
              </div>
            )}
            {metrics.avgTenancy < 12 && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-sm font-medium text-danger">Short Tenancy Alert</p>
                <p className="text-sm text-danger/80">Average tenancy is below 12 months - review lease terms</p>
              </div>
            )}
            {metrics.acquisitionCost > 200 && (
              <div className="p-3 bg-openkey-gold/10 border border-openkey-gold/20 rounded-lg">
                <p className="text-sm font-medium text-openkey-gold">High Acquisition Cost</p>
                <p className="text-sm text-openkey-gold/80">Review marketing spend and referral programs</p>
              </div>
            )}
            {metrics.retentionRate >= 85 && metrics.avgTenancy >= 12 && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm font-medium text-success">Excellent Performance</p>
                <p className="text-sm text-success/80">Your tenant lifecycle metrics are performing well</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TenantLifecycleAnalysis;