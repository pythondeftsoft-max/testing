import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, RotateCcw, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  agencyId: string;
  /** Optional pre-selected staff member; when provided the picker is hidden. */
  staffId?: string;
}

interface StaffRow {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  profiles: { full_name: string | null; email: string | null } | null;
}
interface RolePerm  { role_name: string; tab_name: string; can_view: boolean; can_edit: boolean; can_create: boolean; can_delete: boolean; }
interface OverrideRow { tab_name: string; can_view: boolean | null; can_edit: boolean | null; can_create: boolean | null; can_delete: boolean | null; }

type Tri = 'inherit' | 'grant' | 'revoke';
const triToBool = (t: Tri): boolean | null => t === 'inherit' ? null : t === 'grant';
const boolToTri = (b: boolean | null | undefined): Tri => b === null || b === undefined ? 'inherit' : (b ? 'grant' : 'revoke');

const TriCell: React.FC<{ value: Tri; defaultBool: boolean; onChange: (t: Tri) => void; disabled?: boolean }> = ({ value, defaultBool, onChange, disabled }) => (
  <Select value={value} onValueChange={(v) => onChange(v as Tri)} disabled={disabled}>
    <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="inherit"><span className="text-muted-foreground">Inherit ({defaultBool ? '✓' : '✗'})</span></SelectItem>
      <SelectItem value="grant">Grant ✓</SelectItem>
      <SelectItem value="revoke">Revoke ✗</SelectItem>
    </SelectContent>
  </Select>
);

const StaffPermissionOverridesPanel: React.FC<Props> = ({ agencyId, staffId: presetStaffId }) => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(presetStaffId || '');
  const [roleDefaults, setRoleDefaults] = useState<RolePerm[]>([]);
  const [overrides, setOverrides] = useState<Record<string, OverrideRow>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load staff list
  useEffect(() => {
    if (presetStaffId) return;
    (async () => {
      const { data } = await supabase
        .from('agency_staff')
        .select('id, user_id, role, is_active, profiles:user_id(full_name, email)')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('created_at');
      setStaff((data as unknown as StaffRow[]) || []);
    })();
  }, [agencyId, presetStaffId]);

  // Load single staff record when preset
  useEffect(() => {
    if (!presetStaffId) return;
    (async () => {
      const { data } = await supabase
        .from('agency_staff')
        .select('id, user_id, role, is_active, profiles:user_id(full_name, email)')
        .eq('id', presetStaffId)
        .maybeSingle();
      if (data) setStaff([data as unknown as StaffRow]);
      setSelectedStaffId(presetStaffId);
    })();
  }, [presetStaffId]);

  const selectedStaff = useMemo(() => staff.find(s => s.id === selectedStaffId), [staff, selectedStaffId]);

  // Load role defaults + existing overrides when staff selected
  useEffect(() => {
    if (!selectedStaff) { setRoleDefaults([]); setOverrides({}); return; }
    setLoading(true);
    (async () => {
      const [{ data: rp }, { data: ov }] = await Promise.all([
        supabase.from('agency_role_permissions').select('*').eq('role_name', selectedStaff.role),
        supabase.from('agency_staff_permission_overrides').select('tab_name, can_view, can_edit, can_create, can_delete').eq('staff_id', selectedStaff.id),
      ]);
      setRoleDefaults((rp as RolePerm[]) || []);
      const map: Record<string, OverrideRow> = {};
      ((ov as OverrideRow[]) || []).forEach(o => { map[o.tab_name] = o; });
      setOverrides(map);
      setReason('');
      setLoading(false);
    })();
  }, [selectedStaff]);

  const tabs = useMemo(() => roleDefaults.map(r => r.tab_name).sort(), [roleDefaults]);

  const updateLocal = (tab: string, key: keyof OverrideRow, val: boolean | null) => {
    setOverrides(prev => ({
      ...prev,
      [tab]: { ...(prev[tab] || { tab_name: tab, can_view: null, can_edit: null, can_create: null, can_delete: null }), [key]: val },
    }));
  };

  const isSelf = selectedStaff?.user_id === user?.id;

  const handleSave = async () => {
    if (!selectedStaff) return;
    if (isSelf) { toast.error('You cannot edit your own permissions.'); return; }
    if (!reason.trim()) { toast.error('A short reason is required.'); return; }
    setSaving(true);

    // Build rows: keep only those that diverge from inherit (any non-null field).
    const rows = Object.values(overrides).filter(o =>
      o.can_view !== null || o.can_edit !== null || o.can_create !== null || o.can_delete !== null
    ).map(o => ({
      agency_id: agencyId,
      staff_id: selectedStaff.id,
      tab_name: o.tab_name,
      can_view: o.can_view,
      can_edit: o.can_edit,
      can_create: o.can_create,
      can_delete: o.can_delete,
      reason: reason.trim(),
      created_by: user?.id ?? null,
    }));

    // Guardrail: agency_admin must keep view on the Admin Settings tab.
    if (selectedStaff.role === 'agency_admin') {
      const adminLock = rows.find(r => r.tab_name === 'admin_settings' && r.can_view === false);
      if (adminLock) { setSaving(false); toast.error('Cannot revoke Admin Settings view from an admin.'); return; }
    }

    // Wipe existing then upsert new (simplest semantics)
    const del = await supabase.from('agency_staff_permission_overrides').delete().eq('staff_id', selectedStaff.id);
    if (del.error) { setSaving(false); toast.error('Failed to clear previous overrides.'); return; }

    if (rows.length) {
      const ins = await supabase.from('agency_staff_permission_overrides').insert(rows);
      if (ins.error) { setSaving(false); toast.error('Failed to save overrides.'); return; }
    }

    // Best-effort audit log entry (table may or may not exist for this agency)
    await supabase.from('agency_audit_log').insert({
      agency_id: agencyId,
      action: 'staff_permission_override_changed',
      entity_type: 'agency_staff',
      entity_id: selectedStaff.id,
      actor_user_id: user?.id ?? null,
      details: { tab_count: rows.length, reason: reason.trim() } as any,
    } as any).then(() => {}, () => {});

    setSaving(false);
    toast.success(rows.length ? `Saved ${rows.length} override${rows.length === 1 ? '' : 's'}.` : 'All overrides cleared.');
  };

  const handleResetAll = async () => {
    if (!selectedStaff) return;
    setOverrides({});
    setReason('Reset all overrides to role defaults');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" /> Per-Person Permission Overrides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Grant or revoke specific permissions for one staff member on top of their role defaults. Leave a row on <em>Inherit</em> to use the role default.
        </p>

        {!presetStaffId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Staff member:</span>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="w-[280px] h-8"><SelectValue placeholder="Pick a staff member…" /></SelectTrigger>
              <SelectContent>
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.profiles?.full_name || s.profiles?.email || '—'} <span className="text-muted-foreground">({s.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStaff && <Badge variant="secondary">{selectedStaff.role}</Badge>}
          </div>
        )}

        {selectedStaff && isSelf && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
            You cannot edit your own permission overrides. Ask another agency admin to make changes.
          </div>
        )}

        {selectedStaff && !loading && tabs.length === 0 && (
          <div className="text-sm text-muted-foreground italic">No role defaults found for "{selectedStaff.role}".</div>
        )}

        {selectedStaff && tabs.length > 0 && (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Tab</TableHead>
                    <TableHead>View</TableHead>
                    <TableHead>Edit</TableHead>
                    <TableHead>Create</TableHead>
                    <TableHead>Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabs.map(tab => {
                    const def = roleDefaults.find(r => r.tab_name === tab)!;
                    const ov = overrides[tab];
                    return (
                      <TableRow key={tab}>
                        <TableCell className="font-medium text-xs">{tab}</TableCell>
                        {(['can_view','can_edit','can_create','can_delete'] as const).map(key => (
                          <TableCell key={key}>
                            <TriCell
                              value={boolToTri(ov?.[key])}
                              defaultBool={def[key]}
                              disabled={isSelf}
                              onChange={(t) => updateLocal(tab, key, triToBool(t))}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Reason (required, logged to audit)</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Acting controller — needs Reports access for Q3 audit"
                disabled={isSelf}
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={handleResetAll} disabled={isSelf || saving}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reset to role defaults
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSelf || saving || !reason.trim()}>
                <Save className="h-3 w-3 mr-1" /> {saving ? 'Saving…' : 'Save overrides'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffPermissionOverridesPanel;
