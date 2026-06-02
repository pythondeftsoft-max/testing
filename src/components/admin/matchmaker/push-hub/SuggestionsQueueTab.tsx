import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles, Loader2 } from 'lucide-react';
import { useSuggestedPushes, useSuggestedPushAction } from '@/hooks/usePushActivity';
import { formatDistanceToNow } from 'date-fns';

const SuggestionsQueueTab: React.FC = () => {
  const { data: rows, isLoading } = useSuggestedPushes();
  const action = useSuggestedPushAction();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading queue…
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No pending suggestions. The Auto-Pusher will queue matches here when running in <strong>Suggest Only</strong> mode.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const tier = r.tier ?? 'match';
        const tierColor =
          tier === 'hot' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
          tier === 'warm' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
          'bg-muted text-muted-foreground';
        return (
          <Card key={r.id} className="hover:shadow-sm transition">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {r.tenant_name}
                    <Badge variant="outline" className={`${tierColor} text-xs`}>
                      Score {r.score} • {tier}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    → {r.property_address} · {r.unit_label}
                    {r.unit_beds ? ` · ${r.unit_beds}BR` : ''}
                    {r.unit_rent ? ` · $${r.unit_rent}/mo` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => action.mutate({ id: r.id, action: 'reject' })}
                    disabled={action.isPending}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => action.mutate({ id: r.id, action: 'approve' })}
                    disabled={action.isPending}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve & Push
                  </Button>
                </div>
              </div>
            </CardHeader>
            {r.reasoning?.breakdown && (
              <CardContent className="pt-0 text-xs text-muted-foreground">
                <code className="block bg-muted/50 rounded p-2 overflow-x-auto">
                  {JSON.stringify(r.reasoning.breakdown, null, 0).substring(0, 200)}
                </code>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default SuggestionsQueueTab;
