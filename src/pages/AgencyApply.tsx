import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, CheckCircle, Loader2, Search, Clock, ListOrdered } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AgencyApply = () => {
  const { slug } = useParams();
  const [agency, setAgency] = useState<{ id: string; name: string; city: string | null; state: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [activeTab, setActiveTab] = useState('apply');

  // Status check
  const [checkEmail, setCheckEmail] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    date_of_birth: '', household_size: '1', annual_income: '',
    current_address: '', housing_type_requested: '', special_needs: '',
  });

  useEffect(() => {
    if (!slug) return;
    const fetchAgency = async () => {
      const { data } = await supabase
        .from('housing_authorities')
        .select('id, name, city, state')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      setAgency(data as any);
      setLoading(false);
    };
    fetchAgency();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!consent) {
      toast.error('Please agree to the terms to continue');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('voucher_applications').insert({
      agency_id: agency.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      date_of_birth: form.date_of_birth || null,
      household_size: parseInt(form.household_size) || 1,
      annual_income: form.annual_income ? parseFloat(form.annual_income) : null,
      current_address: form.current_address.trim() || null,
      housing_type_requested: form.housing_type_requested || null,
      special_needs: form.special_needs.trim() || null,
      consent_agreed: true,
    } as any);

    if (error) {
      toast.error('Failed to submit application');
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  const handleStatusCheck = async () => {
    if (!agency || !checkEmail.trim()) return;
    setChecking(true);
    const { data } = await supabase
      .from('voucher_applications')
      .select('status, waitlist_position, created_at, priority_level')
      .eq('agency_id', agency.id)
      .eq('email', checkEmail.trim().toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setCheckResult(data);
    setChecking(false);
    if (!data) toast.info('No application found with that email address.');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!agency) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md"><CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Agency not found or inactive.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Application Submitted!</h2>
            <p className="text-muted-foreground">
              Your application to {agency.name} has been received. You will receive updates at <strong>{form.email}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              You can check your application status anytime using the "Check Status" tab on this page.
            </p>
            <Button variant="outline" onClick={() => { setSubmitted(false); setActiveTab('status'); }}>
              Check Application Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending Review',
    reviewed: 'Under Review',
    waitlisted: 'On Waitlist',
    approved: 'Approved',
    denied: 'Not Approved',
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Agency Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{agency.name}</h1>
            <p className="text-sm text-muted-foreground">
              {agency.city && agency.state ? `${agency.city}, ${agency.state}` : ''} — Housing Assistance Portal
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="apply" className="flex-1 gap-1">
              <ListOrdered className="w-4 h-4" /> Apply
            </TabsTrigger>
            <TabsTrigger value="status" className="flex-1 gap-1">
              <Search className="w-4 h-4" /> Check Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apply">
            <Card>
              <CardHeader>
                <CardTitle>Apply for Housing Assistance</CardTitle>
                <CardDescription>Complete this form to be added to the waitlist. All information is kept confidential.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required /></div>
                    <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                    <div><Label>Phone</Label><Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></div>
                    <div><Label>Household Size</Label><Input type="number" min="1" value={form.household_size} onChange={e => setForm({ ...form, household_size: e.target.value })} /></div>
                  </div>
                  <div><Label>Annual Household Income ($)</Label><Input type="number" value={form.annual_income} onChange={e => setForm({ ...form, annual_income: e.target.value })} placeholder="e.g. 24000" /></div>
                  <div><Label>Current Address</Label><Input value={form.current_address} onChange={e => setForm({ ...form, current_address: e.target.value })} /></div>
                  <div>
                    <Label>Housing Type Requested</Label>
                    <Select value={form.housing_type_requested} onValueChange={v => setForm({ ...form, housing_type_requested: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1br">1 Bedroom</SelectItem>
                        <SelectItem value="2br">2 Bedrooms</SelectItem>
                        <SelectItem value="3br">3 Bedrooms</SelectItem>
                        <SelectItem value="4br+">4+ Bedrooms</SelectItem>
                        <SelectItem value="accessible">Accessible Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Special Needs / Notes</Label><Textarea value={form.special_needs} onChange={e => setForm({ ...form, special_needs: e.target.value })} placeholder="Disabilities, elderly, veteran status, etc." /></div>
                  
                  {/* Consent */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <Checkbox id="consent" checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5" />
                    <label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I certify that the information provided is true and accurate. I understand that my application will be reviewed by {agency.name} and I consent to the collection and use of this information for housing assistance purposes.
                    </label>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting || !consent}>
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Submit Application'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Check Application Status
                </CardTitle>
                <CardDescription>Enter the email address you used on your application to check your current status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email..."
                    value={checkEmail}
                    onChange={e => setCheckEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleStatusCheck} disabled={checking || !checkEmail.trim()}>
                    {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                  </Button>
                </div>

                {checkResult && (
                  <div className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Application Status</span>
                      <Badge className={
                        checkResult.status === 'approved' ? 'bg-green-100 text-green-800' :
                        checkResult.status === 'waitlisted' ? 'bg-purple-100 text-purple-800' :
                        checkResult.status === 'denied' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {statusLabels[checkResult.status] || checkResult.status}
                      </Badge>
                    </div>
                    {checkResult.waitlist_position && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Waitlist Position</span>
                        <span className="text-sm font-medium">#{checkResult.waitlist_position}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Applied On</span>
                      <span className="text-sm">{new Date(checkResult.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      For questions about your application, please contact {agency.name} directly.
                    </p>
                  </div>
                )}

                {checkResult === null && checkEmail && !checking && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Enter your email and click Check to see your application status.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AgencyApply;
