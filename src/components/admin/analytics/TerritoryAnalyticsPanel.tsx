import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Users, Target } from 'lucide-react';
import type { TerritoryWorkerPerformance, TerritoryTotals } from '@/hooks/useTerritoryAnalytics';

interface TerritoryAnalyticsPanelProps {
  workers: TerritoryWorkerPerformance[];
  totals: TerritoryTotals;
  isLoading?: boolean;
}

export const TerritoryAnalyticsPanel: React.FC<TerritoryAnalyticsPanelProps> = ({
  workers,
  totals,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Territory Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Territory: {totals.territory_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Territory Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              Workers
            </div>
            <p className="text-2xl font-bold">{totals.total_workers}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" />
              Total Points
            </div>
            <p className="text-2xl font-bold">{totals.total_points.toFixed(1)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Target className="w-4 h-4" />
              Lease Signed
            </div>
            <p className="text-2xl font-bold">{totals.total_lease_signed}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Trophy className="w-4 h-4" />
              Paid/Housed
            </div>
            <p className="text-2xl font-bold">{totals.total_paid_housed}</p>
          </div>
        </div>

        {/* Worker Leaderboard */}
        <div>
          <h3 className="font-semibold mb-3">Worker Performance in {totals.territory_name}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Worker Name</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Lease Signed</TableHead>
                  <TableHead className="text-right">Paid/Housed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.worker_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {worker.leaderboard_rank === 1 && (
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        )}
                        {worker.leaderboard_rank === 2 && (
                          <Trophy className="w-4 h-4 text-gray-400" />
                        )}
                        {worker.leaderboard_rank === 3 && (
                          <Trophy className="w-4 h-4 text-orange-600" />
                        )}
                        <span className="font-medium">#{worker.leaderboard_rank}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{worker.worker_name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-mono">
                        {worker.total_points.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{worker.lease_signed_moves}</TableCell>
                    <TableCell className="text-right">{worker.paid_housed_moves}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
