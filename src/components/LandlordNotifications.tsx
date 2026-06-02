
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, Calendar, DollarSign, Settings, FileText, Bell, Users, Check, XIcon, Home, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LandlordNotificationsProps {
  onClose: () => void;
}

const LandlordNotifications = ({ onClose }: LandlordNotificationsProps) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (notification: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check for required invitation data based on type
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

      // Mark the notification as read since it was explicitly accepted
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
        onClose();
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
      // Mark the notification as read since it was explicitly declined
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
    try {
      if (!notification.read) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, updated_at: new Date().toISOString() })
          .eq('id', notification.id);

        if (error) throw error;
      }
      
      onClose();
      if (notification.link) {
        navigate(notification.link);
      } else {
        navigate('/landlord-notifications');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      onClose();
      navigate('/landlord-notifications');
    }
  };

  const isInvitationNotification = (notification: any) => {
    return notification.type === 'portfolio_invite' || notification.type === 'account_invite';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment_received':
        return 'text-green-600';
      case 'portfolio_invite':
      case 'account_invite':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'application_received':
        return FileText;
      case 'payment_received':
        return DollarSign;
      case 'maintenance_request_received':
        return Settings;
      case 'appointment_reminder':
        return Calendar;
      case 'lease_expiring_soon':
      case 'lease_renewal_request':
      case 'lease_renewal_declined':
      case 'lease_contract_signed':
        return Calendar;
      case 'portfolio_invite':
      case 'account_invite':
        return Users;
      default:
        return Bell;
    }
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

  const handleViewAllNotifications = () => {
    onClose();
    navigate('/landlord-notifications');
  };

  return (
    <Card className="w-96 max-h-96 overflow-y-auto shadow-lg border border-gray-200">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-black">Notifications</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No notifications at this time</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const IconComponent = getTypeIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => !isInvitationNotification(notification) && markAsReadAndNavigate(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full bg-gray-100 ${getTypeColor(notification.type)}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-black truncate">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {notification.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(notification.priority || 'medium')}`}
                        >
                          {notification.priority || 'medium'}
                        </Badge>
                        {notification.category && (
                          <Badge variant="secondary" className="text-xs">
                            {notification.category}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Invitation Action Buttons */}
                      {isInvitationNotification(notification) && !notification.read && (
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
                </div>
              );
            })}
          </div>
        )}
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <Button
            variant="ghost"
            className="w-full text-sm text-gray-600 hover:text-gray-800"
            onClick={handleViewAllNotifications}
          >
            View All Notifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LandlordNotifications;
