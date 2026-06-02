import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEnterpriseSecurityDashboard } from '@/hooks/useEnterpriseSecurityDashboard';
import { Shield, AlertTriangle, Users, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SecurityOverviewCard = () => {
  const { data: metrics, isLoading } = useEnterpriseSecurityDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-8 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSecurityStatus = () => {
    if (!metrics) return { status: 'Unknown', color: 'secondary' };
    
    if (metrics.critical_incidents > 0) {
      return { status: 'Critical', color: 'destructive' };
    } else if (metrics.active_incidents > 0) {
      return { status: 'Active Issues', color: 'warning' };
    } else if (metrics.compliance_score < 80) {
      return { status: 'Compliance Risk', color: 'warning' };
    }
    
    return { status: 'Secure', color: 'success' };
  };

  const securityStatus = getSecurityStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">System Status</span>
          <Badge variant={securityStatus.color as any}>
            {securityStatus.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <div>
              <div className="font-medium">{metrics?.active_incidents || 0}</div>
              <div className="text-muted-foreground">Active Incidents</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-medium">{metrics?.high_risk_sessions || 0}</div>
              <div className="text-muted-foreground">High Risk Sessions</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-medium">{metrics?.compliance_score || 0}%</div>
              <div className="text-muted-foreground">Compliance Score</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-500" />
            <div>
              <div className="font-medium">{metrics?.recent_security_events || 0}</div>
              <div className="text-muted-foreground">Recent Events</div>
            </div>
          </div>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/dashboard?tab=enterprise-security">
            View Full Security Dashboard
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};