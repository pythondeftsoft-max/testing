import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import InspectorLayout from '@/components/inspector/InspectorLayout';

const InspectorSync: React.FC = () => {
  const { pending, draining, drain } = useSyncQueue();

  return (
    <InspectorLayout>
      <Helmet><title>Sync Queue | Inspector</title></Helmet>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Sync Queue</h1>
            <p className="text-xs text-muted-foreground">{pending.length} pending</p>
          </div>
          <Button onClick={drain} disabled={draining || pending.length === 0} size="sm">
            {draining ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Sync Now
          </Button>
        </div>

        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
              All caught up.
            </CardContent>
          </Card>
        ) : pending.map(p => (
          <Card key={p.client_uuid}>
            <CardContent className="py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Inspection {p.inspection_id.slice(0, 8)}</span>
                <Badge variant={p.status === 'failed' ? 'destructive' : 'outline'}>{p.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Captured {new Date(p.device_captured_at).toLocaleString()} · {p.attempts} attempts
              </p>
              {p.last_error && <p className="text-xs text-destructive">{p.last_error}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </InspectorLayout>
  );
};

export default InspectorSync;
