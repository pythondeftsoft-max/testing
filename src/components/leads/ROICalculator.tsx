import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Sparkles } from 'lucide-react';

const VENDOR_COST_PER_VOUCHER_ANNUAL = {
  yardi: 95,
  emphasys: 80,
  happy: 65,
  paper: 25, // labor cost equivalent for paper-based PHAs
};

const OPENKEY_COST_PER_VOUCHER_ANNUAL = 30; // illustrative

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

export function ROICalculator() {
  const [vouchers, setVouchers] = useState(500);
  const [vendor, setVendor] = useState<keyof typeof VENDOR_COST_PER_VOUCHER_ANNUAL>('yardi');

  const result = useMemo(() => {
    const currentAnnual = vouchers * VENDOR_COST_PER_VOUCHER_ANNUAL[vendor];
    const openkeyAnnual = vouchers * OPENKEY_COST_PER_VOUCHER_ANNUAL;
    const savings = currentAnnual - openkeyAnnual;
    const pct = currentAnnual > 0 ? (savings / currentAnnual) * 100 : 0;
    return { currentAnnual, openkeyAnnual, savings, pct };
  }, [vouchers, vendor]);

  const vendors: { id: keyof typeof VENDOR_COST_PER_VOUCHER_ANNUAL; label: string }[] = [
    { id: 'yardi', label: 'Yardi' },
    { id: 'emphasys', label: 'Emphasys' },
    { id: 'happy', label: 'HappySoftware' },
    { id: 'paper', label: 'Paper / Spreadsheets' },
  ];

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>ROI Calculator</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          See your estimated annual savings switching to OpenKey.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Active vouchers</Label>
            <span className="text-2xl font-bold text-primary">{vouchers.toLocaleString()}</span>
          </div>
          <Slider
            value={[vouchers]}
            onValueChange={([v]) => setVouchers(v)}
            min={50}
            max={10000}
            step={50}
          />
          <Input
            type="number"
            value={vouchers}
            onChange={(e) => setVouchers(parseInt(e.target.value) || 0)}
            className="mt-2"
          />
        </div>

        <div className="space-y-2">
          <Label>Current software</Label>
          <div className="grid grid-cols-2 gap-2">
            {vendors.map((v) => (
              <button
                key={v.id}
                onClick={() => setVendor(v.id)}
                className={`text-sm py-2 px-3 rounded-md border transition-colors ${
                  vendor === v.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Current annual cost
            </div>
            <div className="text-xl font-bold line-through opacity-60">
              {fmt(result.currentAnnual)}
            </div>
          </div>
          <div className="rounded-lg bg-success/10 p-3 border border-success/30">
            <div className="text-xs text-success mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> With OpenKey
            </div>
            <div className="text-xl font-bold text-success">{fmt(result.openkeyAnnual)}</div>
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-success/10 p-4 text-center border border-primary/20">
          <div className="text-xs text-muted-foreground mb-1">Estimated annual savings</div>
          <div className="text-4xl font-bold text-primary mb-1">{fmt(result.savings)}</div>
          <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
            {result.pct.toFixed(0)}% lower TCO
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Estimates only. Actual pricing is custom-quoted per agency. Book a call for your exact number.
        </p>
      </CardContent>
    </Card>
  );
}
