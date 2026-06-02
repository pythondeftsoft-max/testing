import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trophy, Star, Flame, ChevronDown, ChevronUp, Award } from 'lucide-react';

interface AllStar {
  propertyAddress: string;
  unitNumber: string | null;
  tenantName: string;
  streakMonths: number;
  badge: string;
}

interface PaymentAllStarsProps {
  allStars: AllStar[];
  collectionRate: number;
  viaOpenKeyPercent: number;
  loading?: boolean;
}

const getBadgeIcon = (badge: string) => {
  switch (badge) {
    case 'Perfect Streak':
      return <Flame className="h-3.5 w-3.5 text-orange-500" />;
    case '100% On-Time':
      return <Star className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <Award className="h-3.5 w-3.5 text-primary" />;
  }
};

export const PaymentAllStars = ({
  allStars,
  collectionRate,
  viaOpenKeyPercent,
  loading,
}: PaymentAllStarsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Generate landlord achievements based on metrics
  const landlordAchievements = [];
  
  if (collectionRate >= 100) {
    landlordAchievements.push({
      title: 'Full Collection',
      description: '100% of rent collected this month',
      icon: <Trophy className="h-4 w-4 text-amber-500" />,
    });
  } else if (collectionRate >= 95) {
    landlordAchievements.push({
      title: 'High Collector',
      description: '95%+ collection rate achieved',
      icon: <Star className="h-4 w-4 text-amber-500" />,
    });
  }
  
  if (viaOpenKeyPercent >= 80) {
    landlordAchievements.push({
      title: 'OpenKey Champion',
      description: '80%+ rent via OpenKey payments',
      icon: <Award className="h-4 w-4 text-primary" />,
    });
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 h-24" />
      </Card>
    );
  }

  const hasContent = allStars.length > 0 || landlordAchievements.length > 0;

  if (!hasContent) {
    return null; // Don't show the section if there's nothing to display
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-500" />
                On-Time All-Stars & Achievements
                {(allStars.length > 0 || landlordAchievements.length > 0) && (
                  <Badge variant="secondary" className="ml-2">
                    {allStars.length + landlordAchievements.length}
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Landlord Achievements */}
            {landlordAchievements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Achievements</h4>
                <div className="flex flex-wrap gap-2">
                  {landlordAchievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                    >
                      {achievement.icon}
                      <div>
                        <p className="text-sm font-medium">{achievement.title}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tenant All-Stars */}
            {allStars.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Units with Perfect Payment Streaks
                </h4>
                <div className="space-y-2">
                  {allStars.map((star, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <Flame className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {star.unitNumber ? `Unit ${star.unitNumber} @ ` : ''}{star.propertyAddress}
                          </p>
                          <p className="text-xs text-muted-foreground">{star.tenantName}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        {getBadgeIcon(star.badge)}
                        {star.streakMonths} months
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allStars.length === 0 && landlordAchievements.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Tenant streaks will appear here after 3+ months of on-time payments
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
