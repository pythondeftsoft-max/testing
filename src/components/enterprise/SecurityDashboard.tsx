import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Activity, Database, Users, Lock } from "lucide-react";
import { SecurityIncidentList } from "./SecurityIncidentList";
import { ComplianceStatus } from "./ComplianceStatus";
import { BackupManager } from "./BackupManager";
import AuditLogViewer from "./AuditLogViewer";
import RealTimeSecurityMonitor from "../security/RealTimeSecurityMonitor";
import { SessionMonitor } from "./SessionMonitor";
import { useAdminAudit } from "@/hooks/useAdminAudit";

export const SecurityDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { logSecurityAccess } = useAdminAudit();

  // Log security dashboard access
  useEffect(() => {
    logSecurityAccess('view');
  }, []);

  // Log tab changes for audit trail
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    logSecurityAccess(`view_${tab}`);
  };

  // Fetch security dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["enterprise-security-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_enterprise_security_dashboard');
      
      if (error) throw error;
      return data[0] || {
        active_incidents: 0,
        critical_incidents: 0,
        high_risk_sessions: 0,
        rate_limit_violations: 0,
        compliance_score: 0,
        recent_security_events: 0
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent security incidents
  const { data: incidents } = useQuery({
    queryKey: ["security-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      critical: "destructive"
    };
    
    return (
      <Badge variant={variants[severity] || "default"}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert for critical incidents */}
      {dashboardData?.critical_incidents > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical Security Alert:</strong> {dashboardData.critical_incidents} critical security incident(s) require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.active_incidents || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.critical_incidents || 0} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.high_risk_sessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sessions with risk score &gt; 50
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Violations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.rate_limit_violations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(dashboardData?.compliance_score || 0)}`}>
              {dashboardData?.compliance_score || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall compliance status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.recent_security_events || 0}</div>
            <p className="text-xs text-muted-foreground">
              Medium+ severity (24h)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="siem">SIEM Monitor</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              {incidents && incidents.length > 0 ? (
                <div className="space-y-3">
                  {incidents.slice(0, 5).map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{incident.title}</h4>
                          {getSeverityBadge(incident.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(incident.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={incident.status === 'resolved' ? 'default' : 'destructive'}>
                        {incident.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recent security incidents</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="siem">
          <RealTimeSecurityMonitor />
          <div className="mt-6">
            <SessionMonitor />
          </div>
        </TabsContent>

        <TabsContent value="incidents">
          <SecurityIncidentList />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceStatus />
        </TabsContent>

        <TabsContent value="backups">
          <BackupManager />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};
