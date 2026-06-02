import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props { agencyId: string; }

const AssignmentSettingsCard: React.FC<Props> = ({ agencyId }) => {
  const [autoAssign, setAutoAssign] = useState(false);
  const [strategy, setStrategy] = useState('territory_workload_roundrobin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('agency_operational_settings')
        .select('inspection_auto_assign, inspection_assignment_strategy')
        .eq('agency_id', agencyId)
        .maybeSingle();
      if (data) {
        setAutoAssign(!!data.inspection_auto_assign);
        setStrategy(data.inspection_assignment_strategy || 'territory_workload_roundrobin');
      }
      setLoading(false);
    })();
  }, [agencyId]);

  const save = async (next: { autoAssign?: boolean; strategy?: string }) => {
    setSaving(true);
    const payload = {
      agency_id: agencyId,
      inspection_auto_assign: next.autoAssign ?? autoAssign,
      inspection_assignment_strategy: next.strategy ?? strategy,
    };
    const { error } = await supabase
      .from('agency_operational_settings')
      .upsert(payload, { onConflict: 'agency_id' });
    setSaving(false);
    if (error) { toast.error('Save failed'); return; }
    toast.success('Settings saved');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Auto-Assignment Settings
          {(loading || saving) && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Auto-assign new inspections</Label>
            <p className="text-xs text-muted-foreground">When ON, new inspections route to inspectors automatically. Manual assignment is still available.</p>
          </div>
          <Switch
            checked={autoAssign}
            onCheckedChange={(v) => { setAutoAssign(v); save({ autoAssign: v }); }}
            disabled={loading}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Assignment strategy</Label>
          <Select value={strategy} onValueChange={(v) => { setStrategy(v); save({ strategy: v }); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="territory_workload_roundrobin">Territory → workload → round-robin</SelectItem>
              <SelectItem value="workload_only">Lowest workload only</SelectItem>
              <SelectItem value="roundrobin_only">Round-robin only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Used by both auto-assign and the "best fit" picker in the unassigned queue.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentSettingsCard;
