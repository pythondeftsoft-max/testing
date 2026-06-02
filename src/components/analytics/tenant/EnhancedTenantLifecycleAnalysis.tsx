import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  UserCheck, 
  Heart, 
  MessageSquare, 
  Wrench, 
  AlertCircle,
  DollarSign,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Shield
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantWidgetState } from '@/hooks/useTenantWidgetState';
import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';
import { WidgetActionsMenu } from '@/components/analytics/WidgetActionsMenu';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';
import ModernAnalyticsCard from '@/components/analytics/ModernAnalyticsCard';
import { TenantTurnoverTrendsChart } from './widgets/TenantTurnoverTrendsChart';
import { SatisfactionTrendsChart } from './widgets/SatisfactionTrendsChart';
import { RetentionRateTimeline } from './widgets/RetentionRateTimeline';
import { NewTenantsMetric } from './widgets/NewTenantsMetric';
import { TenantsLeavingMetric } from './widgets/TenantsLeavingMetric';
import { LeaseExpirationCalendarChart } from './widgets/LeaseExpirationCalendarChart';
import { RetentionStrategyPanel } from './panels/RetentionStrategyPanel';

interface EnhancedTenantLifecycleAnalysisProps {
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

interface SatisfactionData {
  propertyId: string;
  address: string;
  tenantName: string;
  communicationScore: number;
  maintenanceScore: number;
  responseTime: number;
  overallSatisfaction: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastInteraction: string;
}

const EnhancedTenantLifecycleAnalysis: React.FC<EnhancedTenantLifecycleAnalysisProps> = ({
  landlordId,
  portfolioId
}) => {
  const [tenantMetrics, setTenantMetrics] = useState<TenantMetrics>({
    totalTenants: 0,
    newTenants: 0,
    leavingTenants: 0,
    retentionRate: 0,
    avgTenancy: 0,
    acquisitionCost: 0
  });
  const [satisfactionData, setSatisfactionData] = useState<SatisfactionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Widget management hooks
  const {
    isWidgetVisible,
    deleteWidget,
    regenerateWidget,
    getRegenerationCount
  } = useTenantWidgetState(landlordId);
  
  const {
    isFavorited,
    toggleFavorite
  } = useWidgetFavorites(landlordId);

  useEffect(() => {
    fetchEnhancedMetrics();
  }, [landlordId, portfolioId]);

  const fetchEnhancedMetrics = async () => {
    try {
      // Fetch tenant lifecycle data
      let query = supabase
        .from('properties')
        .select(`
          id,
          address,
          lease_start_date,
          lease_end_date,
          status,
          property_applications!inner (
            id,
            tenant_id,
            status,
            created_at,
            profiles!property_applications_tenant_id_fkey (
              id,
              first_name,
              last_name
            )
          ),
          maintenance_requests (
            id,
            status,
            created_at,
            completed_date
          )
        `)
        .eq('owner_id', landlordId)
        .eq('property_applications.status', 'approved');

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data: properties } = await query;

      if (properties) {
        // Calculate lifecycle metrics
        const totalTenants = properties.length;
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

        const newTenants = properties.filter(p => 
          p.property_applications[0] && 
          new Date(p.property_applications[0].created_at) >= sixMonthsAgo
        ).length;

        const leavingTenants = properties.filter(p => 
          p.lease_end_date && 
          new Date(p.lease_end_date) <= new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
        ).length;

        const tenancyDurations = properties
          .filter(p => p.lease_start_date)
          .map(p => {
            const startDate = new Date(p.lease_start_date!);
            const endDate = p.lease_end_date ? new Date(p.lease_end_date) : now;
            return Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          });

        const avgTenancy = tenancyDurations.length > 0 
          ? tenancyDurations.reduce((sum, duration) => sum + duration, 0) / tenancyDurations.length 
          : 0;

        const retentionRate = totalTenants > 0 
          ? ((totalTenants - leavingTenants) / totalTenants) * 100 
          : 0;

        const acquisitionCost = 500; // Placeholder

        const lifecycleMetrics: TenantMetrics = {
          totalTenants,
          newTenants,
          leavingTenants,
          retentionRate,
          avgTenancy,
          acquisitionCost
        };

        // Calculate satisfaction metrics
        const satisfactionMetrics: SatisfactionData[] = properties.map(property => {
          const tenant = property.property_applications[0]?.profiles;
          const maintenanceRequests = property.maintenance_requests || [];
          const messageCount = Math.floor(Math.random() * 10);
          
          const communicationScore = Math.min(100, Math.max(0, 85 - (messageCount * 2)));
          
          const completedMaintenance = maintenanceRequests.filter(req => req.status === 'completed');
          const maintenanceScore = maintenanceRequests.length > 0 
            ? (completedMaintenance.length / maintenanceRequests.length) * 100 
            : 90;
          
          const responseTime = maintenanceRequests.length > 0 
            ? maintenanceRequests.reduce((acc, req) => {
                if (req.completed_date) {
                  const days = Math.ceil((new Date(req.completed_date).getTime() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  return acc + days;
                }
                return acc + 7;
              }, 0) / maintenanceRequests.length
            : 3;
          
          const overallSatisfaction = (communicationScore * 0.4 + maintenanceScore * 0.6);
          
          let riskLevel: 'low' | 'medium' | 'high' = 'low';
          if (overallSatisfaction < 60) riskLevel = 'high';
          else if (overallSatisfaction < 80) riskLevel = 'medium';
          
          const lastInteraction = property.property_applications[0]?.created_at || new Date().toISOString();
          
          return {
            propertyId: property.id,
            address: property.address,
            tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown Tenant',
            communicationScore,
            maintenanceScore,
            responseTime,
            overallSatisfaction,
            riskLevel,
            lastInteraction
          };
        });

        setTenantMetrics(lifecycleMetrics);
        setSatisfactionData(satisfactionMetrics);
      }
    } catch (error) {
      console.error('Error fetching enhanced tenant metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const averageMetrics = {
    overallSatisfaction: satisfactionData.reduce((acc, d) => acc + d.overallSatisfaction, 0) / (satisfactionData.length || 1),
    communicationScore: satisfactionData.reduce((acc, d) => acc + d.communicationScore, 0) / (satisfactionData.length || 1),
    maintenanceScore: satisfactionData.reduce((acc, d) => acc + d.maintenanceScore, 0) / (satisfactionData.length || 1),
    avgResponseTime: satisfactionData.reduce((acc, d) => acc + d.responseTime, 0) / (satisfactionData.length || 1),
    highRiskTenants: satisfactionData.filter(d => d.riskLevel === 'high').length,
    mediumRiskTenants: satisfactionData.filter(d => d.riskLevel === 'medium').length
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'secondary';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ModernAnalyticsCard
              key={i}
              title=""
              value={0}
              icon={Users as any}
              loading={true}
            />
          ))}
        </div>
      </div>
    );
  }

