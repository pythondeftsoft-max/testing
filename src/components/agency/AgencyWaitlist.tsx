import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users, Clock, CheckCircle, XCircle, Search, Copy, Check,
  UserPlus, ListOrdered, AlertTriangle, Shield, ChevronDown, Shuffle, Star,
} from 'lucide-react';
import { WaitlistPreferenceEditor } from './WaitlistPreferenceEditor';
import { PublicPortalSettings } from './waitlist/PublicPortalSettings';

interface AgencyWaitlistProps {
  agencyId: string;
  agencySlug?: string;
  canManage: boolean;
}

interface Application {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  household_size: number;
  annual_income: number | null;
  housing_type_requested: string | null;
  status: string;
  priority_level: string | null;
  waitlist_position: number | null;
  preference_points: number | null;
  preference_categories: string[] | null;
  created_at: string;
  eligibility_determined_at: string | null;
  voucher_issued_at: string | null;
  notes: string | null;
  application_number: string | null;
  submission_source: 'public' | 'staff' | 'imported' | null;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending Review' },
  reviewed: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Reviewed' },
  waitlisted: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Waitlisted' },
  approved: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
  denied: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Denied' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  normal: { color: 'bg-muted text-muted-foreground', label: 'Normal' },
  priority: { color: 'bg-amber-100 text-amber-800', label: 'Priority' },
  emergency: { color: 'bg-red-100 text-red-800', label: 'Emergency' },
};

