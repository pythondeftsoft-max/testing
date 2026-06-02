import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowRight, AlertTriangle, User, Home, Shield, Bot } from 'lucide-react';
import type { ActivityFeedItem } from '@/hooks/useActivityTrackerData';

interface ActivityFeedTableProps {
  activities: ActivityFeedItem[];
  isLoading?: boolean;
  onWorkerClick?: (workerId: string) => void;
}

export const ActivityFeedTable: React.FC<ActivityFeedTableProps> = ({
  activities,
  isLoading,
  onWorkerClick,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Worker Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="h-12 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Worker Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No activity found</p>
            <p className="text-sm">Try adjusting your filters to see more results</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Activity Feed ({activities.length} events)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Stage Transition</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Territory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {format(new Date(activity.created_at), 'MMM dd, yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), 'h:mm a')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal"
                      onClick={() => onWorkerClick?.(activity.changed_by_id)}
                    >
                      {activity.worker_name || 'System'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {activity.changed_by_type === 'system' || !activity.metadata?.actor_role ? (
                      <Badge variant="secondary" className="gap-1 bg-muted">
                        <Bot className="w-3 h-3" />
                        System
                      </Badge>
                    ) : (
                      <Badge 
                        variant="outline" 
                        className={`gap-1 ${
                          activity.metadata.actor_role === 'super_admin' 
                            ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                            : activity.metadata.actor_role === 'operations_admin'
                            ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                            : activity.metadata.actor_role === 'matchmaker'
                            ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                            : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {activity.metadata.actor_role
                          .split('_')
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {activity.entity_type === 'tenant' ? (
                        <User className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Home className="w-4 h-4 text-green-500" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium capitalize">{activity.entity_type}</span>
                        <span className="text-xs text-muted-foreground">{activity.entity_name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {activity.from_stage || 'Start'}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline" className="capitalize">
                        {activity.to_stage}
                      </Badge>
                      {!activity.is_forward_move && (
                        <AlertTriangle className="w-4 h-4 text-red-500 ml-1" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={activity.points_earned >= 0 ? 'default' : 'destructive'}
                      className={
                        activity.points_earned >= 0
                          ? 'bg-green-500 hover:bg-green-600'
                          : ''
                      }
                    >
                      {activity.points_earned >= 0 ? '+' : ''}
                      {activity.points_earned.toFixed(1)} pts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {activity.territory_name || 'N/A'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
