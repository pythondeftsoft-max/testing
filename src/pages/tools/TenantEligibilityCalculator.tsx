import React, { useState } from 'react';
import { useHudEligibility } from '@/hooks/useHudIntelligence';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, DollarSign, Users, MapPin, Info, BarChart3, ShieldCheck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const TenantEligibilityCalculator = () => {
  const [zip, setZip] = useState('');
  const [householdSize, setHouseholdSize] = useState(1);
  const [income, setIncome] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const annualIncome = Number(income) || 0;
  const { data, isLoading, error } = useHudEligibility(zip, householdSize, annualIncome, submitted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.length === 5 && annualIncome > 0) setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setZip('');
    setIncome('');
    setHouseholdSize(1);
  };

  const categoryLabels: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    extremely_low_income: { label: 'Extremely Low Income — Likely Eligible', color: 'text-green-600', icon: CheckCircle },
    very_low_income: { label: 'Very Low Income — Likely Eligible', color: 'text-green-600', icon: CheckCircle },
    low_income: { label: 'Low Income — May Be Eligible', color: 'text-yellow-600', icon: CheckCircle },
    above_limits: { label: 'Above Income Limits', color: 'text-destructive', icon: XCircle },
  };

  return (
    <>
      <Helmet>
        <title>Housing Assistance Eligibility Calculator | OpenKey</title>
        <meta name="description" content="Check if your household qualifies for Section 8 or housing assistance based on HUD income limits for your area." />
      </Helmet>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Eligibility Calculator</h1>
            <p className="text-muted-foreground">Check if your household may qualify for housing assistance based on HUD income limits.</p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input id="zip" placeholder="e.g. 77001" value={zip}
                      onChange={(e) => { setZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setSubmitted(false); }}
                      maxLength={5} />
                  </div>
                  <div>
                    <Label>Household Size</Label>
                    <Select value={String(householdSize)} onValueChange={(v) => { setHouseholdSize(Number(v)); setSubmitted(false); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'person' : 'people'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="income">Annual Income ($)</Label>
                    <Input id="income" type="number" placeholder="e.g. 35000" value={income}
                      onChange={(e) => { setIncome(e.target.value); setSubmitted(false); }} />
                  </div>
                </div>
                <Button type="submit" disabled={zip.length !== 5 || annualIncome <= 0 || isLoading} className="w-full">
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</> : 'Check Eligibility'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive mb-4">
              <CardContent className="pt-6"><p className="text-destructive">{(error as Error).message}</p></CardContent>
            </Card>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" /><span>{data.areaName} — {data.year}</span>
              </div>

              {(() => {
                const cat = categoryLabels[data.eligibilityCategory] || categoryLabels.above_limits;
                const Icon = cat.icon;
                return (
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-6 w-6 ${cat.color}`} />
                        <div>
                          <span className={`text-lg font-semibold ${cat.color}`}>{cat.label}</span>
                          {data.incomeTier && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Income Tier: <strong>{data.incomeTier}</strong>
                              {data.amiPercent != null && <> — Your income is <strong>{data.amiPercent}% of AMI</strong></>}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Estimated Tenant Contribution Range */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Est. Tenant Contribution</CardDescription>
                    <CardTitle className="text-2xl">$0 – ${data.affordableRent?.toLocaleString()}/mo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Range from $0 up to 30% of your monthly income. Actual amount depends on local housing authority rules.
                    </p>
                  </CardContent>
                </Card>

                {/* Income vs AMI Comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Income vs. Area Median</CardDescription>
                    <CardTitle className="text-xl">
                      {data.amiPercent != null ? (
                        <>{data.amiPercent}% <span className="text-sm font-normal text-muted-foreground">of AMI</span></>
                      ) : (
                        <>${data.annualIncome?.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">vs</span> ${data.medianIncome?.toLocaleString()}</>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Your income: ${data.annualIncome?.toLocaleString()}/yr — Area Median: ${data.medianIncome?.toLocaleString()}/yr
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.extremelyLowIncomeLimit && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Extremely Low Income</CardDescription>
                      <CardTitle className="text-2xl">${data.extremelyLowIncomeLimit?.toLocaleString()}/yr</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">≤30% AMI — Maximum threshold for highest-priority housing assistance</p></CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><Users className="h-4 w-4" /> Very Low Income Limit</CardDescription>
                    <CardTitle className="text-2xl">${data.veryLowIncomeLimit?.toLocaleString()}/yr</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">≤50% AMI — Maximum threshold for most Section 8 eligibility</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Low Income Limit</CardDescription>
                    <CardTitle className="text-2xl">${data.lowIncomeLimit?.toLocaleString()}/yr</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">≤80% AMI — Maximum threshold for some housing programs</p></CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" /> How Eligibility Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Housing programs like Section 8 use <strong>Area Median Income (AMI)</strong> to determine eligibility.
                    For a household of {data.householdSize} in {data.areaName}, the AMI is <strong>${data.medianIncome?.toLocaleString()}/yr</strong>.
                    Your income of <strong>${data.annualIncome?.toLocaleString()}/yr</strong> is{' '}
                    {data.amiPercent != null && <><strong>{data.amiPercent}%</strong> of AMI, placing you in the <strong>{data.incomeTier}</strong> tier. </>}
                    {data.eligibilityCategory === 'above_limits'
                      ? 'This exceeds the income limits for most housing assistance programs.'
                      : 'This may qualify for voucher assistance depending on local availability.'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    HUD income tiers: <strong>Extremely Low Income</strong> (≤30% AMI) receives highest priority, <strong>Very Low Income</strong> (≤50% AMI) qualifies for most Section 8 programs, and <strong>Low Income</strong> (≤80% AMI) may qualify for some programs.
                    These are <strong>maximum income thresholds</strong> — earning below them does not guarantee a voucher, but is required for eligibility.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    If eligible, your estimated tenant contribution could range from <strong>$0 to ${data.affordableRent?.toLocaleString()}/mo</strong> (up to about 30% of adjusted household income).
                    The exact amount you pay is calculated by your local housing authority based on adjusted gross income, household deductions, and bedroom size.
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    This tool provides estimates based on HUD data. It does not guarantee eligibility or a specific voucher amount. 
                    Contact your local Public Housing Authority (PHA) for official determinations.
                  </p>
                </CardContent>
              </Card>

              <Button variant="outline" onClick={handleReset} className="w-full">Check Another</Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default TenantEligibilityCalculator;