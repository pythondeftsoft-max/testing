import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

type PlatformMode = 'agency_choice' | 'force_on' | 'force_off';

const OPTIONS: { value: PlatformMode; label: string; help: string }[] = [
  { value: 'agency_choice', label: 'Agency choice (default)', help: 'Let the agency decide via their own settings.' },
  { value: 'force_on', label: 'Force ON', help: 'Require dual approval regardless of agency setting. Use for high-risk PHAs.' },
  { value: 'force_off', label: 'Force OFF', help: 'Disable dual approval regardless of agency setting. Use sparingly.' },
];

export default function DualApprovalAdminOverride({ agencyId }: Props) {
  const [mode, setMode] = useState<PlatformMode>('agency_choice');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('housing_authorities')
        .select('dual_approval_platform_mode')
        .eq('id', agencyId)
        .single();
      if (data) setMode((data.dual_approval_platform_mode as PlatformMode) ?? 'agency_choice');
      setLoading(false);
    })();
  }, [agencyId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('housing_authorities')
      .update({ dual_approval_platform_mode: mode })
      .eq('id', agencyId);
    setSaving(false);
    if (error) {
      toast.error('Failed: ' + error.message);
      return;
    }
    toast.success('Platform policy updated');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4" /> Dual Approval Policy (OpenKey override)
        </CardTitle>
        <CardDescription>
          Platform-level control over the agency's dual-approval requirement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as PlatformMode)} disabled={loading}>
          {OPTIONS.map((o) => (
            <div key={o.value} className="flex items-start gap-2 rounded-md border p-3">
              <RadioGroupItem value={o.value} id={`dap-${o.value}`} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor={`dap-${o.value}`} className="font-medium cursor-pointer">{o.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{o.help}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
        <Button onClick={save} disabled={saving || loading} size="sm">
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Apply policy
        </Button>
      </CardContent>
    </Card>
  );
}
