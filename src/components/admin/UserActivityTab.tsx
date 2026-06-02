import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserActivityFeed } from '@/hooks/useUserActivityFeed';
import {
  Activity,
  Users,
  Shield,
  AlertTriangle,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Award,
  UserCog,
  ShieldAlert,
  UserX,
  CheckCircle2,
  Send,
  Settings,
} from 'lucide-react';
import {
  getActiveSessionsCount,
  getTodaySessionsCount,
  getHighRiskSessionsCount,
  getSecurityAlertsCount,
  getRecentActionsCount,
  getPeakActivityHour,
  ActivityEvent,
} from '@/utils/activityMocks';
import { formatDistanceToNow } from 'date-fns';
import { MetricDisplay } from '@/components/ui/metric-display';

const activityTypeIcons: Record<ActivityEvent['activity_type'], React.ReactNode> = {
  login: <LogIn className="w-4 h-4" />,
  logout: <LogOut className="w-4 h-4" />,
  points_earned: <Award className="w-4 h-4" />,
  profile_update: <UserCog className="w-4 h-4" />,
  role_change: <UserCog className="w-4 h-4" />,
  security_alert: <ShieldAlert className="w-4 h-4" />,
  session_terminated: <UserX className="w-4 h-4" />,
  failed_login: <AlertTriangle className="w-4 h-4" />,
  mfa_verified: <CheckCircle2 className="w-4 h-4" />,
  referral_sent: <Send className="w-4 h-4" />,
  admin_action: <Settings className="w-4 h-4" />,
};

const activityTypeColors: Record<ActivityEvent['activity_type'], string> = {
  login: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  logout: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  points_earned: 'bg-green-500/10 text-green-500 border-green-500/20',
  profile_update: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  role_change: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  security_alert: 'bg-red-500/10 text-red-500 border-red-500/20',
  session_terminated: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  failed_login: 'bg-red-500/10 text-red-500 border-red-500/20',
  mfa_verified: 'bg-green-500/10 text-green-500 border-green-500/20',
  referral_sent: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  admin_action: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const getRiskScoreColor = (score: number): string => {
  if (score <= 30) return 'text-green-500';
  if (score <= 50) return 'text-yellow-500';
  return 'text-red-500';
};

const getRiskScoreBadge = (score: number): string => {
  if (score <= 30) return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (score <= 50) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  return 'bg-red-500/10 text-red-500 border-red-500/20';
};

const UserActivityTab = () => {
  const {
    activities,
    isLoading,
    filters,
    updateFilter,
    resetFilters,
    currentPage,
    totalPages,
    setCurrentPage,
    totalCount,
    exportToCSV,
  } = useUserActivityFeed();

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const metrics = [
    {
      label: 'Active Users Now',
      value: getActiveSessionsCount(),
      icon: <Users className="w-5 h-5 text-primary" />,
    },
    {
      label: 'Sessions Today',
      value: getTodaySessionsCount(),
      icon: <Activity className="w-5 h-5 text-blue-500" />,
    },
    {
      label: 'High Risk Sessions',
      value: getHighRiskSessionsCount(),
      icon: <Shield className="w-5 h-5 text-red-500" />,
    },
    {
      label: 'Security Alerts',
      value: getSecurityAlertsCount(),
      icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
    },
    {
      label: 'Recent Actions',
      value: getRecentActionsCount(),
      icon: <TrendingUp className="w-5 h-5 text-green-500" />,
    },
    {
      label: 'Peak Activity',
      value: getPeakActivityHour(),
      icon: <Clock className="w-5 h-5 text-purple-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <MetricDisplay
            key={index}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users or activities..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilter('searchQuery', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Activity Type */}
            <Select
              value={filters.activityType}
              onValueChange={(value) => updateFilter('activityType', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Activity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="points_earned">Points Earned</SelectItem>
                <SelectItem value="profile_update">Profile Update</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="security_alert">Security Alert</SelectItem>
                <SelectItem value="failed_login">Failed Login</SelectItem>
                <SelectItem value="mfa_verified">MFA Verified</SelectItem>
                <SelectItem value="referral_sent">Referral Sent</SelectItem>
                <SelectItem value="admin_action">Admin Action</SelectItem>
              </SelectContent>
            </Select>

            {/* Time Range */}
            <Select
              value={filters.timeRange}
              onValueChange={(value) => updateFilter('timeRange', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_hour">Last Hour</SelectItem>
                <SelectItem value="last_24h">Today</SelectItem>
                <SelectItem value="last_7d">Last 7 Days</SelectItem>
                <SelectItem value="last_30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            {/* User Type */}
            <Select
              value={filters.userType}
              onValueChange={(value) => updateFilter('userType', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="landlord">Landlord</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>

            {/* Risk Level */}
            <Select
              value={filters.riskLevel}
              onValueChange={(value) => updateFilter('riskLevel', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low (0-30)</SelectItem>
                <SelectItem value="medium">Medium (31-50)</SelectItem>
                <SelectItem value="high">High (51-100)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Timeline
              <Badge variant="secondary">{totalCount} activities</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
              <p>Loading activity data...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found matching your filters</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === activity.id ? null : activity.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg border ${activityTypeColors[activity.activity_type]}`}>
                          {activityTypeIcons[activity.activity_type]}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{activity.user_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.user_type}
                                </Badge>
                                <Badge className={`text-xs border ${activityTypeColors[activity.activity_type]}`}>
                                  {activity.activity_type.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description}
                              </p>
                            </div>

                            {/* Timestamp & Risk */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-muted-foreground mb-1">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                              </p>
                              <Badge className={`text-xs border ${getRiskScoreBadge(activity.risk_score)}`}>
                                Risk: {activity.risk_score}
                              </Badge>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {expandedRow === activity.id && (
                            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {activity.device && (
                                  <div>
                                    <p className="text-muted-foreground text-xs">Device</p>
                                    <p>{activity.device}</p>
                                  </div>
                                )}
                                {activity.browser && (
                                  <div>
                                    <p className="text-muted-foreground text-xs">Browser</p>
                                    <p>{activity.browser}</p>
                                  </div>
                                )}
                                {activity.route && (
                                  <div>
                                    <p className="text-muted-foreground text-xs">Route</p>
                                    <p className="font-mono text-xs">{activity.route}</p>
                                  </div>
                                )}
                                {activity.portfolio_name && (
                                  <div>
                                    <p className="text-muted-foreground text-xs">Portfolio</p>
                                    <p>{activity.portfolio_name}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityTab;
