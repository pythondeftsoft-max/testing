import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Mail, Phone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { PipelineCard } from './usePipelineData';

const ROLE_OPTIONS = [
  { value: 'ed', label: 'Executive Director' },
  { value: 'deputy', label: 'Deputy Director / COO' },
  { value: 's8_director', label: 'Section 8 Director' },
  { value: 'it', label: 'IT Director / CIO' },
  { value: 'finance', label: 'Finance Director / CFO' },
  { value: 'procurement', label: 'Procurement Officer' },
  { value: 'board', label: 'Board Chair' },
  { value: 'legal', label: 'Legal Counsel' },
  { value: 'other', label: 'Other' },
];

interface Props {
  card: PipelineCard;
}

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  role: string;
  is_primary: boolean;
  is_billing: boolean;
  is_signer: boolean;
  is_technical: boolean;
}

export function DealContactsPanel({ card }: Props) {
  const qc = useQueryClient();
  const parentCol = card.source === 'lead' ? 'lead_id' : 'prospect_id';

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['deal-contacts', card.source, card.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_deal_contacts')
        .select('*')
        .eq(parentCol, card.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ContactRow[];
    },
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const payload: any = {
        [parentCol]: card.id,
        name: 'New Contact',
        role: 'other',
      };
      const { error } = await (supabase as any).from('agency_deal_contacts').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-contacts', card.source, card.id] }),
    onError: (e: any) => toast.error(e.message ?? 'Failed to add contact'),
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ContactRow> }) => {
      const { error } = await (supabase as any).from('agency_deal_contacts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-contacts', card.source, card.id] }),
  });

  const removeContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('agency_deal_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-contacts', card.source, card.id] });
      toast.success('Contact removed');
    },
  });

  // Gate: need ED + billing + (operational or technical) to advance to Demo.
  const hasEd = contacts.some((c) => c.role === 'ed' || c.is_signer);
  const hasBilling = contacts.some((c) => c.is_billing);
  const hasOps = contacts.some((c) =>
    ['deputy', 's8_director', 'it', 'finance'].includes(c.role)
  );
  const gateOk = hasEd && hasBilling && hasOps;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Buying committee</h3>
          <p className="text-xs text-muted-foreground">
            Capture every stakeholder. Required to advance Qualified → Demo.
          </p>
        </div>
        <Button size="sm" onClick={() => addContact.mutate()} disabled={addContact.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Add contact
        </Button>
      </div>

      {!gateOk && contacts.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-2 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-amber-900 dark:text-amber-200">
            Need at least: <b>1 signer/ED</b> ({hasEd ? '✓' : '✗'}),{' '}
            <b>1 billing contact</b> ({hasBilling ? '✓' : '✗'}),{' '}
            <b>1 operational contact</b> ({hasOps ? '✓' : '✗'}).
          </div>
        </div>
      )}

      {gateOk && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 p-2 text-xs text-emerald-900 dark:text-emerald-200">
          ✓ Buying committee complete — ready to advance to Demo.
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="inline h-4 w-4 animate-spin" /></div>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No contacts yet. Add the ED first.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-md border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={c.name}
                    onChange={(e) => updateContact.mutate({ id: c.id, patch: { name: e.target.value } })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select value={c.role} onValueChange={(v) => updateContact.mutate({ id: c.id, patch: { role: v } })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={c.title ?? ''}
                    onChange={(e) => updateContact.mutate({ id: c.id, patch: { title: e.target.value } })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={c.phone ?? ''}
                    onChange={(e) => updateContact.mutate({ id: c.id, patch: { phone: e.target.value } })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={c.email ?? ''}
                    onChange={(e) => updateContact.mutate({ id: c.id, patch: { email: e.target.value } })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {[
                  { key: 'is_primary' as const, label: 'Primary' },
                  { key: 'is_signer' as const, label: 'Signer' },
                  { key: 'is_billing' as const, label: 'Billing' },
                  { key: 'is_technical' as const, label: 'Technical' },
                ].map((flag) => (
                  <label key={flag.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={c[flag.key]}
                      onCheckedChange={(v) =>
                        updateContact.mutate({ id: c.id, patch: { [flag.key]: !!v } as any })
                      }
                    />
                    {flag.label}
                  </label>
                ))}
                <div className="ml-auto flex items-center gap-1">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => removeContact.mutate(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