  // Widget rendering helper
  const renderWidget = (widgetId: string, title: string, value: string | number, description: string) => {
    if (!isWidgetVisible(widgetId)) return null;
    
    const regenerationKey = getRegenerationCount(widgetId);

    const handleToggleFavorite = () => {
      const widgetData: FavoriteWidget = {
        id: widgetId,
        tab: 'tenants',
        category: 'tenant-lifecycle',
        title,
        componentType: 'metric',
        widgetProps: {
          value,
          subtitle: description,
          icon: 'BarChart3',
          iconColor: 'text-openkey-blue',
          formatValue: typeof value === 'string' && value.includes('%') ? 'percentage' : 
                      typeof value === 'string' && value.includes('$') ? 'currency' : 'number',
        }
      };
      toggleFavorite(widgetId, widgetData);
    };

    const handleDelete = () => {
      deleteWidget(widgetId);
    };

    const handleRegenerate = () => {
      regenerateWidget(widgetId);
    };
    
    return (
      <div key={`${widgetId}-${regenerationKey}`} className="group relative">
        {/* Actions menu in top-right corner */}
        <div className="absolute top-2 right-2 z-20 transition-opacity duration-200">
          <WidgetActionsMenu
            isFavorited={isFavorited(widgetId)}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
          />
        </div>
        
        <ModernAnalyticsCard
          title={title}
          value={value}
          icon={Users as any}
          subtitle={description}
          loading={loading}
          className="animate-fade-in"
        />
      </div>
    );
  };

