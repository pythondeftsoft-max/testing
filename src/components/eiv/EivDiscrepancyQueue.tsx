import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEivDiscrepancies, useEivImports, EivDiscrepancy } from '@/hooks/eiv/useEivDiscrepancies';
import { AlertTriangle, FileSpreadsheet } from 'lucide-react';
import EivDiscrepancyDetail from './EivDiscrepancyDetail';

interface Props {
  agencyId: string;
}

const statusColor: Record<string, string> = {
  open: 'destructive',
  under_review: 'default',
  resolved: 'secondary',
  false_positive: 'outline',
};

const EivDiscrepancyQueue: React.FC<Props> = ({ agencyId }) => {
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [selected, setSelected] = useState<EivDiscrepancy | null>(null);
  const { data: discrepancies = [], isLoading } = useEivDiscrepancies(agencyId, statusFilter);
  const { data: imports = [] } = useEivImports(agencyId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open Discrepancies</p>
            <p className="text-2xl font-bold text-destructive">
              {discrepancies.filter(d => d.status === 'open').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recent Imports</p>
            <p className="text-2xl font-bold">{imports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Variance</p>
            <p className="text-2xl font-bold">
              ${discrepancies.reduce((s, d) => s + Math.abs(d.variance_amount), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Discrepancy Queue
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="false_positive">False Positive</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && discrepancies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No discrepancies in this view</p>
            </div>
          )}
          <div className="space-y-2">
            {discrepancies.map(d => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="w-full text-left p-3 rounded border hover:bg-muted/40 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {d.tenant_display_name || 'Unknown tenant'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Declared ${d.declared_amount.toLocaleString()} · EIV ${d.eiv_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {d.variance_pct > 0 ? '+' : ''}{d.variance_pct.toFixed(1)}%
                    </Badge>
                    <Badge variant={statusColor[d.status] as any} className="text-xs">
                      {d.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <EivDiscrepancyDetail
          agencyId={agencyId}
          discrepancy={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default EivDiscrepancyQueue;
