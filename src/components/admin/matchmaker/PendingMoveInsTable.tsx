import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Clock, ListChecks, Plus } from 'lucide-react';
import { usePendingMoveIns } from '@/hooks/usePendingMoveIns';

interface Props {
  agencyId: string;
}

export const PendingMoveInsTable: React.FC<Props> = ({ agencyId }) => {
  const { moveIns, loading, initializeTasks, toggleTask, DEFAULT_TASKS } = usePendingMoveIns(agencyId);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pending Move-Ins ({moveIns.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {moveIns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No pending move-ins. Active leases with completed checklists won't appear here.
          </p>
        ) : (
          <div className="space-y-4">
            {moveIns.map(mi => {
              const completedCount = mi.tasks.filter(t => t.is_completed).length;
              const totalCount = mi.tasks.length || DEFAULT_TASKS.length;
              const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

              return (
                <div key={mi.lease_id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{mi.tenant_name}</p>
                      <p className="text-xs text-muted-foreground">{mi.property_address}</p>
                      {mi.move_in_date && (
                        <p className="text-xs text-muted-foreground">
                          Move-in: {new Date(mi.move_in_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={progress === 100 ? 'success' : progress > 0 ? 'warning' : 'secondary'}>
                      {completedCount}/{totalCount} complete
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {mi.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {mi.tasks.map(task => (
                        <label
                          key={task.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={task.is_completed}
                            onCheckedChange={(checked) => toggleTask(task.id, !!checked)}
                          />
                          <span className={`text-sm ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.label}
                          </span>
                          {task.completed_at && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {new Date(task.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => initializeTasks(mi.lease_id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Initialize Checklist
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
