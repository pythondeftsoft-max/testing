import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Loader2, Bell, Mail, MonitorSmartphone, MessageSquare, Plus, Trash2, Send, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

const NOTIFICATION_TYPES = [
  { key: 'recertification_reminder', label: 'Recertification Reminders', description: 'Notify tenants when annual recertification is approaching' },
  { key: 'inspection_reminder', label: 'Inspection Reminders', description: 'Remind tenants of upcoming housing inspections' },
  { key: 'lease_expiration', label: 'Lease Expiration Notices', description: 'Alert tenants when their lease is nearing expiration' },
  { key: 'voucher_issued', label: 'Voucher Issued Alerts', description: 'Notify tenants when a new voucher has been issued' },
  { key: 'rent_change', label: 'Rent Change Notifications', description: 'Inform tenants and landlords of rent portion changes' },
  { key: 'hap_expiration', label: 'HAP Contract Expiration', description: 'Alert landlords when HAP contracts are expiring' },
] as const;

type NotificationType = typeof NOTIFICATION_TYPES[number]['key'];

const REMINDER_TYPES = [
  { value: 'recertification_30day', label: 'Recertification' },
  { value: 'inspection_upcoming', label: 'Inspection upcoming' },
  { value: 'lease_expiration', label: 'Lease expiration' },
  { value: 'hap_contract_expiration', label: 'HAP contract expiration' },
  { value: 'voucher_issued', label: 'Voucher shopping deadline' },
  { value: 'rent_change', label: 'Rent change' },
  { value: 'document_expiration', label: 'Document expiration' },
];

interface ReminderRule {
  id: string;
  reminder_type: string;
  days_before: number;
  is_active: boolean;
  last_run_at: string | null;
}

const AgencyNotificationPreferencesPanel: React.FC<Props> = ({ agencyId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Record<NotificationType, { email_enabled: boolean; in_app_enabled: boolean }>>({} as any);
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [newType, setNewType] = useState<string>('recertification_30day');
  const [newDays, setNewDays] = useState<number>(30);
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    const { data } = await supabase
      .from('agency_automated_reminders')
      .select('id, reminder_type, days_before, is_active, last_run_at')
      .eq('agency_id', agencyId)
      .order('reminder_type')
      .order('days_before', { ascending: false });
    setRules((data as ReminderRule[]) || []);
  }, [agencyId]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('agency_notification_preferences')
        .select('notification_type, email_enabled, in_app_enabled')
        .eq('agency_id', agencyId);

      const prefs: any = {};
      for (const nt of NOTIFICATION_TYPES) {
        const existing = data?.find((d: any) => d.notification_type === nt.key);
        prefs[nt.key] = {
          email_enabled: existing?.email_enabled ?? true,
          in_app_enabled: existing?.in_app_enabled ?? true,
        };
      }
      setPreferences(prefs);
      await loadRules();
      setLoading(false);
    };
    load();
  }, [agencyId, loadRules]);

  const toggle = (type: NotificationType, channel: 'email_enabled' | 'in_app_enabled') => {
    setPreferences(prev => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type][channel] },
    }));
  };

  const savePreferences = async () => {
    setSaving(true);
    const upserts = NOTIFICATION_TYPES.map(nt => ({
      agency_id: agencyId,
      notification_type: nt.key,
      email_enabled: preferences[nt.key].email_enabled,
      in_app_enabled: preferences[nt.key].in_app_enabled,
    }));
    const { error } = await supabase
      .from('agency_notification_preferences')
      .upsert(upserts as any, { onConflict: 'agency_id,notification_type' });
    if (error) toast.error('Failed to save notification preferences');
    else toast.success('Notification preferences saved');
    setSaving(false);
  };

  const addRule = async () => {
    if (!newType || !newDays || newDays < 1) {
      toast.error('Pick a type and a positive number of days');
      return;
    }
    const { error } = await supabase.from('agency_automated_reminders').insert({
      agency_id: agencyId,
      reminder_type: newType as any,
      days_before: newDays,
      is_active: true,
    });
    if (error) {
      if (error.code === '23505') toast.error('A rule with that type and cadence already exists');
      else toast.error('Failed to add rule');
      return;
    }
    toast.success('Reminder rule added');
    await loadRules();
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    await supabase.from('agency_automated_reminders').update({ is_active: isActive }).eq('id', id);
    await loadRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from('agency_automated_reminders').delete().eq('id', id);
    toast.success('Rule removed');
    await loadRules();
  };

  const sendTest = async (rule: ReminderRule) => {
    setTestingId(rule.id);
    const { data, error } = await supabase.functions.invoke('agency-test-reminder-email', {
      body: { reminderType: rule.reminder_type, agencyId },
    });
    setTestingId(null);
    if (error || !data?.success) {
      toast.error(`Test failed: ${data?.error || error?.message || 'Unknown error'}`);
    } else {
      toast.success(`Test queued to ${data.sent_to}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notification Preferences
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control which automated notifications are sent and through which channels.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-[1fr_80px_80px] gap-2 pb-2 border-b text-xs font-medium text-muted-foreground">
            <span>Notification Type</span>
            <span className="text-center flex items-center justify-center gap-1"><Mail className="w-3 h-3" /> Email</span>
            <span className="text-center flex items-center justify-center gap-1"><MonitorSmartphone className="w-3 h-3" /> In-App</span>
          </div>
          {NOTIFICATION_TYPES.map(nt => (
            <div key={nt.key} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center py-3 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{nt.label}</p>
                <p className="text-xs text-muted-foreground">{nt.description}</p>
              </div>
              <div className="flex justify-center">
                <Switch checked={preferences[nt.key]?.email_enabled ?? true} onCheckedChange={() => toggle(nt.key, 'email_enabled')} />
              </div>
              <div className="flex justify-center">
                <Switch checked={preferences[nt.key]?.in_app_enabled ?? true} onCheckedChange={() => toggle(nt.key, 'in_app_enabled')} />
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Button onClick={savePreferences} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Active Reminder Rules
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Each rule fires daily at 8am UTC for matching records. Stack multiple cadences (e.g. 60 + 30 + 7 days).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end p-3 bg-muted/30 rounded-md">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Reminder type</label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground mb-1 block">Days before</label>
              <Input type="number" min={1} value={newDays} onChange={e => setNewDays(parseInt(e.target.value) || 0)} />
            </div>
            <Button onClick={addRule} className="gap-2"><Plus className="h-4 w-4" /> Add rule</Button>
          </div>

          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No reminder rules configured yet.</p>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => {
                const typeLabel = REMINDER_TYPES.find(t => t.value === rule.reminder_type)?.label || rule.reminder_type;
                return (
                  <div key={rule.id} className="flex items-center gap-3 p-3 border rounded-md">
                    <Switch checked={rule.is_active} onCheckedChange={(v) => toggleRule(rule.id, v)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{typeLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.days_before} days before
                        {rule.last_run_at && ` · last ran ${new Date(rule.last_run_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => sendTest(rule)} disabled={testingId === rule.id}>
                      {testingId === rule.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Test
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          <strong>SMS/Text messaging</strong> is handled through Quo and is not managed here. Contact your Quo representative to configure text notifications.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AgencyNotificationPreferencesPanel;
