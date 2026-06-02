import React from 'react';
import { TaskWithProgress, Subtask } from '@/types/implementation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, GripVertical, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useUpdateImplementationTask } from '@/hooks/useImplementationTasks';
import { toast } from 'sonner';

interface SubtaskEditorDialogProps {
  task: TaskWithProgress | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SubtaskEditorDialog: React.FC<SubtaskEditorDialogProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const [subtasks, setSubtasks] = React.useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');
  const updateTask = useUpdateImplementationTask();

  React.useEffect(() => {
    if (task?.subtasks) {
      setSubtasks([...task.subtasks]);
    }
  }, [task]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle,
      completed: false,
      order: subtasks.length + 1,
    };

    setSubtasks([...subtasks, newSubtask]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setSubtasks(
      subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      )
    );
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== subtaskId));
  };

  const handleUpdateSubtask = (subtaskId: string, title: string) => {
    setSubtasks(
      subtasks.map((st) => (st.id === subtaskId ? { ...st, title } : st))
    );
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(subtasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reordered = items.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setSubtasks(reordered);
  };

  const handleSave = () => {
    if (!task) return;

    updateTask.mutate(
      {
        id: task.id,
        updates: { subtasks: subtasks as any },
      },
      {
        onSuccess: () => {
          toast.success('Subtasks updated successfully');
          onClose();
        },
        onError: () => {
          toast.error('Failed to update subtasks');
        },
      }
    );
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Subtasks - {task.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add new subtask..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddSubtask();
                }
              }}
            />
            <Button onClick={handleAddSubtask} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="subtasks">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {subtasks.map((subtask, index) => (
                    <Draggable
                      key={subtask.id}
                      draggableId={subtask.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                        >
                          <div {...provided.dragHandleProps}>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Checkbox
                            checked={subtask.completed}
                            onCheckedChange={() => handleToggleSubtask(subtask.id)}
                          />
                          <Input
                            value={subtask.title}
                            onChange={(e) =>
                              handleUpdateSubtask(subtask.id, e.target.value)
                            }
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {subtasks.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No subtasks yet. Add one above to get started.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTask.isPending}>
            {updateTask.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
