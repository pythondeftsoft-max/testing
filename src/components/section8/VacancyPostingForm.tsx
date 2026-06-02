import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Loader2, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Props {
  registrationId: string;
  agencyId: string;
  units: Array<{ id: string; property?: { address?: string; name?: string }; unit?: { unit_number?: string } }>;
}

const VacancyPostingForm: React.FC<Props> = ({ registrationId, agencyId, units }) => {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    unit_id: '',
    available_date: '',
    asking_rent: '',
    bedrooms: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: postings } = useQuery({
    queryKey: ['vacancy-postings', registrationId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('agency_vacancy_postings')
        .select('*')
        .eq('landlord_id', registrationId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!form.available_date) {
      toast.error('Please select an availability date');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('agency_vacancy_postings').insert({
        agency_id: agencyId,
        landlord_id: registrationId,
        unit_id: form.unit_id || null,
        available_date: form.available_date,
        asking_rent: form.asking_rent ? parseFloat(form.asking_rent) : null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        notes: form.notes || null,
      } as any);
      if (error) throw error;
      toast.success('Vacancy posted successfully');
      setShowForm(false);
      setForm({ unit_id: '', available_date: '', asking_rent: '', bedrooms: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['vacancy-postings', registrationId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to post vacancy');
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawPosting = async (id: string) => {
    await (supabase as any).from('agency_vacancy_postings').update({ status: 'withdrawn' }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['vacancy-postings', registrationId] });
    toast.success('Vacancy withdrawn');
  };

  const openPostings = postings?.filter((p: any) => p.status === 'open') || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Home className="w-4 h-4" /> Vacancy Postings ({openPostings.length} open)
        </h4>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3 h-3 mr-1" /> Post Vacancy
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">New Vacancy Posting</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {units.length > 0 && (
              <div>
                <Label className="text-xs">Unit (optional)</Label>
                <Select value={form.unit_id} onValueChange={v => setForm({ ...form, unit_id: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select unit..." /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.property?.address || u.property?.name || 'Property'}{u.unit?.unit_number ? ` — Unit ${u.unit.unit_number}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Available Date *</Label>
                <Input type="date" className="h-8 text-sm" value={form.available_date} onChange={e => setForm({ ...form, available_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Asking Rent ($)</Label>
                <Input type="number" className="h-8 text-sm" placeholder="e.g. 1200" value={form.asking_rent} onChange={e => setForm({ ...form, asking_rent: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Bedrooms</Label>
                <Input type="number" className="h-8 text-sm" min="0" max="10" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-sm min-h-[60px]" placeholder="Any additional details..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Submit Vacancy
            </Button>
          </CardContent>
        </Card>
      )}

      {openPostings.length > 0 && (
        <div className="space-y-2">
          {openPostings.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-border/50 text-sm">
              <div>
                <span className="font-medium">
                  {p.bedrooms ? `${p.bedrooms}BR` : 'Unit'} — Available {new Date(p.available_date).toLocaleDateString()}
                </span>
                {p.asking_rent && <span className="ml-2 text-muted-foreground">${Number(p.asking_rent).toLocaleString()}/mo</span>}
                {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Open</Badge>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => withdrawPosting(p.id)}>
                  Withdraw
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VacancyPostingForm;
