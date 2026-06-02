import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onInvited: () => void;
}

const InviteStaffDialog: React.FC<InviteStaffDialogProps> = ({ open, onOpenChange, agencyId, onInvited }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('caseworker');
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) { toast.error('Email is required'); return; }
    setSaving(true);

    // Look up user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (!profile) {
      toast.error('No user found with that email. They must create an account first.');
      setSaving(false);
      return;
    }

    // Check if already staff
    const { data: existing } = await supabase
      .from('agency_staff')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      toast.error('This user is already on your staff roster.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('agency_staff').insert({
      agency_id: agencyId,
      user_id: profile.id,
      role: role as any,
      is_active: true,
    });

    if (error) {
      toast.error('Failed to add staff member');
    } else {
      toast.success(`${email} added as ${role.replace('_', ' ')}`);
      setEmail('');
      setRole('caseworker');
      onOpenChange(false);
      onInvited();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email Address</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">The user must already have an OpenKey account.</p>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agency_admin">Agency Admin</SelectItem>
                <SelectItem value="caseworker">Caseworker</SelectItem>
                <SelectItem value="inspector">Inspector</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleInvite} disabled={saving}>
            {saving ? 'Adding...' : 'Add Staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteStaffDialog;
