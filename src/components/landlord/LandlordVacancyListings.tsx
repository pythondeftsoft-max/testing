import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Home, Plus, MapPin, Bed, Bath, DollarSign, Calendar, Eye, Trash2, Edit } from 'lucide-react';
import { z } from 'zod';

interface Props {
  landlordId: string;
}

interface Vacancy {
  id: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  available_date: string;
  description: string | null;
  accepts_section8: boolean;
  accepts_vash: boolean;
  accepts_emergency_vouchers: boolean;
  pet_friendly: boolean;
  wheelchair_accessible: boolean;
  status: string;
  views_count: number;
  inquiries_count: number;
  photos: string[] | null;
  created_at: string;
}

const vacancySchema = z.object({
  address_line1: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().length(2),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  monthly_rent: z.number().min(1).max(100000),
  available_date: z.string().min(1),
  description: z.string().max(2000).optional(),
});

const blankForm = {
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  bedrooms: 1,
  bathrooms: 1,
  square_feet: '',
  monthly_rent: 0,
  available_date: new Date().toISOString().split('T')[0],
  description: '',
  accepts_section8: true,
  accepts_vash: false,
  accepts_emergency_vouchers: false,
  pet_friendly: false,
  wheelchair_accessible: false,
  contact_email: '',
  contact_phone: '',
};

const LandlordVacancyListings: React.FC<Props> = ({ landlordId }) => {
  const { toast } = useToast();
  const [listings, setListings] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(blankForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchListings(); }, [landlordId]);

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('landlord_vacancy_listings')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Failed to load listings', description: error.message, variant: 'destructive' });
    else setListings(data || []);
    setLoading(false);
  };

  const openNew = () => { setEditId(null); setForm(blankForm); setOpen(true); };
  const openEdit = (v: Vacancy) => {
    setEditId(v.id);
    setForm({
      ...blankForm,
      ...v,
      square_feet: '',
      contact_email: '',
      contact_phone: '',
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const parsed = vacancySchema.safeParse({
      ...form,
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      monthly_rent: Number(form.monthly_rent),
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast({ title: 'Validation error', description: first || 'Check your input', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        landlord_id: landlordId,
        address_line1: form.address_line1,
        address_line2: form.address_line2 || null,
        city: form.city,
        state: form.state.toUpperCase(),
        zip_code: form.zip_code,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        square_feet: form.square_feet ? Number(form.square_feet) : null,
        monthly_rent: Number(form.monthly_rent),
        available_date: form.available_date,
        description: form.description || null,
        accepts_section8: form.accepts_section8,
        accepts_vash: form.accepts_vash,
        accepts_emergency_vouchers: form.accepts_emergency_vouchers,
        pet_friendly: form.pet_friendly,
        wheelchair_accessible: form.wheelchair_accessible,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
      };

      const { error } = editId
        ? await supabase.from('landlord_vacancy_listings').update(payload).eq('id', editId)
        : await supabase.from('landlord_vacancy_listings').insert(payload);

      if (error) throw error;
      toast({ title: editId ? 'Listing updated' : 'Listing posted', description: 'Visible in the marketplace.' });
      setOpen(false);
      fetchListings();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('landlord_vacancy_listings').update({ status: next }).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else fetchListings();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    const { error } = await supabase.from('landlord_vacancy_listings').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchListings(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vacancy Listings</h3>
          <p className="text-sm text-muted-foreground">Post your available units. Voucher-holders find them in the marketplace.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Listing</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No listings yet. Post your first vacancy to attract Section 8 tenants.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {listings.map(v => (
            <Card key={v.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{v.address_line1}</h4>
                      <Badge variant={v.status === 'active' ? 'default' : 'secondary'}>{v.status}</Badge>
                      {v.accepts_section8 && <Badge variant="outline">Section 8</Badge>}
                      {v.accepts_vash && <Badge variant="outline">VASH</Badge>}
                      {v.accepts_emergency_vouchers && <Badge variant="outline">EHV</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />{v.city}, {v.state} {v.zip_code}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{v.bedrooms} bd</span>
                      <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{v.bathrooms} ba</span>
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${Number(v.monthly_rent).toLocaleString()}/mo</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Avail {new Date(v.available_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{v.views_count} views</span>
                      <span>{v.inquiries_count} inquiries</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(v)}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(v.id, v.status)}>
                      {v.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(v.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Listing' : 'New Vacancy Listing'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Address *</Label>
              <Input value={form.address_line1} onChange={e => setForm({...form, address_line1: e.target.value})} />
            </div>
            <div>
              <Label>City *</Label>
              <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>State *</Label>
                <Input maxLength={2} value={form.state} onChange={e => setForm({...form, state: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <Label>ZIP *</Label>
                <Input value={form.zip_code} onChange={e => setForm({...form, zip_code: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Bedrooms *</Label>
              <Input type="number" min={0} value={form.bedrooms} onChange={e => setForm({...form, bedrooms: e.target.value})} />
            </div>
            <div>
              <Label>Bathrooms *</Label>
              <Input type="number" min={0} step={0.5} value={form.bathrooms} onChange={e => setForm({...form, bathrooms: e.target.value})} />
            </div>
            <div>
              <Label>Square Feet</Label>
              <Input type="number" value={form.square_feet} onChange={e => setForm({...form, square_feet: e.target.value})} />
            </div>
            <div>
              <Label>Monthly Rent *</Label>
              <Input type="number" min={0} value={form.monthly_rent} onChange={e => setForm({...form, monthly_rent: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Available Date *</Label>
              <Input type="date" value={form.available_date} onChange={e => setForm({...form, available_date: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-2 border-t pt-3">
              <p className="text-sm font-medium">Voucher Acceptance</p>
              <div className="flex items-center justify-between">
                <Label>Accepts Section 8 (HCV)</Label>
                <Switch checked={form.accepts_section8} onCheckedChange={v => setForm({...form, accepts_section8: v})} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Accepts VASH</Label>
                <Switch checked={form.accepts_vash} onCheckedChange={v => setForm({...form, accepts_vash: v})} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Accepts Emergency Housing Vouchers (EHV)</Label>
                <Switch checked={form.accepts_emergency_vouchers} onCheckedChange={v => setForm({...form, accepts_emergency_vouchers: v})} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Pet-Friendly</Label>
                <Switch checked={form.pet_friendly} onCheckedChange={v => setForm({...form, pet_friendly: v})} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Wheelchair Accessible</Label>
                <Switch checked={form.wheelchair_accessible} onCheckedChange={v => setForm({...form, wheelchair_accessible: v})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : editId ? 'Update' : 'Post Listing'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandlordVacancyListings;
