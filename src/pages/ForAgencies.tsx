import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgencyLeadForm } from '@/components/leads/AgencyLeadForm';
import { ROICalculator } from '@/components/leads/ROICalculator';
import { CaseStudyShowcase } from '@/components/leads/CaseStudyShowcase';
import {
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  FileText,
  Zap,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

const features = [
  { icon: FileText, title: 'RFTA & HAP Workflows', desc: 'Auto-populated forms, batched payments, full audit trail.' },
  { icon: Users, title: 'Tenant & Landlord Portals', desc: 'White-labeled self-service for everyone in your ecosystem.' },
  { icon: TrendingUp, title: 'SEMAP Auto-Scoring', desc: 'Real-time HUD scoring based on your live operational data.' },
  { icon: ShieldCheck, title: 'Compliance Built-in', desc: 'Document expiration tracking, recertification workflows, hearings.' },
  { icon: Sparkles, title: 'AI Document Parsing', desc: 'OCR pay stubs, leases, and W-9s — auto-fill tenant records.' },
  { icon: Zap, title: 'Public Waitlist Apps', desc: 'Branded /apply pages — no more paper applications.' },
];

const compareRows = [
  { feature: 'Modern web UI', us: true, yardi: false, emphasys: false, happy: false },
  { feature: 'Tenant self-service portal', us: true, yardi: 'limited', emphasys: false, happy: false },
  { feature: 'Landlord self-service portal', us: true, yardi: false, emphasys: false, happy: 'limited' },
  { feature: 'AI document parsing', us: true, yardi: false, emphasys: false, happy: false },
  { feature: 'Public waitlist application', us: true, yardi: 'add-on', emphasys: 'add-on', happy: 'add-on' },
  { feature: 'Auto SEMAP scoring', us: true, yardi: false, emphasys: 'limited', happy: false },
  { feature: 'White-label / custom domain', us: true, yardi: false, emphasys: false, happy: false },
  { feature: 'Setup time', us: 'Days', yardi: 'Months', emphasys: 'Months', happy: 'Weeks' },
];

const Cell = ({ v }: { v: boolean | string }) => {
  if (v === true) return <CheckCircle2 className="h-5 w-5 text-success mx-auto" />;
  if (v === false) return <XCircle className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground">{v}</span>;
};

const ForAgencies: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>OpenKey for Housing Authorities — Modern OS for PHAs</title>
        <meta
          name="description"
          content="Replace Yardi, Emphasys, and HappySoftware with a modern Section 8 platform. RFTA, HAP, recertifications, SEMAP, and tenant/landlord portals — all in one."
        />
        <link rel="canonical" href="https://openkeyhousing.com/for-agencies" />
      </Helmet>

      <Navigation />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4" variant="outline">
                  <Building2 className="h-3 w-3 mr-1" /> For Housing Authorities
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  The modern OS for{' '}
                  <span className="text-primary">Public Housing Authorities</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Replace your decades-old software with one platform that handles RFTA, HAP, recertifications, SEMAP, and self-service portals — at a fraction of the cost.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" asChild>
                    <a href="#book-demo">Book a 20-min Demo</a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#compare">See How We Compare</a>
                  </Button>
                  <Button size="lg" variant="ghost" asChild>
                    <Link to="/agency/login">Already have an account? Sign in →</Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-6">
                  Trusted by housing authorities of every size — from 50 vouchers to 50,000.
                </p>
              </div>
              <div className="hidden lg:block">
                <Card className="shadow-2xl border-2 border-primary/10">
                  <CardContent className="p-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="font-semibold">12 RFTAs processed today</div>
                        <div className="text-sm text-muted-foreground">2.3x faster than industry avg</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">$847,200 HAP batch</div>
                        <div className="text-sm text-muted-foreground">Sent to 312 landlords</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold">SEMAP Score: 142/145</div>
                        <div className="text-sm text-muted-foreground">High Performer</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything Your PHA Needs</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built ground-up for HUD compliance, not retrofitted from 1990s real estate software.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <Card key={f.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section id="compare" className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How We Compare</h2>
              <p className="text-lg text-muted-foreground">
                Modern platform. Transparent pricing. No multi-year lock-ins.
              </p>
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="p-4 font-semibold text-primary">OpenKey</th>
                      <th className="p-4 font-semibold text-muted-foreground">Yardi</th>
                      <th className="p-4 font-semibold text-muted-foreground">Emphasys</th>
                      <th className="p-4 font-semibold text-muted-foreground">HappySoftware</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row, i) => (
                      <tr key={row.feature} className={i % 2 ? 'bg-muted/20' : ''}>
                        <td className="p-4 text-sm">{row.feature}</td>
                        <td className="p-4 text-center"><Cell v={row.us} /></td>
                        <td className="p-4 text-center"><Cell v={row.yardi} /></td>
                        <td className="p-4 text-center"><Cell v={row.emphasys} /></td>
                        <td className="p-4 text-center"><Cell v={row.happy} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pricing That Fits Your Authority</h2>
            <p className="text-lg text-muted-foreground mb-8">
              We don't believe in one-size-fits-all licensing. Pricing is custom-quoted based on your portfolio size,
              user count, and feature needs — with no setup fees and no multi-year contracts.
            </p>
            <Card className="border-2 border-primary/30">
              <CardContent className="p-8 md:p-12">
                <div className="text-5xl md:text-6xl font-bold mb-4">Custom</div>
                <p className="text-lg text-muted-foreground mb-6">
                  Built around your portfolio — typically billed monthly with no upfront costs.
                </p>
                <div className="space-y-2 text-left max-w-md mx-auto mb-8">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    <span className="text-sm">All modules included — no per-feature add-ons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    <span className="text-sm">Unlimited staff users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    <span className="text-sm">Free white-glove data migration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    <span className="text-sm">Dedicated implementation specialist</span>
                  </div>
                </div>
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <a href="#book-demo">Get a Quote — Book a Call</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Case studies */}
        <CaseStudyShowcase />

        {/* ROI Calculator */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">See Your Savings</h2>
              <p className="text-lg text-muted-foreground">
                Most PHAs cut software TCO by 60-70% switching to OpenKey.
              </p>
            </div>
            <ROICalculator />
          </div>
        </section>

        {/* Lead Form */}
        <section id="book-demo" className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Let's Talk</h2>
              <p className="text-lg text-muted-foreground">
                A 20-minute call to see if OpenKey is right for your agency.
              </p>
            </div>
            <AgencyLeadForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default ForAgencies;
