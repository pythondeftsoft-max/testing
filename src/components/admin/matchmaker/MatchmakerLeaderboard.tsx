import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { useMatchmakerPoints } from '@/hooks/useMatchmakerPoints';
import { Skeleton } from '@/components/ui/skeleton';

export const MatchmakerLeaderboard = () => {
  const { leaderboard, userStats } = useMatchmakerPoints();

  if (leaderboard.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top Matchmakers This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const leaders = leaderboard.data || [];
  const currentUser = userStats.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Matchmakers This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data yet. Start matching to appear on the leaderboard!
            </p>
          ) : (
            leaders.map((entry) => {
              const isCurrentUser = currentUser?.worker_id === entry.worker_id;
              return (
                <div 
                  key={entry.worker_id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentUser ? 'bg-primary/10 border border-primary' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold ${
                      entry.rank === 1 ? 'text-yellow-500' :
                      entry.rank === 2 ? 'text-gray-400' :
                      entry.rank === 3 ? 'text-orange-600' :
                      'text-muted-foreground'
                    }`}>
                      {entry.rank === 1 ? '🥇' :
                       entry.rank === 2 ? '🥈' :
                       entry.rank === 3 ? '🥉' :
                       `${entry.rank}.`}
                    </div>
                    <div>
                      <div className="font-medium">
                        {entry.worker_name}
                        {isCurrentUser && (
                          <span className="text-xs text-primary ml-2">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.placements_count} placements
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{entry.total_points}</div>
                    <div className="text-xs text-muted-foreground">points</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {currentUser && !leaders.find(l => l.worker_id === currentUser.worker_id) && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary">
              <div>
                <div className="font-medium">Your Stats</div>
                <div className="text-xs text-muted-foreground">
                  {currentUser.placements_count} placements
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">{currentUser.total_points}</div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
