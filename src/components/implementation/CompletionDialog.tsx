import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TaskWithProgress } from '@/types/implementation';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface CompletionDialogProps {
  task: TaskWithProgress | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (actualTime: string, notes?: string) => void;
}

export const CompletionDialog: React.FC<CompletionDialogProps> = ({
  task,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [actualTime, setActualTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setActualTime('');
    setNotes('');
    setError('');
    onClose();
  };

  const parseTimeToMinutes = (timeString: string): number | null => {
    // Support formats like: "2h", "30m", "2h 30m", "150m", "2.5h"
    const hourMinuteRegex = /(?:(\d+(?:\.\d+)?)\s*h(?:our)?s?)?\s*(?:(\d+)\s*m(?:in)?(?:ute)?s?)?/i;
    const match = timeString.trim().match(hourMinuteRegex);
    
    if (!match || (!match[1] && !match[2])) {
      return null;
    }

    const hours = match[1] ? parseFloat(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    
    return Math.round(hours * 60 + minutes);
  };

  const handleConfirm = () => {
    if (!actualTime.trim()) {
      setError('Please enter the time spent on this task');
      return;
    }

    const minutes = parseTimeToMinutes(actualTime);
    if (minutes === null || minutes <= 0) {
      setError('Please enter a valid time (e.g., "2h", "30m", or "1h 30m")');
      return;
    }

    // Convert to format like "2h" or "2h 30m"
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let formattedTime = '';
    if (hours > 0) formattedTime += `${hours}h`;
    if (mins > 0) formattedTime += `${formattedTime ? ' ' : ''}${mins}m`;

    onConfirm(formattedTime, notes.trim() || undefined);
    handleClose();
  };

  const getTimeComparison = () => {
    if (!task?.estimated_time || !actualTime) return null;

    const estimatedMinutes = parseTimeToMinutes(task.estimated_time);
    const actualMinutes = parseTimeToMinutes(actualTime);

    if (estimatedMinutes === null || actualMinutes === null) return null;

    const difference = actualMinutes - estimatedMinutes;
    const percentDiff = Math.abs(Math.round((difference / estimatedMinutes) * 100));

    if (difference === 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Exactly as estimated!</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 text-sm ${
        difference < 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
      }`}>
        {difference < 0 ? (
          <TrendingDown className="h-4 w-4" />
        ) : (
          <TrendingUp className="h-4 w-4" />
        )}
        <span>
          {Math.abs(difference)}m {difference < 0 ? 'under' : 'over'} estimate ({percentDiff}%)
        </span>
      </div>
    );
  };

  const getQuickTimeButtons = () => {
    if (!task?.estimated_time) return null;

    const estimatedMinutes = parseTimeToMinutes(task.estimated_time);
    if (estimatedMinutes === null) return null;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setActualTime(task.estimated_time!)}
        >
          As estimated
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setActualTime('30m')}
        >
          30 min
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setActualTime('1h')}
        >
          1 hour
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setActualTime('2h')}
        >
          2 hours
        </Button>
      </div>
    );
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
          <DialogDescription>
            {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {task.estimated_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated time: {task.estimated_time}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="actual-time">
              Actual time spent <span className="text-destructive">*</span>
            </Label>
            <Input
              id="actual-time"
              placeholder="e.g., 2h, 30m, or 1h 30m"
              value={actualTime}
              onChange={(e) => {
                setActualTime(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {getTimeComparison()}
          </div>

          {getQuickTimeButtons()}

          <div className="space-y-2">
            <Label htmlFor="completion-notes">
              Completion notes <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="completion-notes"
              placeholder="Any notes about completing this task..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
