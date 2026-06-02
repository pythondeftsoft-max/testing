import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Banknote, FileText, ClipboardList, Mail } from 'lucide-react';
import { useAgencyPaymentSettings, DisbursementRail, ApExportFormat } from '@/hooks/useAgencyPaymentSettings';

interface Props { agencyId: string; canManage: boolean; }

const RAIL_INFO: Record<DisbursementRail, { icon: any; title: string; desc: string }> = {
  nacha: { icon: Banknote, title: 'NACHA Export', desc: 'Generate ACH file → upload to your bank portal. $0 platform cost; bank charges normal ACH fee.' },
  checkbook: { icon: Mail, title: 'Checkbook (Digital Check / Virtual Card)', desc: 'Send via Checkbook.io — landlord receives an emailed digital check or printable physical check. Requires verified landlord email; no bank info needed.' },
  manual: { icon: ClipboardList, title: 'Manual / Recorded', desc: 'You pay externally (check, Zelle, wire). Record reference numbers here for the audit trail.' },
  ap_export: { icon: FileText, title: 'AP System Export', desc: 'Export to Yardi / QuickBooks / generic CSV for import into your accounting system.' },
};

const DisbursementRailSettings: React.FC<Props> = ({ agencyId, canManage }) => {
  const { settings, loading, saving, save } = useAgencyPaymentSettings(agencyId);
  const [local, setLocal] = useState(settings);
  useEffect(() => { setLocal(settings); }, [settings]);

  if (loading || !local) {
    return <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">HAP Disbursement Rail</CardTitle>
        <CardDescription>How HAP batches get paid out. OpenKey orchestrates — your agency owns the money movement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={local.primary_rail}
          onValueChange={(v) => setLocal({ ...local, primary_rail: v as DisbursementRail })}
          disabled={!canManage}
          className="space-y-2"
        >
          {(Object.keys(RAIL_INFO) as DisbursementRail[]).map(rail => {
            const Info = RAIL_INFO[rail];
            const Icon = Info.icon;
            return (
              <label key={rail} className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value={rail} id={rail} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium"><Icon className="w-4 h-4" /> {Info.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">{Info.desc}</p>
                </div>
              </label>
            );
          })}
        </RadioGroup>

        {local.primary_rail === 'ap_export' && (
          <div className="space-y-2">
            <Label>AP Export Format</Label>
            <Select
              value={local.ap_export_format || 'generic_csv'}
              onValueChange={(v) => setLocal({ ...local, ap_export_format: v as ApExportFormat })}
              disabled={!canManage}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yardi_csv">Yardi CSV</SelectItem>
                <SelectItem value="qb_iif">QuickBooks IIF</SelectItem>
                <SelectItem value="generic_csv">Generic CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {local.primary_rail === 'manual' && (
          <div className="space-y-2">
            <Label>Default memo on manual payments</Label>
            <Input
              value={local.manual_default_memo || ''}
              onChange={(e) => setLocal({ ...local, manual_default_memo: e.target.value })}
              placeholder="HAP Payment"
              disabled={!canManage}
            />
          </div>
        )}

        <div className="flex items-center justify-between p-3 border rounded-md">
          <div>
            <Label>Notify landlord on disburse</Label>
            <p className="text-xs text-muted-foreground">Email landlord automatically when a line is marked paid.</p>
          </div>
          <Switch
            checked={local.notify_landlord_on_disburse}
            onCheckedChange={(c) => setLocal({ ...local, notify_landlord_on_disburse: c })}
            disabled={!canManage}
          />
        </div>

        {canManage && (
          <Button onClick={() => save(local)} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DisbursementRailSettings;
