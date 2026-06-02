import React, { useState } from 'react';
import { useHudDemand } from '@/hooks/useHudIntelligence';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, TrendingUp, AlertTriangle, BarChart3, MapPin, DollarSign, Gauge, Home, Info } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const scoreColor = (score: number) => {
  if (score >= 70) return 'text-red-600';
  if (score >= 50) return 'text-orange-500';
  if (score >= 30) return 'text-yellow-600';
  return 'text-green-600';
};

const scoreLabel = (score: number) => {
  if (score >= 70) return 'Very High Regional Demand';
  if (score >= 50) return 'High Regional Demand';
  if (score >= 30) return 'Moderate Regional Demand';
  return 'Lower Regional Demand';
};

const HousingMarketDemand = () => {
  const [zip, setZip] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useHudDemand(zip, submitted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.length === 5) setSubmitted(true);
  };

  const handleReset = () => { setSubmitted(false); setZip(''); };

  return (
    <>
      <Helmet>
        <title>Housing Market Demand Analyzer | OpenKey</title>
        <meta name="description" content="Analyze regional affordable housing demand, voucher demand score, and rental opportunity across HUD Metro FMR Areas using HUD data." />
      </Helmet>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Regional Housing Market Demand</h1>
            <p className="text-muted-foreground">Analyze affordable housing demand across a HUD Metro FMR Area. Enter a ZIP code to identify the region.</p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" placeholder="e.g. 77001" value={zip}
                    onChange={(e) => { setZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setSubmitted(false); }}
                    maxLength={5} />
                  <p className="text-xs text-muted-foreground mt-1">ZIP code is used to identify the HUD Metro FMR Area for regional analysis.</p>
                </div>
                <Button type="submit" disabled={zip.length !== 5 || isLoading} className="w-full">
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : 'Analyze Regional Demand'}
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
                <MapPin className="h-4 w-4" />
                <span>{data.metroAreaName || data.areaName} — HUD Metro FMR Area — {data.year}</span>
              </div>

              {/* Voucher Demand Score */}
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Gauge className={`h-8 w-8 ${scoreColor(data.voucherDemandScore)}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Regional Voucher Demand Score</p>
                      <p className={`text-3xl font-bold ${scoreColor(data.voucherDemandScore)}`}>
                        {data.voucherDemandScore}<span className="text-lg text-muted-foreground font-normal">/100</span>
                      </p>
                      <p className={`text-sm font-medium ${scoreColor(data.voucherDemandScore)}`}>
                        {scoreLabel(data.voucherDemandScore)}
                      </p>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div className="mt-4 w-full bg-muted rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all bg-primary"
                      style={{ width: `${Math.min(data.voucherDemandScore, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Higher scores indicate stronger demand for housing assistance across the metro area. Lower scores indicate housing is relatively affordable compared to income levels.
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Cost Burden</CardDescription>
                    <CardTitle className="text-2xl">{data.costBurdenPercent}%</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">of median income spent on rent</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Median Income</CardDescription>
                    <CardTitle className="text-2xl">${data.medianIncome?.toLocaleString()}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Area Median Income</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Baseline FMR</CardDescription>
                    <CardTitle className="text-2xl">${data.baselineFmr?.toLocaleString()}/mo</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">2-bedroom Fair Market Rent</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><Home className="h-4 w-4" /> Affordability Gap</CardDescription>
                    <CardTitle className="text-2xl">${data.affordableHousingGap?.toLocaleString()}/mo</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">Gap between affordable rent & FMR</p></CardContent>
                </Card>
              </div>

              {/* Voucher Rent Range by Bedroom */}
              {data.fmrByBedroom && Object.keys(data.fmrByBedroom).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estimated Voucher Rent Range by Bedroom</CardTitle>
                    <CardDescription>HUD Fair Market Rent and typical payment standard range (90–110% of FMR) for this metro area</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Unit Type</th>
                            <th className="text-right py-2 px-4 text-muted-foreground font-medium">FMR</th>
                            <th className="text-right py-2 px-4 text-muted-foreground font-medium">Voucher Low</th>
                            <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Voucher High</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.fmrByBedroom)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([br, info]: [string, any]) => (
                              <tr key={br} className="border-b last:border-0">
                                <td className="py-2 pr-4">{info.label}</td>
                                <td className="text-right py-2 px-4">${info.fmr?.toLocaleString()}/mo</td>
                                <td className="text-right py-2 px-4">${info.voucherLow?.toLocaleString()}/mo</td>
                                <td className="text-right py-2 pl-4">${info.voucherHigh?.toLocaleString()}/mo</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Regional Market Insights</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {data.insights && Object.entries(data.insights).map(([key, text]) => (
                    <p key={key} className="text-sm text-muted-foreground">{text as string}</p>
                  ))}
                </CardContent>
              </Card>

              {/* Regional context note */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      The Voucher Demand Score reflects <strong>regional demand for housing assistance programs</strong> across the HUD Metro FMR Area, not rental demand for a specific property or ZIP code.
                      Housing vouchers are administered by local Public Housing Authorities and can typically be used anywhere within their jurisdiction.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" onClick={handleReset} className="w-full">Search Another ZIP</Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default HousingMarketDemand;