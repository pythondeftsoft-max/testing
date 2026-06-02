import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, X, Send } from 'lucide-react';
import { PushStatusBadge } from '@/components/admin/matchmaker/SubStageBadge';
import { UnsendPushConfirmDialog } from '@/components/admin/matchmaker/UnsendPushConfirmDialog';
import { useUnsendPropertyPush } from '@/hooks/useUnsendPropertyPush';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ActivePush {
  id: string;
  status: string;
  pushed_at: string;
  expires_at: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  tenant_name: string;
  property_address: string;
  unit_number: string | null;
}

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const timeLeft = (dateStr: string): string => {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h left`;
};

const getWaitingClass = (pushedAt: string): string => {
  const days = Math.floor((Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 7) return 'bg-red-50 dark:bg-red-950/30';
  if (days >= 3) return 'bg-yellow-50 dark:bg-yellow-950/30';
  return '';
};

export const ActivePushesOverview = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unsendTarget, setUnsendTarget] = useState<ActivePush | null>(null);
  const { mutate, isPending, invalidateQueries } = useUnsendPropertyPush();

  const { data: pushes = [], isLoading } = useQuery({
    queryKey: ['active-pushes-overview'],
    queryFn: async (): Promise<ActivePush[]> => {
      const { data, error } = await supabase
        .from('property_pushes')
        .select('id, status, pushed_at, expires_at, tenant_id, property_id, unit_id')
        .neq('status', 'denied')
        .gte('expires_at', new Date().toISOString())
        .order('pushed_at', { ascending: false });

      if (error || !data?.length) return [];

      // Batch fetch tenant names
      const tenantIds = [...new Set(data.map(p => p.tenant_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', tenantIds);

      const nameMap = new Map(
        (profiles || []).map(p => [
          p.id,
          `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown',
        ])
      );

      // Batch fetch property addresses
      const unitIds = [...new Set(data.filter(p => p.unit_id).map(p => p.unit_id))];
      const { data: units } = unitIds.length
        ? await supabase
            .from('property_units')
            .select('id, unit_number, properties(street_address, city)')
            .in('id', unitIds)
        : { data: [] };

      const unitMap = new Map(
        (units || []).map((u: any) => [
          u.id,
          {
            address: `${u.properties?.street_address || 'Unknown'}${u.properties?.city ? `, ${u.properties.city}` : ''}`,
            unit_number: u.unit_number,
          },
        ])
      );

      return data.map(p => ({
        ...p,
        tenant_name: nameMap.get(p.tenant_id) || 'Unknown',
        property_address: unitMap.get(p.unit_id)?.address || 'Unknown',
        unit_number: unitMap.get(p.unit_id)?.unit_number || null,
      }));
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Group by unit_id to show slot usage
  const unitSlotMap = new Map<string, number>();
  pushes.forEach(p => {
    unitSlotMap.set(p.unit_id, (unitSlotMap.get(p.unit_id) || 0) + 1);
  });

  const handleUnsend = (push: ActivePush) => {
    mutate(
      { pushId: push.id, tenantName: push.tenant_name },
      {
        onSettled: () => {
          setUnsendTarget(null);
          setTimeout(() => invalidateQueries(), 400);
        },
      }
    );
  };

  if (pushes.length === 0 && !isLoading) return null;

  return (
    <div className="border rounded-lg">
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Send className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Active Pushes</span>
        <Badge variant="secondary" className="text-xs ml-1">{pushes.length}</Badge>
      </button>

      {isOpen && (
        <div className="border-t">
          <Table className="table-compact">
            <TableHeader>
              <TableRow className="bg-muted/30 h-8">
                <TableHead className="text-xs">Property</TableHead>
                <TableHead className="text-xs">Tenant</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Pushed</TableHead>
                <TableHead className="text-xs">Expires</TableHead>
                <TableHead className="text-xs">Slots</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pushes.map(push => (
                <TableRow key={push.id} className={`h-9 ${getWaitingClass(push.pushed_at)}`}>
                  <TableCell className="text-xs font-medium truncate max-w-[180px]" title={push.property_address}>
                    {push.property_address}
                    {push.unit_number && <span className="text-muted-foreground"> #{push.unit_number}</span>}
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[120px]" title={push.tenant_name}>
                    {push.tenant_name}
                  </TableCell>
                  <TableCell>
                    <PushStatusBadge status={push.status} size="sm" />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(push.pushed_at)} ago
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeLeft(push.expires_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {unitSlotMap.get(push.unit_id) || 0}/3
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {['push_sent', 'interested', 'landlord_review'].includes(push.status) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnsendTarget(push);
                        }}
                        title="Unsend push"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {unsendTarget && (
        <UnsendPushConfirmDialog
          open={!!unsendTarget}
          onOpenChange={(open) => !open && setUnsendTarget(null)}
          tenantName={unsendTarget.tenant_name}
          propertyAddress={unsendTarget.property_address}
          onConfirm={() => handleUnsend(unsendTarget)}
          isPending={isPending}
        />
      )}
    </div>
  );
};
