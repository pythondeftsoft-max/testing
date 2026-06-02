import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, CheckCircle, Clock, Lock, Eye, Globe, Zap } from 'lucide-react';

interface SecurityCenterProps {
  configId: string;
}

const WhiteLabelSecurityCenter = ({ configId }: SecurityCenterProps) => {
  // Mock security data for now - will be replaced with real data once tables are created
  const securityLogs = [
    { id: '1', event_type: 'suspicious_request', threat_level: 'high', action_taken: 'blocked', source_ip: '192.168.1.1', created_at: new Date().toISOString() },
    { id: '2', event_type: 'rate_limit_exceeded', threat_level: 'medium', action_taken: 'throttled', source_ip: '10.0.0.1', created_at: new Date(Date.now() - 3600000).toISOString() },
  ];
  const isLoading = false;

  // Calculate security metrics
  const calculateSecurityScore = () => {
    if (!securityLogs) return 0;
    
    const recentLogs = securityLogs.filter(log => 
      new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    const threatCount = recentLogs.filter(log => 
      log.threat_level === 'high' || log.threat_level === 'critical'
    ).length;
    
    const baseScore = 100;
    const deduction = Math.min(threatCount * 10, 50);
    
    return Math.max(baseScore - deduction, 50);
  };

  const securityScore = calculateSecurityScore();
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const recentThreats = securityLogs?.filter(log => 
    log.threat_level === 'high' || log.threat_level === 'critical'
  ).slice(0, 5) || [];

  const blockedRequests = securityLogs?.filter(log => 
    log.action_taken === 'blocked'
  ).length || 0;

  const suspiciousActivity = securityLogs?.filter(log => 
    log.event_type === 'suspicious_request' || log.event_type === 'rate_limit_exceeded'
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Center</h2>
          <p className="text-muted-foreground">
            Monitor and protect your white-label site
          </p>
        </div>
        <Badge variant={getScoreBadgeVariant(securityScore)} className="text-lg px-3 py-1">
          <Shield className="h-4 w-4 mr-1" />
          Security Score: {securityScore}/100
        </Badge>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(securityScore)}`}>
              {securityScore}/100
            </div>
            <Progress value={securityScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {securityScore >= 80 ? 'Excellent' : securityScore >= 60 ? 'Good' : 'Needs Attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Requests</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedRequests}</div>
            <p className="text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspiciousActivity}</div>
            <p className="text-xs text-muted-foreground">
              <Eye className="h-3 w-3 inline mr-1" />
              Being monitored
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Details */}
      <Tabs defaultValue="threats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="threats">Recent Threats</TabsTrigger>
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
          <TabsTrigger value="settings">Protection Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Threats</CardTitle>
              <CardDescription>
                High and critical security events from the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentThreats.length > 0 ? (
                <div className="space-y-4">
                  {recentThreats.map((threat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          threat.threat_level === 'critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{threat.event_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {threat.source_ip} - {new Date(threat.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={threat.threat_level === 'critical' ? 'destructive' : 'secondary'}>
                        {threat.threat_level}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent threats detected</p>
                  <p className="text-sm text-muted-foreground">Your site is secure</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Event Log</CardTitle>
              <CardDescription>
                Complete history of security events and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {securityLogs?.map((log, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                      <span className="font-medium">{log.event_type}</span>
                      {log.source_ip && (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs">
                          {log.source_ip}
                        </code>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.action_taken || 'logged'}
                      </Badge>
                      <Badge 
                        variant={
                          log.threat_level === 'critical' ? 'destructive' :
                          log.threat_level === 'high' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {log.threat_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Rate Limiting
                </CardTitle>
                <CardDescription>
                  Protect against DDoS and abuse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Requests per minute</span>
                    <Badge variant="outline">60</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Burst allowance</span>
                    <Badge variant="outline">10</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="w-full">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Content Security Policy
                </CardTitle>
                <CardDescription>
                  Prevent XSS and injection attacks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Script sources</span>
                    <Badge variant="outline">Strict</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Frame ancestors</span>
                    <Badge variant="outline">None</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="w-full">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhiteLabelSecurityCenter;