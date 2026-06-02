import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { SuggestionCard, SuggestedTask } from "./SuggestionCard";

interface SuggestedTasksPanelProps {
  suggestions: SuggestedTask[];
  onStartTask: (id: string) => void;
  onAddTask: (task: Omit<SuggestedTask, 'id' | 'isExisting' | 'isReady'>) => void;
  onDismiss: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function SuggestedTasksPanel({
  suggestions,
  onStartTask,
  onAddTask,
  onDismiss,
  onGenerate,
  isGenerating,
}: SuggestedTasksPanelProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI Suggested Next Steps</h3>
              <p className="text-xs text-muted-foreground">
                Based on your current progress and priorities
              </p>
            </div>
          </div>

          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                What's Next?
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <SuggestionCard
              key={suggestion.id || `${suggestion.title}-${index}`}
              suggestion={suggestion}
              onStartTask={onStartTask}
              onAddTask={onAddTask}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
