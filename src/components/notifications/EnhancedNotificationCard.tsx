import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bell, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Settings, 
  FileText, 
  Users, 
  Home,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  CreditCard,
  Wrench,
  FileCheck,
  Trash2
} from 'lucide-react';
import { getNotificationLink, validateNotificationLink } from '@/utils/notificationLinks';

interface NotificationData {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  read: boolean;
  action_type?: string;
  action_data?: any;
  link?: string;
  expires_at?: string;
}

interface EnhancedNotificationCardProps {
  notification: NotificationData;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction: (id: string, actionType: string, actionData: any) => void;
  onNavigate: (link: string) => void;
}

const EnhancedNotificationCard: React.FC<EnhancedNotificationCardProps> = ({
  notification,
  onRead,
  onDelete,
  onAction,
  onNavigate
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'application_approved':
      case 'application_rejected':
        return FileText;
      case 'payment_due':
      case 'payment_overdue':
        return DollarSign;
      case 'maintenance_completed':
        return Settings;
      case 'appointment_scheduled':
      case 'appointment_cancelled':
        return Calendar;
      default:
        return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400';
      case 'high':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400';
      case 'low':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Application':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'Payment':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'Maintenance':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'Appointments':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case 'Documents':
        return 'bg-muted text-muted-foreground';
      case 'Property':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getActionButton = () => {
    if (!notification.action_type) return null;

    switch (notification.action_type) {
      case 'view_application':
        return (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleAction()}
            className="flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            View Application
          </Button>
        );
      case 'review_application':
        return (
          <Button 
            size="sm" 
            onClick={() => handleAction()}
            className="flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            Review Application
          </Button>
        );
      case 'pay_rent':
        return (
          <Button 
            size="sm" 
            onClick={() => handleAction()}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
          >
            <CreditCard className="w-3 h-3" />
            Pay Now
          </Button>
        );
      case 'review_maintenance':
        return (
          <Button 
            size="sm" 
            onClick={() => handleAction()}
            className="flex items-center gap-1"
          >
            <Wrench className="w-3 h-3" />
            Review Request
          </Button>
        );
      case 'view_property':
        return (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleAction()}
            className="flex items-center gap-1"
          >
            <Home className="w-3 h-3" />
            View Property
          </Button>
        );
      default:
        return (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleAction()}
            className="flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            View Details
          </Button>
        );
    }
  };

  const handleAction = () => {
    if (notification.action_type && notification.action_data) {
      onAction(notification.id, notification.action_type, notification.action_data);
    }
    
    let targetLink = '/dashboard';
    
    // Priority 1: Use notification type to determine the correct route (MOST RELIABLE)
    if (notification.type) {
      targetLink = getNotificationLink(notification.type, notification.category, '/dashboard');
      console.log(`Computed route from type "${notification.type}": ${targetLink}`);
    }
    
    // Priority 2: ONLY use database link if type-based routing returned the default fallback
    if (targetLink === '/dashboard' && notification.link) {
      const validatedLink = validateNotificationLink(notification.link);
      targetLink = validatedLink;
      console.log(`Using database link (no type mapping found): ${targetLink}`);
    }
    
    console.log(`Notification action: type="${notification.type}" category="${notification.category}" → ${targetLink}`);
    onNavigate(targetLink);
    
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  const handleCardClick = () => {
    let targetLink = '/dashboard';
    
    // Priority 1: Use notification type to determine the correct route (MOST RELIABLE)
    if (notification.type) {
      targetLink = getNotificationLink(notification.type, notification.category, '/dashboard');
      console.log(`Computed route from type "${notification.type}": ${targetLink}`);
    }
    
    // Priority 2: ONLY use database link if type-based routing returned the default fallback
    if (targetLink === '/dashboard' && notification.link) {
      const validatedLink = validateNotificationLink(notification.link);
      targetLink = validatedLink;
      console.log(`Using database link (no type mapping found): ${targetLink}`);
    }
    
    console.log(`Final navigation: type="${notification.type}" category="${notification.category}" → ${targetLink}`);
    onNavigate(targetLink);
    
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const isExpired = notification.expires_at && new Date(notification.expires_at) < new Date();
  const IconComponent = getTypeIcon(notification.type);

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
        !notification.read ? 'border-l-4 border-l-blue-500' : ''
      } ${isExpired ? 'opacity-60' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground pr-2">
                {notification.title}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Always show read status first - either button or icon with reserved space */}
                {!notification.read ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleMarkAsRead}
                    className="h-6 px-2 text-xs hover:bg-accent"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Mark Read
                  </Button>
                ) : (
                  <div className="h-6 px-2 flex items-center">
                    <CheckCircle className="w-3 h-3 text-success" />
                  </div>
                )}
                
                {/* Delete button always in second position */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
                
                {/* Clock icon for expired notifications */}
                {isExpired && (
                  <Clock className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {notification.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(notification.created_at)}
                </span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getCategoryColor(notification.category)}`}
                >
                  {notification.category}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getPriorityColor(notification.priority)}`}
                >
                  {notification.priority}
                </Badge>
              </div>
              
              {getActionButton()}
            </div>
            
            {isExpired && (
              <div className="mt-2 text-xs text-muted-foreground italic">
                This notification has expired
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedNotificationCard;