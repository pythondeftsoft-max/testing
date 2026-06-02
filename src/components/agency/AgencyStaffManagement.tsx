import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, UserCheck, UserX, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import InviteStaffDialog from './InviteStaffDialog';
import EditStaffPermissionsDrawer from './team/EditStaffPermissionsDrawer';

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface AgencyStaffManagementProps {
  agencyId: string;
}

const roleBadgeVariant = (role: string): "default" | "secondary" | "warning" | "success" => {
  switch (role) {
    case 'agency_admin': return 'default';
    case 'caseworker': return 'success';
    case 'inspector': return 'warning';
    default: return 'secondary';
  }
};

const AgencyStaffManagement: React.FC<AgencyStaffManagementProps> = ({ agencyId }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [permsFor, setPermsFor] = useState<StaffMember | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_staff')
      .select('id, user_id, role, is_active, created_at, profiles:user_id(full_name, email)')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true });

    if (error) toast.error('Failed to load staff');
    setStaff((data as unknown as StaffMember[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from('agency_staff')
      .update({ is_active: !currentlyActive })
      .eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(currentlyActive ? 'Staff deactivated' : 'Staff activated');
    fetchStaff();
  };

  const changeRole = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from('agency_staff')
      .update({ role: newRole as any })
      .eq('id', id);
    if (error) { toast.error('Failed to change role'); return; }
    toast.success('Role updated');
    fetchStaff();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Staff ({staff.length})
            </CardTitle>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1">
              <Plus className="h-3 w-3" /> Add Staff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.length ? staff.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.profiles?.full_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.profiles?.email || '—'}</TableCell>
                      <TableCell>
                        <Select value={s.role} onValueChange={(v) => changeRole(s.id, v)}>
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agency_admin">Admin</SelectItem>
                            <SelectItem value="caseworker">Caseworker</SelectItem>
                            <SelectItem value="caseworker_supervisor">Caseworker Supervisor</SelectItem>
                            <SelectItem value="inspector">Inspector</SelectItem>
                            <SelectItem value="inspection_supervisor">Inspection Supervisor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? 'success' : 'secondary'}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPermsFor(s)}
                            className="gap-1"
                            title="Edit per-person permission overrides"
                          >
                            <Shield className="h-3 w-3" /> Permissions
                          </Button>
                          <Button
                            size="sm"
                            variant={s.is_active ? 'destructive' : 'default'}
                            onClick={() => toggleActive(s.id, s.is_active)}
                            className="gap-1"
                          >
                            {s.is_active ? <><UserX className="h-3 w-3" /> Deactivate</> : <><UserCheck className="h-3 w-3" /> Activate</>}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No staff members yet. Click "Add Staff" to invite your team.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} agencyId={agencyId} onInvited={fetchStaff} />
      <EditStaffPermissionsDrawer
        open={!!permsFor}
        onOpenChange={(o) => { if (!o) setPermsFor(null); }}
        agencyId={agencyId}
        staffId={permsFor?.id ?? null}
        staffName={permsFor?.profiles?.full_name || permsFor?.profiles?.email || null}
      />
    </>
  );
};

export default AgencyStaffManagement;