const AgencyWaitlist: React.FC<AgencyWaitlistProps> = ({ agencyId, agencySlug, canManage }) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('voucher_applications')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true });
    setApps((data as unknown as Application[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const updateStatus = async (ids: string[], status: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    const updates: Record<string, any> = {
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    };
    if (status === 'waitlisted') {
      const maxPos = apps.filter(a => a.waitlist_position).reduce((max, a) => Math.max(max, a.waitlist_position || 0), 0);
      // Assign positions sequentially
      for (let i = 0; i < ids.length; i++) {
        await supabase.from('voucher_applications').update({
          ...updates,
          waitlist_position: maxPos + i + 1,
        } as any).eq('id', ids[i]);
      }
    } else if (status === 'approved') {
      updates.eligibility_determined_at = new Date().toISOString();
      for (const id of ids) {
        await supabase.from('voucher_applications').update(updates as any).eq('id', id);
      }
      // Auto-create voucher records for approved applicants
      for (const id of ids) {
        const app = apps.find(a => a.id === id);
        if (app) {
          await supabase.from('agency_vouchers').insert({
            agency_id: agencyId,
            tenant_id: user?.id || app.email, // Will be linked later
            voucher_type: 'HCV',
            status: 'pending',
            notes: `Auto-created from waitlist approval for ${app.first_name} ${app.last_name}`,
          } as any);
        }
      }
    } else {
      for (const id of ids) {
        await supabase.from('voucher_applications').update(updates as any).eq('id', id);
      }
    }
    toast.success(`${ids.length} application(s) ${status}`);
    setSelected(new Set());
    fetchApps();
  };

  const updatePriority = async (id: string, priority: string) => {
    await supabase.from('voucher_applications').update({ priority_level: priority } as any).eq('id', id);
    toast.success('Priority updated');
    fetchApps();
  };

  const copyLink = () => {
    if (!agencySlug) return;
    navigator.clipboard.writeText(`${window.location.origin}/agency/${agencySlug}/apply`);
    setCopied(true);
    toast.success('Application link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const runLotteryDraw = async () => {
    const waitlisted = apps.filter(a => a.status === 'waitlisted');
    if (waitlisted.length < 2) {
      toast.error('Need at least 2 waitlisted applicants for a lottery draw');
      return;
    }
    const shuffled = [...waitlisted].sort(() => Math.random() - 0.5);
    const user = (await supabase.auth.getUser()).data.user;
    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from('voucher_applications')
        .update({ waitlist_position: i + 1 } as any)
        .eq('id', shuffled[i].id);
    }
    await supabase.from('agency_activity_log').insert({
      agency_id: agencyId,
      entity_type: 'waitlist',
      entity_id: agencyId,
      action: 'lottery_draw',
      actor_id: user?.id || null,
      metadata: { applicants_shuffled: shuffled.length },
    } as any);
    toast.success(`Lottery draw complete — ${shuffled.length} positions randomized`);
    fetchApps();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  };

  // Memoized filtered list — avoids re-walking apps[] on every keystroke / unrelated state change
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return apps.filter(a => {
      const matchText = `${a.first_name} ${a.last_name} ${a.email} ${a.application_number || ''}`.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchSource = sourceFilter === 'all' || (a.submission_source || 'staff') === sourceFilter;
      return matchText && matchStatus && matchSource;
    });
  }, [apps, search, statusFilter, sourceFilter]);

  // KPI counts — single pass over apps instead of 4 separate filters
  const counts = useMemo(() => {
    const c = { total: apps.length, pending: 0, waitlisted: 0, approved: 0, denied: 0 };
    for (const a of apps) {
      if (a.status === 'pending') c.pending++;
      else if (a.status === 'waitlisted') c.waitlisted++;
      else if (a.status === 'approved') c.approved++;
      else if (a.status === 'denied') c.denied++;
    }
    return c;
  }, [apps]);

  const avgDaysOnWaitlist = useMemo(() => {
    const wl = apps.filter(a => a.status === 'waitlisted' || a.status === 'approved');
    if (!wl.length) return 0;
    const now = Date.now();
    const total = wl.reduce((sum, a) => sum + (now - new Date(a.created_at).getTime()), 0);
    return Math.round(total / wl.length / (1000 * 60 * 60 * 24));
  }, [apps]);

  return (
    <div className="space-y-4">
      {/* Public Application Portal */}
      <PublicPortalSettings agencyId={agencyId} agencySlug={agencySlug} canManage={canManage} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Applicants', value: counts.total, icon: Users },
          { label: 'Pending Review', value: counts.pending, icon: Clock, highlight: counts.pending > 0 },
          { label: 'Waitlisted', value: counts.waitlisted, icon: ListOrdered },
          { label: 'Approved', value: counts.approved, icon: CheckCircle },
          { label: 'Denied', value: counts.denied, icon: XCircle },
          { label: 'Avg Wait (days)', value: avgDaysOnWaitlist, icon: Clock },
        ].map((kpi, i) => (
          <Card key={i} className={kpi.highlight ? 'border-amber-300 bg-amber-50/50' : ''}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="h-4 w-4" /> Waitlist Management
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {agencySlug && (
                <>
                  <Input
                    value={`${window.location.origin}/agency/${agencySlug}/apply`}
                    readOnly
                    className="text-xs w-56 h-8"
                  />
                  <Button variant="outline" size="sm" onClick={copyLink} className="h-8">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </>
              )}
              {canManage && (
                <AddApplicantDialog
                  open={addOpen}
                  onOpenChange={setAddOpen}
                  agencyId={agencyId}
                  onAdded={fetchApps}
                />
              )}
              {canManage && (
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={runLotteryDraw}>
                  <Shuffle className="w-3.5 h-3.5" /> Lottery Draw
                </Button>
              )}
            </div>
          </div>

          {/* Filters + Bulk Actions */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search applicants..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="public">Public submissions</SelectItem>
                <SelectItem value="staff">Staff entered</SelectItem>
                <SelectItem value="imported">Imported</SelectItem>
              </SelectContent>
            </Select>
            {canManage && selected.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                <Button size="sm" variant="outline" className="h-8" onClick={() => updateStatus([...selected], 'waitlisted')}>
                  <ListOrdered className="w-3.5 h-3.5 mr-1" /> Waitlist
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-green-600" onClick={() => updateStatus([...selected], 'approved')}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-destructive" onClick={() => updateStatus([...selected], 'denied')}>
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Deny
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManage && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selected.size === filtered.length && filtered.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Household</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Preferences</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? filtered.map((app, idx) => (
                    <TableRow key={app.id} className={selected.has(app.id) ? 'bg-accent/30' : ''}>
                      {canManage && (
                        <TableCell>
                          <Checkbox
                            checked={selected.has(app.id)}
                            onCheckedChange={() => toggleSelect(app.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {app.waitlist_position || idx + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{app.first_name} {app.last_name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{app.email}</div>
                        {app.phone && <div className="text-xs text-muted-foreground">{app.phone}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{app.household_size} members</div>
                        {app.annual_income && (
                          <div className="text-xs text-muted-foreground">${app.annual_income.toLocaleString()}/yr</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <Select
                            value={app.priority_level || 'normal'}
                            onValueChange={v => updatePriority(app.id, v)}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="priority">Priority</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={priorityConfig[app.priority_level || 'normal']?.color}>
                            {priorityConfig[app.priority_level || 'normal']?.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <WaitlistPreferenceEditor
                            applicationId={app.id}
                            currentCategories={(app.preference_categories as string[]) || []}
                            currentPoints={app.preference_points || 0}
                            onUpdated={fetchApps}
                          />
                        ) : (
                          app.preference_points ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <Star className="h-3 w-3 mr-1" /> {app.preference_points} pts
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[app.status]?.color || 'bg-muted'}>
                          {statusConfig[app.status]?.label || app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1">
                            {app.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateStatus([app.id], 'waitlisted')}>
                                  Waitlist
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => updateStatus([app.id], 'approved')}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateStatus([app.id], 'denied')}>
                                  Deny
                                </Button>
                              </>
                            )}
                            {app.status === 'waitlisted' && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => updateStatus([app.id], 'approved')}>
                                <Shield className="w-3 h-3 mr-1" /> Issue Voucher
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 10 : 8} className="text-center py-8 text-muted-foreground">
                        {search || statusFilter !== 'all'
                          ? 'No applications match your filters.'
                          : 'No applications yet. Share your application link to start receiving applications.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// --- Add Applicant Dialog ---
const AddApplicantDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onAdded: () => void;
}> = ({ open, onOpenChange, agencyId, onAdded }) => {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    household_size: '1', annual_income: '', housing_type_requested: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('voucher_applications').insert({
      agency_id: agencyId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      household_size: parseInt(form.household_size) || 1,
      annual_income: form.annual_income ? parseFloat(form.annual_income) : null,
      housing_type_requested: form.housing_type_requested || null,
      notes: form.notes.trim() || null,
      consent_agreed: true,
    } as any);
    setSubmitting(false);
    if (error) { toast.error('Failed to add applicant'); return; }
    toast.success('Applicant added to waitlist');
    setForm({ first_name: '', last_name: '', email: '', phone: '', household_size: '1', annual_income: '', housing_type_requested: '', notes: '' });
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <UserPlus className="w-3.5 h-3.5" /> Add Walk-in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Walk-in Applicant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">First Name *</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required className="h-9" /></div>
            <div><Label className="text-xs">Last Name *</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="h-9" /></div>
            <div><Label className="text-xs">Phone</Label><Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Household Size</Label><Input type="number" min="1" value={form.household_size} onChange={e => setForm({ ...form, household_size: e.target.value })} className="h-9" /></div>
            <div><Label className="text-xs">Annual Income ($)</Label><Input type="number" value={form.annual_income} onChange={e => setForm({ ...form, annual_income: e.target.value })} className="h-9" /></div>
          </div>
          <div>
            <Label className="text-xs">Housing Type</Label>
            <Select value={form.housing_type_requested} onValueChange={v => setForm({ ...form, housing_type_requested: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1br">1 Bedroom</SelectItem>
                <SelectItem value="2br">2 Bedrooms</SelectItem>
                <SelectItem value="3br">3 Bedrooms</SelectItem>
                <SelectItem value="4br+">4+ Bedrooms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Staff Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-16" /></div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add to Waitlist'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgencyWaitlist;
