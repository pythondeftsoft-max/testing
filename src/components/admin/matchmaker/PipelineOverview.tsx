import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Zap, DollarSign, Trophy, ArrowRight, Sparkles, Clock, Search, CheckCircle, Home } from 'lucide-react';
import { useMatchmakerPipeline } from '@/hooks/useMatchmakerPipeline';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PipelineOverviewProps {
  onStageClick?: (status: string) => void;
}

export const PipelineOverview = ({ onStageClick }: PipelineOverviewProps) => {
  const { data, isLoading } = useMatchmakerPipeline();
  const queryClient = useQueryClient();

  // Setup real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('matchmaker-activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_applications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['matchmaker-pipeline'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const stats = data?.stats;
  const activity = data?.activity || [];

  const STAGE_DEFINITIONS = [
    {
      name: 'New',
      status: 'pending',
      icon: Sparkles,
      color: 'text-blue-600',
      description: 'Fresh applications submitted by tenants, not yet reviewed or assigned',
      count: stats?.new || 0
    },
    {
      name: 'Pending',
      status: 'pending',
      icon: Clock,
      color: 'text-yellow-600',
      description: 'Applications assigned to a worker, waiting for initial screening',
      count: stats?.pending || 0
    },
    {
      name: 'Reviewing',
      status: 'under_review',
      icon: Search,
      color: 'text-blue-600',
      description: 'Active review in progress - background checks and verification',
      count: stats?.under_review || 0
    },
    {
      name: 'Accepted',
      status: 'approved',
      icon: CheckCircle,
      color: 'text-green-600',
      description: 'Application approved, waiting for lease signing and move-in',
      count: stats?.approved || 0
    },
    {
      name: 'Housed',
      status: 'housed',
      icon: Home,
      color: 'text-purple-600',
      description: 'Tenant successfully moved in - application complete!',
      count: stats?.total_housed || 0
    }
  ];

  return (
    <div className="space-y-6">
      {/* Funnel Stats - Clickable */}
      <TooltipProvider>
        <div className="flex items-center justify-between gap-4 p-6 bg-muted/30 rounded-lg">
          {STAGE_DEFINITIONS.map((stage, index) => (
            <React.Fragment key={stage.name}>
              {index > 0 && <ArrowRight className="w-5 h-5 text-muted-foreground" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onStageClick?.(stage.status)}
                    className="text-center hover:scale-105 transition-transform cursor-pointer hover:bg-muted/50 rounded-lg p-2"
                  >
                    <div className="text-sm text-muted-foreground">{stage.name}</div>
                    <div className={`text-2xl font-bold ${stage.color}`}>{stage.count}</div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold">{stage.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                    <p className="text-xs text-primary mt-2">Click to view applications</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </React.Fragment>
          ))}
        </div>
      </TooltipProvider>

      {/* Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Stage Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STAGE_DEFINITIONS.map((stage) => {
              const Icon = stage.icon;
              return (
                <div key={stage.name} className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${stage.color}`} />
                  <div>
                    <h4 className="font-semibold text-sm">{stage.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Matches</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.new || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available to match
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Follow-ups</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.urgent_followups || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.pending_payouts?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              To be disbursed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.this_month_placements || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tenants housed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            ) : (
              activity.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    item.type === 'approval' ? 'bg-green-500' :
                    item.type === 'request' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
