import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Clock, CheckCircle2, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PushHistoryEntry } from '@/hooks/usePropertyPushHistory';

interface PushHistoryPillProps {
  push: PushHistoryEntry | null | undefined;
  onClick?: () => void;
  onRepush?: () => void;
  compact?: boolean;
}

const getPushDisplay = (push: PushHistoryEntry) => {
  const ago = formatDistanceToNow(new Date(push.pushed_at), { addSuffix: true });
  const status = push.status;

  if (status === 'denied' || status === 'rejected') {
    return {
      icon: XCircle,
      label: `Declined · ${ago}`,
      className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      canRepush: true,
    };
  }
  if (status === 'interested') {
    return {
      icon: CheckCircle2,
      label: `Tenant interested · ${ago}`,
      className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      canRepush: false,
    };
  }
  if (status === 'landlord_review' || status === 'primary_applicant') {
    return {
      icon: CheckCircle2,
      label: `With landlord · ${ago}`,
      className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      canRepush: false,
    };
  }
  if (push.is_expired) {
    return {
      icon: AlertCircle,
      label: `Expired · no response`,
      className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
      canRepush: true,
    };
  }
  // pending / push_sent
  const hoursSince = (Date.now() - new Date(push.pushed_at).getTime()) / (1000 * 60 * 60);
  const isStale = hoursSince > 48;
  return {
    icon: Clock,
    label: `Pushed ${ago} · awaiting`,
    className: isStale
      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    canRepush: false,
  };
};

export const PushHistoryPill: React.FC<PushHistoryPillProps> = ({
  push,
  onClick,
  onRepush,
  compact = false,
}) => {
  if (!push) {
    return (
      <Badge
        variant="outline"
        className="text-xs gap-1 cursor-default text-muted-foreground border-dashed"
      >
        <Send className="w-3 h-3" />
        Not pushed
      </Badge>
    );
  }

  const display = getPushDisplay(push);
  const Icon = display.icon;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer',
          display.className
        )}
      >
        <Icon className="w-3 h-3" />
        {display.label}
      </button>
      {display.canRepush && onRepush && !compact && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onRepush();
          }}
        >
          <RotateCcw className="w-3 h-3" />
          Re-push
        </Button>
      )}
    </div>
  );
};
