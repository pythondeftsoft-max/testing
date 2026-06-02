import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, UserPlus, Link2, Shuffle } from 'lucide-react';
import AssignCaseworkerDialog from './AssignCaseworkerDialog';
import LinkTenantDialog from './LinkTenantDialog';
import TenantDetailDrawer from './TenantDetailDrawer';
import CaseloadAutoAssign from './CaseloadAutoAssign';

interface Tenant {
  id: string;
  user_id: string;
  voucher_status: string | null;
  housing_authority: string | null;
  city: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface AgencyTenantsTableProps {
  tenants: Tenant[];
  loading: boolean;
  agencyId: string;
  canManage: boolean;
  onRefresh: () => void;
}

const statusBadgeVariant = (status: string | null): "default" | "success" | "warning" | "secondary" => {
  switch (status) {
    case 'active': return 'success';
    case 'pending': return 'warning';
    case 'expired': return 'secondary';
    default: return 'default';
  }
};

const AgencyTenantsTable: React.FC<AgencyTenantsTableProps> = ({ tenants, loading, agencyId, canManage, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState<{ userId: string; name: string } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<{ userId: string; name: string } | null>(null);

  const filtered = tenants.filter(t => {
    const name = t.profiles?.full_name?.toLowerCase() || '';
    const email = t.profiles?.email?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Tenants ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {canManage && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)} className="gap-1">
                    <Link2 className="h-3 w-3" /> Link Tenant
                  </Button>
                  <CaseloadAutoAssign agencyId={agencyId} onComplete={onRefresh} />
                </>
              )}
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tenants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
              </div>
            </div>
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
                    <TableHead>City</TableHead>
                    <TableHead>Voucher Status</TableHead>
                    <TableHead>Joined</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? filtered.map(t => (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setDetailTarget({ userId: t.user_id, name: t.profiles?.full_name || 'Tenant' })}>
                      <TableCell className="font-medium">{t.profiles?.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.profiles?.email || '—'}</TableCell>
                      <TableCell>{t.city || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(t.voucher_status)}>
                          {t.voucher_status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAssignTarget({ userId: t.user_id, name: t.profiles?.full_name || 'Tenant' })}
                              className="gap-1"
                            >
                              <UserPlus className="h-3 w-3" /> Assign
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        No tenants linked to this agency yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {assignTarget && (
        <AssignCaseworkerDialog
          open={!!assignTarget}
          onOpenChange={(open) => !open && setAssignTarget(null)}
          agencyId={agencyId}
          tenantUserId={assignTarget.userId}
          tenantName={assignTarget.name}
          onAssigned={onRefresh}
        />
      )}

      <LinkTenantDialog open={linkOpen} onOpenChange={setLinkOpen} agencyId={agencyId} onLinked={onRefresh} />

      {detailTarget && (
        <TenantDetailDrawer
          open={!!detailTarget}
          onOpenChange={(open) => !open && setDetailTarget(null)}
          tenantUserId={detailTarget.userId}
          tenantName={detailTarget.name}
          agencyId={agencyId}
        />
      )}
    </>
  );
};

export default AgencyTenantsTable;
