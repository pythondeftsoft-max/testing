
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Target, Zap, Award } from 'lucide-react';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';

interface PortfolioAchievementsProps {
  portfolioId: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  requirement: number;
  earned: boolean;
  progress: number;
  color: string;
}

const PortfolioAchievements = ({ portfolioId }: PortfolioAchievementsProps) => {
  const { pointsSummary, loading } = usePortfolioPoints(portfolioId);

  const totalPoints = pointsSummary?.total_points || 0;
  const thisMonth = pointsSummary?.points_this_month || 0;

  const achievements: Achievement[] = [
    {
      id: 'first_100',
      title: 'Getting Started',
      description: 'Earn your first 100 points',
      icon: Star,
      requirement: 100,
      earned: totalPoints >= 100,
      progress: Math.min((totalPoints / 100) * 100, 100),
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 'milestone_500',
      title: 'Rising Star',
      description: 'Accumulate 500 total points',
      icon: Trophy,
      requirement: 500,
      earned: totalPoints >= 500,
      progress: Math.min((totalPoints / 500) * 100, 100),
      color: 'text-yellow-600 bg-yellow-100'
    },
    {
      id: 'milestone_1000',
      title: 'Point Master',
      description: 'Reach 1,000 total points',
      icon: Award,
      requirement: 1000,
      earned: totalPoints >= 1000,
      progress: Math.min((totalPoints / 1000) * 100, 100),
      color: 'text-purple-600 bg-purple-100'
    },
    {
      id: 'monthly_250',
      title: 'Monthly Champion',
      description: 'Earn 250 points in one month',
      icon: Target,
      requirement: 250,
      earned: thisMonth >= 250,
      progress: Math.min((thisMonth / 250) * 100, 100),
      color: 'text-green-600 bg-green-100'
    },
    {
      id: 'streak_master',
      title: 'Consistency King',
      description: 'Maintain activity for 7 days',
      icon: Zap,
      requirement: 7,
      earned: false, // This would need streak tracking
      progress: 0,
      color: 'text-orange-600 bg-orange-100'
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Trophy className="w-4 h-4 mr-2" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          <Trophy className="w-4 h-4 mr-2" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((achievement) => {
            const IconComponent = achievement.icon;
            return (
              <div 
                key={achievement.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  achievement.earned 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${achievement.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {achievement.title}
                      </h4>
                      {achievement.earned && (
                        <Badge variant="default" className="bg-green-600">
                          ✓
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {achievement.description}
                    </p>
                    {!achievement.earned && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${achievement.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioAchievements;
