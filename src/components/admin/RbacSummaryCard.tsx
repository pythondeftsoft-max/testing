import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { useNavigate } from 'react-router-dom';

interface RbacStats {
  total_events: number;
  denied_events: number;
  allowed_events: number;
  unique_users: number;
}

const RbacSummaryCard: React.FC = () => {
  const navigate = useNavigate();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['rbac-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_rbac_stats', {
        p_timeframe: '7 days'
      });
      
      if (error) throw error;
      return data as RbacStats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const denialRate = stats && stats.total_events > 0 
    ? (stats.denied_events / stats.total_events) * 100 
    : 0;

  return (
    <PermissionGuard 
      object="admin.rbac_logs" 
      action="view" 
      scope="account"
      showDeniedMessage={false}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Access Controls
          </CardTitle>
          <Badge 
            variant={denialRate > 5 ? "destructive" : "secondary"}
            className="text-xs"
          >
            Last 7 days
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.total_events}</p>
                  <p className="text-xs text-muted-foreground">
                    Total events ({stats.denied_events} denials)
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {denialRate > 5 ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    <span className={`text-sm font-medium ${denialRate > 5 ? 'text-destructive' : 'text-green-600'}`}>
                      {denialRate.toFixed(1)}% denial rate
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate('/admin?tab=portfolio-management&subtab=audit-logs')}
                >
                  Logs
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate('/admin?tab=portfolio-management&subtab=permissions')}
                >
                  Permission Explorer
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
};

export default RbacSummaryCard;