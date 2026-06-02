import React, { useState } from 'react';
import { useHudFmr } from '@/hooks/useHudIntelligence';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, Home, TrendingUp, MapPin } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const PropertyRentAnalyzer = () => {
  const [zip, setZip] = useState('');
  const [bedrooms, setBedrooms] = useState(2);
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useHudFmr(zip, bedrooms, submitted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.length === 5) setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setZip('');
    setBedrooms(2);
  };

  return (
    <>
      <Helmet>
        <title>Property Rent Analyzer — Fair Market Rent & Voucher Data | OpenKey</title>
        <meta name="description" content="Check HUD Fair Market Rent rates and Section 8 voucher payment ranges for any ZIP code. Free tool for landlords." />
      </Helmet>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Property Rent Analyzer</h1>
            <p className="text-muted-foreground">Look up HUD Fair Market Rent and voucher payment ranges for any ZIP code.</p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      placeholder="e.g. 77001"
                      value={zip}
                      onChange={(e) => { setZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setSubmitted(false); }}
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label>Bedrooms</Label>
                    <Select value={String(bedrooms)} onValueChange={(v) => { setBedrooms(Number(v)); setSubmitted(false); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Studio</SelectItem>
                        <SelectItem value="1">1 Bedroom</SelectItem>
                        <SelectItem value="2">2 Bedrooms</SelectItem>
                        <SelectItem value="3">3 Bedrooms</SelectItem>
                        <SelectItem value="4">4 Bedrooms</SelectItem>
                        <SelectItem value="5">5+ Bedrooms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={zip.length !== 5 || isLoading} className="w-full">
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : 'Analyze Rent'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive mb-4">
              <CardContent className="pt-6">
                <p className="text-destructive">{(error as Error).message}</p>
              </CardContent>
            </Card>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" />
                <span>{data.areaName} — {data.year}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Fair Market Rent</CardDescription>
                    <CardTitle className="text-2xl">${data.fmr?.toLocaleString()}/mo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{data.bedroomLabel}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Voucher Range (Low)</CardDescription>
                    <CardTitle className="text-2xl">${data.voucherRange?.low?.toLocaleString()}/mo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">90% of FMR</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1"><Home className="h-4 w-4" /> Voucher Range (High)</CardDescription>
                    <CardTitle className="text-2xl">${data.voucherRange?.high?.toLocaleString()}/mo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">110% of FMR</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>What this means:</strong> HUD sets the Fair Market Rent at <strong>${data.fmr?.toLocaleString()}/mo</strong> for a {data.bedroomLabel?.toLowerCase()} in {data.areaName}. 
                    Housing Choice Vouchers typically cover rent between <strong>${data.voucherRange?.low?.toLocaleString()}</strong> and <strong>${data.voucherRange?.high?.toLocaleString()}</strong> per month. 
                    Listing your property within this range maximizes voucher-holder interest.
                  </p>
                </CardContent>
              </Card>

              {/* All Bedroom FMR Summary */}
              {data.fmrByBedroom && Object.keys(data.fmrByBedroom).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">FMR by Bedroom Size</CardTitle>
                    <CardDescription>Compare Fair Market Rent and voucher ranges across all unit types</CardDescription>
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
                              <tr key={br} className={`border-b last:border-0 ${Number(br) === bedrooms ? 'bg-accent/50 font-semibold' : ''}`}>
                                <td className="py-2 pr-4">{info.label}</td>
                                <td className="text-right py-2 px-4">${info.fmr?.toLocaleString()}</td>
                                <td className="text-right py-2 px-4">${info.voucherLow?.toLocaleString()}</td>
                                <td className="text-right py-2 pl-4">${info.voucherHigh?.toLocaleString()}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" onClick={handleReset} className="w-full">Search Another ZIP</Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PropertyRentAnalyzer;