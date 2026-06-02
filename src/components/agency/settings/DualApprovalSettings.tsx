import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Lock, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

type PlatformMode = 'agency_choice' | 'force_on' | 'force_off';

export default function DualApprovalSettings({ agencyId }: Props) {
  const [platformMode, setPlatformMode] = useState<PlatformMode>('agency_choice');
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('housing_authorities')
      .select('dual_approval_platform_mode, dual_approval_enabled, dual_approval_threshold_amount')
      .eq('id', agencyId)
      .single();
    if (data) {
      setPlatformMode((data.dual_approval_platform_mode as PlatformMode) ?? 'agency_choice');
      setEnabled(!!data.dual_approval_enabled);
      setThreshold(String(data.dual_approval_threshold_amount ?? 0));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [agencyId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('housing_authorities')
      .update({
        dual_approval_enabled: enabled,
        dual_approval_threshold_amount: parseFloat(threshold) || 0,
      })
      .eq('id', agencyId);
    setSaving(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
      return;
    }
    toast.success('Dual approval settings saved');
  };

  const lockedOn = platformMode === 'force_on';
  const lockedOff = platformMode === 'force_off';
  const locked = lockedOn || lockedOff;
  const effectiveEnabled = lockedOn ? true : lockedOff ? false : enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> Dual Approval for HAP Batches
        </CardTitle>
        <CardDescription>
          Require a second approver before a payment batch can be sent. Helps prevent
          accidental or unauthorized large disbursements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lockedOn && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Required by OpenKey</strong> — Dual approval is enforced on your
              account and cannot be disabled here.
            </AlertDescription>
          </Alert>
        )}
        {lockedOff && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Disabled by OpenKey</strong> — Dual approval is turned off for your
              account. Contact support to enable it.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="text-sm font-medium">Require second approver</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Preparer cannot also approve — a different staff member must co-sign.
            </p>
          </div>
          <Switch
            checked={effectiveEnabled}
            onCheckedChange={setEnabled}
            disabled={loading || locked}
          />
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Apply to batches at or above</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              min={0}
              step={100}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              disabled={loading || locked || !effectiveEnabled}
              className="w-36 pl-6"
            />
          </div>
          <span className="text-xs text-muted-foreground">0 = always require</span>
        </div>

        <Alert variant="default" className="bg-muted/40">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            When enabled, a batch the preparer tries to send goes into{' '}
            <strong>Pending Second Approval</strong> status. Any other agency staff can
            open it and co-sign to release the funds.
          </AlertDescription>
        </Alert>

        <Button onClick={save} disabled={saving || loading || locked}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Save settings
        </Button>
      </CardContent>
    </Card>
  );
}
