import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agencyId: string;
  agencyName?: string;
  defaultEmail?: string;
  defaultFirstName?: string;
  defaultLastName?: string;
}

const ROLES = [
  { value: 'agency_admin', label: 'Agency Admin (full access)' },
  { value: 'executive_director', label: 'Executive Director' },
  { value: 'caseworker_supervisor', label: 'Caseworker Supervisor' },
  { value: 'inspection_supervisor', label: 'Inspection Supervisor' },
  { value: 'finance', label: 'Finance' },
  { value: 'caseworker', label: 'Caseworker' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'intake_clerk', label: 'Intake Clerk' },
  { value: 'viewer', label: 'Viewer (read-only)' },
];

export const GrantAdminAccessDialog: React.FC<Props> = ({
  open, onOpenChange, agencyId, agencyName, defaultEmail, defaultFirstName, defaultLastName,
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState(defaultEmail || '');
  const [firstName, setFirstName] = useState(defaultFirstName || '');
  const [lastName, setLastName] = useState(defaultLastName || '');
  const [role, setRole] = useState('agency_admin');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setEmail(defaultEmail || '');
      setFirstName(defaultFirstName || '');
      setLastName(defaultLastName || '');
    }
  }, [open, defaultEmail, defaultFirstName, defaultLastName]);

  const submit = async () => {
    if (!email.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          operation: 'invite_agency_staff',
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          agency_id: agencyId,
          staff_role: role,
        },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Failed');

      toast({
        title: 'Access granted',
        description: `${email} invited as ${role.replace('_', ' ')}.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Grant agency access
          </DialogTitle>
          <DialogDescription>
            Invite this person to {agencyName || 'the agency'}. They'll receive an email to set up their
            password and land directly in the onboarding wizard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !email.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrantAdminAccessDialog;
