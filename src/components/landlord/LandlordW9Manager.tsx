import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, CheckCircle2, Clock, XCircle, Plus, Download } from 'lucide-react';
import { z } from 'zod';

interface Props {
  landlordId: string;
}

interface W9Document {
  id: string;
  tax_year: number;
  legal_name: string;
  business_name: string | null;
  tax_classification: string;
  tin_type: string;
  tin_last_four: string | null;
  status: string;
  file_path: string | null;
  file_name: string | null;
  signature_date: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

const w9Schema = z.object({
  tax_year: z.number().min(2020).max(2100),
  legal_name: z.string().trim().min(1).max(200),
  business_name: z.string().trim().max(200).optional().or(z.literal('')),
  tax_classification: z.string(),
  tin_type: z.string(),
  tin_last_four: z.string().regex(/^\d{4}$/, 'Must be 4 digits').optional().or(z.literal('')),
  address_line1: z.string().trim().max(200),
  city: z.string().trim().max(100),
  state: z.string().trim().length(2),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip'),
  signature_name: z.string().trim().min(1).max(200),
});

const LandlordW9Manager: React.FC<Props> = ({ landlordId }) => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<W9Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    tax_year: currentYear,
    legal_name: '',
    business_name: '',
    tax_classification: 'individual',
    tin_type: 'ssn',
    tin_last_four: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    signature_name: '',
  });

  useEffect(() => {
    fetchDocs();
  }, [landlordId]);

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('landlord_w9_documents')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('tax_year', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load W-9s', description: error.message, variant: 'destructive' });
    } else {
      setDocs(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    const parsed = w9Schema.safeParse({ ...form, tax_year: Number(form.tax_year) });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast({ title: 'Validation error', description: first || 'Check your input', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let file_path: string | null = null;
      let file_name: string | null = null;
      let file_size: number | null = null;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${landlordId}/w9-${form.tax_year}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('w9-documents')
          .upload(path, file, { upsert: false });
        if (uploadErr) throw uploadErr;
        file_path = path;
        file_name = file.name;
        file_size = file.size;
      }

      const { error } = await supabase.from('landlord_w9_documents').insert({
        landlord_id: landlordId,
        tax_year: Number(form.tax_year),
        legal_name: form.legal_name,
        business_name: form.business_name || null,
        tax_classification: form.tax_classification,
        tin_type: form.tin_type,
        tin_last_four: form.tin_last_four || null,
        address_line1: form.address_line1,
        city: form.city,
        state: form.state.toUpperCase(),
        zip_code: form.zip_code,
        signature_name: form.signature_name,
        signature_date: new Date().toISOString().split('T')[0],
        file_path,
        file_name,
        file_size,
        status: 'submitted',
      });

      if (error) throw error;

      toast({ title: 'W-9 submitted', description: 'Your tax form has been recorded.' });
      setOpen(false);
      setFile(null);
      setForm({ ...form, legal_name: '', signature_name: '' });
      fetchDocs();
    } catch (e: any) {
      toast({ title: 'Submission failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadFile = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('w9-documents').createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: 'Download failed', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const statusBadge = (s: string) => {
    if (s === 'approved') return <Badge variant="default" className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    if (s === 'rejected') return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">W-9 Tax Forms</h3>
          <p className="text-sm text-muted-foreground">Submit and track your W-9s for 1099-MISC reporting</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Submit W-9</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Submit W-9 Form</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>Tax Year</Label>
                <Input type="number" value={form.tax_year} onChange={e => setForm({...form, tax_year: Number(e.target.value)})} />
              </div>
              <div>
                <Label>Tax Classification</Label>
                <Select value={form.tax_classification} onValueChange={v => setForm({...form, tax_classification: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                    <SelectItem value="c_corp">C Corporation</SelectItem>
                    <SelectItem value="s_corp">S Corporation</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="trust">Trust / Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Legal Name (as shown on tax return) *</Label>
                <Input value={form.legal_name} onChange={e => setForm({...form, legal_name: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label>Business Name / Disregarded Entity</Label>
                <Input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} />
              </div>
              <div>
                <Label>TIN Type</Label>
                <Select value={form.tin_type} onValueChange={v => setForm({...form, tin_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssn">SSN</SelectItem>
                    <SelectItem value="ein">EIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Last 4 of TIN (for verification)</Label>
                <Input maxLength={4} value={form.tin_last_four} onChange={e => setForm({...form, tin_last_four: e.target.value.replace(/\D/g,'')})} />
              </div>
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
              <div className="col-span-2">
                <Label>Signature (type your full legal name) *</Label>
                <Input value={form.signature_name} onChange={e => setForm({...form, signature_name: e.target.value})} placeholder="By typing my name, I certify the information above is accurate" />
              </div>
              <div className="col-span-2">
                <Label>Upload signed W-9 PDF (optional)</Label>
                <Input type="file" accept=".pdf,.jpg,.png" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit W-9'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No W-9 forms on file. Submit one to enable 1099-MISC tax reporting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map(d => (
            <Card key={d.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Tax Year {d.tax_year}</span>
                      {statusBadge(d.status)}
                    </div>
                    <p className="text-sm mt-1">{d.legal_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.tax_classification.replace('_', ' ')} • {d.tin_type.toUpperCase()}
                      {d.tin_last_four && ` ****${d.tin_last_four}`}
                    </p>
                    {d.review_notes && (
                      <p className="text-xs text-warning mt-2">Reviewer note: {d.review_notes}</p>
                    )}
                  </div>
                  {d.file_path && (
                    <Button size="sm" variant="outline" onClick={() => downloadFile(d.file_path!, d.file_name!)}>
                      <Download className="h-4 w-4 mr-1" />Download
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandlordW9Manager;
