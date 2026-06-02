import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper as StepperComponent } from '@/components/ui/stepper';
import { toast } from 'sonner';
import { Building2, CheckCircle2, Loader2, Lock, Printer } from 'lucide-react';

interface AgencyInfo {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  public_waitlist_open: boolean;
  public_waitlist_message: string | null;
  direct_apply_open?: boolean | null;
  direct_apply_eligibility_criteria?: string | null;
}

const STEPS = ['Contact', 'Household', 'Income', 'Preferences', 'Review'];

const PREFERENCE_OPTIONS = [
  { id: 'veteran', label: 'Veteran or active military' },
  { id: 'disabled', label: 'Household member with a disability' },
  { id: 'elderly', label: 'Elderly head of household (62+)' },
  { id: 'displaced', label: 'Displaced by disaster, government action, or domestic violence' },
  { id: 'working', label: 'Working / employed head of household' },
  { id: 'homeless', label: 'Currently homeless' },
  { id: 'local_resident', label: 'Local resident' },
];

export default function PublicWaitlistApplication() {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const [searchParams] = useSearchParams();
  const requestedDirect = searchParams.get('mode') === 'direct';
  const [agency, setAgency] = useState<AgencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ number: string; agencyName: string; requiresClaim?: boolean; attachedExisting?: boolean } | null>(null);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  // Detect logged-in user so we can pre-fill + lock identity fields
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user?.email) return;
      setAuthedEmail(user.email);
      const meta = (user.user_metadata || {}) as { first_name?: string; last_name?: string; phone?: string };
      setForm((f) => ({
        ...f,
        email: user.email!,
        first_name: f.first_name || meta.first_name || '',
        last_name: f.last_name || meta.last_name || '',
        phone: f.phone || meta.phone || '',
      }));
    })();
    return () => { cancelled = true; };
  }, []);

  // Resolve effective intake mode: only `direct` if requested AND the agency has direct-apply on.
  const isDirectMode = requestedDirect && Boolean(agency?.direct_apply_open);
  const directRequestedButClosed = requestedDirect && agency && !agency.direct_apply_open;

  // Form state
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    current_address: '',
    city: '',
    state: '',
    zip: '',
    household_size: '1',
    minors_count: '0',
    annual_income: '',
    income_source: '',
    housing_type_requested: '',
    preferences: [] as string[],
    special_needs: '',
    race: '',
    ethnicity: '',
    consent: false,
  });

  useEffect(() => {
    if (!agencySlug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('housing_authorities')
        .select('id, name, slug, city, state, is_active, public_waitlist_open, public_waitlist_message, direct_apply_open, direct_apply_eligibility_criteria')
        .eq('slug', agencySlug)
        .maybeSingle();
      if (cancelled) return;
      setAgency(data as AgencyInfo | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [agencySlug]);

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const togglePreference = (id: string) => {
    setForm((f) => ({
      ...f,
      preferences: f.preferences.includes(id)
        ? f.preferences.filter((p) => p !== id)
        : [...f.preferences, id],
    }));
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.first_name.trim()) return 'First name is required';
      if (!form.last_name.trim()) return 'Last name is required';
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email required';
    }
    if (s === 1) {
      const size = Number(form.household_size);
      if (!size || size < 1) return 'Household size must be at least 1';
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (!agency) return;
    if (!form.consent) {
      toast.error('You must agree to the certification before submitting');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-public-waitlist-application', {
        body: {
          agency_slug: agency.slug,
          intake_mode: isDirectMode ? 'direct' : 'waitlist',
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          date_of_birth: form.date_of_birth || undefined,
          current_address: [form.current_address, form.city, form.state, form.zip].filter(Boolean).join(', '),
          household_size: Number(form.household_size) || 1,
          annual_income: form.annual_income ? Number(form.annual_income) : undefined,
          housing_type_requested: form.housing_type_requested || undefined,
          special_needs: form.special_needs || undefined,
          preference_categories: form.preferences,
          household_data: {
            household_size: Number(form.household_size),
            minors_count: Number(form.minors_count),
          },
          address_history: {
            current: {
              street: form.current_address,
              city: form.city,
              state: form.state,
              zip: form.zip,
            },
          },
          preferences: form.preferences,
          demographics: {
            race: form.race || null,
            ethnicity: form.ethnicity || null,
          },
          consent: true,
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Could not submit application');
        setSubmitting(false);
        return;
      }

      setConfirmation({
        number: data.application_number,
        agencyName: data.agency_name,
        requiresClaim: !!data.requires_claim,
        attachedExisting: !!data.attached_existing_user,
      });
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!agency) return '';
    const loc = [agency.city, agency.state].filter(Boolean).join(', ');
    const label = isDirectMode ? 'Section 8 Direct Application' : 'Housing Choice Voucher Application';
    return loc ? `${label} • ${loc}` : label;
  }, [agency, isDirectMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agency || !agency.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Agency Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We couldn't find an agency at this link. Please double-check the URL provided by your housing authority.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Allow the form through if either the waitlist OR direct-apply is open.
  if (!agency.public_waitlist_open && !agency.direct_apply_open) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>{agency.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-base font-medium">The waitlist is currently closed.</p>
            {agency.public_waitlist_message && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {agency.public_waitlist_message}
              </p>
            )}
            {(agency.email || agency.phone) && (
              <div className="text-sm text-muted-foreground pt-2 border-t">
                <p className="font-medium text-foreground mb-1">Contact this agency:</p>
                {agency.email && <p>{agency.email}</p>}
                {agency.phone && <p>{agency.phone}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 print:py-0">
        <Helmet>
          <title>Application Submitted • {agency.name}</title>
        </Helmet>
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Application Submitted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground">
                Thank you for applying to <span className="font-semibold text-foreground">{confirmation.agencyName}</span>.
                A confirmation has been sent to <span className="font-medium text-foreground">{form.email}</span>.
              </p>
              {confirmation.requiresClaim && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-left text-sm">
                  <p className="font-medium text-foreground mb-1">📩 One more step — finish creating your OpenKey account</p>
                  <p className="text-muted-foreground">
                    We sent a link to <span className="font-medium text-foreground">{form.email}</span>. Click it to set a password and track this application from your dashboard. Without an account, you'll only get email updates.
                  </p>
                </div>
              )}
              {confirmation.attachedExisting && !authedEmail && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-left text-sm">
                  <p className="font-medium">You already have an OpenKey account</p>
                  <p className="text-muted-foreground">
                    We linked this application to your existing account. Sign in to view it on your dashboard.
                  </p>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-6 border">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Application Number</p>
                <p className="text-3xl font-mono font-bold tracking-wider">{confirmation.number}</p>
                <p className="text-xs text-muted-foreground mt-2">Save this number for your records</p>
              </div>
              <div className="text-sm text-muted-foreground space-y-2 text-left bg-background border rounded-lg p-4">
                <p className="font-medium text-foreground">What happens next?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your application will be reviewed by agency staff</li>
                  <li>You may be contacted to provide additional documentation</li>
                  <li>Eligible applicants will be placed on the waitlist by preference and date</li>
                  <li>Wait times vary — please be patient</li>
                </ul>
              </div>
              <div className="flex gap-2 justify-center print:hidden">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print confirmation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <Helmet>
        <title>Apply • {agency.name}</title>
        <meta name="description" content={`Apply to the housing choice voucher waitlist at ${agency.name}.`} />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{agency.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{headerSubtitle}</p>
        </div>

        {directRequestedButClosed && (
          <Card className="mb-4 border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-4 text-sm">
              Direct apply isn't currently open at this agency — your submission will be added to the waitlist instead.
            </CardContent>
          </Card>
        )}

        {isDirectMode && agency.direct_apply_eligibility_criteria && (
          <Card className="mb-4 border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Eligibility criteria</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-line text-muted-foreground">
              {agency.direct_apply_eligibility_criteria}
            </CardContent>
          </Card>
        )}

        {/* Stepper */}
        <div className="mb-6">
          <StepperComponent currentStep={step} steps={STEPS} />
        </div>

        {/* Steps */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First name *</Label>
                  <Input id="first_name" value={form.first_name} onChange={(e) => update({ first_name: e.target.value })} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="last_name">Last name *</Label>
                  <Input id="last_name" value={form.last_name} onChange={(e) => update({ last_name: e.target.value })} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} maxLength={255} disabled={!!authedEmail} />
                  {authedEmail && <p className="text-[11px] text-muted-foreground mt-1">Using your OpenKey account email — this application will link to your dashboard automatically.</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => update({ phone: e.target.value })} maxLength={50} />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of birth</Label>
                  <Input id="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => update({ date_of_birth: e.target.value })} />
                </div>
              </div>
              <div className="pt-2 border-t">
                <Label className="text-sm font-medium">Current Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-2">
                  <div className="md:col-span-6">
                    <Input placeholder="Street address" value={form.current_address} onChange={(e) => update({ current_address: e.target.value })} maxLength={200} />
                  </div>
                  <div className="md:col-span-3">
                    <Input placeholder="City" value={form.city} onChange={(e) => update({ city: e.target.value })} maxLength={100} />
                  </div>
                  <div className="md:col-span-1">
                    <Input placeholder="State" value={form.state} onChange={(e) => update({ state: e.target.value })} maxLength={2} />
                  </div>
                  <div className="md:col-span-2">
                    <Input placeholder="ZIP" value={form.zip} onChange={(e) => update({ zip: e.target.value })} maxLength={10} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Household</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="household_size">Total people in household *</Label>
                  <Input id="household_size" type="number" min={1} max={20} value={form.household_size} onChange={(e) => update({ household_size: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="minors_count">Number of minors (under 18)</Label>
                  <Input id="minors_count" type="number" min={0} max={20} value={form.minors_count} onChange={(e) => update({ minors_count: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="housing_type">Bedroom size requested</Label>
                  <Select value={form.housing_type_requested} onValueChange={(v) => update({ housing_type_requested: v })}>
                    <SelectTrigger><SelectValue placeholder="Select bedroom size" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="1br">1 bedroom</SelectItem>
                      <SelectItem value="2br">2 bedrooms</SelectItem>
                      <SelectItem value="3br">3 bedrooms</SelectItem>
                      <SelectItem value="4br">4 bedrooms</SelectItem>
                      <SelectItem value="5br+">5+ bedrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Income</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="annual_income">Total annual household income</Label>
                  <Input id="annual_income" type="number" min={0} value={form.annual_income} onChange={(e) => update({ annual_income: e.target.value })} placeholder="$" />
                </div>
                <div>
                  <Label htmlFor="income_source">Primary income source</Label>
                  <Select value={form.income_source} onValueChange={(v) => update({ income_source: v })}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employment">Employment</SelectItem>
                      <SelectItem value="ssi">SSI / SSDI</SelectItem>
                      <SelectItem value="social_security">Social Security</SelectItem>
                      <SelectItem value="unemployment">Unemployment</SelectItem>
                      <SelectItem value="tanf">TANF / Public assistance</SelectItem>
                      <SelectItem value="pension">Pension / Retirement</SelectItem>
                      <SelectItem value="none">No income</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferences & Special Circumstances</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select all that apply. These may give your application priority on the waitlist.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {PREFERENCE_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-start gap-3 p-3 rounded-md border hover:bg-accent/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.preferences.includes(opt.id)}
                      onCheckedChange={() => togglePreference(opt.id)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <Label htmlFor="special_needs">Special accommodations needed</Label>
                <Textarea
                  id="special_needs"
                  value={form.special_needs}
                  onChange={(e) => update({ special_needs: e.target.value })}
                  placeholder="e.g., wheelchair accessible unit, ground floor, etc."
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  The following demographic information is optional and used only for HUD reporting.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="race">Race (optional)</Label>
                    <Select value={form.race} onValueChange={(v) => update({ race: v })}>
                      <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="black">Black or African American</SelectItem>
                        <SelectItem value="asian">Asian</SelectItem>
                        <SelectItem value="native">American Indian / Alaska Native</SelectItem>
                        <SelectItem value="pacific">Native Hawaiian / Pacific Islander</SelectItem>
                        <SelectItem value="multi">Multi-racial</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ethnicity">Ethnicity (optional)</Label>
                    <Select value={form.ethnicity} onValueChange={(v) => update({ ethnicity: v })}>
                      <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                        <SelectItem value="non_hispanic">Not Hispanic or Latino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review & Submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div><span className="font-medium">Name:</span> {form.first_name} {form.last_name}</div>
                <div><span className="font-medium">Email:</span> {form.email}</div>
                {form.phone && <div><span className="font-medium">Phone:</span> {form.phone}</div>}
                <div><span className="font-medium">Household size:</span> {form.household_size}</div>
                {form.annual_income && <div><span className="font-medium">Annual income:</span> ${Number(form.annual_income).toLocaleString()}</div>}
                {form.preferences.length > 0 && (
                  <div>
                    <span className="font-medium">Preferences:</span>{' '}
                    {form.preferences.map(p => PREFERENCE_OPTIONS.find(o => o.id === p)?.label).filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              <div className="rounded-md border p-4 bg-muted/40">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.consent}
                    onCheckedChange={(v) => update({ consent: Boolean(v) })}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground">
                    I certify that the information provided is true and complete to the best of my knowledge.
                    I understand that providing false information may result in denial of assistance and may be
                    punishable under federal law (18 U.S.C. § 1001). I authorize {agency.name} to verify the
                    information provided.
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={back} disabled={step === 0 || submitting}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={submit} disabled={submitting || !form.consent}>
              {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Submit Application
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Equal Housing Opportunity • Powered by OpenKey Housing
        </p>
      </div>
    </div>
  );
}
