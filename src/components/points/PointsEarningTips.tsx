import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  Home, 
  Users, 
  Gift,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

interface EarningTip {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: React.ComponentType<any>;
  frequency: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'rent' | 'referral' | 'engagement' | 'bonus';
}

interface PointsEarningTipsProps {
  onTipClick?: (tip: EarningTip) => void;
  onOpenReferralDialog?: () => void;
}

const PointsEarningTips = ({ onTipClick, onOpenReferralDialog }: PointsEarningTipsProps) => {
  const navigate = useNavigate();
  
  const earningTips: EarningTip[] = [
    {
      id: '1',
      title: 'Pay Rent On Time',
      description: 'Earn 1 point for every dollar of rent paid',
      points: 1,
      icon: Home,
      frequency: 'Per dollar',
      difficulty: 'Easy',
      category: 'rent'
    },
    {
      id: '2',
      title: 'Refer a Friend',
      description: 'Get 10,000 points when friends sign up through your link',
      points: 10000,
      icon: Users,
      frequency: 'Per referral',
      difficulty: 'Easy',
      category: 'referral'
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
      case 'Medium': return 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10';
      case 'Hard': return 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10';
      default: return 'border-border text-muted-foreground bg-muted';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'rent': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'referral': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'engagement': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'bonus': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleTipClick = (tip: EarningTip) => {
    onTipClick?.(tip);
    
    switch (tip.category) {
      case 'rent':
        navigate('/rent-payments-new');
        break;
      case 'referral':
        onOpenReferralDialog?.();
        break;
      default:
        break;
    }
  };

  return (
    <Card className="shadow-sm card-hover-gold">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Lightbulb className="h-5 w-5 text-muted-foreground" />
          Ways to Earn Points
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {earningTips.map((tip) => (
            <div
              key={tip.id}
              onClick={() => handleTipClick(tip)}
              className="group p-3 sm:p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer bg-card touch-manipulation"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTipClick(tip);
                }
              }}
              aria-label={`${tip.title} - ${tip.description}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getCategoryColor(tip.category)}`}>
                    {React.createElement(tip.icon, { className: "h-5 w-5" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-foreground group-hover:text-blue-600 transition-colors">
                        {tip.title}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getDifficultyColor(tip.difficulty)}`}
                      >
                        {tip.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{tip.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-medium text-blue-600">+{tip.points} points</span>
                      <span>{tip.frequency}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 sm:p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-medium text-foreground mb-1">Ready to start earning?</h4>
              <p className="text-sm text-muted-foreground">Click any activity above to begin</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              onClick={() => handleTipClick(earningTips[0])}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Start Earning
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PointsEarningTips;