import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Shield, Activity, Users, Target, Clock } from 'lucide-react';
import { useEnterpriseSecurityDashboard } from '@/hooks/useEnterpriseSecurityDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export const EnterpriseSecurityMetrics = () => {
  const { data: metrics, isLoading } = useEnterpriseSecurityDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const getIncidentSeverityColor = (count: number) => {
    if (count === 0) return 'text-muted-foreground';
    if (count > 5) return 'text-destructive';
    if (count > 2) return 'text-warning';
    return 'text-primary';
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Active Security Incidents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getIncidentSeverityColor(metrics?.active_incidents || 0)}`}>
            {metrics?.active_incidents || 0}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={metrics?.critical_incidents ? 'destructive' : 'secondary'}>
              {metrics?.critical_incidents || 0} Critical
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* High Risk Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Risk Sessions</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics?.high_risk_sessions ? 'text-warning' : 'text-muted-foreground'}`}>
            {metrics?.high_risk_sessions || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sessions with risk score &gt; 50
          </p>
        </CardContent>
      </Card>

      {/* Rate Limit Violations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rate Limit Violations</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics?.rate_limit_violations ? 'text-destructive' : 'text-muted-foreground'}`}>
            {metrics?.rate_limit_violations || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last 24 hours
          </p>
        </CardContent>
      </Card>

      {/* Compliance Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getComplianceColor(metrics?.compliance_score || 0)}`}>
            {metrics?.compliance_score?.toFixed(1) || '0.0'}%
          </div>
          <Progress 
            value={metrics?.compliance_score || 0} 
            className="mt-2" 
          />
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Security Events</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics?.recent_security_events ? 'text-primary' : 'text-muted-foreground'}`}>
            {metrics?.recent_security_events || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Medium+ severity (24h)
          </p>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">
            Operational
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-xs text-muted-foreground">All systems normal</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};