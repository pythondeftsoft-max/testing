import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { useUpdateImplementationTask, useDeleteImplementationTask } from '@/hooks/useImplementationTasks';
import { useToggleSubtask } from '@/hooks/useSubtaskManagement';
import { TaskWithProgress, Subtask } from '@/types/implementation';
import { TaskProgressIndicator } from './TaskProgressIndicator';
import { SubtaskList } from './SubtaskList';
import { CompletionDialog } from './CompletionDialog';
import { toast } from 'sonner';

interface TaskListProps {
  tasks: TaskWithProgress[];
}

const priorityColors = {
  Low: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  High: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  Critical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

const statusColors = {
  Backlog: 'bg-muted text-muted-foreground',
  'In Progress': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  Done: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  Blocked: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

const sourceIcons = {
  'AI Suggested': '🤖',
  'CSV Import': '📥',
  Manual: '✍️',
};

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  const updateTask = useUpdateImplementationTask();
  const deleteTask = useDeleteImplementationTask();
  const toggleSubtask = useToggleSubtask();
  const [completingTask, setCompletingTask] = React.useState<TaskWithProgress | null>(null);

  const stripCompletionNotes = (description: string | null): string | null => {
    if (!description) return description;
    
    // Remove everything from "**Completion Notes:**" onwards
    const noteMarker = '\n\n**Completion Notes:**';
    const index = description.indexOf(noteMarker);
    
    if (index !== -1) {
      return description.substring(0, index);
    }
    
    return description;
  };

  const toggleStatus = (task: TaskWithProgress) => {
    const isCurrentlyDone = task.status === 'Done';
    
    // If marking as done, show completion dialog
    if (!isCurrentlyDone) {
      setCompletingTask(task);
      return;
    }
    
    // If unmarking from done, perform full reset
    const newStatus = 'Backlog';
    const cleanedDescription = stripCompletionNotes(task.description);
    const updates = {
      status: newStatus,
      completed_at: null,
      actual_time: null,
      description: cleanedDescription,
    };
    
    updateTask.mutate({ id: task.id, updates }, {
      onSuccess: () => {
        toast.success(`Task reverted to ${newStatus}`, {
          action: {
            label: 'Undo',
            onClick: () => {
              updateTask.mutate({
                id: task.id,
                updates: {
                  status: task.status,
                  completed_at: task.completed_at,
                  actual_time: task.actual_time,
                  description: task.description,
                },
              });
            },
          },
          duration: 5000,
        });
      },
    });
  };

  const handleTaskCompletion = (actualTime: string, notes?: string) => {
    if (!completingTask) return;

    const updates: any = {
      status: 'Done',
      completed_at: new Date().toISOString(),
      actual_time: actualTime,
    };

    // Store notes in description if provided
    if (notes) {
      const existingDesc = completingTask.description || '';
      updates.description = existingDesc 
        ? `${existingDesc}\n\n**Completion Notes:** ${notes}`
        : `**Completion Notes:** ${notes}`;
    }

    updateTask.mutate({ id: completingTask.id, updates }, {
      onSuccess: () => {
        toast.success('Task marked as done', {
          description: `Completed in ${actualTime}`,
        });
      },
    });

    setCompletingTask(null);
  };

  const handleToggleSubtask = (task: TaskWithProgress, subtaskId: string) => {
    toggleSubtask.mutate({
      taskId: task.id,
      subtasks: task.subtasks,
      subtaskId,
    });
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    const status = task.status || 'Backlog';
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<string, TaskWithProgress[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTasks).map(([status, statusTasks]) => (
        <div key={status}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {status}
            <Badge variant="secondary">{statusTasks.length}</Badge>
          </h3>
          <div className="grid gap-3">
            {statusTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(task)}
                          className="h-6 w-6 p-0"
                        >
                          {task.status === 'Done' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </Button>
                        <CardTitle className="text-base">{task.title}</CardTitle>
                      </div>
                      {task.totalSubtasks > 0 && (
                        <TaskProgressIndicator
                          completedCount={task.completedSubtasks}
                          totalCount={task.totalSubtasks}
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline">{task.category}</Badge>
                        {task.estimated_time && (
                          <Badge variant="secondary">⏱️ {task.estimated_time}</Badge>
                        )}
                        <Badge variant="outline">
                          {sourceIcons[task.source as keyof typeof sourceIcons]} {task.source}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTask.mutate(task.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {(task.description || task.ai_reasoning || (task.subtasks && task.subtasks.length > 0)) && (
                  <CardContent>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <SubtaskList
                        subtasks={task.subtasks}
                        onToggleSubtask={(subtaskId) => handleToggleSubtask(task, subtaskId)}
                        completedCount={task.completedSubtasks}
                      />
                    )}
                    {task.ai_reasoning && (
                      <div className="mt-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs">
                        <strong>AI Reasoning:</strong> {task.ai_reasoning}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}

      <CompletionDialog
        task={completingTask}
        isOpen={!!completingTask}
        onClose={() => setCompletingTask(null)}
        onConfirm={handleTaskCompletion}
      />
    </div>
  );
};
