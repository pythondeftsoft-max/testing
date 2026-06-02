import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, AlertCircle, Mail, Clock } from 'lucide-react';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useMarketAlerts } from '@/hooks/useMarketAlerts';
import { supabase } from '@/integrations/supabase/client';

interface AlertsNotificationsCardProps {
  userId: string;
  onOpenPreferences?: () => void;
  onOpenNotifications?: () => void;
}

const AlertsNotificationsCard: React.FC<AlertsNotificationsCardProps> = ({
  userId,
  onOpenPreferences,
  onOpenNotifications
}) => {
  const { unreadCount } = useNotificationCount();
  const { data: preferences } = useNotificationPreferences(userId);
  const { data: alerts } = useMarketAlerts(userId);

  // Get market alert notifications from last 24h
  const [recentAlerts, setRecentAlerts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchRecentAlerts = async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .like('title', 'Alert:%')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      setRecentAlerts(data || []);
    };

    fetchRecentAlerts();
  }, [userId]);

  const marketAlertPrefs = preferences?.find(p => p.notification_type === 'market_alert');
  const digestModeEnabled = marketAlertPrefs?.email_enabled && marketAlertPrefs?.digest_mode;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alerts & Notifications
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPreferences}
          className="h-8"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unread Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Unread notifications</div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onOpenNotifications}>
              View
            </Button>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Alerts triggered (24h)
            </div>
            {recentAlerts.length > 0 && (
              <Badge variant="secondary" className="h-5 text-xs">
                {recentAlerts.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Active Alerts Count */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Active market alerts</div>
          <Badge variant="outline" className="h-5 text-xs">
            {alerts?.filter(a => a.is_active).length || 0}
          </Badge>
        </div>

        {/* Email Status */}
        {marketAlertPrefs?.email_enabled && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              {digestModeEnabled ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Daily digest enabled
                </span>
              ) : (
                'Immediate email alerts enabled'
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onOpenPreferences}
          className="w-full h-8"
        >
          Manage Preferences
        </Button>
      </CardContent>
    </Card>
  );
};

export default AlertsNotificationsCard;