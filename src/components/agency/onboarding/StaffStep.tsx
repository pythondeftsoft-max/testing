import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

interface InviteRow {
  email: string;
  role: string;
}

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
}

const ROLE_OPTIONS = [
  { value: 'agency_admin', label: 'Agency Admin' },
  { value: 'caseworker_supervisor', label: 'Caseworker Supervisor' },
  { value: 'caseworker', label: 'Caseworker' },
  { value: 'inspector_supervisor', label: 'Inspector Supervisor' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'finance', label: 'Finance' },
  { value: 'viewer', label: 'Viewer' },
];

export const StaffStep: React.FC<Props> = ({ agencyId }) => {
  const [drafts, setDrafts] = useState<InviteRow[]>([{ email: '', role: 'caseworker' }]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('agency_staff')
      .select('id, user_id, role')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!rows || rows.length === 0) {
      setStaff([]);
      setLoading(false);
      return;
    }

    const userIds = rows.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    const merged: StaffMember[] = rows.map(r => {
      const p = profiles?.find(p => p.id === r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        email: p?.email,
        full_name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : undefined,
      };
    });
    setStaff(merged);
    setLoading(false);
  };

  useEffect(() => { loadStaff(); }, [agencyId]);

  const addDraft = () => setDrafts(d => [...d, { email: '', role: 'caseworker' }]);
  const removeDraft = (i: number) => setDrafts(d => d.filter((_, idx) => idx !== i));
  const updateDraft = (i: number, key: keyof InviteRow, value: string) => {
    setDrafts(d => d.map((row, idx) => idx === i ? { ...row, [key]: value } : row));
  };

  const handleAddAll = async () => {
    const validDrafts = drafts.filter(d => d.email.trim() && d.role);
    if (validDrafts.length === 0) {
      toast.error('Add at least one email + role');
      return;
    }
    setSaving(true);

    let added = 0;
    let notFound: string[] = [];
    let alreadyExists: string[] = [];
    let errors: string[] = [];

    for (const draft of validDrafts) {
      const email = draft.email.trim().toLowerCase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!profile) { notFound.push(email); continue; }

      const { data: existing } = await supabase
        .from('agency_staff')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (existing) { alreadyExists.push(email); continue; }

      const { error } = await supabase.from('agency_staff').insert({
        agency_id: agencyId,
        user_id: profile.id,
        role: draft.role as any,
        is_active: true,
      });
      if (error) { errors.push(`${email}: ${error.message}`); continue; }
      added++;
    }

    if (added > 0) toast.success(`Added ${added} staff member${added > 1 ? 's' : ''}`);
    if (notFound.length) toast.error(`Not found (must sign up first): ${notFound.join(', ')}`);
    if (alreadyExists.length) toast.message(`Already on roster: ${alreadyExists.join(', ')}`);
    if (errors.length) toast.error(errors.join('; '));

    setDrafts([{ email: '', role: 'caseworker' }]);
    setSaving(false);
    loadStaff();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this staff member?')) return;
    const { error } = await supabase
      .from('agency_staff')
      .update({ is_active: false })
      .eq('id', id);
    if (error) { toast.error('Remove failed'); return; }
    toast.success('Removed');
    loadStaff();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Add team members by email. Each user must already have an OpenKey account — share the signup link with anyone who doesn't.
        </p>

        <div className="space-y-2">
          {drafts.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="staff@yourpha.gov"
                value={row.email}
                onChange={e => updateDraft(i, 'email', e.target.value)}
                className="flex-1"
              />
              <Select value={row.role} onValueChange={(v) => updateDraft(i, 'role', v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {drafts.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeDraft(i)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={addDraft}>
            <Plus className="h-4 w-4 mr-1" /> Add another
          </Button>
          <Button size="sm" onClick={handleAddAll} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Add to staff
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-sm">Current staff</Label>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : staff.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-md mt-2">
            <AlertCircle className="h-4 w-4" /> No staff yet — add some above.
          </div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {staff.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-md border bg-card">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <div>
                    <div className="text-sm font-medium">{s.full_name || s.email || s.user_id.slice(0, 8)}</div>
                    {s.email && s.full_name && <div className="text-xs text-muted-foreground">{s.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{s.role.replace(/_/g, ' ')}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(s.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Manage staff in detail later from <strong>Admin → Operations → Staff</strong>.
      </p>
    </div>
  );
};

export default StaffStep;
