import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StickyNote, SkipForward, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { StageNotePopover } from './StageNotePopover';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  source: 'lead' | 'prospect';
  recordId: string;
}

interface TimelineItem {
  id: string;
  kind: 'note' | 'stage_skipped' | 'activity' | 'email';
  text: string;
  actor?: string | null;
  at: string;
  pinned?: boolean;
  meta?: any;
}

export const DealNotesTab: React.FC<Props> = ({ source, recordId }) => {
  const { data: items = [], isLoading } = useQuery<TimelineItem[]>({
    queryKey: ['deal-notes', source, recordId],
    queryFn: async () => {
      if (source === 'lead') {
        const { data } = await supabase
          .from('agency_lead_activities')
          .select('id, activity_type, description, actor_id, created_at, metadata')
          .eq('lead_id', recordId)
          .order('created_at', { ascending: false })
          .limit(100);
        return (data || []).map((r: any) => ({
          id: r.id,
          kind: r.activity_type === 'note' ? 'note' : (r.activity_type === 'stage_skipped' ? 'stage_skipped' : 'activity'),
          text: r.description || r.activity_type,
          actor: r.actor_id,
          at: r.created_at,
          pinned: r.metadata?.pinned,
          meta: r.metadata,
        }));
      }
      const { data } = await supabase
        .from('pha_prospect_notes')
        .select('id, kind, note, author_user_id, created_at, metadata')
        .eq('prospect_id', recordId)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data || []).map((r: any) => ({
        id: r.id,
        kind: r.kind === 'stage_skipped' ? 'stage_skipped' : 'note',
        text: r.note,
        actor: r.author_user_id,
        at: r.created_at,
        pinned: r.metadata?.pinned,
        meta: r.metadata,
      }));
    },
    enabled: !!recordId,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Notes & activity</h4>
        <StageNotePopover source={source} recordId={recordId} />
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground">
          <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No notes yet. Add one to capture context as the deal moves along.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.id} className="p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                {it.kind === 'note' && <StickyNote className="h-3.5 w-3.5 text-amber-500" />}
                {it.kind === 'stage_skipped' && <SkipForward className="h-3.5 w-3.5 text-violet-500" />}
                {it.kind === 'email' && <Mail className="h-3.5 w-3.5 text-blue-500" />}
                {it.kind === 'activity' && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="font-medium capitalize">{it.kind.replace('_', ' ')}</span>
                {it.pinned && <Badge variant="secondary" className="text-[9px] h-4">Pinned</Badge>}
                {it.meta?.stage && (
                  <Badge variant="outline" className="text-[9px] h-4">{it.meta.stage}</Badge>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(it.at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{it.text}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealNotesTab;
