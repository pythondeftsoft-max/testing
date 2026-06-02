import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Pencil, Trash2, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

interface Office {
  id: string;
  name: string;
  region: string | null;
  address: string | null;
  parent_office_id: string | null;
  manager_id: string | null;
  is_active: boolean;
}

const AgencyOfficeManager: React.FC<Props> = ({ agencyId }) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [form, setForm] = useState({ name: '', region: '', address: '', parent_office_id: '' });
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});

  const fetchOffices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('agency_offices')
      .select('*')
      .eq('agency_id', agencyId)
      .order('name');

    if (error) { toast.error('Failed to load offices'); setLoading(false); return; }
    setOffices(data || []);

    // Get staff counts per office
    const { data: staff } = await supabase
      .from('agency_staff')
      .select('office_id')
      .eq('agency_id', agencyId)
      .eq('is_active', true);

    const counts: Record<string, number> = {};
    (staff || []).forEach((s: any) => {
      if (s.office_id) counts[s.office_id] = (counts[s.office_id] || 0) + 1;
    });
    setStaffCounts(counts);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchOffices(); }, [fetchOffices]);

  const openCreate = () => {
    setEditingOffice(null);
    setForm({ name: '', region: '', address: '', parent_office_id: '' });
    setDialogOpen(true);
  };

  const openEdit = (office: Office) => {
    setEditingOffice(office);
    setForm({
      name: office.name,
      region: office.region || '',
      address: office.address || '',
      parent_office_id: office.parent_office_id || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload: any = {
      agency_id: agencyId,
      name: form.name.trim(),
      region: form.region || null,
      address: form.address || null,
      parent_office_id: form.parent_office_id || null,
    };

    if (editingOffice) {
      const { error } = await (supabase as any)
        .from('agency_offices')
        .update(payload)
        .eq('id', editingOffice.id);
      if (error) { toast.error('Failed to update office'); return; }
      toast.success('Office updated');
    } else {
      const { error } = await (supabase as any)
        .from('agency_offices')
        .insert(payload);
      if (error) { toast.error('Failed to create office'); return; }
      toast.success('Office created');
    }
    setDialogOpen(false);
    fetchOffices();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('agency_offices')
      .delete()
      .eq('id', id);
    if (error) { toast.error('Failed to delete office'); return; }
    toast.success('Office deleted');
    fetchOffices();
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return '—';
    return offices.find(o => o.id === parentId)?.name || parentId.slice(0, 8);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Regional Offices</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Add Office
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingOffice ? 'Edit Office' : 'Add Office'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Office Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. North District Office" />
              </div>
              <div>
                <Label>Region</Label>
                <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. Northern Region" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, City, ST" />
              </div>
              <div>
                <Label>Parent Office</Label>
                <Select value={form.parent_office_id} onValueChange={v => setForm(f => ({ ...f, parent_office_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {offices.filter(o => o.id !== editingOffice?.id).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} disabled={!form.name.trim()} className="w-full">
                {editingOffice ? 'Update Office' : 'Create Office'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : offices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No offices configured yet.</p>
              <p className="text-xs">Add regional offices to organize staff and scope data.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offices.map(office => (
                  <TableRow key={office.id}>
                    <TableCell className="font-medium">{office.name}</TableCell>
                    <TableCell>
                      {office.region ? (
                        <Badge variant="secondary" className="gap-1">
                          <MapPin className="h-3 w-3" />{office.region}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {office.address || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{getParentName(office.parent_office_id)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" /> {staffCounts[office.id] || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(office)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(office.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyOfficeManager;
