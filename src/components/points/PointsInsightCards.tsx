import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Zap, 
  Gift,
  Star,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Info
} from 'lucide-react';

interface PointsInsightCardsProps {
  totalPoints: number;
  monthlyPoints: number;
  lastMonthPoints: number;
  weeklyActivity: number;
  streak?: number;
  nextMilestone?: number;
}

const PointsInsightCards = ({
  totalPoints,
  monthlyPoints,
  lastMonthPoints,
  weeklyActivity,
  streak = 0,
  nextMilestone = 10000
}: PointsInsightCardsProps) => {
  const monthlyChange = monthlyPoints - lastMonthPoints;
  const monthlyChangePercent = lastMonthPoints > 0 
    ? ((monthlyChange / lastMonthPoints) * 100).toFixed(1)
    : monthlyPoints > 0 ? '100' : '0';

  const nextMilestonePoints = Math.ceil(totalPoints / nextMilestone) * nextMilestone;
  const progressToNext = ((totalPoints % nextMilestone) / nextMilestone) * 100;

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-success" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* This Month Card */}
        <Card className="relative overflow-hidden bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-yellow-400 hover:shadow-yellow-400/20 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-muted rounded-xl shadow-md transition-all">
                <Calendar className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                  This Month
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-yellow-600 cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Points earned from rent payments, referrals, and activities in the current month</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-foreground transition-all">
                {monthlyPoints.toLocaleString()}
              </h3>
              <p className="text-sm font-semibold text-foreground">Points Earned</p>
              
              {lastMonthPoints > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 group-hover:bg-yellow-500/10 rounded-lg transition-colors">
                  {getTrendIcon(monthlyChange)}
                  <span className={`text-sm font-semibold ${getTrendColor(monthlyChange)}`}>
                    {Math.abs(Number(monthlyChangePercent))}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity Card */}
        <Card className="relative overflow-hidden bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-yellow-400 hover:shadow-yellow-400/20 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-muted rounded-xl shadow-md transition-all">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  This Week
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-yellow-600 cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Number of point-earning activities completed this week (rent payments, referrals, profile updates)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-foreground transition-all">
                {weeklyActivity}
              </h3>
              <p className="text-sm font-semibold text-foreground">Activities</p>
              
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg transition-colors">
                <Star className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground font-medium">
                  Stay active to earn more
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className="relative overflow-hidden bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-yellow-400 hover:shadow-yellow-400/20 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-muted rounded-xl shadow-md transition-all">
                <Trophy className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${streak >= 7 ? 'bg-purple-500 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'}`}>
                  {streak >= 7 ? 'Hot Streak!' : 'Streak'}
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-yellow-600 cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Consecutive days with point-earning activities. Maintain streaks for bonus rewards!</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-foreground transition-all">
                {streak}
              </h3>
              <p className="text-sm font-semibold text-foreground">Days in a row</p>
              
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-3 shadow-inner transition-colors">
                  <div 
                    className="h-3 bg-purple-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {Math.min(streak, 30)}/30 days to max streak bonus
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Milestone Card */}
        <Card className="relative overflow-hidden bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-yellow-400 hover:shadow-yellow-400/20 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-muted rounded-xl shadow-md transition-all">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Next Goal
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-yellow-600 cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Your next point milestone target. Reach milestones to unlock special rewards and benefits</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-foreground transition-all">
                {nextMilestonePoints.toLocaleString()}
              </h3>
              <p className="text-sm font-semibold text-foreground">Point Milestone</p>
              
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-3 shadow-inner transition-colors">
                  <div 
                    className="h-3 bg-green-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${progressToNext}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {(nextMilestonePoints - totalPoints).toLocaleString()} points to go
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default PointsInsightCards;
