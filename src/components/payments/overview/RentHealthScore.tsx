import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface RentHealthScoreProps {
  score: number;
  totalCollected: number;
  totalExpected: number;
  onTimeCount: number;
  pendingCount: number;
  lateCount: number;
  gracePeriodCount: number;
  loading?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Attention';
  return 'Critical';
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

export const RentHealthScore = ({
  score,
  totalCollected,
  totalExpected,
  onTimeCount,
  pendingCount,
  lateCount,
  gracePeriodCount,
  loading,
}: RentHealthScoreProps) => {
  const collectionPercent = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="animate-pulse">
          <CardContent className="p-6 h-48" />
        </Card>
        <Card className="animate-pulse">
          <CardContent className="p-6 h-48" />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Health Score Card */}
      <Card className="relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-1 h-full ${getScoreBgColor(score)}`} />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Rent Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-muted/20"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${(score / 100) * 352} 352`}
                  strokeLinecap="round"
                  className={getScoreColor(score)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
                <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Collection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Collected vs Expected</span>
              <span className="font-medium">{collectionPercent.toFixed(1)}%</span>
            </div>
            <Progress value={collectionPercent} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatCurrency(totalCollected)}</span>
              <span>{formatCurrency(totalExpected)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2">
            <div className="text-center p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
              <p className="text-lg font-bold text-emerald-500">{onTimeCount}</p>
              <p className="text-xs text-muted-foreground">On-Time</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold text-blue-500">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold text-amber-500">{gracePeriodCount}</p>
              <p className="text-xs text-muted-foreground">Grace</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-4 w-4 mx-auto text-red-500 mb-1" />
              <p className="text-lg font-bold text-red-500">{lateCount}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
