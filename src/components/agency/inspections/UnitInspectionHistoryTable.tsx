import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Building, AlertTriangle, ChevronRight } from 'lucide-react';
import { useUnitInspectionHistory, type UnitHistoryRow } from '@/hooks/useUnitInspectionHistory';
import UnitInspectionTimeline from './UnitInspectionTimeline';

interface Props {
  agencyId: string;
}

const UnitInspectionHistoryTable: React.FC<Props> = ({ agencyId }) => {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UnitHistoryRow | null>(null);
  const { units, loading, refetch } = useUnitInspectionHistory(agencyId, includeArchived);

  const filtered = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase();
    return units.filter(u => u.address.toLowerCase().includes(q));
  }, [units, search]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" /> Unit Inspection History
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch id="archived" checked={includeArchived} onCheckedChange={setIncludeArchived} />
                <Label htmlFor="archived" className="text-xs">Include archived</Label>
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search address…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 h-8 w-56 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search ? 'No units match your search.' : 'No inspection history yet.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit / Address</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead>Last Inspection</TableHead>
                  <TableHead>Last Result</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Chronic Issues</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow
                    key={u.unit_key}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(u)}
                  >
                    <TableCell className="font-medium text-sm">{u.address}</TableCell>
                    <TableCell className="text-center font-semibold">{u.total_inspections}</TableCell>
                    <TableCell className="text-sm">{u.last_date ? new Date(u.last_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      {u.last_result
                        ? <Badge variant={u.last_result === 'pass' ? 'success' : u.last_result === 'fail' ? 'destructive' : 'secondary'}>{u.last_result}</Badge>
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      {u.current_status ? <Badge variant="secondary">{u.current_status.replace('_', ' ')}</Badge> : '—'}
                    </TableCell>
                    <TableCell>
                      {u.chronic_codes.length > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {u.chronic_codes.length} code{u.chronic_codes.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )}
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
        <UnitInspectionTimeline
          agencyId={agencyId}
          unit={selected}
          includeArchived={includeArchived}
          open={!!selected}
          onClose={() => { setSelected(null); refetch(); }}
        />
      )}
    </>
  );
};

export default UnitInspectionHistoryTable;
