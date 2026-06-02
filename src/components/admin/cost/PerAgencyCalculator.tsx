import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AgencyInputs,
  CostAssumptions,
  DEFAULT_AGENCY_INPUTS,
  computeAgencyCost,
  fmt,
} from '@/lib/cost-model';
import { Database, HardDrive, Zap, Wifi, Mail, MessageSquare, Brain, FileCheck, TrendingUp, DollarSign } from 'lucide-react';

interface Props {
  assumptions: CostAssumptions;
  initialInputs?: AgencyInputs;
  initialAnnualQuote?: number;
}

const INPUT_GROUPS: { title: string; fields: { key: keyof AgencyInputs; label: string }[] }[] = [
  {
    title: 'Staff',
    fields: [
      { key: 'caseworkers', label: 'Caseworkers' },
      { key: 'inspectors', label: 'Inspectors' },
      { key: 'admins', label: 'Admins' },
    ],
  },
  {
    title: 'Portfolio',
    fields: [
      { key: 'activeVouchers', label: 'Active vouchers' },
      { key: 'pendingApplications', label: 'Pending applications' },
      { key: 'activeLandlords', label: 'Active landlords' },
    ],
  },
  {
    title: 'Monthly Workflow Volume',
    fields: [
      { key: 'monthlyRftas', label: 'RFTAs/mo' },
      { key: 'monthlyInspections', label: 'Inspections/mo' },
      { key: 'monthlyRecerts', label: 'Recerts/mo' },
      { key: 'monthlyHapDisbursements', label: 'HAP checks/mo' },
      { key: 'monthlyEmails', label: 'Emails/mo' },
      { key: 'monthlySms', label: 'SMS/mo' },
      { key: 'monthlyAiOcrPages', label: 'AI OCR pages/mo' },
    ],
  },
];

export function PerAgencyCalculator({ assumptions, initialInputs, initialAnnualQuote }: Props) {
  const [inputs, setInputs] = useState<AgencyInputs>(initialInputs ?? DEFAULT_AGENCY_INPUTS);

  const breakdown = useMemo(
    () => computeAgencyCost(inputs, assumptions),
    [inputs, assumptions]
  );

  const projectedQuoteAnnual = initialAnnualQuote ?? breakdown.suggestedPriceFloor * 12;
  const projectedQuoteMonthly = projectedQuoteAnnual / 12;
  const projectedMargin = projectedQuoteMonthly - breakdown.total;
  const projectedMarginPct =
    projectedQuoteMonthly > 0 ? (projectedMargin / projectedQuoteMonthly) * 100 : 0;

  const lineItems = [
    { icon: Database, label: 'Database', value: breakdown.database, color: 'text-blue-600' },
    { icon: HardDrive, label: 'File Storage', value: breakdown.fileStorage, color: 'text-purple-600' },
    { icon: Zap, label: 'Edge Functions', value: breakdown.edgeFunctions, color: 'text-yellow-600' },
    { icon: Wifi, label: 'Bandwidth', value: breakdown.bandwidth, color: 'text-cyan-600' },
    { icon: Mail, label: 'Email (Resend)', value: breakdown.email, color: 'text-green-600' },
    { icon: MessageSquare, label: 'SMS (Quo)', value: breakdown.sms, color: 'text-indigo-600' },
    { icon: Brain, label: 'AI (OCR)', value: breakdown.ai, color: 'text-pink-600' },
    { icon: FileCheck, label: 'Checkbook.io', value: breakdown.checkbook, color: 'text-orange-600' },
  ];

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Inputs */}
      <div className="lg:col-span-3 space-y-4">
        {INPUT_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {group.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input
                    type="number"
                    value={inputs[f.key]}
                    onChange={(e) =>
                      setInputs({ ...inputs, [f.key]: parseInt(e.target.value) || 0 })
                    }
                    className="h-8"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Output */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Monthly Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lineItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1.5 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="text-sm font-mono">{fmt(item.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">Our Cost / mo</span>
              </div>
              <span className="text-2xl font-bold text-primary">{fmt(breakdown.total)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-primary/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="font-semibold text-sm">Suggested Price Floor</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-success">
                  {fmt(breakdown.suggestedPriceFloor)}
                </div>
                <Badge variant="outline" className="text-xs">
                  {assumptions.markupMultiplier}x markup
                </Badge>
              </div>
            </div>
            {initialAnnualQuote != null && initialAnnualQuote > 0 && (
              <div className="pt-2 border-t border-primary/20 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Prospect quote / mo</span>
                  <span className="font-mono tabular-nums">{fmt(projectedQuoteMonthly)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Projected gross profit</span>
                  <span
                    className={`font-mono tabular-nums font-semibold ${
                      projectedMargin >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {fmt(projectedMargin)} ({projectedMarginPct.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
