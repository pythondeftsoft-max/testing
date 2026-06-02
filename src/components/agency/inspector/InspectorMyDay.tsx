import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, GripVertical, ArrowUp, ArrowDown, CheckCircle2, XCircle } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import type { MyInspection } from '@/hooks/useInspectorMyWork';
import DeclineInspectionDialog from '@/components/agency/inspections/DeclineInspectionDialog';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  inspections: MyInspection[];
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}

const InspectorMyDay: React.FC<Props> = ({ inspections, onUpdate }) => {
  const [declineTarget, setDeclineTarget] = useState<{ id: string; userId: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id || ''));
  }, []);
  const today = useMemo(() =>
    inspections.filter(i => i.scheduled_date && isToday(parseISO(i.scheduled_date)) && i.status !== 'completed' && i.status !== 'cancelled')
      .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || '')),
    [inspections]
  );

  const [order, setOrder] = useState<string[]>([]);
  const orderedToday = useMemo(() => {
    if (!order.length) return today;
    const map = new Map(today.map(i => [i.id, i]));
    const ordered = order.map(id => map.get(id)).filter(Boolean) as MyInspection[];
    today.forEach(i => { if (!order.includes(i.id)) ordered.push(i); });
    return ordered;
  }, [today, order]);

  const move = (idx: number, dir: -1 | 1) => {
    const ids = orderedToday.map(i => i.id);
    const target = idx + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    setOrder(ids);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> My Day · {format(new Date(), 'EEE MMM d')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!orderedToday.length ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No inspections scheduled for today. Enjoy the day or check My Inspections.
          </div>
        ) : (
          <div className="space-y-2">
            {orderedToday.map((insp, idx) => (
              <div key={insp.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                <div className="flex flex-col gap-0.5">
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => move(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <GripVertical className="h-3 w-3 text-muted-foreground mx-auto" />
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => move(idx, 1)} disabled={idx === orderedToday.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{format(parseISO(insp.scheduled_date!), 'h:mm a')}</span>
                    <Badge variant={insp.status === 'in_progress' ? 'default' : 'secondary'}>{insp.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {insp.property_id ? `Property ${insp.property_id.slice(0, 8)}…` : 'No property'}
                    {insp.unit_id && ` · Unit ${insp.unit_id.slice(0, 8)}…`}
                  </p>
                </div>
                <div className="flex gap-1">
                  {insp.status === 'scheduled' && (
                    <>
                      <Button size="sm" onClick={() => onUpdate(insp.id, { status: 'in_progress' })}>Start</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeclineTarget({ id: insp.id, userId: currentUserId })} title="Decline">
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {insp.status === 'in_progress' && (
                    <Button size="sm" variant="outline" onClick={() => onUpdate(insp.id, { status: 'completed', result: 'pass', completed_date: new Date().toISOString() })}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {declineTarget && (
        <DeclineInspectionDialog
          open={!!declineTarget}
          onOpenChange={(o) => { if (!o) setDeclineTarget(null); }}
          inspectionId={declineTarget.id}
          inspectorUserId={declineTarget.userId}
        />
      )}
    </Card>
  );
};

export default InspectorMyDay;
