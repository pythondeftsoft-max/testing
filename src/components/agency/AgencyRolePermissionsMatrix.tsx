import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PermissionRow {
  id: string;
  role_name: string;
  tab_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
}

const TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  waitlist: 'Waitlist',
  caseload: 'Caseload',
  properties: 'Properties',
  rfta: 'RFTA',
  inspections: 'Inspections',
  placements: 'Placements',
  recertifications: 'Recertifications',
  reports: 'Reports',
  operations: 'Operations',
  hap_batching: 'HAP Batching',
  rent_calc: 'Rent Calculator',
  notices: 'Notices',
  comms: 'Communications',
  audit_trail: 'Audit Trail',
  settings: 'Settings',
};

const ROLE_LABELS: Record<string, string> = {
  agency_admin: 'Admin',
  caseworker: 'Caseworker',
  inspector: 'Inspector',
  finance: 'Finance',
  executive_director: 'Executive Director',
  viewer: 'Viewer',
  intake_clerk: 'Intake Clerk',
  porting_coordinator: 'Porting Coordinator',
};

const roleBadgeVariant = (role: string): "default" | "secondary" | "warning" | "success" | "destructive" => {
  switch (role) {
    case 'agency_admin': return 'default';
    case 'caseworker': return 'success';
    case 'inspector': return 'warning';
    case 'finance': return 'destructive';
    case 'executive_director': return 'default';
    default: return 'secondary';
  }
};

interface Props {
  agencyId: string;
}

const AgencyRolePermissionsMatrix: React.FC<Props> = ({ agencyId }) => {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_role_permissions')
      .select('*')
      .order('role_name')
      .order('tab_name');

    if (error) {
      toast.error('Failed to load permissions');
    } else {
      setPermissions((data as unknown as PermissionRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const roles = [...new Set(permissions.map(p => p.role_name))].sort();
  const tabs = [...new Set(permissions.map(p => p.tab_name))].sort();

  const getPermission = (role: string, tab: string) => {
    return permissions.find(p => p.role_name === role && p.tab_name === tab);
  };

  const togglePermission = (role: string, tab: string, field: 'can_view' | 'can_edit' | 'can_create' | 'can_delete') => {
    setPermissions(prev => prev.map(p => {
      if (p.role_name === role && p.tab_name === tab) {
        return { ...p, [field]: !p[field] };
      }
      return p;
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const filtered = selectedRole ? permissions.filter(p => p.role_name === selectedRole) : permissions;
    
    let hasError = false;
    for (const p of filtered) {
      const { error } = await supabase
        .from('agency_role_permissions')
        .update({
          can_view: p.can_view,
          can_edit: p.can_edit,
          can_create: p.can_create,
          can_delete: p.can_delete,
        })
        .eq('id', p.id);
      if (error) hasError = true;
    }

    if (hasError) {
      toast.error('Some permissions failed to save');
    } else {
      toast.success('Permissions saved successfully');
      setDirty(false);
    }
    setSaving(false);
  };

  const displayRoles = selectedRole ? [selectedRole] : roles;
  const displayTabs = tabs;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Permissions Matrix
          </CardTitle>
          <div className="flex items-center gap-2">
            {dirty && (
              <Badge variant="warning" className="text-xs">Unsaved changes</Badge>
            )}
            <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <Button
            variant={selectedRole === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedRole('')}
          >
            All Roles
          </Button>
          {roles.map(role => (
            <Button
              key={role}
              variant={selectedRole === role ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRole(role)}
            >
              {ROLE_LABELS[role] || role}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[140px]">Tab / Module</TableHead>
                {displayRoles.map(role => (
                  <TableHead key={role} colSpan={4} className="text-center border-l">
                    <Badge variant={roleBadgeVariant(role)} className="text-xs">
                      {ROLE_LABELS[role] || role}
                    </Badge>
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10" />
                {displayRoles.map(role => (
                  <React.Fragment key={role}>
                    <TableHead className="text-center text-xs px-1 border-l">View</TableHead>
                    <TableHead className="text-center text-xs px-1">Edit</TableHead>
                    <TableHead className="text-center text-xs px-1">Create</TableHead>
                    <TableHead className="text-center text-xs px-1">Delete</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTabs.map(tab => (
                <TableRow key={tab}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">
                    {TAB_LABELS[tab] || tab}
                  </TableCell>
                  {displayRoles.map(role => {
                    const perm = getPermission(role, tab);
                    if (!perm) {
                      return (
                        <React.Fragment key={role}>
                          <TableCell colSpan={4} className="text-center text-xs text-muted-foreground border-l">
                            —
                          </TableCell>
                        </React.Fragment>
                      );
                    }
                    return (
                      <React.Fragment key={role}>
                        {(['can_view', 'can_edit', 'can_create', 'can_delete'] as const).map((field, i) => (
                          <TableCell key={field} className={`text-center px-1 ${i === 0 ? 'border-l' : ''}`}>
                            <Checkbox
                              checked={perm[field]}
                              onCheckedChange={() => togglePermission(role, tab, field)}
                              disabled={role === 'agency_admin' && tab === 'settings'}
                            />
                          </TableCell>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Changes apply to all agencies using the default permission set. Admin settings permissions cannot be revoked.
        </p>
      </CardContent>
    </Card>
  );
};

export default AgencyRolePermissionsMatrix;
