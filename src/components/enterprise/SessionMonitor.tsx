import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, Shield, MapPin, Smartphone } from 'lucide-react';
import { useUserSessions, useHighRiskSessions, useTerminateSession } from '@/hooks/useUserSessions';
import { formatDistanceToNow } from 'date-fns';

export const SessionMonitor = () => {
  const { data: allSessions, isLoading } = useUserSessions();
  const { data: highRiskSessions } = useHighRiskSessions();
  const terminateSession = useTerminateSession();

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 75) return 'destructive';
    if (riskScore >= 50) return 'warning';
    if (riskScore >= 25) return 'secondary';
    return 'outline';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore >= 75) return 'Critical';
    if (riskScore >= 50) return 'High';
    if (riskScore >= 25) return 'Medium';
    return 'Low';
  };

  const handleTerminateSession = async (sessionId: string) => {
    await terminateSession.mutateAsync(sessionId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Session Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSessions = allSessions?.filter(session => session.is_active) || [];
  const suspiciousSessions = activeSessions.filter(session => session.risk_score > 50);

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently online users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Sessions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${suspiciousSessions.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {suspiciousSessions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk score &gt; 50
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Verified</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {activeSessions.filter(s => s.mfa_verified).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Of {activeSessions.length} active sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Sessions Alert */}
      {highRiskSessions && highRiskSessions.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              High Risk Sessions Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highRiskSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border border-destructive rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getRiskColor(session.risk_score)}>
                        {getRiskLabel(session.risk_score)} Risk ({session.risk_score})
                      </Badge>
                      {!session.mfa_verified && (
                        <Badge variant="outline">No MFA</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {session.ip_address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.ip_address}
                        </span>
                      )}
                      {session.user_agent && (
                        <span className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          {session.user_agent.substring(0, 50)}...
                        </span>
                      )}
                      <span>
                        Active {formatDistanceToNow(new Date(session.last_activity))} ago
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleTerminateSession(session.id)}
                    disabled={terminateSession.isPending}
                  >
                    Terminate
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active User Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active sessions</p>
                <p className="text-sm">All users are currently offline</p>
              </div>
            ) : (
              activeSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getRiskColor(session.risk_score)}>
                          Risk: {session.risk_score}
                        </Badge>
                        {session.mfa_verified && (
                          <Badge variant="default">
                            <Shield className="h-3 w-3 mr-1" />
                            MFA Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Session Details</p>
                          <p className="text-muted-foreground">
                            Started: {new Date(session.created_at).toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">
                            Last Active: {formatDistanceToNow(new Date(session.last_activity))} ago
                          </p>
                          <p className="text-muted-foreground">
                            Expires: {new Date(session.expires_at).toLocaleString()}
                          </p>
                        </div>
                        
                        <div>
                          <p className="font-medium">Connection Info</p>
                          {session.ip_address && (
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.ip_address}
                            </p>
                          )}
                          {session.user_agent && (
                            <p className="text-muted-foreground text-xs">
                              {session.user_agent}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleTerminateSession(session.id)}
                      disabled={terminateSession.isPending}
                    >
                      Terminate
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};