import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wrench } from 'lucide-react';

interface UnitMaintenanceTabProps {
  unitId: string;
  unitNumber: string;
}

const UnitMaintenanceTab: React.FC<UnitMaintenanceTabProps> = ({ unitId, unitNumber }) => {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['unit-maintenance', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('id, title, description, status, priority, submitted_date')
        .eq('unit_id', unitId)
        .order('submitted_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div className="text-center py-8">
        <Wrench className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No maintenance requests for Unit {unitNumber}</p>
      </div>
    );
  }

  const priorityVariant = (p: string) => {
    if (p === 'high') return 'destructive' as const;
    if (p === 'medium') return 'warning' as const;
    return 'secondary' as const;
  };

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.title}</TableCell>
              <TableCell>
                <Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{r.status?.replace('_', ' ')}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.submitted_date ? new Date(r.submitted_date).toLocaleDateString() : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UnitMaintenanceTab;
