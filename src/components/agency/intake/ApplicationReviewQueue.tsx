import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Search, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ApplicationDetailPanel, { ApplicationRow } from './ApplicationDetailPanel';

interface Props {
  agencyId: string;
  agencySlug?: string;
  canManage: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  under_review: 'Under Review',
  docs_requested: 'Docs Requested',
  interview_scheduled: 'Interview Scheduled',
  eligibility_confirmed: 'Eligibility Confirmed',
  enrolled: 'Enrolled',
  approved: 'Approved',
  waitlisted: 'Waitlisted',
  denied: 'Denied',
  withdrawn: 'Withdrawn',
  reviewed: 'Reviewed',
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    submitted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    docs_requested: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    interview_scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    eligibility_confirmed: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    enrolled: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    waitlisted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    withdrawn: 'bg-muted text-muted-foreground',
    reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  };
  return <Badge className={map[s] || 'bg-muted'}>{STATUS_LABEL[s] || s}</Badge>;
};

const ApplicationReviewQueue: React.FC<Props> = ({ agencyId, agencySlug, canManage }) => {
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [intakeFilter, setIntakeFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('voucher_applications')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load applications');
    } else {
      setApps((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      const name = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase()) || (a.email || '').toLowerCase().includes(search.toLowerCase());
      const isClosed = a.status === 'enrolled' || a.status === 'denied' || a.status === 'withdrawn';
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && !isClosed) ||
        (statusFilter === 'closed' && isClosed) ||
        a.status === statusFilter;
      const matchesIntake = intakeFilter === 'all' || (a.intake_mode || 'waitlist') === intakeFilter;
      return matchesSearch && matchesStatus && matchesIntake;
    });
  }, [apps, search, statusFilter, intakeFilter]);

  const selected = useMemo(() => apps.find((a) => a.id === selectedId) || null, [apps, selectedId]);

  // Auto-select the first application on load
  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const copyLink = () => {
    if (!agencySlug) return;
    navigator.clipboard.writeText(`${window.location.origin}/agency/${agencySlug}/apply`);
    setCopied(true);
    toast.success('Application link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const counts = useMemo(() => {
    const total = apps.length;
    const open = apps.filter((a) => !(a.status === 'enrolled' || a.status === 'denied' || a.status === 'withdrawn')).length;
    const enrolled = apps.filter((a) => a.status === 'enrolled').length;
    return { total, open, enrolled };
  }, [apps]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" /> Application Review Queue
          </h2>
          <p className="text-xs text-muted-foreground">
            {counts.total} total · {counts.open} open · {counts.enrolled} enrolled
          </p>
        </div>
        {agencySlug && (
          <div className="flex items-center gap-2">
            <Input value={`${window.location.origin}/agency/${agencySlug}/apply`} readOnly className="text-xs w-72" />
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        {/* List */}
        <Card>
          <CardHeader className="pb-3 space-y-2">
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open queue</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="docs_requested">Docs Requested</SelectItem>
                  <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                  <SelectItem value="eligibility_confirmed">Eligibility Confirmed</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
              <Select value={intakeFilter} onValueChange={setIntakeFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All intakes</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                  <SelectItem value="direct_apply">Direct apply</SelectItem>
                  <SelectItem value="transfer_in">Transfer-in</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8 px-4">
                No applications match the filter.
              </p>
            ) : (
              <ScrollArea className="h-[560px]">
                <div className="divide-y divide-border">
                  {filtered.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedId(app.id)}
                      className={`w-full text-left px-3 py-3 hover:bg-accent/40 transition-colors ${
                        selectedId === app.id ? 'bg-accent/60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {app.first_name} {app.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(app.created_at).toLocaleDateString()} · HH {app.household_size}
                            {app.preference_points ? ` · ${app.preference_points} pts` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {statusBadge(app.status || 'pending')}
                          {app.intake_mode && app.intake_mode !== 'waitlist' && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {app.intake_mode.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Detail */}
        <div>
          {selected ? (
            <ApplicationDetailPanel
              application={selected}
              agencyId={agencyId}
              canManage={canManage}
              onUpdated={fetchApps}
            />
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Select an application to review.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationReviewQueue;
