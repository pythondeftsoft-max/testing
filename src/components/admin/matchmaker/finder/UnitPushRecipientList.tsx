import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, AlertCircle, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUnitPushRecipients, UnitPushRecipient } from '@/hooks/useUnitPushRecipients';

interface UnitPushRecipientListProps {
  unitId: string | null | undefined;
  /** Optional: open tenant profile or push timeline for a recipient */
  onSelectRecipient?: (recipient: UnitPushRecipient) => void;
}

const getStatusDisplay = (r: UnitPushRecipient) => {
  if (r.status === 'denied' || r.status === 'rejected') {
    return { icon: XCircle, label: 'declined', className: 'text-red-600' };
  }
  if (r.status === 'interested') {
    return { icon: CheckCircle2, label: 'interested', className: 'text-green-600' };
  }
  if (r.status === 'landlord_review' || r.status === 'primary_applicant') {
    return { icon: CheckCircle2, label: 'with landlord', className: 'text-blue-600' };
  }
  if (r.is_expired) {
    return { icon: AlertCircle, label: 'expired', className: 'text-muted-foreground' };
  }
  return { icon: Clock, label: 'awaiting', className: 'text-blue-600' };
};

export const UnitPushRecipientList: React.FC<UnitPushRecipientListProps> = ({
  unitId,
  onSelectRecipient,
}) => {
  const { data: recipients = [], isLoading } = useUnitPushRecipients(unitId);
  const [expanded, setExpanded] = useState(false);

  if (!unitId || isLoading) return null;

  if (recipients.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Send className="w-3.5 h-3.5" />
          Not pushed to anyone yet
        </CardContent>
      </Card>
    );
  }

  if (recipients.length === 1) {
    const r = recipients[0];
    const display = getStatusDisplay(r);
    const Icon = display.icon;
    const ago = formatDistanceToNow(new Date(r.pushed_at), { addSuffix: true });
    return (
      <Card>
        <CardContent className="p-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Send className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">Pushed to {r.tenant_name}</span>
            <span className="text-muted-foreground">{ago}</span>
            <span className={cn('inline-flex items-center gap-1', display.className)}>
              <Icon className="w-3 h-3" />
              {display.label}
            </span>
            {r.admin_name && (
              <span className="text-muted-foreground">· by {r.admin_name}</span>
            )}
          </div>
          {onSelectRecipient && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onSelectRecipient(r)}>
              View
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const visible = expanded ? recipients : recipients.slice(0, 3);

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between gap-2 text-xs font-medium"
        >
          <span className="flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-primary" />
            Pushed to {recipients.length} tenants
          </span>
          {recipients.length > 3 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              {expanded ? 'Show less' : `Show all ${recipients.length}`}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          )}
        </button>
        <ul className="space-y-1.5">
          {visible.map((r) => {
            const display = getStatusDisplay(r);
            const Icon = display.icon;
            const ago = formatDistanceToNow(new Date(r.pushed_at), { addSuffix: true });
            return (
              <li
                key={r.push_id}
                className={cn(
                  'flex items-center gap-2 text-xs py-1 px-1.5 rounded',
                  onSelectRecipient && 'hover:bg-accent cursor-pointer'
                )}
                onClick={() => onSelectRecipient?.(r)}
              >
                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{r.tenant_name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{ago}</span>
                <span className={cn('inline-flex items-center gap-1 ml-auto', display.className)}>
                  <Icon className="w-3 h-3" />
                  {display.label}
                </span>
                {r.admin_name && (
                  <span className="text-muted-foreground hidden sm:inline">({r.admin_name})</span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};
