import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

interface AccessNotificationsBannerProps {}

/**
 * Displays recent access-related notifications (approvals, denials, revocations) 
 * in a dismissible banner at the top of My Access page.
 */
export const AccessNotificationsBanner: React.FC<AccessNotificationsBannerProps> = () => {
  const [dismissed, setDismissed] = useState(false);
  
  const { data } = useNotifications(20, {});

  // Get recent access notifications
  const recentNotifications = data?.pages?.[0]?.notifications?.filter(
    notification => {
      const created = new Date(notification.created_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return created > oneDayAgo && 
             !notification.read && 
             (notification.category === 'access_request' || 
              notification.type?.includes('access') ||
              notification.description?.toLowerCase().includes('access'));
    }
  ) || [];

  // Don't show if dismissed or no notifications
  if (dismissed || recentNotifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'access_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'access_denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'access_revoked':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'access_approved':
        return 'default';
      case 'access_denied':
        return 'destructive';
      case 'access_revoked':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Recent Access Updates
              </h3>
              <Badge variant="secondary" className="text-xs">
                {recentNotifications.length} new
              </Badge>
            </div>
            
            <div className="space-y-2">
              {recentNotifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="flex items-center gap-3 text-sm">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <span className="text-blue-900 dark:text-blue-100">
                      {notification.description}
                    </span>
                    <span className="text-blue-600 dark:text-blue-300 ml-2">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <Badge variant={getNotificationColor(notification.type)} className="text-xs">
                    {notification.type.replace('access_', '').charAt(0).toUpperCase() + notification.type.replace('access_', '').slice(1)}
                  </Badge>
                </div>
              ))}
              
              {recentNotifications.length > 3 && (
                <div className="text-xs text-blue-600 dark:text-blue-300">
                  +{recentNotifications.length - 3} more notifications
                </div>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:text-blue-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};