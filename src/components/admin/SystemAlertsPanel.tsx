
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { SystemMonitor } from '@/utils/systemMonitoring';

interface SystemAlertsPanelProps {
  alerts: Array<{
    id: string;
    level: 'info' | 'warn' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
  systemMonitor: SystemMonitor;
}

const SystemAlertsPanel = ({ alerts, systemMonitor }: SystemAlertsPanelProps) => {
  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'error':
        return AlertTriangle;
      case 'warn':
        return Clock;
      case 'info':
      default:
        return CheckCircle;
    }
  };

  const handleResolveAlert = (alertId: string) => {
    systemMonitor.resolveAlert(alertId);
  };

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const criticalAlerts = systemMonitor.getCriticalAlerts();

  return (
    <div className="space-y-4">
      {/* Active Alerts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {criticalAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Immediate action needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(alert => 
                alert.resolved && 
                new Date(alert.timestamp).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Issues resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">All Clear!</p>
              <p className="text-sm">No active system alerts at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.level);
                return (
                  <div 
                    key={alert.id} 
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <SeverityIcon className={`w-5 h-5 mt-0.5 ${
                        alert.level === 'critical' || alert.level === 'error' 
                          ? 'text-red-500' 
                          : alert.level === 'warn' 
                          ? 'text-yellow-500' 
                          : 'text-blue-500'
                      }`} />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(alert.level)}>
                            {alert.level.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{alert.message}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleResolveAlert(alert.id)}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Resolved Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Recently Resolved
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.filter(alert => alert.resolved).slice(0, 5).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No recently resolved alerts.
            </p>
          ) : (
            <div className="space-y-2">
              {alerts
                .filter(alert => alert.resolved)
                .slice(0, 5)
                .map((alert) => (
                  <div 
                    key={alert.id} 
                    className="flex items-center justify-between p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{alert.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAlertsPanel;
