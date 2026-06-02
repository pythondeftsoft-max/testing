import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Clock, User } from 'lucide-react';

interface ActivityTimelineProps {
  entityType: string;
  entityId: string;
  agencyId: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name?: string;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ entityType, entityId, agencyId }) => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('agency_activity_log')
        .select('id, action, actor_id, metadata, created_at')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data?.length) {
        const actorIds = [...new Set(data.filter((d: any) => d.actor_id).map((d: any) => d.actor_id))];
        let nameMap: Record<string, string> = {};
        if (actorIds.length) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', actorIds);
          profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name || 'Unknown'; });
        }
        setEntries(data.map((d: any) => ({ ...d, actor_name: d.actor_id ? nameMap[d.actor_id] : 'System' })));
      } else {
        setEntries([]);
      }
      setLoading(false);
    };
    fetch();
  }, [entityType, entityId, agencyId]);

  if (loading) return <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4" /> Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No activity recorded</p>
        ) : (
          <div className="space-y-3">
            {entries.map(e => (
              <div key={e.id} className="flex gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <div className="min-w-0">
                  <p>
                    <span className="font-medium">{e.actor_name}</span>{' '}
                    <span className="text-muted-foreground">{e.action}</span>
                  </p>
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Object.entries(e.metadata).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityTimeline;
