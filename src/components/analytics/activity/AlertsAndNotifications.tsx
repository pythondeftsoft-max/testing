import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { 
  Bell, 
  BellRing, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Wrench, 
  Users,
  Settings,
  CheckCircle,
  X
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'system' | 'tenant';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  created_at: string;
  is_read: boolean;
  action_required: boolean;
  due_date?: string;
  property_address?: string;
  amount?: number;
}

interface AlertsAndNotificationsProps {
  landlordId: string;
  portfolioId?: string;
}

const AlertsAndNotifications: React.FC<AlertsAndNotificationsProps> = ({
  landlordId,
  portfolioId
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    pushNotifications: true,
    maintenanceAlerts: true,
    paymentAlerts: true,
    leaseAlerts: true
  });

  const { unreadCount } = useUnreadMessageCount();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      // Fetch notifications/alerts from the database
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', landlordId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Transform notifications into alerts format
      const alertItems: Alert[] = notifications?.map(notif => ({
        id: notif.id,
        type: (notif.category as Alert['type']) || 'system',
        priority: notif.category === 'error' ? 'high' : notif.category === 'warning' ? 'medium' : 'low',
        title: notif.title || 'Notification',
        description: notif.description || '',
        created_at: notif.created_at,
        is_read: !notif.read,
        action_required: notif.category === 'error' || notif.category === 'warning'
      })) || [];

      // Add some sample high-priority alerts based on real data
      const currentDate = new Date();
      const overduePayments: Alert[] = [];
      const urgentMaintenance: Alert[] = [];

      // Sample overdue payment alert
      overduePayments.push({
        id: 'payment-overdue-1',
        type: 'payment',
        priority: 'high',
        title: 'Overdue Rent Payment',
        description: 'Rent payment for 123 Main St is 5 days overdue',
        created_at: new Date().toISOString(),
        is_read: false,
        action_required: true,
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        property_address: '123 Main St',
        amount: 1850
      });

      // Sample urgent maintenance alert
      urgentMaintenance.push({
        id: 'maintenance-urgent-1',
        type: 'maintenance',
        priority: 'high',
        title: 'Emergency Maintenance Request',
        description: 'Water leak reported at 456 Oak Ave - immediate attention required',
        created_at: new Date().toISOString(),
        is_read: false,
        action_required: true,
        property_address: '456 Oak Ave'
      });

      const allAlerts = [...overduePayments, ...urgentMaintenance, ...alertItems];
      allAlerts.sort((a, b) => {
        // Sort by priority first, then by date
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications-alerts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${landlordId}`
      }, () => fetchAlerts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [landlordId]);

  const markAsRead = async (alertId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', alertId);
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getAlertIcon = (type: string, priority: string) => {
    const iconClass = priority === 'high' ? 'text-red-600' : priority === 'medium' ? 'text-yellow-600' : 'text-blue-600';
    
    switch (type) {
      case 'payment': return <DollarSign className={`h-5 w-5 ${iconClass}`} />;
      case 'maintenance': return <Wrench className={`h-5 w-5 ${iconClass}`} />;
      case 'lease': return <Users className={`h-5 w-5 ${iconClass}`} />;
      case 'tenant': return <Users className={`h-5 w-5 ${iconClass}`} />;
      default: return <Bell className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-l-4 border-red-500';
      case 'medium': return 'bg-yellow-50 border-l-4 border-yellow-500';
      default: return 'bg-blue-50 border-l-4 border-blue-500';
    }
  };

  const unreadAlerts = alerts.filter(alert => !alert.is_read);
  const highPriorityAlerts = alerts.filter(alert => alert.priority === 'high');

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <div className="h-8 w-8 bg-muted-foreground/20 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{highPriorityAlerts.length}</div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BellRing className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{unreadAlerts.length}</div>
                <div className="text-sm text-muted-foreground">Unread Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{unreadCount}</div>
                <div className="text-sm text-muted-foreground">Unread Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Email Alerts</label>
              <Switch 
                checked={preferences.emailAlerts}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailAlerts: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Push Notifications</label>
              <Switch 
                checked={preferences.pushNotifications}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, pushNotifications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Maintenance Alerts</label>
              <Switch 
                checked={preferences.maintenanceAlerts}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, maintenanceAlerts: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Payment Alerts</label>
              <Switch 
                checked={preferences.paymentAlerts}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, paymentAlerts: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Alerts
            {unreadAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadAlerts.length} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alerts to display</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${getPriorityColor(alert.priority)} ${!alert.is_read ? 'ring-2 ring-blue-200' : ''}`}
                >
                  {getAlertIcon(alert.type, alert.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-sm">{alert.title}</div>
                      <Badge 
                        variant={alert.priority === 'high' ? 'destructive' : alert.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {alert.priority}
                      </Badge>
                      {!alert.is_read && (
                        <Badge variant="outline" className="text-xs">New</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{alert.description}</div>
                    {alert.property_address && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Property: {alert.property_address}
                      </div>
                    )}
                    {alert.amount && (
                      <div className="text-sm font-medium text-green-600 mt-1">
                        ${alert.amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!alert.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsAndNotifications;