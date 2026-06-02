import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Building2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

/**
 * Public landlord enrollment form for a specific PHA — mirrors PublicWaitlistApplication.
 * Pre-fills email when authenticated; dedupes via the edge function.
 */
export default function PublicLandlordApplication() {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agency, setAgency] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{
    requires_claim: boolean;
    attached_existing_user: boolean;
  } | null>(null);

  const [form, setForm] = useState({
    landlord_name: '',
    landlord_email: '',
    phone: '',
    business_name: '',
    notes: '',
    consent: false,
  });

  useEffect(() => {
    if (!agencySlug) return;
    (async () => {
      const { data } = await supabase
        .from('housing_authorities')
        .select('id, name')
        .eq('slug', agencySlug)
        .maybeSingle();
      setAgency(data as any);
      setLoading(false);
    })();
  }, [agencySlug]);

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, landlord_email: f.landlord_email || user.email! }));
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencySlug || !form.consent) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('submit-public-landlord-application', {
      body: { ...form, agency_slug: agencySlug },
    });
    setSubmitting(false);
    const result = data as { success: boolean; error?: string; requires_claim?: boolean; attached_existing_user?: boolean };
    if (error || !result?.success) {
      toast.error(result?.error || 'Submission failed');
      return;
    }
    setSubmitted({
      requires_claim: !!result.requires_claim,
      attached_existing_user: !!result.attached_existing_user,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Agency not found</CardTitle>
            <CardDescription>This enrollment link is no longer active.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <Helmet><title>Application received • OpenKey</title></Helmet>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Application received</CardTitle>
            <CardDescription>
              {agency.name} will review your enrollment and follow up by email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {submitted.requires_claim && (
              <p>We've sent a link to <span className="font-medium text-foreground">{form.landlord_email}</span> to set up your OpenKey landlord account.</p>
            )}
            {submitted.attached_existing_user && (
              <p>We found an existing OpenKey account for this email. Sign in to confirm and complete onboarding.</p>
            )}
            <Button className="w-full" onClick={() => navigate('/landlord/auth')}>Go to landlord sign-in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <Helmet><title>Landlord enrollment with {agency.name} • OpenKey</title></Helmet>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Landlord enrollment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Apply to participate with <span className="font-medium text-foreground">{agency.name}</span>
          </p>
        </div>
        <Card>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label htmlFor="name">Owner / business name *</Label>
                <Input id="name" required value={form.landlord_name} onChange={(e) => setForm({ ...form, landlord_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required disabled={!!user?.email} value={form.landlord_email} onChange={(e) => setForm({ ...form, landlord_email: e.target.value })} />
                {user?.email && <p className="text-xs text-muted-foreground mt-1">Using your signed-in account email.</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="biz">Business / LLC (if any)</Label>
                <Input id="biz" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="notes">Notes for the agency</Label>
                <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox id="consent" checked={form.consent} onCheckedChange={(v) => setForm({ ...form, consent: !!v })} />
                <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                  I authorize {agency.name} to review my information and contact me about Section 8 participation.
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !form.consent}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit enrollment
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
