import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  MessageSquare, 
  Eye, 
  UserPlus, 
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAdminUserActivity } from '@/hooks/useAdminUserActivity';

interface UserActivitySectionProps {
  userId: string;
}

const UserActivitySection = ({ userId }: UserActivitySectionProps) => {
  const { stats, activities, isLoading, error } = useAdminUserActivity(userId);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'points_earned':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'referral_sent':
        return <UserPlus className="h-4 w-4 text-purple-600" />;
      case 'profile_updated':
        return <UserPlus className="h-4 w-4 text-orange-600" />;
      case 'property_viewed':
        return <Eye className="h-4 w-4 text-indigo-600" />;
      case 'message_sent':
        return <MessageSquare className="h-4 w-4 text-pink-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-blue-100 text-blue-800';
      case 'points_earned':
        return 'bg-green-100 text-green-800';
      case 'referral_sent':
        return 'bg-purple-100 text-purple-800';
      case 'profile_updated':
        return 'bg-orange-100 text-orange-800';
      case 'property_viewed':
        return 'bg-indigo-100 text-indigo-800';
      case 'message_sent':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>Error loading activity data</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.messages_sent || 0}</div>
            <p className="text-xs text-muted-foreground">Total messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals Sent</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.referrals_sent || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.points_earned_this_month || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats?.last_active ? formatTimestamp(stats.last_active) : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">Last activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{activity.description}</p>
                        <Badge className={getActivityColor(activity.type)} variant="secondary">
                          {activity.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatTimestamp(activity.timestamp)}</span>
                      </div>
                    </div>
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

export default UserActivitySection;
