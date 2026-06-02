import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, MapPin } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
import type { MyInspection } from '@/hooks/useInspectorMyWork';

interface Props {
  inspections: MyInspection[];
}

const cureWindowDays = 30; // default NSPIRE 30-day cure window

const InspectorReinspectionQueue: React.FC<Props> = ({ inspections }) => {
  const failed = useMemo(() => {
    return inspections
      .filter(i => i.result === 'fail' && i.status === 'completed')
      .map(i => {
        const completedAt = i.completed_date ? parseISO(i.completed_date) : null;
        const cureDeadline = completedAt ? new Date(completedAt.getTime() + cureWindowDays * 86400000) : null;
        const daysLeft = cureDeadline ? differenceInDays(cureDeadline, new Date()) : null;
        return { ...i, cureDeadline, daysLeft };
      })
      .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
  }, [inspections]);

  const overdue = failed.filter(f => (f.daysLeft ?? 999) < 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Reinspection Queue ({failed.length})
          </span>
          {overdue > 0 && <Badge variant="destructive">{overdue} overdue</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {failed.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No failed inspections need reinspection.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Failed on</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Cure deadline</TableHead>
                <TableHead className="text-right">Days left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failed.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm">{f.completed_date ? format(parseISO(f.completed_date), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {f.property_id ? `Property ${f.property_id.slice(0, 8)}…` : '—'}
                    </div>
                    {f.unit_id && <div className="text-xs text-muted-foreground ml-4">Unit {f.unit_id.slice(0, 8)}…</div>}
                  </TableCell>
                  <TableCell className="text-sm">{f.cureDeadline ? format(f.cureDeadline, 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell className="text-right">
                    {f.daysLeft === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : f.daysLeft < 0 ? (
                      <Badge variant="destructive">{Math.abs(f.daysLeft)}d overdue</Badge>
                    ) : f.daysLeft <= 7 ? (
                      <Badge variant="warning">{f.daysLeft}d</Badge>
                    ) : (
                      <Badge variant="secondary">{f.daysLeft}d</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default InspectorReinspectionQueue;
