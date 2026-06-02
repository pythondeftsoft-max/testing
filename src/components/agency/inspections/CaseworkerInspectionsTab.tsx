import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClipboardCheck, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { useCaseworkerInspections } from '@/hooks/useCaseworkerInspections';
import InspectionDetail from '@/components/agency/InspectionDetail';

type Filter = 'all' | 'upcoming' | 'in_progress' | 'failed' | 'recent';

interface Props {
  agencyId: string;
  staffId: string;
}

const statusVariant = (s: string): 'default' | 'warning' | 'success' | 'destructive' | 'secondary' => {
  switch (s) {
    case 'scheduled': return 'warning';
    case 'in_progress': return 'default';
    case 'completed': return 'success';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
};

const resultVariant = (r: string | null): 'success' | 'destructive' | 'warning' | 'secondary' => {
  switch (r) {
    case 'pass': return 'success';
    case 'fail': return 'destructive';
    case 'conditional': return 'warning';
    default: return 'secondary';
  }
};

const CaseworkerInspectionsTab: React.FC<Props> = ({ agencyId, staffId }) => {
  const { inspections, loading } = useCaseworkerInspections(agencyId, staffId);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const now = new Date();
  const filtered = useMemo(() => {
    return inspections.filter(i => {
      if (filter === 'upcoming') return i.status === 'scheduled' && i.scheduled_date && new Date(i.scheduled_date) >= now;
      if (filter === 'in_progress') return i.status === 'in_progress';
      if (filter === 'failed') return i.result === 'fail';
      if (filter === 'recent') return i.status === 'completed';
      return true;
    });
  }, [inspections, filter]);

  const failedCount = inspections.filter(i => i.result === 'fail').length;

  if (selectedId) {
    return <InspectionDetail inspectionId={selectedId} onBack={() => setSelectedId(null)} canManage={false} />;
  }

  return (
    <div className="space-y-4">
      {failedCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{failedCount} inspection{failedCount > 1 ? 's' : ''} failed</strong> on units in your caseload — re-inspection cycles may need follow-up.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> My Tenants' Inspections
          </CardTitle>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'upcoming', 'in_progress', 'failed', 'recent'] as Filter[]).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
              >
                {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No inspections to show for this filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-center">Defs</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(i => (
                  <TableRow
                    key={i.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(i.id)}
                  >
                    <TableCell className="font-medium">{i.tenant_name || '—'}</TableCell>
                    <TableCell className="text-sm">{i.unit_address || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{i.inspector_name || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      {i.result ? <Badge variant={resultVariant(i.result)}>{i.result}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-sm">{i.deficiency_count || '—'}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseworkerInspectionsTab;
