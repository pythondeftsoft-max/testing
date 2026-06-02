import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Filter, Bell, FileText, DollarSign, Home, Wrench, Users, Check, XIcon, Trash2, CheckCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getLandlordNotificationLink } from '@/utils/landlordNotificationLinks';
import { featureFlags } from '@/config/featureFlags';

interface LandlordNotificationsContentProps {
  userId: string;
  portfolioId?: string;
}

const LandlordNotificationsContent: React.FC<LandlordNotificationsContentProps> = ({ userId, portfolioId = 'everything' }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      
      const channel = supabase
        .channel('notification-changes-content')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedNotifications = data.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.description || '',
        time: getTimeAgo(notification.created_at),
        date: new Date(notification.created_at),
        priority: getPriorityFromType(notification.type),
        icon: getIconForType(notification.type),
        unread: !notification.read,
        category: getCategoryFromType(notification.type),
        link: notification.link,
        metadata: notification.metadata
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  const getPriorityFromType = (type: string) => {
    switch (type) {
      case 'maintenance_urgent':
      case 'lease_expiring_soon':
      case 'payment_overdue':
      case 'portfolio_invite':
      case 'account_invite':
        return 'high';
      case 'maintenance_request':
      case 'lease_expiring':
      case 'application_received':
        return 'medium';
      case 'payment_received':
        return 'low';
      default:
        return 'medium';
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'maintenance_request':
      case 'maintenance_urgent':
        return Wrench;
      case 'lease_expiring':
      case 'lease_expiring_soon':
        return FileText;
      case 'payment_received':
      case 'payment_overdue':
        return DollarSign;
      case 'application_received':
        return Home;
      case 'portfolio_invite':
      case 'account_invite':
        return Users;
      default:
        return Bell;
    }
  };

  const getCategoryFromType = (type: string) => {
    switch (type) {
      case 'maintenance_request':
      case 'maintenance_urgent':
        return 'Maintenance';
      case 'lease_expiring':
      case 'lease_expiring_soon':
        return 'Lease Management';
      case 'payment_received':
      case 'payment_overdue':
        return 'Payment';
      case 'application_received':
        return 'Applications';
      case 'portfolio_invite':
        return 'Portfolio Invitation';
      case 'account_invite':
        return 'Account Invitation';
      default:
        return 'General';
    }
  };

  const getNavigationUrl = (notification: any) => {
    return getLandlordNotificationLink(
      notification.type,
      notification.category,
      '/dashboard'
    );
  };

  const isInvitationNotification = (notification: any) => {
    return notification.type === 'portfolio_invite' || notification.type === 'account_invite';
  };

  const handleAcceptInvitation = async (notification: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isAccountInvite = notification.type === 'account_invite';
    const requiredField = isAccountInvite ? 'invitation_token' : 'invitation_id';
    
    if (!notification.metadata?.[requiredField]) {
      toast({
        title: "Error",
        description: "Invalid invitation data",
        variant: "destructive"
      });
      return;
    }

    setProcessingInvitation(notification.id);
    
    try {
      const invitationType = isAccountInvite ? 'account' : 'portfolio';
      const invitationIdentifier = notification.metadata[requiredField];
      
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: {
          invitationId: invitationIdentifier,
          type: invitationType
        }
      });

      if (error) throw error;

      await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notification.id);

      toast({
        title: "Invitation Accepted",
        description: data.message || "Successfully accepted invitation"
      });

      await fetchNotifications();
      
      if (data.redirectTo) {
        navigate(data.redirectTo);
      }
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive"
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (notification: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notification.id);

      if (error) throw error;

      toast({
        title: "Invitation Declined",
        description: "Invitation has been declined"
      });

      await fetchNotifications();
      
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      toast({
        title: "Error",
        description: "Failed to decline invitation",
        variant: "destructive"
      });
    }
  };

  const markAsReadAndNavigate = async (notification: any) => {
    const isPropertyLimitNotification = notification.type?.includes('property_limit');
    
    if (isPropertyLimitNotification) {
      if (notification.unread) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id);
        
        if (!error) {
          setNotifications(prev => 
            prev.map(n => n.id === notification.id ? { ...n, unread: false } : n)
          );
        }
      }
      
      if (!featureFlags.landlordSubscriptionUiEnabled) {
        toast({
          title: "Feature Coming Soon",
          description: "Subscription management will be available soon. Contact support for more information.",
        });
        return;
      }
      
      const portfolioParam = portfolioId ? `?portfolioId=${portfolioId}` : '?portfolioId=everything';
      navigate(`/dashboard${portfolioParam}`, {
        state: {
          activeTab: 'Profile',
          profileSubTab: 'subscriptions',
          portfolioId
        }
      });
      return;
    }

    try {
      if (notification.unread) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id);

        if (!error) {
          setNotifications(prev => 
            prev.map(n => n.id === notification.id ? { ...n, unread: false } : n)
          );
        }
      }

      let navigationUrl: string;
      const isFromPortfolio = Boolean(portfolioId);
      const navigationState = { portfolioId };

      if (notification.type.includes('appointment')) {
        const appointmentIdMatch = notification.link?.match(/id=([a-f0-9-]+)/);
        const appointmentId = appointmentIdMatch ? appointmentIdMatch[1] : null;

        if (appointmentId) {
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select('property_application_id')
            .eq('extension', 'appointment')
            .contains('payload', { appointment_id: appointmentId })
            .single();

          if (!messageError && messageData?.property_application_id) {
            const portfolioParam = isFromPortfolio ? `?portfolioId=${portfolioId}` : '';
            navigate(`/dashboard${portfolioParam}`, { 
              state: { 
                activeTab: 'Messages',
                selectedApplicationId: messageData.property_application_id,
                ...navigationState
              }
            });
            return;
          }
        }
        
        const portfolioParam = isFromPortfolio ? `?portfolioId=${portfolioId}` : '';
        navigate(`/dashboard${portfolioParam}`, { 
          state: { activeTab: 'Messages', ...navigationState }
        });
        return;
      } else {
        const isLeaseNotification = notification.type?.includes('lease_renewal') || 
                                     notification.type?.includes('lease_expiring') ||
                                     notification.title?.toLowerCase().includes('lease renewal');
        
        if (isLeaseNotification) {
          navigationUrl = getNavigationUrl(notification);
        } else if (notification.link && notification.link.trim() !== '') {
          navigationUrl = notification.link;
        } else {
          navigationUrl = getNavigationUrl(notification);
        }
        
        const isAccountInvite = notification.type === 'account_invite';
        const isPortfolioInvite = notification.type === 'portfolio_invite';
        
        if (isPortfolioInvite && notification.metadata?.portfolio_id) {
          navigate(`/dashboard?portfolioId=${notification.metadata.portfolio_id}`, { state: navigationState });
        } else if (isAccountInvite) {
          navigate('/dashboard', { state: navigationState });
        } else if (navigationUrl.startsWith('/dashboard') && isFromPortfolio) {
          const separator = navigationUrl.includes('?') ? '&' : '?';
          navigate(`${navigationUrl}${separator}portfolioId=${portfolioId}`, { state: navigationState });
        } else {
          navigate(navigationUrl, { state: navigationState });
        }
      }

    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lease_expiring':
        return 'text-orange-600';
      case 'payment_received':
        return 'text-green-600';
      case 'maintenance_request':
        return 'text-blue-600';
      case 'portfolio_invite':
      case 'account_invite':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return notification.unread;
    return notification.type === filter;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === 'newest') {
      return b.date.getTime() - a.date.getTime();
    } else {
      return a.date.getTime() - b.date.getTime();
    }
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAsRead = async () => {
    if (!selectedNotification) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', selectedNotification.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === selectedNotification.id ? { ...n, unread: false } : n)
      );

      toast({
        title: "Success",
        description: "Notification marked as read"
      });

    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive"
      });
    }

    setIsModalOpen(false);
  };

  const handleReadAll = async () => {
    try {
      const unreadNotificationIds = notifications
        .filter(n => n.unread)
        .map(n => n.id);

      if (unreadNotificationIds.length === 0) {
        toast({
          title: "No unread notifications",
          description: "All notifications are already marked as read"
        });
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .in('id', unreadNotificationIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, unread: false }))
      );

      toast({
        title: "Success",
        description: `Marked ${unreadNotificationIds.length} notification(s) as read`
      });

      await fetchNotifications();

    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAll = async () => {
    if (notifications.length === 0) {
      toast({
        title: "No notifications",
        description: "There are no notifications to delete"
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete all ${notifications.length} notification(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const notificationIds = notifications.map(n => n.id);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);

      if (error) throw error;

      setNotifications([]);

      toast({
        title: "Success",
        description: `Deleted ${notificationIds.length} notification(s)`
      });

      await fetchNotifications();

    } catch (error) {
      console.error('Error deleting all notifications:', error);
      toast({
        title: "Error",
        description: "Failed to delete all notifications",
        variant: "destructive"
      });
    }
  };

  const handleMarkSingleAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, unread: false } : n)
      );

      toast({
        title: "Success",
        description: "Notification marked as read"
      });

    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSingle = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      toast({
        title: "Success",
        description: "Notification deleted"
      });

    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All notifications read'}
            </p>
          </div>
          
          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleReadAll}
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Read All
            </Button>
            <Button
              onClick={handleDeleteAll}
              variant="outline"
              size="sm"
              disabled={notifications.length === 0}
              className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 bg-card border border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filter:</span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="lease_expiring">Lease Expiring</SelectItem>
                  <SelectItem value="payment_received">Payments</SelectItem>
                  <SelectItem value="maintenance_request">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {sortedNotifications.length === 0 ? (
        <Card className="bg-card border border-border">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No notifications found</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? "You don't have any notifications at this time."
                : `No ${filter} notifications found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedNotifications.map((notification) => {
            const IconComponent = notification.icon;
            return (
              <Card
                key={notification.id}
                className={`bg-card border border-border hover:shadow-md transition-shadow ${
                  notification.unread ? 'border-l-4 border-l-blue-500' : ''
                } ${!isInvitationNotification(notification) ? 'cursor-pointer' : ''}`}
                onClick={() => !isInvitationNotification(notification) && markAsReadAndNavigate(notification)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-full bg-muted ${getTypeColor(notification.type)}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <h4 className="text-lg font-semibold text-foreground">
                          {notification.title}
                        </h4>
                      </div>
                      <p className="text-muted-foreground mb-3 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-muted-foreground">{notification.time}</span>
                          <Badge variant="secondary" className="text-xs">
                            {notification.category}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {notification.unread && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleMarkSingleAsRead(notification.id, e)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Mark as read"
                            >
                              Mark Read
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => handleDeleteSingle(notification.id, e)}
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Invitation Action Buttons */}
                      {isInvitationNotification(notification) && notification.unread && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={(e) => handleAcceptInvitation(notification, e)}
                            disabled={processingInvitation === notification.id}
                            className="flex-1"
                          >
                            {processingInvitation === notification.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                            ) : (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleDeclineInvitation(notification, e)}
                            disabled={processingInvitation === notification.id}
                            className="flex-1"
                          >
                            <XIcon className="w-3 h-3 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Notification Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              {selectedNotification && (
                <>
                  <div className={`p-2 rounded-full bg-muted ${getTypeColor(selectedNotification.type)}`}>
                    <selectedNotification.icon className="w-5 h-5" />
                  </div>
                  <span>{selectedNotification.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getPriorityColor(selectedNotification.priority)}`}
                  >
                    {selectedNotification.priority}
                  </Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <div className="text-foreground leading-relaxed">
                {selectedNotification.message}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">{selectedNotification.time}</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedNotification.category}
                  </Badge>
                </div>
                
                {selectedNotification.unread && (
                  <Button onClick={handleMarkAsRead} size="sm">
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandlordNotificationsContent;
