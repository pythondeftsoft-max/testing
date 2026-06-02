import React, { useState } from 'react';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Save, Send } from 'lucide-react';
import { useLandlordW9Submissions, useUpsertW9Submission, type W9Submission } from '@/hooks/tax/useW9Submissions';

interface Props {
  landlordId: string;
  agencyId?: string | null;
}

const schema = z.object({
  legal_name: z.string().trim().min(1, 'Required').max(200),
  business_name: z.string().trim().max(200).optional(),
  tax_classification: z.string(),
  tin_type: z.enum(['ssn', 'ein']),
  tin_last_four: z.string().regex(/^\d{4}$/, 'Enter last 4 digits'),
  address_line1: z.string().trim().min(1, 'Required').max(200),
  address_line2: z.string().trim().max(200).optional(),
  address_city: z.string().trim().min(1).max(100),
  address_state: z.string().trim().length(2, 'Use 2-letter state'),
  address_zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP'),
  signature_typed_name: z.string().trim().min(1, 'Sign by typing your name'),
});

const TAX_CLASS_OPTIONS = [
  ['individual', 'Individual / Sole Proprietor'],
  ['single_member_llc', 'Single-member LLC'],
  ['llc_c', 'LLC – C corporation'],
  ['llc_s', 'LLC – S corporation'],
  ['llc_p', 'LLC – Partnership'],
  ['c_corporation', 'C Corporation'],
  ['s_corporation', 'S Corporation'],
  ['partnership', 'Partnership'],
  ['trust_estate', 'Trust / Estate'],
  ['other', 'Other'],
] as const;

const LandlordW9Form: React.FC<Props> = ({ landlordId, agencyId }) => {
  const currentYear = new Date().getFullYear();
  const { data: submissions } = useLandlordW9Submissions(landlordId);
  const upsert = useUpsertW9Submission();

  const existing = submissions?.find(s => s.tax_year === currentYear);
  const [taxYear, setTaxYear] = useState(currentYear);
  const [form, setForm] = useState<Partial<W9Submission>>(existing || {
    tax_year: currentYear,
    tax_classification: 'individual',
    tin_type: 'ssn',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    const found = submissions?.find(s => s.tax_year === taxYear);
    if (found) setForm(found);
    else setForm({ tax_year: taxYear, tax_classification: 'individual', tin_type: 'ssn' });
  }, [taxYear, submissions]);

  const update = (k: keyof W9Submission, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (asSubmit: boolean) => {
    setErrors({});
    if (asSubmit) {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
        setErrors(errs);
        return;
      }
    }
    const payload: any = {
      ...form,
      landlord_id: landlordId,
      agency_id: agencyId || null,
      tax_year: taxYear,
      status: asSubmit ? 'submitted' : 'draft',
    };
    if (asSubmit) {
      payload.submitted_at = new Date().toISOString();
      payload.signed_at = new Date().toISOString();
    }
    await upsert.mutateAsync(payload);
  };

  const isReadOnly = form.status === 'verified';
  const statusBadge = form.status === 'verified'
    ? <Badge className="bg-green-100 text-green-800"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>
    : form.status === 'submitted' ? <Badge variant="secondary">Awaiting Review</Badge>
    : form.status === 'rejected' ? <Badge variant="destructive">Rejected</Badge>
    : <Badge variant="outline">Draft</Badge>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>W-9 Tax Form</CardTitle>
            <CardDescription>Required for 1099 reporting if you receive $600+ in HAP payments per year.</CardDescription>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-xs">
            For your security, only the last 4 digits of your TIN are stored. Your housing authority will verify your full TIN separately.
          </AlertDescription>
        </Alert>

        {form.status === 'rejected' && form.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription>Rejected: {form.rejection_reason}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tax Year</Label>
            <Select value={String(taxYear)} onValueChange={v => setTaxYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0,1,2].map(o => <SelectItem key={o} value={String(currentYear-o)}>{currentYear-o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tax Classification</Label>
            <Select disabled={isReadOnly} value={form.tax_classification || 'individual'} onValueChange={v => update('tax_classification', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TAX_CLASS_OPTIONS.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Legal Name *</Label>
          <Input disabled={isReadOnly} value={form.legal_name || ''} onChange={e => update('legal_name', e.target.value)} />
          {errors.legal_name && <p className="text-xs text-destructive mt-1">{errors.legal_name}</p>}
        </div>

        <div>
          <Label>Business Name (if different)</Label>
          <Input disabled={isReadOnly} value={form.business_name || ''} onChange={e => update('business_name', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>TIN Type</Label>
            <Select disabled={isReadOnly} value={form.tin_type || 'ssn'} onValueChange={v => update('tin_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ssn">SSN</SelectItem>
                <SelectItem value="ein">EIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Last 4 of TIN *</Label>
            <Input maxLength={4} disabled={isReadOnly} value={form.tin_last_four || ''} onChange={e => update('tin_last_four', e.target.value.replace(/\D/g, ''))} />
            {errors.tin_last_four && <p className="text-xs text-destructive mt-1">{errors.tin_last_four}</p>}
          </div>
        </div>

        <div>
          <Label>Address Line 1 *</Label>
          <Input disabled={isReadOnly} value={form.address_line1 || ''} onChange={e => update('address_line1', e.target.value)} />
          {errors.address_line1 && <p className="text-xs text-destructive mt-1">{errors.address_line1}</p>}
        </div>
        <div>
          <Label>Address Line 2</Label>
          <Input disabled={isReadOnly} value={form.address_line2 || ''} onChange={e => update('address_line2', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label>City *</Label>
            <Input disabled={isReadOnly} value={form.address_city || ''} onChange={e => update('address_city', e.target.value)} />
            {errors.address_city && <p className="text-xs text-destructive mt-1">{errors.address_city}</p>}
          </div>
          <div>
            <Label>State *</Label>
            <Input maxLength={2} disabled={isReadOnly} value={form.address_state || ''} onChange={e => update('address_state', e.target.value.toUpperCase())} />
            {errors.address_state && <p className="text-xs text-destructive mt-1">{errors.address_state}</p>}
          </div>
        </div>
        <div>
          <Label>ZIP *</Label>
          <Input disabled={isReadOnly} value={form.address_zip || ''} onChange={e => update('address_zip', e.target.value)} />
          {errors.address_zip && <p className="text-xs text-destructive mt-1">{errors.address_zip}</p>}
        </div>

        <div>
          <Label>Signature (type full legal name) *</Label>
          <Input disabled={isReadOnly} value={form.signature_typed_name || ''} onChange={e => update('signature_typed_name', e.target.value)} placeholder="Type your full legal name" />
          {errors.signature_typed_name && <p className="text-xs text-destructive mt-1">{errors.signature_typed_name}</p>}
          <p className="text-xs text-muted-foreground mt-1">By typing your name above and clicking Submit, you certify under penalty of perjury that the information provided is correct.</p>
        </div>

        {!isReadOnly && (
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={upsert.isPending}>
              <Save className="w-4 h-4 mr-2" />Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={upsert.isPending}>
              <Send className="w-4 h-4 mr-2" />Submit for Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LandlordW9Form;
