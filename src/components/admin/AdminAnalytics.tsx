import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, TrendingUp, Award, Gift, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAdminPointsOverview, useAdminPointsMonthlyTrends, useAdminPointsRecentActivity, useAdminPointsLeaderboard } from '@/hooks/useAdminPointsAnalytics';
import { useAdminReferralsOverview, useAdminReferralsRecentActivity } from '@/hooks/useAdminReferralsAnalytics';
import { formatDistanceToNow } from 'date-fns';

const MetricCard = ({ title, value, icon: Icon, trend, trendLabel }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: number | null;
  trendLabel?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend !== undefined && trend !== null && (
        <p className="text-xs text-muted-foreground">
          <span className={trend >= 0 ? 'text-green-600' : 'text-red-600'}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
          {trendLabel && ` ${trendLabel}`}
        </p>
      )}
    </CardContent>
  </Card>
);

export const AdminAnalytics = () => {
  const { data: pointsOverview, isLoading: pointsLoading, error: pointsError } = useAdminPointsOverview();
  const { data: pointsTrends, error: trendsError } = useAdminPointsMonthlyTrends(12);
  const { data: pointsActivity, error: activityError } = useAdminPointsRecentActivity(10);
  const { data: pointsLeaderboard, error: leaderboardError } = useAdminPointsLeaderboard('30d', 10);
  const { data: referralsOverview, error: referralsError } = useAdminReferralsOverview();
  const { data: referralsActivity, error: refActivityError } = useAdminReferralsRecentActivity(10);

  if (pointsLoading) {
    return <div>Loading analytics...</div>;
  }

  // Debug information
  const debugInfo = {
    pointsOverview: { data: pointsOverview, error: pointsError },
    pointsTrends: { data: pointsTrends, error: trendsError },
    pointsActivity: { data: pointsActivity, error: activityError },
    pointsLeaderboard: { data: pointsLeaderboard, error: leaderboardError },
    referralsOverview: { data: referralsOverview, error: referralsError },
    referralsActivity: { data: referralsActivity, error: refActivityError }
  };

  console.log('AdminAnalytics Debug Info:', debugInfo);

  const chartData = pointsTrends?.map(trend => ({
    month: new Date(trend.month_start).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    points: trend.points_awarded,
    users: trend.unique_users,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics Dashboard
        </h2>
        <p className="text-muted-foreground">
          System-wide analytics for Points & Referrals
        </p>
      </div>

      {/* Debug Error Display */}
      {(pointsError || trendsError || activityError || leaderboardError || referralsError || refActivityError) && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Debug: API Errors Detected</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {pointsError && <div><strong>Points Overview:</strong> {pointsError.message}</div>}
            {trendsError && <div><strong>Points Trends:</strong> {trendsError.message}</div>}
            {activityError && <div><strong>Points Activity:</strong> {activityError.message}</div>}
            {leaderboardError && <div><strong>Points Leaderboard:</strong> {leaderboardError.message}</div>}
            {referralsError && <div><strong>Referrals Overview:</strong> {referralsError.message}</div>}
            {refActivityError && <div><strong>Referrals Activity:</strong> {refActivityError.message}</div>}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="points" className="space-y-6">
        <TabsList>
          <TabsTrigger value="points">Points Analytics</TabsTrigger>
          <TabsTrigger value="referrals">Referrals Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="space-y-6">
          {/* Points Overview Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Points Distributed"
              value={pointsOverview?.total_points_distributed?.toLocaleString() || '0'}
              icon={Award}
            />
            <MetricCard
              title="Active Users (30d)"
              value={pointsOverview?.active_users || 0}
              icon={Users}
            />
            <MetricCard
              title="Monthly Growth"
              value={pointsOverview?.monthly_growth ? `${pointsOverview.monthly_growth.toFixed(1)}%` : 'N/A'}
              icon={TrendingUp}
              trend={pointsOverview?.monthly_growth}
            />
            <MetricCard
              title="Net Points Balance"
              value={`${pointsOverview?.net_points_balance?.toLocaleString() || '0'} pts`}
              icon={Award}
            />
          </div>

          {/* Points Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Points Distribution Trends</CardTitle>
              <CardDescription>Monthly points awarded and user activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="points" fill="hsl(var(--primary))" name="Points" />
                  <Line yAxisId="right" type="monotone" dataKey="users" stroke="hsl(var(--secondary))" name="Users" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity and Leaderboard */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Points Activity</CardTitle>
                <CardDescription>Latest points distributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {pointsActivity?.map((activity, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{activity.user_name}</span>
                         <span className="text-muted-foreground ml-2">{activity.event_type}</span>
                       </div>
                       <div className="text-right">
                         <div className="font-medium">+{activity.points_change}</div>
                         <div className="text-xs text-muted-foreground">
                           {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  )) || <div className="text-muted-foreground">No recent activity</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Users (30d)</CardTitle>
                <CardDescription>Users with most points this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {pointsLeaderboard?.map((user, idx) => (
                    <div key={user.user_id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-4 text-center text-muted-foreground">#{idx + 1}</span>
                        <span className="font-medium">{user.user_name}</span>
                      </div>
                      <span className="font-medium">{user.total_points.toLocaleString()}</span>
                    </div>
                  )) || <div className="text-muted-foreground">No data available</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          {/* Referrals Overview Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              title="Total Referrals"
              value={referralsOverview?.total_referrals || 0}
              icon={Users}
            />
            <MetricCard
              title="Qualified Referrals"
              value={referralsOverview?.qualified_referrals || 0}
              icon={Award}
            />
            <MetricCard
              title="Pending Referrals"
              value={referralsOverview?.pending_referrals || 0}
              icon={Activity}
            />
            <MetricCard
              title="Total Rewards"
              value={`$${referralsOverview?.total_rewards_earned?.toLocaleString() || '0'}`}
              icon={Gift}
            />
            <MetricCard
              title="Available Rewards"
              value={referralsOverview?.available_rewards_count || 0}
              icon={Gift}
            />
          </div>

          {/* Recent Referral Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Referral Activity</CardTitle>
              <CardDescription>Latest referral status updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {referralsActivity?.map((activity, idx) => (
                  <div key={activity.referral_id} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{activity.referrer_name}</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        activity.status === 'qualified' ? 'bg-green-100 text-green-800' :
                        activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                )) || <div className="text-muted-foreground">No recent activity</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};