import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Home, 
  Users, 
  Gift, 
  Star, 
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Settings
} from 'lucide-react';

interface ActivityItem {
  pointsChange: number;
  balanceAfter?: number;
  timestamp: string;
  eventType: string;
  notes?: string;
}

interface PointsActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

// Helper function to get the appropriate icon for activity type
const getActivityIcon = (eventType: string, pointsChange: number) => {
  if (eventType.includes('rent')) return Home;
  if (eventType.includes('referral')) return Users;
  if (eventType.includes('reward') || eventType.includes('redeem')) return Gift;
  if (eventType.includes('bonus')) return Star;
  if (eventType.includes('admin')) return Settings;
  
  // Default based on points change
  return pointsChange > 0 ? TrendingUp : TrendingDown;
};

// Helper function to get color theme for activity type
const getActivityColorTheme = (eventType: string, pointsChange: number) => {
  if (pointsChange > 0) {
    // Check referral FIRST before bonus (since 'referral_bonus' contains both words)
    if (eventType.includes('referral')) {
      return {
        badge: 'bg-openkey-gold',
        icon: 'text-openkey-gold',
        iconBg: 'bg-openkey-gold/10'
      };
    }
    if (eventType.includes('rent')) {
      return {
        badge: 'bg-openkey-blue',
        icon: 'text-openkey-blue',
        iconBg: 'bg-openkey-blue/10'
      };
    }
    if (eventType.includes('bonus')) {
      return {
        badge: 'bg-purple-500',
        icon: 'text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-500/10'
      };
    }
    // Default "Earned" - success green
    return {
      badge: 'bg-success',
      icon: 'text-success',
      iconBg: 'bg-success/10'
    };
  } else {
    if (eventType.includes('reward') || eventType.includes('redeem')) {
      return {
        badge: 'bg-amber-500',
        icon: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-500/10'
      };
    }
    return {
      badge: 'bg-red-500',
      icon: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-500/10'
    };
  }
};

// Helper function to get badge variant for activity type
const getActivityBadge = (eventType: string, pointsChange: number, bgColor: string) => {
  if (pointsChange > 0) {
    if (eventType.includes('rent')) return <Badge className={`text-xs ${bgColor} text-white font-medium`}>Rent Payment</Badge>;
    if (eventType.includes('referral')) return <Badge className={`text-xs ${bgColor} text-white font-medium`}>Referral</Badge>;
    if (eventType.includes('bonus')) return <Badge className={`text-xs ${bgColor} text-white font-medium`}>Bonus</Badge>;
    return <Badge className={`text-xs ${bgColor} text-white font-medium`}>Earned</Badge>;
  } else {
    if (eventType.includes('reward') || eventType.includes('redeem')) {
      return <Badge className={`text-xs ${bgColor} text-white font-medium`}>Redeemed</Badge>;
    }
    return <Badge className={`text-xs ${bgColor} text-white font-medium`}>Spent</Badge>;
  }
};

// Helper function to get display text for activity
const getDisplayText = (activity: ActivityItem): string => {
  if (activity.notes) {
    return activity.notes;
  }
  
  // Fallback based on event type
  switch (activity.eventType) {
    case 'rent_payment':
      return 'Monthly Rent Payment';
    case 'referral_milestone':
      return 'Referral Reward';
    case 'reward_redemption':
      return 'Reward Redeemed';
    case 'admin_adjustment':
      return 'Points Adjustment';
    default:
      return activity.eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

// Helper function to format points change
const formatPointsChange = (change: number): string => {
  return change >= 0 ? `+${change.toLocaleString()}` : change.toLocaleString();
};

const PointsActivityFeed = ({ activities, isLoading = false }: PointsActivityFeedProps) => {
  if (isLoading) {
    return (
      <Card className="shadow-sm card-hover-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-muted rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded"></div>
                    <div className="h-3 w-24 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="command-bento-card h-[500px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="command-section-icon">
            <Clock className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-openkey-blue">Recent Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Points & transactions</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 flex flex-col overflow-hidden">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium text-foreground">No recent activity</p>
            <p className="text-sm">Start earning points to see your activity here</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {activities.map((activity, index) => {
                const colorTheme = getActivityColorTheme(activity.eventType, activity.pointsChange);
                const icon = getActivityIcon(activity.eventType, activity.pointsChange);
                const badge = getActivityBadge(activity.eventType, activity.pointsChange, colorTheme.badge);
              
                return (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="command-activity-item flex items-start gap-4 p-4 bg-card"
                  >
                    {/* Icon - Fixed width */}
                    <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center ${colorTheme.iconBg} rounded-full`}>
                      {React.createElement(icon, { className: `h-6 w-6 ${colorTheme.icon}`, strokeWidth: 1.5 })}
                    </div>
                  
                    {/* Content - Flexible */}
                    <div className="flex-1 min-w-0">
                      {/* Badge first */}
                      <div className="mb-1">
                        {badge}
                      </div>
                    
                      {/* Description - no truncate, allow wrap */}
                      <p className="text-sm font-medium text-foreground mb-2 leading-snug">
                        {getDisplayText(activity)}
                      </p>
                    
                      {/* Date and Balance */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(activity.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {activity.balanceAfter !== undefined && (
                          <>
                            <span className="text-border">•</span>
                            <span className="text-foreground font-semibold">Balance: {activity.balanceAfter.toLocaleString()} pts</span>
                          </>
                        )}
                      </div>
                    </div>
                  
                    {/* Points - Fixed width, aligned right */}
                    <div className="flex-shrink-0 w-20 text-right">
                      <p className={`text-2xl font-bold ${colorTheme.icon}`}>
                        {formatPointsChange(activity.pointsChange)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PointsActivityFeed;