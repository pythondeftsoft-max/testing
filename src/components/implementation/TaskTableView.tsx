import React from 'react';
import { TaskWithProgress } from '@/types/implementation';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Trash2, ChevronDown, ChevronRight, Edit, MoreVertical, ArrowUpDown, List } from 'lucide-react';
import { TaskProgressIndicator } from './TaskProgressIndicator';
import { SubtaskList } from './SubtaskList';
import { EditTaskDialog } from './EditTaskDialog';
import { SubtaskEditorDialog } from './SubtaskEditorDialog';
import { useUpdateImplementationTask, useDeleteImplementationTask } from '@/hooks/useImplementationTasks';
import { useToggleSubtask } from '@/hooks/useSubtaskManagement';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CompletionDialog } from './CompletionDialog';

interface TaskTableViewProps {
  tasks: TaskWithProgress[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (column: string) => void;
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

export const TaskTableView: React.FC<TaskTableViewProps> = ({ 
  tasks, 
  selectedIds, 
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort 
}) => {
  const updateTask = useUpdateImplementationTask();
  const deleteTask = useDeleteImplementationTask();
  const toggleSubtask = useToggleSubtask();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = React.useState<TaskWithProgress | null>(null);
  const [editingSubtasks, setEditingSubtasks] = React.useState<TaskWithProgress | null>(null);
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

  const toggleRow = (taskId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleStatus = (task: TaskWithProgress) => {
    const isCurrentlyDone = task.status === 'Done';
    
    // If marking as done, show completion dialog
    if (!isCurrentlyDone) {
      setCompletingTask(task);
      return;
    }
    
    // If unmarking from done, perform full reset
    const newStatus = task.previous_status || 'In Progress';
    const cleanedDescription = stripCompletionNotes(task.description);
    const updates: any = {
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
                  previous_status: task.previous_status,
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
      previous_status: completingTask.status,
      actual_time: actualTime,
    };

    // Store notes in description if provided (since we don't have a completion_notes field yet)
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
          action: {
            label: 'Undo',
            onClick: () => {
              updateTask.mutate({
                id: completingTask.id,
                updates: {
                  status: completingTask.status,
                  previous_status: completingTask.previous_status,
                  completed_at: completingTask.completed_at,
                  actual_time: completingTask.actual_time,
                  description: completingTask.description,
                },
              });
            },
          },
          duration: 5000,
        });
      },
    });

    setCompletingTask(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(tasks.map(t => t.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, taskId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== taskId));
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
      : <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  const handleToggleSubtask = (task: TaskWithProgress, subtaskId: string) => {
    toggleSubtask.mutate({
      taskId: task.id,
      subtasks: task.subtasks,
      subtaskId,
    });
  };

  const columns: ColumnDef<TaskWithProgress>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={selectedIds.length === tasks.length && tasks.length > 0}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(checked) => handleSelectTask(row.original.id, !!checked)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        const task = row.original;
        if (!task.subtasks || task.subtasks.length === 0) return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRow(task.id)}
            className="h-6 w-6 p-0"
          >
            {expandedRows.has(task.id) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const task = row.original;
        return (
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
        );
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => onSort('title')}
          className="h-8 px-2"
        >
          Title
          {getSortIcon('title')}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-md">
          <div className="font-medium">{row.original.title}</div>
          {row.original.description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                    {row.original.description}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <p>{row.original.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => onSort('priority')}
          className="h-8 px-2"
        >
          Priority
          {getSortIcon('priority')}
        </Button>
      ),
      cell: ({ row }) => (
        <Badge className={priorityColors[row.original.priority as keyof typeof priorityColors]}>
          {row.original.priority}
        </Badge>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    },
    {
      accessorKey: 'estimated_time',
      header: 'Est. Time',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.estimated_time || '-'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingTask(row.original)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {row.original.subtasks && row.original.subtasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingSubtasks(row.original)}
              className="h-8 w-8 p-0"
              title="Edit subtasks"
            >
              <List className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteTask.mutate(row.original.id)}
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const tableData = tasks.map((task) => {
    const isExpanded = expandedRows.has(task.id);
    return {
      ...task,
      _expanded: isExpanded,
    };
  });

  return (
    <>
      <div className="space-y-4">
        <DataTable columns={columns} data={tableData} />
        {tasks.map((task) => {
          if (!expandedRows.has(task.id) || !task.subtasks || task.subtasks.length === 0) {
            return null;
          }
          return (
            <div key={`expanded-${task.id}`} className="ml-12 pl-4 border-l-2 border-border">
              <SubtaskList
                subtasks={task.subtasks}
                onToggleSubtask={(subtaskId) => handleToggleSubtask(task, subtaskId)}
                completedCount={task.completedSubtasks}
              />
            </div>
          );
        })}
      </div>

      <EditTaskDialog
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
      />

      <SubtaskEditorDialog
        task={editingSubtasks}
        isOpen={!!editingSubtasks}
        onClose={() => setEditingSubtasks(null)}
      />

      <CompletionDialog
        task={completingTask}
        isOpen={!!completingTask}
        onClose={() => setCompletingTask(null)}
        onConfirm={handleTaskCompletion}
      />
    </>
  );
};
