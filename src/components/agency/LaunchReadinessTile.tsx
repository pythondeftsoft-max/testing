import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  agencyId: string;
  onTabChange?: (tab: string) => void;
}

interface Gate {
  key: string;
  label: string;
  done: boolean;
  tab?: string;
  hint?: string;
}

const LaunchReadinessTile: React.FC<Props> = ({ agencyId, onTabChange }) => {
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [nacha, staff, landlords, tenants, batches, w9] = await Promise.all([
        supabase.from('agency_nacha_settings' as any).select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('agency_staff').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('is_active', true),
        supabase.from('agency_landlords').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('agency_hap_contracts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('status', 'active'),
        supabase.from('agency_nacha_files' as any).select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('agency_landlords').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('w9_status', 'approved'),
      ]);
      if (cancelled) return;
      const next: Gate[] = [
        { key: 'nacha', label: 'NACHA bank settings configured', done: (nacha.count || 0) > 0, tab: 'finance', hint: 'Settings → Payment Rails' },
        { key: 'staff', label: 'At least 1 active staff member', done: (staff.count || 0) > 0, tab: 'team' },
        { key: 'landlords', label: 'At least 1 enrolled landlord', done: (landlords.count || 0) > 0, tab: 'landlords' },
        { key: 'w9', label: 'At least 1 verified W-9', done: (w9.count || 0) > 0, tab: 'landlords' },
        { key: 'tenants', label: 'At least 1 active HAP contract', done: (tenants.count || 0) > 0, tab: 'hap' },
        { key: 'batches', label: 'First HAP/NACHA batch generated', done: (batches.count || 0) > 0, tab: 'finance' },
      ];
      setGates(next);
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [agencyId]);

  if (loading) return null;
  const done = gates.filter(g => g.done).length;
  const total = gates.length;
  if (done === total) return null;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            Launch Readiness
          </CardTitle>
          <Badge variant={done === total ? 'default' : 'secondary'}>{done}/{total} complete</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {gates.map(g => (
            <li key={g.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {g.done
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <Circle className="w-4 h-4 text-muted-foreground" />}
                <span className={g.done ? 'text-muted-foreground line-through' : ''}>{g.label}</span>
                {g.hint && !g.done && <span className="text-xs text-muted-foreground">— {g.hint}</span>}
              </span>
              {!g.done && g.tab && onTabChange && (
                <Button variant="ghost" size="sm" onClick={() => onTabChange(g.tab!)}>Go</Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default LaunchReadinessTile;
