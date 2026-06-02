import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accessibility, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
}

const TYPES = [
  { value: 'larger_unit', label: 'Larger Unit' },
  { value: 'live_in_aide', label: 'Live-In Aide' },
  { value: 'extended_shopping', label: 'Extended Voucher Shopping Time' },
  { value: 'transfer', label: 'Unit Transfer' },
  { value: 'assistance_animal', label: 'Assistance Animal' },
  { value: 'accessibility_modification', label: 'Accessibility Modification' },
  { value: 'other', label: 'Other' },
];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  under_review: 'secondary',
  approved: 'secondary',
  denied: 'destructive',
  withdrawn: 'outline',
};

const AccommodationRequestForm: React.FC<Props> = ({ userId }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('larger_unit');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: profile } = await supabase
        .from('tenant_profiles')
        .select('housing_authority_id')
        .eq('user_id', userId)
        .maybeSingle();
      setAgencyId(profile?.housing_authority_id || null);

      const { data } = await supabase
        .from('agency_accommodation_requests')
        .select('*')
        .eq('tenant_id', userId)
        .order('request_date', { ascending: false });
      setRequests(data || []);
      setLoading(false);
    })();
  }, [userId]);

  const submit = async () => {
    if (!agencyId) return toast.error('No agency on file');
    if (!description.trim()) return toast.error('Describe your request');
    setSaving(true);
    const { error } = await supabase.from('agency_accommodation_requests').insert({
      tenant_id: userId,
      agency_id: agencyId,
      accommodation_type: type,
      description,
      status: 'pending',
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Request submitted to your agency');
    setOpen(false);
    setDescription('');
    const { data } = await supabase
      .from('agency_accommodation_requests')
      .select('*')
      .eq('tenant_id', userId)
      .order('request_date', { ascending: false });
    setRequests(data || []);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Accessibility className="w-4 h-4" /> Reasonable Accommodation Requests</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Submit requests under Section 504 / Fair Housing Act</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!agencyId}>
          <Plus className="w-4 h-4 mr-1" /> New Request
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No requests submitted</p>
        ) : (
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{TYPES.find(t => t.value === r.accommodation_type)?.label}</span>
                  <Badge variant={STATUS_VARIANTS[r.status] || 'outline'} className="capitalize">{r.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Submitted {r.request_date}</p>
                <p className="text-xs mt-1 whitespace-pre-wrap">{r.description}</p>
                {r.denial_reason && <p className="text-xs mt-1 text-destructive">Denial reason: {r.denial_reason}</p>}
                {r.decision_notes && <p className="text-xs mt-1 text-muted-foreground">Notes: {r.decision_notes}</p>}
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Accommodation Request</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type of Accommodation</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description / Justification</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Describe your disability-related need and the accommodation requested..." />
              </div>
              <p className="text-xs text-muted-foreground">Your agency will respond within ~14 days. You may be asked for supporting documentation.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AccommodationRequestForm;
