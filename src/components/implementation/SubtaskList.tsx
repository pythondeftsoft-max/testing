import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Subtask } from '@/types/implementation';
import { cn } from '@/lib/utils';

interface SubtaskListProps {
  subtasks: Subtask[];
  onToggleSubtask: (subtaskId: string) => void;
  completedCount: number;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ 
  subtasks, 
  onToggleSubtask,
  completedCount 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!subtasks || subtasks.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span>
          Subtasks: {completedCount}/{subtasks.length} completed
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2 pl-6">
        {subtasks
          .sort((a, b) => a.order - b.order)
          .map((subtask) => (
            <div key={subtask.id} className="flex items-start gap-2">
              <Checkbox
                id={subtask.id}
                checked={subtask.completed}
                onCheckedChange={() => onToggleSubtask(subtask.id)}
                className="mt-0.5"
              />
              <label
                htmlFor={subtask.id}
                className={cn(
                  "text-sm cursor-pointer",
                  subtask.completed && "line-through text-muted-foreground"
                )}
              >
                {subtask.title}
              </label>
            </div>
          ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
