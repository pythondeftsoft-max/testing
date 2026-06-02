import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Trash2, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBulkUpdateTasks, useBulkDeleteTasks, useGenerateSubtasks } from '@/hooks/useImplementationTasks';
import { toast } from 'sonner';

interface BulkActionsToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedIds,
  onClearSelection,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();
  const generateSubtasks = useGenerateSubtasks();

  const handleStatusChange = (status: string) => {
    bulkUpdate.mutate(
      {
        ids: selectedIds,
        updates: { status },
      },
      {
        onSuccess: () => {
          toast.success(`Updated ${selectedIds.length} tasks to ${status}`);
          onClearSelection();
        },
        onError: () => {
          toast.error('Failed to update tasks');
        },
      }
    );
  };

  const handlePriorityChange = (priority: string) => {
    bulkUpdate.mutate(
      {
        ids: selectedIds,
        updates: { priority },
      },
      {
        onSuccess: () => {
          toast.success(`Updated ${selectedIds.length} tasks to ${priority} priority`);
          onClearSelection();
        },
        onError: () => {
          toast.error('Failed to update tasks');
        },
      }
    );
  };

  const handleDelete = () => {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        toast.success(`Deleted ${selectedIds.length} tasks`);
        onClearSelection();
        setShowDeleteDialog(false);
      },
      onError: () => {
        toast.error('Failed to delete tasks');
      },
    });
  };

  const handleGenerateSubtasks = () => {
    toast.info('Generating subtasks with AI...');
    generateSubtasks.mutate(selectedIds);
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedIds.length} task{selectedIds.length > 1 ? 's' : ''} selected
          </span>

          <div className="h-4 w-px bg-border" />

          <Select onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Backlog">Backlog</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Change priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateSubtasks}
            disabled={generateSubtasks.isPending}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {generateSubtasks.isPending ? 'Generating...' : 'Generate Subtasks'}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected
              tasks and all their subtasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
