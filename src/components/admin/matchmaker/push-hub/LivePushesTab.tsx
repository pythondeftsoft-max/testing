import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Loader2, Heart } from 'lucide-react';
import { useLivePushes, useNotifyTenant } from '@/hooks/usePushActivity';
import { formatDistanceToNow } from 'date-fns';

const statusBadge = (status: string | null) => {
  const map: Record<string, string> = {
    push_sent: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    tenant_interested: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
    declined: 'bg-muted text-muted-foreground',
    lease_signed: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  };
  return map[status ?? ''] ?? 'bg-muted text-muted-foreground';
};

const pushTypeLabel = (type: string | null) => {
  if (!type) return 'Manual';
  if (type === 'auto_pushed') return 'Auto';
  if (type === 'approved_suggestion') return 'Approved';
  return type.replace(/_/g, ' ');
};

const LivePushesTab: React.FC = () => {
  const { data: rows, isLoading } = useLivePushes();
  const notify = useNotifyTenant();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading pushes…
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No pushes in the last 30 days.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2">Tenant</th>
            <th className="text-left px-3 py-2">Property / Unit</th>
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">When</th>
            <th className="text-right px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t hover:bg-muted/30">
              <td className="px-3 py-2">
                <div className="font-medium">{r.tenant_name}</div>
                <div className="text-xs text-muted-foreground">{r.tenant_phone ?? 'no phone'}</div>
              </td>
              <td className="px-3 py-2">
                <div>{r.property_address}</div>
                <div className="text-xs text-muted-foreground">
                  {r.unit_label}
                  {r.unit_beds ? ` · ${r.unit_beds}BR` : ''}
                  {r.unit_rent ? ` · $${r.unit_rent}` : ''}
                </div>
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="text-xs">{pushTypeLabel(r.push_type)}</Badge>
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline" className={`${statusBadge(r.status)} text-xs`}>
                  {r.status === 'tenant_interested' && <Heart className="w-3 h-3 mr-1 fill-current" />}
                  {(r.status ?? 'sent').replace(/_/g, ' ')}
                </Badge>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.pushed_at ?? r.created_at), { addSuffix: true })}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-1.5">
                  {!r.sms_message_id && r.tenant_phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => notify.mutate(r.id)}
                      disabled={notify.isPending}
                      className="h-7 text-xs"
                    >
                      <Send className="w-3 h-3 mr-1" /> Send SMS
                    </Button>
                  )}
                  {r.sms_conversation_id && (
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                    >
                      <a href={`/admin?tab=sms&conversation=${r.sms_conversation_id}`}>
                        <MessageSquare className="w-3 h-3 mr-1" /> Quo Thread
                      </a>
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LivePushesTab;
