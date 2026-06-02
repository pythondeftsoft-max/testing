import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Power, Save, Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useAutoPusherSettings,
  useUpdateAutoPusherSettings,
  AutoPusherMode,
} from '@/hooks/useAutoPusherSettings';
import { AutoPusherStepDiagram } from '@/components/admin/matchmaker/auto-pusher/AutoPusherStepDiagram';
import { TerritoryAllowList } from '@/components/admin/matchmaker/auto-pusher/TerritoryAllowList';

const AutoPusherSettings: React.FC = () => {
  const { data: settings, isLoading } = useAutoPusherSettings();
  const updateMut = useUpdateAutoPusherSettings();

  const [draft, setDraft] = useState({
    master_enabled: false,
    mode: 'suggest_only' as AutoPusherMode,
    score_floor: 80,
    daily_cap_total: 50,
    daily_cap_per_tenant: 2,
    cooldown_days: 14,
    quiet_hours_start: 21,
    quiet_hours_end: 8,
    sms_enabled: true,
    email_enabled: false,
    dry_run: true,
  });

  useEffect(() => {
    if (settings) {
      setDraft({
        master_enabled: settings.master_enabled,
        mode: settings.mode,
        score_floor: settings.score_floor,
        daily_cap_total: settings.daily_cap_total,
        daily_cap_per_tenant: settings.daily_cap_per_tenant,
        cooldown_days: settings.cooldown_days,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end,
        sms_enabled: settings.sms_enabled,
        email_enabled: settings.email_enabled,
        dry_run: settings.dry_run,
      });
    }
  }, [settings]);

  const update = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  const handleSave = () => {
    updateMut.mutate(draft);
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  const isOn = draft.master_enabled;

  return (
    <div className="space-y-4 p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin?tab=match-maker" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Auto-Pusher
            </h1>
            <p className="text-sm text-muted-foreground">
              Automatic match → push pipeline. Always starts safe (off, dry-run, suggest-only).
            </p>
          </div>
        </div>
        <Badge variant={isOn ? 'default' : 'secondary'} className="text-xs">
          {isOn ? 'ENABLED' : 'DISABLED'}
        </Badge>
      </div>

      {/* Step diagram */}
      <AutoPusherStepDiagram />

      {/* Master controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Power className="w-4 h-4" />
            Master controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Auto-Pusher master switch</p>
              <p className="text-xs text-muted-foreground">
                When OFF, nothing runs. When ON, the cron tick checks this every 10 min.
              </p>
            </div>
            <Switch
              checked={draft.master_enabled}
              onCheckedChange={(checked) => update({ master_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border">
            <div>
              <p className="text-sm font-medium">Dry-run mode</p>
              <p className="text-xs text-muted-foreground">
                Logs what it WOULD push but never sends. Recommended for first activation.
              </p>
            </div>
            <Switch
              checked={draft.dry_run}
              onCheckedChange={(checked) => update({ dry_run: checked })}
            />
          </div>

          <div>
            <Label className="text-xs">Mode</Label>
            <Select value={draft.mode} onValueChange={(v) => update({ mode: v as AutoPusherMode })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggest_only">
                  Suggest only — drops in queue for human approval (recommended)
                </SelectItem>
                <SelectItem value="auto_hot">Auto-push hot matches (≥80) only</SelectItem>
                <SelectItem value="auto_hot_decent">Auto-push hot + decent (≥60)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!draft.dry_run && draft.mode !== 'suggest_only' && draft.master_enabled && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-amber-200 bg-amber-50/50 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Live auto-push enabled.</strong> Tenants in your allow-listed territories
                will receive SMS without manual review. Cap and cooldown rules below still apply.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Territory allow list */}
      <TerritoryAllowList />

      {/* Numerical limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limits & guardrails</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Required match score floor</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.score_floor}
              onChange={(e) => update({ score_floor: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Default 80. Lower = more pushes, more noise.
            </p>
          </div>

          <div>
            <Label className="text-xs">Cooldown (days)</Label>
            <Input
              type="number"
              min={0}
              value={draft.cooldown_days}
              onChange={(e) => update({ cooldown_days: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Don't re-push the same unit to a tenant within N days.
            </p>
          </div>

          <div>
            <Label className="text-xs">Daily cap (total)</Label>
            <Input
              type="number"
              min={0}
              value={draft.daily_cap_total}
              onChange={(e) => update({ daily_cap_total: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Hard ceiling on auto-pushes per day across the platform.
            </p>
          </div>

          <div>
            <Label className="text-xs">Daily cap per tenant</Label>
            <Input
              type="number"
              min={0}
              value={draft.daily_cap_per_tenant}
              onChange={(e) => update({ daily_cap_per_tenant: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Anti-spam: max pushes a single tenant can receive per day.
            </p>
          </div>

          <div>
            <Label className="text-xs">Quiet hours start (24h)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={draft.quiet_hours_start}
              onChange={(e) => update({ quiet_hours_start: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <Label className="text-xs">Quiet hours end (24h)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={draft.quiet_hours_end}
              onChange={(e) => update({ quiet_hours_end: parseInt(e.target.value) || 0 })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SMS</p>
              <p className="text-xs text-muted-foreground">Tenant gets a text with the property link.</p>
            </div>
            <Switch
              checked={draft.sms_enabled}
              onCheckedChange={(checked) => update({ sms_enabled: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">Tenant gets an email summary.</p>
            </div>
            <Switch
              checked={draft.email_enabled}
              onCheckedChange={(checked) => update({ email_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-background border-t -mx-4 px-4 py-3 flex justify-end gap-2">
        <Button onClick={handleSave} disabled={updateMut.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          {updateMut.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
};

export default AutoPusherSettings;
