import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Shield, Search, Download, Loader2, Calendar } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { exportAuditTrailCSV, exportAuditTrailPDF, type AuditEntry } from '@/lib/exportAuditTrail';

interface Props {
  agencyId: string;
  agencyName: string;
}

const ACTION_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  approve: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  deny: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  created: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  create: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  updated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const getActionColor = (action: string) => {
  const lower = action.toLowerCase();
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (lower.includes(key)) return cls;
  }
  return 'bg-muted text-muted-foreground';
};

const PAGE_SIZE = 50;

const AgencyAuditTrailTab: React.FC<Props> = ({ agencyId, agencyName }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEntries();
    fetchStaffNames();
  }, [agencyId]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_activity_log')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!error && data) {
      setEntries(data.map(d => ({
        id: d.id,
        action: d.action,
        entity_type: d.entity_type,
        entity_id: d.entity_id,
        actor_id: d.actor_id,
        metadata: d.metadata,
        created_at: d.created_at,
      })));
    }
    setLoading(false);
  };

  const fetchStaffNames = async () => {
    const { data } = await supabase
      .from('agency_staff')
      .select('user_id, profiles:user_id(full_name)')
      .eq('agency_id', agencyId);

    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: any) => {
        if (s.user_id && s.profiles?.full_name) {
          map[s.user_id] = s.profiles.full_name;
        }
      });
      setStaffMap(map);
    }
  };

  // Derive unique values for filters
  const uniqueActions = useMemo(() => [...new Set(entries.map(e => e.action))].sort(), [entries]);
  const uniqueEntities = useMemo(() => [...new Set(entries.map(e => e.entity_type))].sort(), [entries]);

  // Filter entries
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (actionFilter !== 'all' && e.action !== actionFilter) return false;
      if (entityFilter !== 'all' && e.entity_type !== entityFilter) return false;
      if (dateFrom && new Date(e.created_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(e.created_at) > end) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const actorName = (e.actor_id && staffMap[e.actor_id]) || '';
        const metaStr = e.metadata ? JSON.stringify(e.metadata).toLowerCase() : '';
        return (
          e.action.toLowerCase().includes(s) ||
          e.entity_type.toLowerCase().includes(s) ||
          e.entity_id.toLowerCase().includes(s) ||
          actorName.toLowerCase().includes(s) ||
          metaStr.includes(s)
        );
      }
      return true;
    });
  }, [entries, actionFilter, entityFilter, dateFrom, dateTo, search, staffMap]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, dateFrom, dateTo]);

  const enrichedForExport = filtered.map(e => ({
    ...e,
    actor_name: (e.actor_id && staffMap[e.actor_id]) || undefined,
  }));

  const formatMetadata = (meta: any) => {
    if (!meta || typeof meta !== 'object') return '';
    return Object.entries(meta)
      .filter(([k]) => k !== 'timestamp')
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(' • ');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Audit Trail</h2>
          <Badge variant="secondary" className="text-xs">{filtered.length} entries</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportAuditTrailCSV(enrichedForExport, agencyName)}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAuditTrailPDF(enrichedForExport, agencyName, { from: dateFrom, to: dateTo })}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, staff, entities..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <DatePicker date={dateFrom} onDateChange={setDateFrom} placeholder="From date" className="w-[150px]" />
            <DatePicker date={dateTo} onDateChange={setDateTo} placeholder="To date" className="w-[150px]" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Date/Time</TableHead>
                  <TableHead className="w-[140px]">Staff</TableHead>
                  <TableHead className="w-[140px]">Action</TableHead>
                  <TableHead className="w-[120px]">Entity Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No audit entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(entry.actor_id && staffMap[entry.actor_id]) || 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-medium ${getActionColor(entry.action)}`} variant="secondary">
                          {entry.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {entry.entity_type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                        {formatMetadata(entry.metadata)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="border-t p-3">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            isActive={page === pageNum}
                            onClick={() => setPage(pageNum)}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgencyAuditTrailTab;
