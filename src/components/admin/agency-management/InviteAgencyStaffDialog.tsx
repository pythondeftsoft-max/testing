import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  agencyId: string;
  agencyName: string;
  /** Existing staff list — used to default to agency_admin when no admins exist. */
  existingStaff?: Array<{ role?: string | null; is_active?: boolean | null }>;
}

function genPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const sym = '!@#$%^&*';
  let pw = '';
  for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw + sym[Math.floor(Math.random() * sym.length)] + Math.floor(Math.random() * 10);
}

export const InviteAgencyStaffDialog: React.FC<Props> = ({ agencyId, agencyName, existingStaff = [] }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const hasActiveAdmin = useMemo(
    () => existingStaff.some(s => s.is_active && s.role === 'agency_admin'),
    [existingStaff]
  );
  const defaultRole = hasActiveAdmin ? 'viewer' : 'agency_admin';

  const [tab, setTab] = useState<'invite' | 'password'>('invite');
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', role: defaultRole, password: '',
  });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm({ email: '', first_name: '', last_name: '', role: defaultRole, password: '' });
      setCreatedPassword(null);
      setTab('invite');
    }
  }, [open, defaultRole]);

  const sendInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          operation: 'invite_agency_staff',
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          agency_id: agencyId,
          staff_role: form.role,
        },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Invite email sent');
      queryClient.invalidateQueries({ queryKey: ['agency-staff', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['all-agency-staff'] });
      setOpen(false);
    },
    onError: (e: any) => toast.error('Failed to send invite', { description: e.message }),
  });

  const createWithPassword = useMutation({
    mutationFn: async () => {
      const password = form.password || genPassword();
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          operation: 'create_agency_staff_with_password',
          email: form.email,
          password,
          first_name: form.first_name,
          last_name: form.last_name,
          agency_id: agencyId,
          staff_role: form.role,
        },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error);
      return password;
    },
    onSuccess: (password) => {
      toast.success('Staff account created');
      setCreatedPassword(password);
      queryClient.invalidateQueries({ queryKey: ['agency-staff', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['all-agency-staff'] });
    },
    onError: (e: any) => toast.error('Failed to create user', { description: e.message }),
  });

  const valid = form.email && form.first_name;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" />Invite Staff</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Agency Staff</DialogTitle>
          <DialogDescription>
            Add a staff member to {agencyName}.
            {!hasActiveAdmin && (
              <span className="block mt-2 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> This will be the first admin for this agency.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {createdPassword ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium mb-1">⚠️ One-time password — copy it now</p>
              <p className="text-muted-foreground text-xs">
                You won't be able to view this again. The user will be required to change it on first login.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input value={createdPassword} readOnly className="font-mono" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => { navigator.clipboard.writeText(createdPassword); toast.success('Copied'); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite">Send email invite</TabsTrigger>
              <TabsTrigger value="password">Set temp password</TabsTrigger>
            </TabsList>

            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First name *</Label>
                  <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last name</Label>
                  <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email address *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@agency.gov" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency_admin">Agency Admin</SelectItem>
                    <SelectItem value="caseworker_supervisor">Caseworker Supervisor</SelectItem>
                    <SelectItem value="caseworker">Caseworker</SelectItem>
                    <SelectItem value="inspection_supervisor">Inspection Supervisor</SelectItem>
                    <SelectItem value="inspector">Inspector</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="invite" className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">
                They'll receive an email with a link to set their own password.
              </p>
              <Button
                className="w-full"
                disabled={!valid || sendInvite.isPending}
                onClick={() => sendInvite.mutate()}
              >
                {sendInvite.isPending ? 'Sending...' : 'Send invite email'}
              </Button>
            </TabsContent>

            <TabsContent value="password" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    className="font-mono"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Click Generate or type one"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm({ ...form, password: genPassword() })}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  User will be forced to change this on first login. Useful for in-person/screen-share onboarding.
                </p>
              </div>
              <Button
                className="w-full"
                disabled={!valid || !form.password || createWithPassword.isPending}
                onClick={() => createWithPassword.mutate()}
              >
                {createWithPassword.isPending ? 'Creating...' : 'Create account'}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteAgencyStaffDialog;
