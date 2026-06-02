import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, CheckCircle, Loader2 } from 'lucide-react';

interface PacketData {
  id: string;
  tenant_id: string;
  landlord_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  agency_id: string | null;
  status: string;
  tenant_data: Record<string, string> | null;
  landlord_data: Record<string, string> | null;
  share_token: string | null;
}

const RftaSubmission: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [packet, setPacket] = useState<PacketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');

  // Form state
  const [tenantForm, setTenantForm] = useState({
    full_name: '', phone: '', email: '', current_address: '',
    household_size: '', annual_income: '', employer: '', notes: '',
  });
  const [landlordForm, setLandlordForm] = useState({
    owner_name: '', owner_phone: '', owner_email: '', property_address: '',
    unit_number: '', proposed_rent: '', lease_start_date: '', utilities_included: '', notes: '',
  });

  useEffect(() => {
    if (!token) return;
    loadPacket();
  }, [token]);

  const loadPacket = async () => {
    const { data, error } = await supabase
      .from('rfta_packets')
      .select('id, tenant_id, landlord_id, property_id, unit_id, agency_id, status, tenant_data, landlord_data, share_token')
      .eq('share_token', token!)
      .maybeSingle();

    if (error || !data) {
      toast.error('Invalid or expired submission link');
      setLoading(false);
      return;
    }

    const p = data as unknown as PacketData;
    setPacket(p);

    // Pre-fill forms if data exists
    if (p.tenant_data) {
      setTenantForm(prev => ({ ...prev, ...(p.tenant_data as any) }));
    }
    if (p.landlord_data) {
      setLandlordForm(prev => ({ ...prev, ...(p.landlord_data as any) }));
    }

    // Determine which side to show
    if (p.tenant_data && Object.keys(p.tenant_data).length > 0) {
      setRole('landlord');
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!packet) return;
    setSubmitting(true);

    const updates: Record<string, unknown> = {};
    if (role === 'tenant') {
      updates.tenant_data = tenantForm;
    } else {
      updates.landlord_data = landlordForm;
    }

    // Check if both sides are now complete
    const otherSideComplete = role === 'tenant'
      ? packet.landlord_data && Object.keys(packet.landlord_data).length > 0
      : packet.tenant_data && Object.keys(packet.tenant_data).length > 0;

    if (otherSideComplete) {
      updates.status = 'submitted';
      updates.submitted_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('rfta_packets')
      .update(updates)
      .eq('id', packet.id);

    if (error) {
      toast.error('Failed to submit. Please try again.');
      setSubmitting(false);
      return;
    }

    toast.success('Your portion has been submitted!');
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!packet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">This RFTA submission link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted || packet.status === 'submitted' || packet.status === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 className="text-lg font-semibold mb-2">Submission Complete</h2>
            <p className="text-muted-foreground">
              {submitted ? 'Your portion has been submitted successfully.' : 'This RFTA packet has already been submitted.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              RFTA Submission — {role === 'tenant' ? 'Tenant' : 'Landlord'} Portion
            </CardTitle>
            <CardDescription>
              Fill out your section of the Request for Tenancy Approval. Both tenant and landlord must complete their portions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role switcher */}
            <div className="flex gap-2 mb-6">
              <Button variant={role === 'tenant' ? 'default' : 'outline'} size="sm" onClick={() => setRole('tenant')}>
                I'm the Tenant
              </Button>
              <Button variant={role === 'landlord' ? 'default' : 'outline'} size="sm" onClick={() => setRole('landlord')}>
                I'm the Landlord
              </Button>
            </div>

            {role === 'tenant' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Full Name</Label><Input value={tenantForm.full_name} onChange={e => setTenantForm(p => ({ ...p, full_name: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={tenantForm.phone} onChange={e => setTenantForm(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div><Label>Email</Label><Input type="email" value={tenantForm.email} onChange={e => setTenantForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>Current Address</Label><Input value={tenantForm.current_address} onChange={e => setTenantForm(p => ({ ...p, current_address: e.target.value }))} /></div>
                  <div><Label>Household Size</Label><Input type="number" value={tenantForm.household_size} onChange={e => setTenantForm(p => ({ ...p, household_size: e.target.value }))} /></div>
                  <div><Label>Annual Income</Label><Input type="number" value={tenantForm.annual_income} onChange={e => setTenantForm(p => ({ ...p, annual_income: e.target.value }))} /></div>
                  <div><Label>Employer</Label><Input value={tenantForm.employer} onChange={e => setTenantForm(p => ({ ...p, employer: e.target.value }))} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={tenantForm.notes} onChange={e => setTenantForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Owner Name</Label><Input value={landlordForm.owner_name} onChange={e => setLandlordForm(p => ({ ...p, owner_name: e.target.value }))} /></div>
                  <div><Label>Owner Phone</Label><Input value={landlordForm.owner_phone} onChange={e => setLandlordForm(p => ({ ...p, owner_phone: e.target.value }))} /></div>
                  <div><Label>Owner Email</Label><Input type="email" value={landlordForm.owner_email} onChange={e => setLandlordForm(p => ({ ...p, owner_email: e.target.value }))} /></div>
                  <div><Label>Property Address</Label><Input value={landlordForm.property_address} onChange={e => setLandlordForm(p => ({ ...p, property_address: e.target.value }))} /></div>
                  <div><Label>Unit Number</Label><Input value={landlordForm.unit_number} onChange={e => setLandlordForm(p => ({ ...p, unit_number: e.target.value }))} /></div>
                  <div><Label>Proposed Rent ($)</Label><Input type="number" value={landlordForm.proposed_rent} onChange={e => setLandlordForm(p => ({ ...p, proposed_rent: e.target.value }))} /></div>
                  <div><Label>Lease Start Date</Label><Input type="date" value={landlordForm.lease_start_date} onChange={e => setLandlordForm(p => ({ ...p, lease_start_date: e.target.value }))} /></div>
                  <div><Label>Utilities Included</Label><Input value={landlordForm.utilities_included} onChange={e => setLandlordForm(p => ({ ...p, utilities_included: e.target.value }))} placeholder="e.g., Water, Gas" /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={landlordForm.notes} onChange={e => setLandlordForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
            )}

            <Button className="w-full mt-6" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit My Portion'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RftaSubmission;
