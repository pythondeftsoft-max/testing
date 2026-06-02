import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CostAssumptions, DEFAULT_ASSUMPTIONS } from '@/lib/cost-model';
import { RotateCcw } from 'lucide-react';

interface Props {
  assumptions: CostAssumptions;
  onChange: (a: CostAssumptions) => void;
}

const FIELDS: { key: keyof CostAssumptions; label: string; suffix?: string; step?: number }[] = [
  { key: 'supabaseBaseFee', label: 'Supabase base fee', suffix: '$/mo' },
  { key: 'supabaseDbCostPerGb', label: 'Supabase DB', suffix: '$/GB', step: 0.001 },
  { key: 'supabaseStorageCostPerGb', label: 'Supabase storage', suffix: '$/GB', step: 0.001 },
  { key: 'supabaseEdgeCostPerMillion', label: 'Edge functions', suffix: '$/1M' },
  { key: 'supabaseBandwidthCostPerGb', label: 'Bandwidth', suffix: '$/GB', step: 0.01 },
  { key: 'resendCostPerEmail', label: 'Resend email', suffix: '$/email', step: 0.0001 },
  { key: 'resendFreeTier', label: 'Resend free tier', suffix: 'emails/mo' },
  { key: 'aiCostPerMillionInputTokens', label: 'AI input tokens', suffix: '$/1M', step: 0.01 },
  { key: 'aiCostPerMillionOutputTokens', label: 'AI output tokens', suffix: '$/1M', step: 0.01 },
  { key: 'checkbookCostPerCheck', label: 'Checkbook.io', suffix: '$/check', step: 0.01 },
  { key: 'smsCostPerMessage', label: 'SMS (Quo)', suffix: '$/msg', step: 0.001 },
  { key: 'hostingBaseFee', label: 'Hosting base', suffix: '$/mo' },
  { key: 'markupMultiplier', label: 'Price markup', suffix: 'x', step: 0.5 },
];

export function CostAssumptionsPanel({ assumptions, onChange }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Cost Assumptions</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_ASSUMPTIONS)}
          className="text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {f.label} <span className="opacity-60">({f.suffix})</span>
            </Label>
            <Input
              type="number"
              step={f.step ?? 1}
              value={assumptions[f.key]}
              onChange={(e) =>
                onChange({ ...assumptions, [f.key]: parseFloat(e.target.value) || 0 })
              }
              className="h-8 text-sm"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
