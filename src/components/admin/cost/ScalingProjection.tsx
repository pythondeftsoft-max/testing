import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CostAssumptions,
  DEFAULT_SCALING_TIERS,
  ScalingTier,
  computeScalingProjection,
  fmt,
  fmtNum,
} from '@/lib/cost-model';

interface Props {
  assumptions: CostAssumptions;
}

export function ScalingProjection({ assumptions }: Props) {
  const [avgVouchers, setAvgVouchers] = useState(500);
  const [avgPrice, setAvgPrice] = useState(2500);

  const tiers: ScalingTier[] = useMemo(
    () =>
      DEFAULT_SCALING_TIERS.map((t) => ({
        agencies: t.agencies,
        avgVouchersPerAgency: avgVouchers,
        avgPricePerAgency: avgPrice,
      })),
    [avgVouchers, avgPrice]
  );

  const rows = useMemo(
    () => computeScalingProjection(tiers, assumptions),
    [tiers, assumptions]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Portfolio Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Avg vouchers per agency</Label>
            <Input
              type="number"
              value={avgVouchers}
              onChange={(e) => setAvgVouchers(parseInt(e.target.value) || 0)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Avg monthly price per agency ($)</Label>
            <Input
              type="number"
              value={avgPrice}
              onChange={(e) => setAvgPrice(parseInt(e.target.value) || 0)}
              className="h-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            What we look like at scale
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Monthly economics across portfolio sizes — based on the assumptions above and the cost model.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agencies</TableHead>
                <TableHead className="text-right">Total Vouchers</TableHead>
                <TableHead className="text-right">Variable Cost</TableHead>
                <TableHead className="text-right">Fixed Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.agencies}>
                  <TableCell className="font-semibold">{fmtNum(r.agencies)}</TableCell>
                  <TableCell className="text-right">{fmtNum(r.totalVouchers)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {fmt(r.variableCost, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {fmt(r.fixedCost, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmt(r.totalCost, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-primary font-medium">
                    {fmt(r.totalRevenue, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-success font-semibold">
                    {fmt(r.margin, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={r.marginPct > 80 ? 'default' : r.marginPct > 50 ? 'secondary' : 'outline'}
                    >
                      {r.marginPct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Note:</strong> Variable cost scales linearly with agencies.
            Fixed cost adds 1 base infra tier per ~50 agencies (Supabase + hosting).
          </p>
          <p>
            All numbers are model-based estimates from current published vendor pricing. Real-world costs vary with caching, batching, and free-tier consumption.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
