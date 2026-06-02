import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollText, Search } from 'lucide-react';
import { format } from 'date-fns';

interface AgencyAuditLogProps {
  agencyId: string;
}

const ACTION_COLORS: Record<string, string> = {
  insert: 'default',
  update: 'secondary',
  delete: 'destructive',
};

const AgencyAuditLog: React.FC<AgencyAuditLogProps> = ({ agencyId }) => {
  const [tableFilter, setTableFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['agency-audit-log', agencyId, tableFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('agency_audit_log')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (tableFilter !== 'all') query = query.eq('table_name', tableFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const tables = ([...new Set(logs.map((l: any) => l.table_name))] as string[]).sort();

  const filtered = searchTerm
    ? logs.filter((l: any) => {
        const term = searchTerm.toLowerCase();
        return l.table_name.includes(term) || l.action.includes(term) || JSON.stringify(l.new_values || l.old_values).toLowerCase().includes(term);
      })
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ScrollText className="w-5 h-5" /> Audit Log
          <Badge variant="secondary">{filtered.length} entries</Badge>
        </h3>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t.replace('agency_', '')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit entries</TableCell></TableRow>
              ) : (
                filtered.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_COLORS[log.action] as any || 'secondary'}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{log.table_name.replace('agency_', '')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{log.record_id?.slice(0, 8)}...</TableCell>
                    <TableCell className="max-w-[300px]">
                      {log.action === 'update' && log.old_values && log.new_values ? (
                        <div className="text-xs text-muted-foreground">
                          {Object.keys(log.new_values).filter(k => 
                            !['updated_at', 'created_at'].includes(k) && 
                            JSON.stringify(log.old_values[k]) !== JSON.stringify(log.new_values[k])
                          ).slice(0, 3).map(k => (
                            <div key={k}><span className="font-medium">{k}</span>: {String(log.old_values[k]).slice(0, 20)} → {String(log.new_values[k]).slice(0, 20)}</div>
                          ))}
                        </div>
                      ) : log.action === 'insert' ? (
                        <span className="text-xs text-muted-foreground">New record</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Record removed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyAuditLog;
