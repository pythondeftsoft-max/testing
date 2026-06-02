
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Award,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  User,
  Settings,
  Plus,
  Minus,
  BarChart3,
  Gift
} from 'lucide-react';
import UserSearchAutocomplete from './UserSearchAutocomplete';
import PointAdjustmentModal from './PointAdjustmentModal';
import UserManagementTable from './UserManagementTable';
import { AdminUserSearchResult } from '@/hooks/useAdminUserSearch';
import { AdminUser, useAdminUserCounts } from '@/hooks/useAdminUsersDirectory';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useAdminPointsOverview, useAdminPointsRecentActivity } from '@/hooks/useAdminPointsAnalytics';
import { useAdminReferralsOverview, useAdminReferralsRecentActivity } from '@/hooks/useAdminReferralsAnalytics';
import EnhancedUserProfile from './EnhancedUserProfile';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { SystemConfigManager } from './SystemConfigManager';
import { AdminAnalytics } from './AdminAnalytics';
import PointsLogsTab from './PointsLogsTab';
import ReferralsLogsTab from './ReferralsLogsTab';

const PointsReferralsTab = () => {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isPointAdjustmentModalOpen, setIsPointAdjustmentModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  // Get points data for selected user
  const { pointsSummary: userPointsSummary } = useUserPoints(selectedUser?.id || '', undefined);

  // Get live admin data
  const { data: pointsOverview, isLoading: pointsLoading } = useAdminPointsOverview();
  const { data: referralsOverview, isLoading: referralsLoading } = useAdminReferralsOverview();
  const { data: pointsActivity, isLoading: pointsActivityLoading } = useAdminPointsRecentActivity(10);
  const { data: referralsActivity, isLoading: referralsActivityLoading } = useAdminReferralsRecentActivity(10);
  const { data: userCounts, isLoading: userCountsLoading } = useAdminUserCounts();

  const isLoading = pointsLoading || referralsLoading;
  const isActivityLoading = pointsActivityLoading || referralsActivityLoading;

  // Combine recent activities from both points and referrals
  const recentActivities = [
    ...(pointsActivity?.map(activity => ({
      id: `points-${activity.user_id}`,
      user: activity.user_name,
      action: activity.event_type,
      points: activity.points_change,
      timestamp: new Date(activity.created_at).toLocaleString()
    })) || []),
    ...(referralsActivity?.map(activity => ({
      id: `referral-${activity.referral_id}`,
      user: activity.referrer_name,
      action: `Referral - ${activity.status}`,
      points: 0, // Points will be calculated when referral qualifies
      timestamp: new Date(activity.updated_at).toLocaleString()
    })) || [])
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  const handleUserSelect = (user: AdminUserSearchResult) => {
    // Convert AdminUserSearchResult to AdminUser format
    const adminUser: AdminUser = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_type: user.user_type,
      created_at: user.created_at,
      last_sign_in_at: null, // AdminUserSearchResult doesn't have this field
      total_points: user.total_points || 0,
      account_status: 'active' as const // Default status since it's not in AdminUserSearchResult
    };
    setSelectedUser(adminUser);
  };

  const handleViewPointHistory = () => {
    if (selectedUser) {
      setIsUserProfileOpen(true);
    }
  };

  const handleAdjustPointsBalance = () => {
    if (selectedUser) {
      setIsPointAdjustmentModalOpen(true);
    }
  };

  const handleViewReferralActivity = () => {
    if (selectedUser) {
      setIsUserProfileOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points Distributed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{pointsOverview?.total_points_distributed?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime points awarded
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{pointsOverview?.active_users || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  Users with points activity
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {pointsOverview?.monthly_growth !== null && pointsOverview?.monthly_growth !== undefined 
                    ? `+${pointsOverview.monthly_growth.toFixed(1)}%` 
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Points distribution growth
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Points Balance</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {pointsOverview?.net_points_balance?.toLocaleString() || '0'} pts
                </div>
                <p className="text-xs text-muted-foreground">
                  Total points in circulation
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="user-management" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="user-management" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="system-config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Config
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="points-logs" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Points Logs
          </TabsTrigger>
          <TabsTrigger value="referrals-logs" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Referrals Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-management" className="space-y-6">
          {/* User Search and Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                User Points Management
              </CardTitle>
              <CardDescription>
                Search for users to view their points history and make adjustments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <UserSearchAutocomplete
                    onUserSelect={handleUserSelect}
                    selectedUser={selectedUser}
                  />
                </div>
              </div>

              {selectedUser && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {selectedUser.first_name} {selectedUser.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedUser.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{selectedUser.user_type}</Badge>
                          <span className="text-sm">
                            Current Points: {userPointsSummary?.total_points || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleViewPointHistory}
                        className="flex items-center gap-1"
                      >
                        <BarChart3 className="w-3 w-3" />
                        View Point History
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleAdjustPointsBalance}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-3 w-3" />
                        Adjust Points Balance
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleViewReferralActivity}
                        className="flex items-center gap-1"
                      >
                        <Gift className="w-3 w-3" />
                        View Referral Activity
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Counts Summary */}
          {userCounts && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Directory Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Badge variant="outline" className="px-3 py-1">
                    Total: {userCounts.total}
                  </Badge>
                  <Badge variant="default" className="px-3 py-1 bg-green-100 text-green-800">
                    Active: {userCounts.active}
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1">
                    Invited: {userCounts.invited}
                  </Badge>
                  <Badge variant="destructive" className="px-3 py-1">
                    Suspended: {userCounts.suspended}
                  </Badge>
                  {userCounts.byType && Object.entries(userCounts.byType).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="px-3 py-1">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Directory Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Directory
              </CardTitle>
              <CardDescription>
                Browse, search, and manage all users with advanced filtering and bulk actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable onViewProfile={(user) => {
                setSelectedUser(user);
                setIsUserProfileOpen(true);
              }} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Points Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isActivityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-2">
                        <MetricSkeleton />
                      </div>
                      <MetricSkeleton />
                    </div>
                  ))}
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{activity.user}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                      {activity.points > 0 && (
                        <Badge variant="secondary" className="text-green-700 bg-green-100">
                          +{activity.points} points
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-config" className="space-y-6">
          <SystemConfigManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="points-logs" className="space-y-6">
          <PointsLogsTab />
        </TabsContent>

        <TabsContent value="referrals-logs" className="space-y-6">
          <ReferralsLogsTab />
        </TabsContent>
      </Tabs>

      {/* Point Adjustment Modal */}
      <PointAdjustmentModal
        isOpen={isPointAdjustmentModalOpen}
        onClose={() => setIsPointAdjustmentModalOpen(false)}
        user={selectedUser}
        currentPoints={userPointsSummary?.total_points || 0}
      />

      {/* Enhanced User Profile */}
      {selectedUser && (
        <EnhancedUserProfile
          isOpen={isUserProfileOpen}
          onClose={() => setIsUserProfileOpen(false)}
          user={{
            id: selectedUser.id,
            name: `${selectedUser.first_name} ${selectedUser.last_name}`,
            email: selectedUser.email,
            role: selectedUser.user_type as any,
          }}
          defaultTab="points"
        />
      )}
    </div>
  );
};

export default PointsReferralsTab;
