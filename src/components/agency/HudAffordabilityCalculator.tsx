import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';

const HudAffordabilityCalculator: React.FC = () => {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [proposedRent, setProposedRent] = useState('');
  const [fmr, setFmr] = useState('');
  const [paymentStandard, setPaymentStandard] = useState('');

  const income = parseFloat(monthlyIncome) || 0;
  const rent = parseFloat(proposedRent) || 0;
  const fmrVal = parseFloat(fmr) || 0;
  const psVal = parseFloat(paymentStandard) || fmrVal;

  const maxTenantPortion = income * 0.4;
  const hapAmount = Math.max(0, Math.min(psVal, rent) - (income * 0.3));
  const tenantPortion = rent - hapAmount;
  const passesFortyPercent = tenantPortion <= maxTenantPortion;
  const passesRentReasonableness = rent <= fmrVal * 1.1;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Calculator className="h-3 w-3" /> Affordability Check
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>HUD Affordability Calculator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monthly Adjusted Income</Label>
              <Input type="number" placeholder="$0.00" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} />
            </div>
            <div>
              <Label>Proposed Rent (Gross)</Label>
              <Input type="number" placeholder="$0.00" value={proposedRent} onChange={e => setProposedRent(e.target.value)} />
            </div>
            <div>
              <Label>Fair Market Rent (FMR)</Label>
              <Input type="number" placeholder="$0.00" value={fmr} onChange={e => setFmr(e.target.value)} />
            </div>
            <div>
              <Label>Payment Standard</Label>
              <Input type="number" placeholder="= FMR if blank" value={paymentStandard} onChange={e => setPaymentStandard(e.target.value)} />
            </div>
          </div>

          {income > 0 && rent > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-sm">Breakdown</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">30% of Income (TTP):</span>
                <span className="font-mono">${(income * 0.3).toFixed(2)}</span>
                <span className="text-muted-foreground">40% of Income (Max Tenant):</span>
                <span className="font-mono">${maxTenantPortion.toFixed(2)}</span>
                <span className="text-muted-foreground">HAP Amount:</span>
                <span className="font-mono">${hapAmount.toFixed(2)}</span>
                <span className="text-muted-foreground">Tenant Portion:</span>
                <span className="font-mono font-bold">${tenantPortion.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  {passesFortyPercent ? (
                    <><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-sm">Passes 40% Rule</span></>
                  ) : (
                    <><AlertTriangle className="h-4 w-4 text-destructive" /><Badge variant="destructive">FAILS 40% Rule — Tenant pays ${tenantPortion.toFixed(0)} vs max ${maxTenantPortion.toFixed(0)}</Badge></>
                  )}
                </div>
                {fmrVal > 0 && (
                  <div className="flex items-center gap-2">
                    {passesRentReasonableness ? (
                      <><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-sm">Passes Rent Reasonableness (≤110% FMR)</span></>
                    ) : (
                      <><AlertTriangle className="h-4 w-4 text-destructive" /><Badge variant="destructive">FAILS — Rent ${rent} exceeds 110% FMR (${(fmrVal * 1.1).toFixed(0)})</Badge></>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HudAffordabilityCalculator;
