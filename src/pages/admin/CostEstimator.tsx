import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, TrendingUp, Settings2 } from 'lucide-react';
import { CostAssumptions, DEFAULT_ASSUMPTIONS } from '@/lib/cost-model';
import { CostAssumptionsPanel } from '@/components/admin/cost/CostAssumptionsPanel';
import { PerAgencyCalculator } from '@/components/admin/cost/PerAgencyCalculator';
import { ScalingProjection } from '@/components/admin/cost/ScalingProjection';
import { unitsToAgencyInputs } from '@/lib/prospectCostEstimate';

const STORAGE_KEY = 'openkey-cost-assumptions-v1';

export default function CostEstimator() {
  const [assumptions, setAssumptions] = useState<CostAssumptions>(DEFAULT_ASSUMPTIONS);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAssumptions({ ...DEFAULT_ASSUMPTIONS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assumptions));
  }, [assumptions]);

  const initialInputs = useMemo(() => {
    const unitsParam = Number(searchParams.get('units'));
    return Number.isFinite(unitsParam) && unitsParam > 0
      ? unitsToAgencyInputs(unitsParam)
      : undefined;
  }, [searchParams]);

  const initialQuote = useMemo(() => {
    const q = Number(searchParams.get('quote'));
    return Number.isFinite(q) && q > 0 ? q : undefined;
  }, [searchParams]);

  const defaultTab = initialInputs ? 'per-agency' : 'per-agency';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Cost & Pricing Estimator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Internal tool: model our infrastructure cost per agency and project portfolio economics. Use before discovery calls to set price floors.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="per-agency">
                <Calculator className="w-4 h-4 mr-1" /> Per-Agency
              </TabsTrigger>
              <TabsTrigger value="scaling">
                <TrendingUp className="w-4 h-4 mr-1" /> Portfolio Scaling
              </TabsTrigger>
              <TabsTrigger value="assumptions">
                <Settings2 className="w-4 h-4 mr-1" /> Assumptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="per-agency">
              <PerAgencyCalculator
                assumptions={assumptions}
                initialInputs={initialInputs}
                initialAnnualQuote={initialQuote}
              />
            </TabsContent>

            <TabsContent value="scaling">
              <ScalingProjection assumptions={assumptions} />
            </TabsContent>

            <TabsContent value="assumptions">
              <CostAssumptionsPanel assumptions={assumptions} onChange={setAssumptions} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
