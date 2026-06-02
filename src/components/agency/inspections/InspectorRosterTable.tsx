import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, ChevronRight } from 'lucide-react';
import type { InspectorRosterRow } from '@/hooks/useInspectionOversight';
import InspectorDetailDrawer from './InspectorDetailDrawer';

interface Props {
  roster: InspectorRosterRow[];
  loading: boolean;
  agencyId: string;
}

const InspectorRosterTable: React.FC<Props> = ({ roster, loading, agencyId }) => {
  const [selected, setSelected] = useState<InspectorRosterRow | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Inspector Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : roster.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No inspectors on staff.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspector</TableHead>
                  <TableHead className="text-center">Scheduled</TableHead>
                  <TableHead className="text-center">In Progress</TableHead>
                  <TableHead className="text-center">Done (Mo)</TableHead>
                  <TableHead className="text-center">Pass %</TableHead>
                  <TableHead className="text-center">Avg Defs</TableHead>
                  <TableHead className="text-center">Avg Days</TableHead>
                  <TableHead className="text-center">Overdue</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map(r => (
                  <TableRow
                    key={r.inspector_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(r)}
                  >
                    <TableCell className="font-medium">{r.inspector_name}</TableCell>
                    <TableCell className="text-center">{r.scheduled}</TableCell>
                    <TableCell className="text-center">{r.in_progress}</TableCell>
                    <TableCell className="text-center font-semibold">{r.completed_month}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.pass_rate >= 80 ? 'success' : r.pass_rate >= 60 ? 'warning' : 'destructive'}>
                        {r.pass_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{r.avg_deficiencies}</TableCell>
                    <TableCell className="text-center">{r.avg_days_to_complete}d</TableCell>
                    <TableCell className="text-center">
                      {r.overdue > 0 ? <Badge variant="destructive">{r.overdue}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <InspectorDetailDrawer
          inspector={selected}
          agencyId={agencyId}
          allInspectors={roster}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default InspectorRosterTable;
