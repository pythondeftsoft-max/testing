import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calculator, CheckCircle2, XCircle, Save, DollarSign, TrendingUp, Users, Sparkles } from 'lucide-react';
import { useRentCalculations, computeHudRent, type RentCalcInput } from '@/hooks/useRentCalculations';
import { Textarea } from '@/components/ui/textarea';
import RecipientPicker from './RecipientPicker';
import { useUtilitySchedules } from '@/hooks/useUtilitySchedules';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OcrUploader } from './ocr/OcrUploader';
import { featureFlags } from '@/config/featureFlags';

interface Props {
  agencyId: string;
  staffId: string;
  canManage: boolean;
}

const AgencyRentCalculator: React.FC<Props> = ({ agencyId, staffId, canManage }) => {
  const { calculations, loading, saveCalculation } = useRentCalculations(agencyId);
  const { getTotalUA } = useUtilitySchedules(agencyId);
  const [saving, setSaving] = useState(false);
  const [hapSynced, setHapSynced] = useState<boolean | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);

  // Form state
  const [tenantId, setTenantId] = useState('');
  const [calcType, setCalcType] = useState<string>('initial');
  const [grossIncome, setGrossIncome] = useState<number>(0);
  const [numDependents, setNumDependents] = useState<number>(0);
  const [isElderlyDisabled, setIsElderlyDisabled] = useState(false);
  const [childcareExpense, setChildcareExpense] = useState<number>(0);
  const [medicalExpense, setMedicalExpense] = useState<number>(0);
  const [utilityAllowance, setUtilityAllowance] = useState<number>(0);
  const [uaManualOverride, setUaManualOverride] = useState(false);
  const [bedroomCount, setBedroomCount] = useState<number>(2);
  const [paymentStandard, setPaymentStandard] = useState<number>(0);
  const [psManualOverride, setPsManualOverride] = useState(false);
  const [grossRent, setGrossRent] = useState<number>(0);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Auto-populate UA from agency schedules
  useEffect(() => {
    if (!uaManualOverride) {
      const ua = getTotalUA(bedroomCount);
      setUtilityAllowance(ua);
    }
  }, [bedroomCount, uaManualOverride, getTotalUA]);

  // Auto-populate payment standard from agency_payment_standards table
  useEffect(() => {
    if (psManualOverride) return;
    const fetchPS = async () => {
      const { data } = await supabase
        .from('agency_payment_standards')
        .select('amount')
        .eq('agency_id', agencyId)
        .eq('bedroom_count', bedroomCount)
        .is('exception_area_name', null)
        .lte('effective_date', effectiveDate)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setPaymentStandard(Number(data.amount));
      }
    };
    fetchPS();
  }, [bedroomCount, effectiveDate, psManualOverride, agencyId]);

  const computed = useMemo(() => computeHudRent({
    tenant_id: tenantId,
    calculation_type: calcType,
    annual_gross_income: grossIncome,
    num_dependents: numDependents,
    is_elderly_disabled: isElderlyDisabled,
    childcare_expense: childcareExpense,
    medical_expense: medicalExpense,
    utility_allowance: utilityAllowance,
    payment_standard: paymentStandard,
    gross_rent: grossRent,
    effective_date: effectiveDate,
  }), [grossIncome, numDependents, isElderlyDisabled, childcareExpense, medicalExpense, utilityAllowance, paymentStandard, grossRent, calcType, tenantId, effectiveDate]);

  const handleSave = async () => {
    if (!tenantId.trim()) return;
    setSaving(true);
    setHapSynced(null);
    const result = await saveCalculation({
      tenant_id: tenantId,
      calculation_type: calcType,
      annual_gross_income: grossIncome,
      num_dependents: numDependents,
      is_elderly_disabled: isElderlyDisabled,
      childcare_expense: childcareExpense,
      medical_expense: medicalExpense,
      utility_allowance: utilityAllowance,
      payment_standard: paymentStandard,
      gross_rent: grossRent,
      effective_date: effectiveDate,
      notes,
    }, staffId);
    setHapSynced(result === true);
    setSaving(false);
  };

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{fmt(computed.ttp)}</p>
              <p className="text-xs text-muted-foreground">TTP (30%)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{fmt(computed.hap_amount)}</p>
              <p className="text-xs text-muted-foreground">HAP Amount</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{fmt(computed.tenant_portion)}</p>
              <p className="text-xs text-muted-foreground">Tenant Portion</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {computed.passes_40pct_rule
              ? <CheckCircle2 className="h-5 w-5 text-primary" />
              : <XCircle className="h-5 w-5 text-destructive" />
            }
            <div>
              <p className="text-lg font-bold">{computed.passes_40pct_rule ? 'PASS' : 'FAIL'}</p>
              <p className="text-xs text-muted-foreground">40% Rule</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculator form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> HUD Rent Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Income & Deductions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-sm text-muted-foreground">Step 1: Income & Deductions</h3>
                {featureFlags.aiOcrEnabled && canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setOcrOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Auto-fill from pay stub
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tenant</Label>
                <RecipientPicker
                  type="tenant"
                  agencyId={agencyId}
                  value={tenantId || null}
                  onChange={(r) => setTenantId(r?.id || '')}
                  placeholder="Search tenants..."
                />
              </div>
              <div className="space-y-2">
                <Label>Calculation Type</Label>
                <Select value={calcType} onValueChange={setCalcType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="interim">Interim</SelectItem>
                    <SelectItem value="biennial">Biennial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Annual Gross Income</Label>
                <Input type="number" value={grossIncome} onChange={e => setGrossIncome(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Number of Dependents</Label>
                <Input type="number" min={0} value={numDependents} onChange={e => setNumDependents(Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isElderlyDisabled} onCheckedChange={setIsElderlyDisabled} />
                <Label>Elderly / Disabled Head</Label>
              </div>
              <div className="space-y-2">
                <Label>Annual Childcare Expense</Label>
                <Input type="number" value={childcareExpense} onChange={e => setChildcareExpense(Number(e.target.value))} />
              </div>
              {isElderlyDisabled && (
                <div className="space-y-2">
                  <Label>Annual Medical Expense</Label>
                  <Input type="number" value={medicalExpense} onChange={e => setMedicalExpense(Number(e.target.value))} />
                </div>
              )}
            </div>

            {/* Column 2: Rent & Standards */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Step 2: Rent & Standards</h3>
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input type="number" min={0} max={6} value={bedroomCount} onChange={e => setBedroomCount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Gross Rent (Contract + Utilities)</Label>
                <Input type="number" value={grossRent} onChange={e => setGrossRent(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Payment Standard</Label>
                <Input type="number" value={paymentStandard} onChange={e => setPaymentStandard(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Utility Allowance</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Manual</span>
                    <Switch checked={uaManualOverride} onCheckedChange={setUaManualOverride} />
                  </div>
                </div>
                <Input
                  type="number"
                  value={utilityAllowance}
                  onChange={e => setUtilityAllowance(Number(e.target.value))}
                  disabled={!uaManualOverride}
                />
                {!uaManualOverride && utilityAllowance > 0 && (
                  <p className="text-[10px] text-muted-foreground">Auto-loaded from agency utility schedules for {bedroomCount}BR</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
              </div>
            </div>

            {/* Column 3: Computed Results */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Step 3: Results</h3>
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span>Dependent Allowance:</span>
                  <span className="font-mono">{fmt(computed.allowances.dependent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Elderly/Disabled:</span>
                  <span className="font-mono">{fmt(computed.allowances.elderly_disabled)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Childcare:</span>
                  <span className="font-mono">{fmt(computed.allowances.childcare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Medical:</span>
                  <span className="font-mono">{fmt(computed.allowances.medical)}</span>
                </div>
                <hr />
                <div className="flex justify-between text-sm">
                  <span>Adjusted Annual Income:</span>
                  <span className="font-mono font-medium">{fmt(computed.annual_adjusted_income)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Monthly Adjusted Income:</span>
                  <span className="font-mono">{fmt(computed.monthly_adjusted_income)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>TTP (30%):</span>
                  <span className="font-mono">{fmt(computed.ttp)}</span>
                </div>
                <hr />
                <div className="flex justify-between text-sm font-medium text-primary">
                  <span>HAP Amount:</span>
                  <span className="font-mono">{fmt(computed.hap_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Tenant Portion:</span>
                  <span className="font-mono">{fmt(computed.tenant_portion)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>40% Rule:</span>
                  <Badge variant={computed.passes_40pct_rule ? 'success' : 'destructive'}>
                    {computed.passes_40pct_rule ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              </div>

              {canManage && (
                <div className="space-y-2">
                  <Button onClick={handleSave} disabled={saving || !tenantId.trim()} className="w-full">
                    <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Calculation'}
                  </Button>
                  {hapSynced === true && (
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>HAP contract auto-updated with new amounts</span>
                    </div>
                  )}
                  {hapSynced === false && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>No active HAP contract found — update manually</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculation History ({calculations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>TTP</TableHead>
                    <TableHead>HAP</TableHead>
                    <TableHead>Tenant $</TableHead>
                    <TableHead>40%</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.length ? calculations.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.tenant_id.slice(0, 8)}...</TableCell>
                      <TableCell className="capitalize text-sm">{c.calculation_type}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(c.ttp)}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(c.hap_amount)}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(c.tenant_portion)}</TableCell>
                      <TableCell>
                        <Badge variant={c.passes_40pct_rule ? 'success' : 'destructive'}>
                          {c.passes_40pct_rule ? 'Pass' : 'Fail'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(c.effective_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No rent calculations yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={ocrOpen} onOpenChange={setOcrOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI document extraction
            </DialogTitle>
          </DialogHeader>
          <OcrUploader
            defaultDocType="paystub"
            onCommit={({ docType, data }) => {
              if (docType === 'paystub') {
                if (data.annual_gross_estimate) setGrossIncome(Number(data.annual_gross_estimate));
              } else if (docType === 'lease') {
                if (data.monthly_rent) setGrossRent(Number(data.monthly_rent) * 12 / 12); // monthly
                if (data.bedroom_count) setBedroomCount(Number(data.bedroom_count));
              }
              setOcrOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgencyRentCalculator;
