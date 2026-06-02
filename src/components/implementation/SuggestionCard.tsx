import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, ArrowRight, X } from "lucide-react";

export interface SuggestedTask {
  id?: string;
  title: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  estimated_time?: string;
  isExisting: boolean;
  dependencies?: string[];
  isReady?: boolean;
}

interface SuggestionCardProps {
  suggestion: SuggestedTask;
  onStartTask?: (id: string) => void;
  onAddTask?: (task: Omit<SuggestedTask, 'id' | 'isExisting' | 'isReady'>) => void;
  onDismiss: (id: string) => void;
}

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  high: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export function SuggestionCard({ suggestion, onStartTask, onAddTask, onDismiss }: SuggestionCardProps) {
  const handlePrimaryAction = () => {
    if (suggestion.isExisting && suggestion.id && onStartTask) {
      onStartTask(suggestion.id);
    } else if (!suggestion.isExisting && onAddTask) {
      onAddTask({
        title: suggestion.title,
        reasoning: suggestion.reasoning,
        priority: suggestion.priority,
        category: suggestion.category,
        estimated_time: suggestion.estimated_time,
        dependencies: suggestion.dependencies,
      });
    }
  };

  const handleDismiss = () => {
    onDismiss(suggestion.id || suggestion.title);
  };

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/5 hover:border-primary/40 transition-all">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-xs">
                {suggestion.isExisting ? 'In Backlog' : 'New Idea'}
              </Badge>
              <Badge className={priorityColors[suggestion.priority]}>
                {suggestion.priority}
              </Badge>
              {suggestion.isExisting && !suggestion.isReady && (
                <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Has Dependencies
                </Badge>
              )}
              {suggestion.isExisting && suggestion.isReady && (
                <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">
                  ✅ Ready to Start
                </Badge>
              )}
            </div>
            <h4 className="font-semibold text-sm mb-2 line-clamp-2">{suggestion.title}</h4>
            <p className="text-xs text-muted-foreground italic line-clamp-3 mb-3">
              {suggestion.reasoning}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium">{suggestion.category}</span>
            {suggestion.estimated_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{suggestion.estimated_time}</span>
              </div>
            )}
          </div>

          <Button
            size="sm"
            onClick={handlePrimaryAction}
            className="gap-1"
          >
            {suggestion.isExisting ? 'Start This' : 'Add to Backlog'}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
