import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Camera } from 'lucide-react';
import { format } from 'date-fns';

interface TenantInspectionsTabProps {
  userId: string;
}

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; label: string }> = {
  scheduled: { variant: 'secondary', icon: Clock, label: 'Scheduled' },
  completed: { variant: 'default', icon: CheckCircle, label: 'Completed' },
  pass: { variant: 'default', icon: CheckCircle, label: 'Pass' },
  fail: { variant: 'destructive', icon: XCircle, label: 'Fail' },
  pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
  cancelled: { variant: 'outline', icon: AlertTriangle, label: 'Cancelled' },
};

const TenantInspectionsTab = ({ userId }: TenantInspectionsTabProps) => {
  // Get tenant's current lease to find their property/unit
  const { data: inspections, isLoading } = useQuery({
    queryKey: ['tenant-inspections', userId],
    queryFn: async () => {
      // Find tenant's active leases to get property/unit IDs
      const { data: leases } = await supabase
        .from('tenant_leases')
        .select('property_id, unit_id')
        .eq('tenant_id', userId)
        .eq('status', 'active');

      if (!leases?.length) return [];

      const propertyIds = [...new Set(leases.map(l => l.property_id).filter(Boolean))];
      if (!propertyIds.length) return [];

      // Fetch inspections for these properties
      const { data: inspData, error } = await supabase
        .from('inspections')
        .select('*')
        .in('property_id', propertyIds)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      if (!inspData?.length) return [];

      // Enrich with property addresses
      const { data: props } = await supabase
        .from('properties')
        .select('id, address, city, state')
        .in('id', propertyIds);

      const propMap: Record<string, any> = {};
      props?.forEach(p => { propMap[p.id] = p; });

      // Enrich with unit numbers
      const unitIds = inspData.filter(i => i.unit_id).map(i => i.unit_id);
      const unitMap: Record<string, string> = {};
      if (unitIds.length) {
        const { data: units } = await supabase
          .from('property_units')
          .select('id, unit_number')
          .in('id', unitIds);
        units?.forEach(u => { unitMap[u.id] = u.unit_number; });
      }

      // Fetch HQS checklist items for failed inspections
      const failedIds = inspData.filter(i => (i.result as string) === 'fail').map(i => i.id);
      const deficiencyMap: Record<string, any[]> = {};
      if (failedIds.length) {
        const { data: items } = await (supabase
          .from('hqs_inspection_items')
          .select('*')
          .in('inspection_id', failedIds) as any)
          .eq('result', 'fail');
        items?.forEach(item => {
          if (!deficiencyMap[item.inspection_id]) deficiencyMap[item.inspection_id] = [];
          deficiencyMap[item.inspection_id].push(item);
        });
      }

      return inspData.map(insp => ({
        ...insp,
        property_address: propMap[insp.property_id]
          ? `${propMap[insp.property_id].address}, ${propMap[insp.property_id].city}, ${propMap[insp.property_id].state}`
          : 'Unknown',
        unit_number: insp.unit_id ? unitMap[insp.unit_id] : null,
        deficiencies: deficiencyMap[insp.id] || [],
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!inspections?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Inspections</h3>
          <p className="text-muted-foreground">No HQS inspections have been scheduled for your unit yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">HQS Inspections</h2>
        <Badge variant="secondary">{inspections.length}</Badge>
      </div>

      {inspections.map((insp: any) => {
        const cfg = statusConfig[insp.status] || statusConfig[insp.result] || { variant: 'outline' as const, icon: Clock, label: insp.status };
        const Icon = cfg.icon;

        return (
          <Card key={insp.id}>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {insp.property_address}
                    {insp.unit_number && ` — Unit ${insp.unit_number}`}
                  </p>
                  {insp.scheduled_date && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(insp.scheduled_date), 'MMM d, yyyy')}
                      {insp.completed_date && ` · Completed ${format(new Date(insp.completed_date), 'MMM d, yyyy')}`}
                    </p>
                  )}
                </div>
                <Badge variant={cfg.variant} className="flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </Badge>
              </div>

              {insp.notes && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{insp.notes}</p>
              )}

              {insp.deficiencies.length > 0 && (
                <div className="border border-destructive/20 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Deficiencies ({insp.deficiencies.length})
                  </p>
                  {insp.deficiencies.map((d: any) => (
                    <div key={d.id} className="text-sm text-muted-foreground pl-5 flex items-start gap-2">
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-foreground">{d.category}</span>
                        {d.item_name && ` — ${d.item_name}`}
                        {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TenantInspectionsTab;
