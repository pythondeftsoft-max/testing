import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, TrendingUp, TrendingDown, Target, Percent, 
  ArrowUpRight, ArrowDownRight, Eye, Calendar, Filter
} from 'lucide-react';
import { useWorkerPerformance, useWorkerPerformanceKPIs, WorkerPerformanceFilters } from '@/hooks/useWorkerPerformance';
import { WorkerPerformanceFiltersComponent } from './WorkerPerformanceFilters';
import { WorkerDetailDrawer } from './WorkerDetailDrawer';
import { WorkerPerformanceKPICard } from './WorkerPerformanceKPICard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

export const WorkerPerformancePage: React.FC = () => {
  const [filters, setFilters] = useState<WorkerPerformanceFilters>({
    dateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    },
    entityType: 'all',
  });

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'points' | 'conversion' | 'activity'>('points');

  const { data: workers, isLoading } = useWorkerPerformance(filters);
  const { data: kpis } = useWorkerPerformanceKPIs(filters);

  const sortedWorkers = React.useMemo(() => {
    if (!workers) return [];
    
    return [...workers].sort((a, b) => {
      switch (sortColumn) {
        case 'points':
          return b.total_points - a.total_points;
        case 'conversion':
          return b.conversion_rate - a.conversion_rate;
        case 'activity':
          return new Date(b.last_activity_date || 0).getTime() - new Date(a.last_activity_date || 0).getTime();
        default:
          return 0;
      }
    });
  }, [workers, sortColumn]);

  const topPerformers = sortedWorkers.slice(0, 5);
  const needsAttention = sortedWorkers.filter(w => w.total_points === 0 || !w.last_activity_date);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <WorkerPerformanceFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <WorkerPerformanceKPICard
          title="Total Points"
          value={kpis?.totalPoints || 0}
          icon={<Trophy className="w-5 h-5 text-yellow-500" />}
          subtitle="Based on worker-triggered stage changes"
        />
        <WorkerPerformanceKPICard
          title="Lease Signed Moves"
          value={kpis?.leaseSignedMoves || 0}
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          subtitle="Assigned → Lease Signed"
        />
        <WorkerPerformanceKPICard
          title="Paid / Housed Moves"
          value={kpis?.paidHousedMoves || 0}
          icon={<Target className="w-5 h-5 text-green-500" />}
          subtitle="Deals fully closed"
        />
        <WorkerPerformanceKPICard
          title="Backwards Moves"
          value={kpis?.backwardsMoves || 0}
          icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          subtitle="Pipeline reversals"
        />
        <WorkerPerformanceKPICard
          title="Conversion Rate"
          value={`${kpis?.conversionRate || 0}%`}
          icon={<Percent className="w-5 h-5 text-purple-500" />}
          subtitle="Signed → Housed"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Button
          variant={sortColumn === 'points' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortColumn('points')}
        >
          Points
        </Button>
        <Button
          variant={sortColumn === 'conversion' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortColumn('conversion')}
        >
          Conversion Rate
        </Button>
        <Button
          variant={sortColumn === 'activity' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortColumn('activity')}
        >
          Last Activity
        </Button>
      </div>

      {/* Workers Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workers Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sortedWorkers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No worker activity in selected date range
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Worker Name</TableHead>
                  <TableHead className="text-right">Total Points</TableHead>
                  <TableHead className="text-right">Lease Signed</TableHead>
                  <TableHead className="text-right">Paid/Housed</TableHead>
                  <TableHead className="text-right">Backwards</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedWorkers.map((worker, index) => {
                  const isTopPerformer = index < 3;
                  const isInactive = worker.total_points === 0;

                  return (
                    <TableRow
                      key={worker.worker_id}
                      className={`
                        ${isTopPerformer ? 'bg-green-50 dark:bg-green-950/20' : ''}
                        ${isInactive ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' : ''}
                        cursor-pointer hover:bg-accent
                      `}
                      onClick={() => setSelectedWorkerId(worker.worker_id)}
                    >
                      <TableCell className="font-medium">
                        {index + 1}
                        {isTopPerformer && <Trophy className="w-4 h-4 inline ml-1 text-yellow-500" />}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{worker.worker_name}</div>
                          {worker.territory_name && (
                            <div className="text-xs text-muted-foreground">{worker.territory_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {worker.total_points}
                      </TableCell>
                      <TableCell className="text-right">
                        {worker.lease_signed_moves}
                      </TableCell>
                      <TableCell className="text-right">
                        {worker.paid_housed_moves}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={worker.backwards_moves > 0 ? 'destructive' : 'secondary'}>
                          {worker.backwards_moves}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {worker.conversion_rate}%
                          {worker.conversion_rate > 50 ? (
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {worker.last_activity_date
                          ? format(new Date(worker.last_activity_date), 'MMM d, yyyy')
                          : 'No activity'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkerId(worker.worker_id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Slackers vs Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPerformers.map((worker, index) => (
                <div
                  key={worker.worker_id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedWorkerId(worker.worker_id)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{worker.worker_name}</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {worker.total_points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsAttention.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All workers are active!
                </p>
              ) : (
                needsAttention.slice(0, 5).map((worker) => (
                  <div
                    key={worker.worker_id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedWorkerId(worker.worker_id)}
                  >
                    <span className="font-medium">{worker.worker_name}</span>
                    <Badge variant="destructive">0 pts</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Detail Drawer */}
      {selectedWorkerId && (
        <WorkerDetailDrawer
          workerId={selectedWorkerId}
          dateRange={filters.dateRange}
          onClose={() => setSelectedWorkerId(null)}
        />
      )}
    </div>
  );
};
