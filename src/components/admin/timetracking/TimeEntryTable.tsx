import React from 'react';
import { WorkerTimeEntry } from '@/hooks/useWorkerTimeEntries';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface TimeEntryTableProps {
  entries: WorkerTimeEntry[];
}

function calcHours(entry: WorkerTimeEntry): string {
  if (!entry.clock_out) return '—';
  const h = (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000;
  return h.toFixed(1);
}

export function TimeEntryTable({ entries }: TimeEntryTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No time entries this month
              </TableCell>
            </TableRow>
          ) : (
            entries.map(entry => {
              const hours = calcHours(entry);
              const active = !entry.clock_out;
              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.worker_name}</TableCell>
                  <TableCell>{format(new Date(entry.clock_in), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(entry.clock_in), 'h:mm a')}</TableCell>
                  <TableCell>
                    {active ? (
                      <Badge variant="secondary" className="animate-pulse">Active</Badge>
                    ) : (
                      format(new Date(entry.clock_out!), 'h:mm a')
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">{hours === '—' ? hours : `${hours}h`}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{entry.notes || '—'}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
