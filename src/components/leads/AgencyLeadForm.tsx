import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { captureUtmFromUrl, getStoredUtm } from '@/lib/utm-capture';

const Schema = z.object({
  contact_name: z.string().trim().min(1, 'Required').max(200),
  contact_email: z.string().trim().email('Invalid email').max(255),
  contact_phone: z.string().trim().max(50).optional(),
  contact_role: z.string().trim().max(100).optional(),
  agency_name: z.string().trim().min(1, 'Required').max(255),
  agency_state: z.string().trim().max(50).optional(),
  voucher_count: z.coerce.number().int().min(0).max(1000000).optional(),
  current_software: z.string().trim().max(100).optional(),
  message: z.string().trim().max(2000).optional(),
});

export const AgencyLeadForm: React.FC = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { captureUtmFromUrl(); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    // Convert empty strings to undefined for optional fields
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      cleaned[k] = v === '' ? undefined : v;
    }

    const parsed = Schema.safeParse(cleaned);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [k, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (msgs && msgs[0]) fieldErrors[k] = msgs[0];
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const utm = getStoredUtm();
      const { data, error } = await supabase.functions.invoke('submit-agency-lead', {
        body: { ...parsed.data, ...utm },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Submission failed');
      }
      setSuccess(true);
      toast({ title: 'Demo request received', description: "We'll be in touch within 1 business day." });
    } catch (err: any) {
      toast({
        title: 'Could not submit request',
        description: err.message || 'Please try again or email hello@openkey.dev',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h3 className="text-2xl font-semibold">Thanks — we got it</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            A member of our team will reach out within 1 business day to schedule your 20-minute walkthrough.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Book a 20-Minute Demo</CardTitle>
        <CardDescription>
          Tell us a bit about your agency. We'll follow up with custom pricing tailored to your portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">Your Name *</Label>
              <Input id="contact_name" name="contact_name" required maxLength={200} />
              {errors.contact_name && <p className="text-sm text-destructive mt-1">{errors.contact_name}</p>}
            </div>
            <div>
              <Label htmlFor="contact_role">Your Title</Label>
              <Input id="contact_role" name="contact_role" placeholder="Executive Director" maxLength={100} />
            </div>
            <div>
              <Label htmlFor="contact_email">Work Email *</Label>
              <Input id="contact_email" name="contact_email" type="email" required maxLength={255} />
              {errors.contact_email && <p className="text-sm text-destructive mt-1">{errors.contact_email}</p>}
            </div>
            <div>
              <Label htmlFor="contact_phone">Phone</Label>
              <Input id="contact_phone" name="contact_phone" type="tel" maxLength={50} />
            </div>
            <div>
              <Label htmlFor="agency_name">Agency Name *</Label>
              <Input id="agency_name" name="agency_name" required maxLength={255} />
              {errors.agency_name && <p className="text-sm text-destructive mt-1">{errors.agency_name}</p>}
            </div>
            <div>
              <Label htmlFor="agency_state">State</Label>
              <Input id="agency_state" name="agency_state" placeholder="CA" maxLength={50} />
            </div>
            <div>
              <Label htmlFor="voucher_count"># of Vouchers</Label>
              <Input id="voucher_count" name="voucher_count" type="number" min={0} max={1000000} />
            </div>
            <div>
              <Label htmlFor="current_software">Current Software</Label>
              <Input id="current_software" name="current_software" placeholder="Yardi, Emphasys, etc." maxLength={100} />
            </div>
          </div>
          <div>
            <Label htmlFor="message">What are you hoping to solve?</Label>
            <Textarea id="message" name="message" rows={4} maxLength={2000} />
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
              </>
            ) : (
              'Request My Demo'
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            By submitting, you agree to be contacted about OpenKey for Agencies. We never share your info.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
