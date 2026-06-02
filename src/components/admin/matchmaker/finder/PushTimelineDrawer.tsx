import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, Mail, CheckCircle2, XCircle, FileSignature, AlertCircle, Clock, RotateCcw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { usePropertyPushHistory } from '@/hooks/usePropertyPushHistory';
import { Skeleton } from '@/components/ui/skeleton';

interface PushTimelineDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantUserId: string | undefined;
  unitId?: string | null;
  propertyId?: string | null;
  tenantName?: string;
  propertyAddress?: string;
  onRepush?: () => void;
}

interface TimelineRow {
  at: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  className?: string;
}

const buildTimeline = (push: any): TimelineRow[] => {
  const rows: TimelineRow[] = [];
  rows.push({
    at: push.pushed_at,
    icon: Send,
    label: `Pushed${push.events.admin_name ? ` by ${push.events.admin_name}` : ''}`,
    className: 'text-blue-600',
  });
  if (push.events.email_sent && push.events.email_sent_at) {
    rows.push({
      at: push.events.email_sent_at,
      icon: Mail,
      label: 'Email delivered to tenant',
      className: 'text-blue-600',
    });
  }
  if (push.status === 'interested') {
    rows.push({
      at: push.events.pushed_at,
      icon: CheckCircle2,
      label: 'Tenant marked interested',
      className: 'text-green-600',
    });
  }
  if (push.status === 'landlord_review' || push.status === 'primary_applicant') {
    rows.push({
      at: push.events.pushed_at,
      icon: CheckCircle2,
      label: 'Sent to landlord for review',
      className: 'text-blue-600',
    });
  }
  if (push.events.landlord_signed_at) {
    rows.push({
      at: push.events.landlord_signed_at,
      icon: FileSignature,
      label: 'Landlord signed',
      className: 'text-green-600',
    });
  }
  if (push.events.tenant_signed_at) {
    rows.push({
      at: push.events.tenant_signed_at,
      icon: FileSignature,
      label: 'Tenant signed',
      className: 'text-green-600',
    });
  }
  if (push.status === 'denied' || push.status === 'rejected') {
    rows.push({
      at: push.events.pushed_at,
      icon: XCircle,
      label: 'Declined',
      className: 'text-red-600',
    });
  }
  if (push.is_expired && push.status !== 'denied' && push.status !== 'interested') {
    rows.push({
      at: push.expires_at,
      icon: AlertCircle,
      label: 'Push expired (no response)',
      className: 'text-amber-600',
    });
  }
  return rows.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};

export const PushTimelineDrawer: React.FC<PushTimelineDrawerProps> = ({
  open,
  onOpenChange,
  tenantUserId,
  unitId,
  propertyId,
  tenantName,
  propertyAddress,
  onRepush,
}) => {
  const { data: pushes = [], isLoading } = usePropertyPushHistory(tenantUserId, unitId, propertyId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Push History
          </SheetTitle>
          <SheetDescription>
            {tenantName && <span className="font-medium">{tenantName}</span>}
            {tenantName && propertyAddress && ' → '}
            {propertyAddress}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {!isLoading && pushes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No push history for this match yet</p>
            </div>
          )}

          {pushes.map((push, idx) => {
            const timeline = buildTimeline(push);
            const isLatest = idx === 0;
            const canRepush = ['denied', 'rejected'].includes(push.status) || push.is_expired;

            return (
              <div key={push.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isLatest ? 'default' : 'outline'} className="text-xs">
                      {isLatest ? 'Latest' : `Push #${pushes.length - idx}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(push.pushed_at), { addSuffix: true })}
                    </span>
                  </div>
                  {push.expires_at && !push.is_expired && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {formatDistanceToNow(new Date(push.expires_at), { addSuffix: true })}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 pl-1">
                  {timeline.map((row, i) => {
                    const Icon = row.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <div className={`mt-0.5 ${row.className || 'text-muted-foreground'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{row.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(row.at), 'MMM d, HH:mm')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {push.events.notes && (
                  <div className="border-t pt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Notes:</span> {push.events.notes}
                  </div>
                )}

                {isLatest && canRepush && onRepush && (
                  <div className="border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        onRepush();
                        onOpenChange(false);
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Re-push to this tenant
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
