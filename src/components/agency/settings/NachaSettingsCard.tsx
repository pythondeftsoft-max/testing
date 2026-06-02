import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Banknote, ShieldAlert } from 'lucide-react';
import { useNachaSettings, NachaSettingsRow } from '@/hooks/useNachaSettings';

interface Props {
  agencyId: string;
}

const NachaSettingsCard: React.FC<Props> = ({ agencyId }) => {
  const { settings, loading, saving, save } = useNachaSettings(agencyId);
  const [form, setForm] = useState<NachaSettingsRow | null>(null);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  if (loading || !form) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
    );
  }

  const set = <K extends keyof NachaSettingsRow>(k: K, v: NachaSettingsRow[K]) =>
    setForm(f => f ? { ...f, [k]: v } : f);

  const handleSave = async () => {
    await save(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" /> NACHA / ACH Bank Origination
        </CardTitle>
        <CardDescription>
          Configure your bank's ODFI details so HAP batches can be exported as NACHA-compliant ACH files
          for direct upload to your bank's cash management portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.test_mode && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              <strong>Test mode active.</strong> Generated files include "TEST" markers and should NOT be
              submitted to your bank for live processing.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>ODFI Routing Number (9 digits)</Label>
            <Input
              maxLength={9}
              value={form.odfi_routing_number || ''}
              onChange={e => set('odfi_routing_number', e.target.value.replace(/\D/g, ''))}
              placeholder="021000021"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bank Name</Label>
            <Input
              maxLength={23}
              value={form.odfi_name || ''}
              onChange={e => set('odfi_name', e.target.value)}
              placeholder="JPMorgan Chase Bank NA"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Originator Company Name (max 16 chars)</Label>
            <Input
              maxLength={16}
              value={form.originator_company_name || ''}
              onChange={e => set('originator_company_name', e.target.value)}
              placeholder="HOUSING AUTHORITY"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Company ID (10 chars, e.g., "1" + EIN)</Label>
            <Input
              maxLength={10}
              value={form.originator_company_id || ''}
              onChange={e => set('originator_company_id', e.target.value)}
              placeholder="1XXXXXXXXX"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bank Account Number</Label>
            <Input
              value={form.originator_account_number || ''}
              onChange={e => set('originator_account_number', e.target.value)}
              placeholder="Account # at ODFI"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <Select value={form.originator_account_type} onValueChange={v => set('originator_account_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>SEC Code</Label>
            <Select value={form.sec_code} onValueChange={v => set('sec_code', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PPD">PPD — Personal (individual landlords)</SelectItem>
                <SelectItem value="CCD">CCD — Corporate (LLCs/property management)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Service Class</Label>
            <Select value={form.service_class_code} onValueChange={v => set('service_class_code', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="220">220 — Credits Only (HAP payments)</SelectItem>
                <SelectItem value="200">200 — Mixed (credits + debits)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium text-sm">Test Mode</p>
            <p className="text-xs text-muted-foreground">
              Keep on until your bank has verified file format with a pre-note.
            </p>
          </div>
          <Switch checked={form.test_mode} onCheckedChange={v => set('test_mode', v)} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium text-sm">Enable NACHA Export</p>
            <p className="text-xs text-muted-foreground">
              When off, the "Export NACHA" button is hidden from HAP batches.
            </p>
          </div>
          <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save NACHA Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NachaSettingsCard;
