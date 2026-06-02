
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, Award, Clock } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';

interface PortfolioPointsNotificationsProps {
  portfolioId: string;
}

const PortfolioPointsNotifications = ({ portfolioId }: PortfolioPointsNotificationsProps) => {
  const { portfolioPoints, loading } = usePortfolioPoints(portfolioId);

  const recentActivity = portfolioPoints?.slice(0, 5) || [];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'rent_payment':
        return TrendingUp;
      case 'lease_signing':
        return Award;
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

  if (loading) {
    return (
      <CardEnhanced variant="default" className="animate-pulse">
        <CardEnhancedHeader>
          <CardEnhancedTitle>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Recent Activity
            </div>
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded mb-1"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="default" className="h-fit">
      <CardEnhancedHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-openkey-blue/10">
            <Bell className="w-4 h-4 text-openkey-blue" />
          </div>
          <CardEnhancedTitle>Recent Activity</CardEnhancedTitle>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent className="max-h-96 overflow-y-auto">
        {recentActivity.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => {
              const IconComponent = getEventIcon(activity.source_event_type);
              return (
                <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-openkey-blue/10 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-3 h-3 text-openkey-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground truncate">
                        {activity.points_awarded} points
                      </p>
                      <Badge className="bg-gradient-blue-gold text-white border-0 text-xs px-2 py-0">
                        +{activity.points_awarded}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span className="capitalize text-xs">{activity.source_event_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span className="text-xs">{formatTimeAgo(activity.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default PortfolioPointsNotifications;
