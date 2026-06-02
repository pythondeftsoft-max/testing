
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, Calendar, Settings, FileText, Bell, Filter, Crown, LogOut, MessageSquare, User, Users, Check, XIcon, Eye } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getNotificationLink } from '@/utils/notificationLinks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const TenantNotifications = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const { unreadCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const { hasActiveSubscription } = useSubscription(userId, 'tenant');
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      
      // Set up real-time subscription for notifications
      const channel = supabase
        .channel('notification-changes')
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
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database notifications to match UI format
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
        category: notification.category || getCategoryFromType(notification.type),
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

  const handleAcceptInvitation = async (notification: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!notification.metadata?.invitation_id) {
      toast({
        title: "Error",
        description: "Invalid invitation data",
        variant: "destructive"
      });
      return;
    }

    setProcessingInvitation(notification.id);
    
    try {
      const invitationType = notification.type === 'portfolio_invite' ? 'portfolio' : 'account';
      
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: {
          invitationId: notification.metadata.invitation_id,
          type: invitationType
        }
      });

      if (error) throw error;

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
        .update({ read: true })
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
    console.log('=== Notification Click Debug ===');
    console.log('Notification type:', notification.type);
    console.log('Notification category:', notification.category);
    console.log('Notification link (from DB):', notification.link);
    
    try {
      // Mark notification as read if it's unread
      if (notification.unread) {
        console.log('🔔 Marking notification as read:', notification.id, notification.title);
        
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id);

        if (error) {
          console.error('❌ Error marking notification as read:', error);
          throw error;
        }

        console.log('✅ Notification marked as read successfully');

        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, unread: false } : n)
        );
      }

      let navigationUrl: string;

      // Special handling for appointment notifications
      if (notification.type.includes('appointment')) {
        // Extract appointment ID from the link field
        const appointmentIdMatch = notification.link?.match(/id=([a-f0-9-]+)/);
        const appointmentId = appointmentIdMatch ? appointmentIdMatch[1] : null;

        if (appointmentId) {
          // Query messages table to find the application ID
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select('property_application_id')
            .eq('extension', 'appointment')
            .contains('payload', { appointment_id: appointmentId })
            .single();

          if (!messageError && messageData?.property_application_id) {
            console.log('Navigating to appointment chat with applicationId:', messageData.property_application_id);
            navigate('/messages?messageSubtab=calendar', { 
              state: { selectedApplicationId: messageData.property_application_id }
            });
            return;
          } else {
            // Fallback to general messages page with calendar tab
            console.log('Appointment message not found, navigating to messages calendar');
            navigate('/messages?messageSubtab=calendar');
            return;
          }
        } else {
          // No appointment ID found, fallback to messages calendar
          navigate('/messages?messageSubtab=calendar');
          return;
        }
      } else {
        // Use the smart routing utility for non-appointment notifications
        navigationUrl = getNotificationLink(
          notification.type, 
          notification.category, 
          '/dashboard'
        );
        console.log('Final navigation URL:', navigationUrl);
        
        // Get current user data to pass through navigation state for seamless tab switching
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        let currentProfile = null;
        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          currentProfile = profile;
        }
        
        // Pass user data through navigation state to avoid loading flash
        navigate(navigationUrl, {
          state: {
            fromInternalNavigation: true,
            user: currentUser,
            userProfile: currentProfile
          }
        });
        console.log('Navigation called with user state');
      }

    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive"
      });
    }
  };

  const isInvitationNotification = (notification: any) => {
    return notification.type === 'portfolio_invite' || notification.type === 'account_invite';
  };

  const getTimeAgo = (dateString: string) => {
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

  const getPriorityFromType = (type: string) => {
    switch (type) {
      case 'portfolio_invite':
      case 'account_invite':
        return 'high';
      case 'maintenance':
        return 'medium';
      case 'lease':
        return 'high';
      case 'inspection':
        return 'medium';
      default:
        return 'low';
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'maintenance':
        return Settings;
      case 'lease':
        return FileText;
      case 'inspection':
        return Calendar;
      case 'portfolio_invite':
      case 'account_invite':
        return Users;
      default:
        return Bell;
    }
  };

  const getCategoryFromType = (type: string) => {
    // Check for partial matches first
    if (type.includes('maintenance')) return 'Maintenance';
    if (type.includes('lease')) return 'Lease';
    if (type.includes('inspection')) return 'Inspection';
    if (type.includes('payment') || type.includes('rent')) return 'Payment';
    if (type.includes('application')) return 'Application';
    if (type.includes('appointment')) return 'Appointments';
    if (type.includes('document')) return 'Documents';
    if (type.includes('message')) return 'Message';
    if (type.includes('points') || type.includes('reward')) return 'Points';
    
    // Exact matches for special cases
    switch (type) {
      case 'portfolio_invite':
        return 'Portfolio Invitation';
      case 'account_invite':
        return 'Account Invitation';
      default:
        return 'General';
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
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
      case 'maintenance':
        return 'text-blue-600';
      case 'lease':
        return 'text-purple-600';
      case 'inspection':
        return 'text-orange-600';
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

  const notificationUnreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Back Button */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToDashboard}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <button 
                onClick={() => navigate('/')}
                className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                OpenKey
              </button>
              {hasActiveSubscription && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  Tenant Pro
                </div>
              )}
            </div>
            
            {/* Header Icons */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="icon"
                className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 rounded-lg relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/messages')}
                variant="outline" 
                size="icon"
                className="bg-muted text-foreground border-border hover:bg-muted/80 rounded-lg relative"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/tenant-profile')}
                variant="outline" 
                size="icon"
                className="bg-muted text-foreground border-border hover:bg-muted/80 rounded-lg"
              >
                <User className="w-4 h-4" />
              </Button>
              
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                className="bg-muted text-foreground border-border hover:bg-muted/80 rounded-lg"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Notifications</h2>
            <p className="text-muted-foreground">
              {notifications.filter(n => n.unread).length > 0 ? `${notifications.filter(n => n.unread).length} unread notification${notifications.filter(n => n.unread).length > 1 ? 's' : ''}` : 'All notifications read'}
            </p>
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
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
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
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full bg-muted ${getTypeColor(notification.type)}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold text-foreground">
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {notification.unread && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            )}
                            <Badge
                              variant="outline"
                              className={`text-xs ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">{notification.time}</span>
                            <Badge variant="secondary" className="text-xs">
                              {notification.category}
                            </Badge>
                          </div>
                          {!isInvitationNotification(notification) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadAndNavigate(notification);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          )}
                        </div>
                        
                        {/* Invitation Action Buttons */}
                        {isInvitationNotification(notification) && notification.unread && (
                          <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                            <Button
                              onClick={(e) => handleAcceptInvitation(notification, e)}
                              disabled={processingInvitation === notification.id}
                              className="flex-1"
                            >
                              {processingInvitation === notification.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              Accept Invitation
                            </Button>
                            <Button
                              variant="outline"
                              onClick={(e) => handleDeclineInvitation(notification, e)}
                              disabled={processingInvitation === notification.id}
                              className="flex-1"
                            >
                              <XIcon className="w-4 h-4 mr-2" />
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
      </main>
    </div>
  );
};

export default TenantNotifications;
