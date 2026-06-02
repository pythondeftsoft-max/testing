
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Download, Calendar, Target, Zap, Users, Award, Activity } from 'lucide-react';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

interface PortfolioPerformanceDashboardProps {
  portfolioId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const PortfolioPerformanceDashboard = ({ portfolioId }: PortfolioPerformanceDashboardProps) => {
  const [dateRange, setDateRange] = useState('30');
  const [viewType, setViewType] = useState('overview');
  const { portfolioPoints, pointsSummary, loading } = usePortfolioPoints(portfolioId);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Generate performance trend data
  const generatePerformanceTrend = () => {
    const days = parseInt(dateRange);
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    const dateRangeArray = eachDayOfInterval({ start: startDate, end: endDate });
    
    return dateRangeArray.map(date => {
      const dayPoints = portfolioPoints?.filter(point => 
        format(new Date(point.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).reduce((sum, point) => sum + Number(point.points_awarded), 0) || 0;
      
      return {
        date: format(date, 'MMM dd'),
        points: dayPoints,
        cumulative: 0, // Will be calculated below
      };
    });
  };

  // Generate team performance data
  const generateTeamPerformance = () => {
    const teamData = portfolioPoints?.reduce((acc, point) => {
      const teamMember = point.processed_by || 'System';
      acc[teamMember] = (acc[teamMember] || 0) + Number(point.points_awarded);
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(teamData).map(([member, points]) => ({
      member: member === 'System' ? 'Automated' : member,
      points,
    }));
  };

  // Generate event distribution data
  const generateEventDistribution = () => {
    const eventData = portfolioPoints?.reduce((acc, point) => {
      const eventType = point.source_event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      acc[eventType] = (acc[eventType] || 0) + Number(point.points_awarded);
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(eventData).map(([event, points]) => ({
      event,
      points,
    }));
  };

  const performanceData = generatePerformanceTrend();
  const teamData = generateTeamPerformance();
  const eventData = generateEventDistribution();
  
  // Calculate cumulative points
  let cumulative = 0;
  performanceData.forEach(item => {
    cumulative += item.points;
    item.cumulative = cumulative;
  });

  // Calculate KPIs
  const totalPoints = pointsSummary?.total_points || 0;
  const thisMonth = pointsSummary?.points_this_month || 0;
  const lastMonth = pointsSummary?.points_last_month || 0;
  const monthlyGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
  const avgDailyPoints = thisMonth / new Date().getDate();
  const projectedMonthly = avgDailyPoints * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  const exportReport = () => {
    // Placeholder for export functionality
    console.log('Exporting performance report...');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-black mb-1">Performance Dashboard</h3>
          <p className="text-sm text-muted-foreground">Advanced analytics and insights for portfolio performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Points
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
            <div className="flex items-center mt-1">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">
                {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}% vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Average
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDailyPoints.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">points per day</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projected Monthly
              </CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectedMonthly.toFixed(0)}</div>
            <Progress value={(thisMonth / projectedMonthly) * 100} className="mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {((thisMonth / projectedMonthly) * 100).toFixed(0)}% of projection
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Activity Score
              </CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pointsSummary?.recent_activity_count || 0}
            </div>
            <div className="text-xs text-muted-foreground">events this week</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Points Trend</CardTitle>
            <CardDescription>Daily and cumulative points over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="points" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Daily Points"
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Cumulative"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Performance</CardTitle>
            <CardDescription>Points contribution by team members</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="member" type="category" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="points" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Distribution</CardTitle>
            <CardDescription>Points breakdown by event type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ event, percent }) => `${event} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="points"
                >
                  {eventData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Events</CardTitle>
            <CardDescription>Highest performing activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventData
                .sort((a, b) => b.points - a.points)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={item.event} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm">{item.event}</span>
                    </div>
                    <Badge variant="secondary">
                      {item.points.toLocaleString()} pts
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortfolioPerformanceDashboard;
