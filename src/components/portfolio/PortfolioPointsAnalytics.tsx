
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, Activity, Target } from 'lucide-react';
import ModernMetricCard from '@/components/analytics/ModernMetricCard';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface PortfolioPointsAnalyticsProps {
  portfolioId: string;
}

const PortfolioPointsAnalytics = ({ portfolioId }: PortfolioPointsAnalyticsProps) => {
  const { portfolioPoints, pointsSummary, loading, error } = usePortfolioPoints(portfolioId);

  if (loading) {
    return (
      <div className="space-y-6">
        <CardEnhanced variant="premium" className="animate-pulse">
          <CardEnhancedHeader>
            <div className="h-6 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </CardEnhancedHeader>
        </CardEnhanced>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <ModernMetricCard
              key={i}
              title="Loading..."
              value="--"
              icon={TrendingUp}
              loading={true}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !pointsSummary) {
    return (
      <CardEnhanced variant="default">
        <CardEnhancedContent className="p-6">
          <div className="text-center text-destructive">Error loading analytics data</div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  // Generate trend data for the last 30 days
  const generateTrendData = () => {
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    return dateRange.map(date => {
      const dayPoints = portfolioPoints?.filter(point => 
        format(new Date(point.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).reduce((sum, point) => sum + Number(point.points_awarded), 0) || 0;
      
      return {
        date: format(date, 'MMM dd'),
        points: dayPoints,
      };
    });
  };

  // Generate event type distribution data
  const generateEventData = () => {
    const eventCounts = portfolioPoints?.reduce((acc, point) => {
      const eventType = point.source_event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      acc[eventType] = (acc[eventType] || 0) + Number(point.points_awarded);
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(eventCounts).map(([event, points]) => ({
      event,
      points,
    }));
  };

  const trendData = generateTrendData();
  const eventData = generateEventData();
  const monthlyGrowth = pointsSummary.points_last_month > 0 
    ? ((pointsSummary.points_this_month - pointsSummary.points_last_month) / pointsSummary.points_last_month) * 100
    : pointsSummary.points_this_month > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      <CardEnhanced variant="premium">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="text-2xl">Points Analytics</CardEnhancedTitle>
          <p className="text-muted-foreground">Detailed analytics and performance metrics for your portfolio</p>
        </CardEnhancedHeader>
      </CardEnhanced>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernMetricCard
          title="Monthly Growth"
          value={`${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth.toFixed(1)}%`}
          icon={TrendingUp}
          iconColor="text-openkey-blue"
          subtitle="vs last month"
          variant="gradient"
        />

        <ModernMetricCard
          title="Avg Daily Points"
          value={(pointsSummary.points_this_month / 30).toFixed(0)}
          icon={Calendar}
          iconColor="text-openkey-gold"
          subtitle="points per day"
          variant="default"
        />

        <ModernMetricCard
          title="Activity Score"
          value={pointsSummary.recent_activity_count}
          icon={Activity}
          iconColor="text-openkey-blue"
          subtitle="events this week"
          variant="default"
        />

        <ModernMetricCard
          title="Goal Progress"
          value="75%"
          icon={Target}
          iconColor="text-openkey-gold"
          subtitle="monthly goal"
          variant="default"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points Trend Chart */}
        <CardEnhanced variant="default">
          <CardEnhancedHeader>
            <CardEnhancedTitle>Points Trend (30 Days)</CardEnhancedTitle>
            <p className="text-sm text-muted-foreground">Daily points earned over the last month</p>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="points" 
                  stroke="hsl(var(--openkey-blue))" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--openkey-blue))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardEnhancedContent>
        </CardEnhanced>

        {/* Event Distribution Chart */}
        <CardEnhanced variant="default">
          <CardEnhancedHeader>
            <CardEnhancedTitle>Points by Event Type</CardEnhancedTitle>
            <p className="text-sm text-muted-foreground">Distribution of points across different activities</p>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="event" type="category" fontSize={12} width={100} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="points" fill="hsl(var(--openkey-gold))" />
              </BarChart>
            </ResponsiveContainer>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>

      {/* Top Sources */}
      <CardEnhanced variant="subtle">
        <CardEnhancedHeader>
          <CardEnhancedTitle>Top Points Sources</CardEnhancedTitle>
          <p className="text-sm text-muted-foreground">Highest performing activities this month</p>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-3">
            {eventData.slice(0, 5).map((item, index) => (
              <div key={item.event} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-openkey-blue/10 flex items-center justify-center text-xs font-medium text-openkey-blue">
                    {index + 1}
                  </div>
                  <span className="font-medium text-sm">{item.event}</span>
                </div>
                <Badge className="bg-gradient-blue-gold text-white border-0">
                  {item.points.toLocaleString()} pts
                </Badge>
              </div>
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default PortfolioPointsAnalytics;