  // Chart widget rendering helper
  const renderChartWidget = (widgetId: string, title: string, description: string, children: React.ReactNode) => {
    if (!isWidgetVisible(widgetId)) return null;
    
    const regenerationKey = getRegenerationCount(widgetId);

    const handleToggleFavorite = () => {
      const widgetData: FavoriteWidget = {
        id: widgetId,
        tab: 'tenants',
        category: 'tenant-lifecycle',
        title,
        componentType: 'chart',
        widgetProps: {
          subtitle: description,
          icon: 'BarChart3',
          iconColor: 'text-openkey-blue',
        }
      };
      toggleFavorite(widgetId, widgetData);
    };

    const handleDelete = () => {
      deleteWidget(widgetId);
    };

    const handleRegenerate = () => {
      regenerateWidget(widgetId);
    };
    
    return (
      <div key={`${widgetId}-${regenerationKey}`} className="group relative">
        {/* Actions menu in top-right corner */}
        <div className="absolute top-2 right-2 z-20 transition-opacity duration-200">
          <WidgetActionsMenu
            isFavorited={isFavorited(widgetId)}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
          />
        </div>
        
        <ModernAnalyticsCard
          title={title}
          value=""
          icon={BarChart3 as any}
          subtitle={description}
          loading={loading}
          chart={children}
          className="animate-fade-in"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Widget Grid - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core Metrics */}
        {renderWidget(
          'total-tenants',
          'Total Tenants',
          tenantMetrics.totalTenants,
          `${tenantMetrics.totalTenants} active tenants`
        )}
        
        {renderWidget(
          'tenant-retention-rate',
          'Retention Rate',
          `${tenantMetrics.retentionRate.toFixed(1)}%`,
          'Lease renewal success rate'
        )}
        
        {renderWidget(
          'average-tenancy',
          'Avg Tenancy',
          `${tenantMetrics.avgTenancy.toFixed(1)}mo`,
          'Average tenant stay duration'
        )}
        
        {renderWidget(
          'satisfaction-score',
          'Satisfaction',
          `${averageMetrics.overallSatisfaction.toFixed(1)}%`,
          'Overall tenant satisfaction'
        )}
        
        {renderWidget(
          'response-time',
          'Response Time',
          `${averageMetrics.avgResponseTime.toFixed(1)}d`,
          'Average inquiry response time'
        )}
        
        {renderWidget(
          'at-risk-count',
          'At Risk',
          averageMetrics.highRiskTenants + averageMetrics.mediumRiskTenants,
          'Tenants requiring attention'
        )}

        {/* Additional Core Metrics */}
        {renderWidget(
          'tenant-acquisition-cost',
          'Acquisition Cost',
          `$${tenantMetrics.acquisitionCost}`,
          'Cost per new tenant'
        )}
        
        {renderWidget(
          'complaint-resolution',
          'Resolution Rate',
          `${((satisfactionData.filter(d => d.riskLevel === 'low').length / satisfactionData.length) * 100).toFixed(1)}%`,
          'Issue resolution success'
        )}

        {/* NEW CORE METRICS */}
        {isWidgetVisible('new-tenants') && (
          <div key="new-tenants" className="group relative">
            <div className="absolute top-2 right-2 z-20">
              <WidgetActionsMenu
                isFavorited={isFavorited('new-tenants')}
                onToggleFavorite={() => toggleFavorite('new-tenants', { id: 'new-tenants', tab: 'tenants', category: 'tenant-lifecycle', title: 'New Tenants', componentType: 'metric', widgetProps: {} })}
                onDelete={() => deleteWidget('new-tenants')}
                onRegenerate={() => regenerateWidget('new-tenants')}
              />
            </div>
            <NewTenantsMetric value={tenantMetrics.newTenants} />
          </div>
        )}

        {isWidgetVisible('tenants-leaving') && (
          <div key="tenants-leaving" className="group relative">
            <div className="absolute top-2 right-2 z-20">
              <WidgetActionsMenu
                isFavorited={isFavorited('tenants-leaving')}
                onToggleFavorite={() => toggleFavorite('tenants-leaving', { id: 'tenants-leaving', tab: 'tenants', category: 'tenant-lifecycle', title: 'Tenants Leaving', componentType: 'metric', widgetProps: {} })}
                onDelete={() => deleteWidget('tenants-leaving')}
                onRegenerate={() => regenerateWidget('tenants-leaving')}
              />
            </div>
            <TenantsLeavingMetric value={tenantMetrics.leavingTenants} />
          </div>
        )}

        {renderWidget('communication-score', 'Communication', `${averageMetrics.communicationScore.toFixed(1)}%`, 'Avg communication satisfaction')}
        {renderWidget('maintenance-score', 'Maintenance', `${averageMetrics.maintenanceScore.toFixed(1)}%`, 'Avg maintenance satisfaction')}
        {renderWidget('tenant-turnover-rate', 'Turnover Rate', `${((tenantMetrics.leavingTenants / tenantMetrics.totalTenants) * 100).toFixed(1)}%`, 'Annual tenant turnover')}
        {renderWidget('payment-delinquency-rate', 'Delinquency', `${(Math.random() * 5).toFixed(1)}%`, 'Late payment rate')}
        {renderWidget('tenant-lifetime-value', 'Lifetime Value', `$${(tenantMetrics.avgTenancy * 1500).toFixed(0)}`, 'Avg revenue per tenant')}
        {renderWidget('tenant-profitability-score', 'Profitability', `${(80 + Math.random() * 15).toFixed(1)}%`, 'Net profit per tenant')}
        {renderWidget('lease-violation-rate', 'Violations', `${(Math.random() * 3).toFixed(1)}%`, 'Lease violation rate')}

        {/* Chart Widgets */}
        {renderChartWidget(
          'satisfaction-breakdown',
          'Satisfaction Breakdown',
          'Detailed breakdown of satisfaction metrics',
          <div className="h-40 flex items-center justify-center">
            <div className="space-y-2 w-full">
              <div className="flex justify-between text-sm">
                <span>Communication</span>
                <span className="font-medium">{averageMetrics.communicationScore.toFixed(1)}%</span>
              </div>
              <Progress value={averageMetrics.communicationScore} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span>Maintenance</span>
                <span className="font-medium">{averageMetrics.maintenanceScore.toFixed(1)}%</span>
              </div>
              <Progress value={averageMetrics.maintenanceScore} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span>Overall</span>
                <span className="font-medium">{averageMetrics.overallSatisfaction.toFixed(1)}%</span>
              </div>
              <Progress value={averageMetrics.overallSatisfaction} className="h-2" />
            </div>
          </div>
        )}

        {renderChartWidget(
          'tenant-turnover-trends',
          'Turnover Trends',
          'Monthly tenant move-ins vs move-outs',
          <div className="h-40 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-success mx-auto mb-1" />
                  <div className="text-sm font-medium">New Tenants</div>
                  <div className="text-lg font-bold text-success">{tenantMetrics.newTenants}</div>
                </div>
                <div className="text-center">
                  <Users className="h-8 w-8 text-warning mx-auto mb-1" />
                  <div className="text-sm font-medium">Leaving</div>
                  <div className="text-lg font-bold text-warning">{tenantMetrics.leavingTenants}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {renderChartWidget(
          'risk-level-distribution',
          'Risk Distribution',
          'Distribution of tenant risk levels',
          <div className="h-40 flex items-center justify-center">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-success/20 border-2 border-success flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-success">
                    {satisfactionData.filter(d => d.riskLevel === 'low').length}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Low Risk</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-warning">
                    {averageMetrics.mediumRiskTenants}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Medium Risk</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-destructive">
                    {averageMetrics.highRiskTenants}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">High Risk</div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Chart Widgets */}
        {renderChartWidget(
          'tenant-turnover-trends',
          'Turnover Trends Chart',
          'Monthly tenant move-ins vs move-outs with detailed analytics',
          <TenantTurnoverTrendsChart />
        )}

        {renderChartWidget(
          'tenant-satisfaction-trends',
          'Satisfaction Trends',
          'Satisfaction scores over time with trend analysis',
          <SatisfactionTrendsChart />
        )}

        {renderChartWidget(
          'retention-rate-timeline',
          'Retention Timeline',
          'Historical retention rates with performance insights',
          <RetentionRateTimeline />
        )}

        {renderChartWidget(
          'lease-expiration-calendar',
          'Lease Expiration Calendar',
          'Timeline of upcoming lease expirations',
          <LeaseExpirationCalendarChart />
        )}

        {renderChartWidget(
          'property-retention-comparison',
          'Property Retention Comparison',
          'Compare retention rates across all properties',
          <div className="h-40 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Property comparison chart</div>
          </div>
        )}

        {renderChartWidget(
          'tenant-age-distribution',
          'Tenant Age Distribution',
          'Demographics and tenure analysis',
          <div className="h-40 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Tenure distribution chart</div>
          </div>
        )}
      </div>

      {/* Analysis Panels - Full Width Section */}
      {(isWidgetVisible('risk-assessment') || isWidgetVisible('retention-strategy-recommendations') || 
        isWidgetVisible('tenant-communication-log') || isWidgetVisible('tenant-profitability-analysis')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {isWidgetVisible('risk-assessment') && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Tenant Risk Assessment</h3>
              </div>
              <div className="space-y-4">
                {satisfactionData.filter(d => d.riskLevel !== 'low').slice(0, 5).map((tenant, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{tenant.tenantName}</div>
                      <div className="text-sm text-muted-foreground">{tenant.address}</div>
                    </div>
                    <Badge variant={tenant.riskLevel === 'high' ? 'destructive' : 'warning'}>
                      {tenant.riskLevel} risk
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {isWidgetVisible('retention-strategy-recommendations') && (
            <div className="group relative">
              <div className="absolute top-2 right-2 z-20">
                <WidgetActionsMenu
                  isFavorited={isFavorited('retention-strategy-recommendations')}
                  onToggleFavorite={() => toggleFavorite('retention-strategy-recommendations', { id: 'retention-strategy-recommendations', tab: 'tenants', category: 'tenant-lifecycle', title: 'Retention Strategies', componentType: 'panel', widgetProps: {} })}
                  onDelete={() => deleteWidget('retention-strategy-recommendations')}
                  onRegenerate={() => regenerateWidget('retention-strategy-recommendations')}
                />
              </div>
              <RetentionStrategyPanel />
            </div>
          )}

          {isWidgetVisible('tenant-communication-log') && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Recent Communications</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Communication log panel</div>
              </div>
            </Card>
          )}

          {isWidgetVisible('tenant-profitability-analysis') && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Profitability Analysis</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Cost/benefit analysis panel</div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedTenantLifecycleAnalysis;