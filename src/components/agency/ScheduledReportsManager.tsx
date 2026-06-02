import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Plus, Save, Trash2, Loader2, Calendar, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScheduledReport {
  id: string;
  agency_id: string;
  report_type: string;
  schedule_cron: string;
  recipient_emails: string[];
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

const REPORT_TYPES = [
  { value: 'vms_utilization', label: 'VMS Utilization Report' },
  { value: 'semap_scorecard', label: 'SEMAP Scorecard' },
  { value: 'vacancy_analysis', label: 'Vacancy Analysis' },
  { value: 'hap_summary', label: 'HAP Payment Summary' },
  { value: 'recertification_due', label: 'Upcoming Recertifications' },
  { value: 'inspection_schedule', label: 'Inspection Schedule' },
];

const SCHEDULE_OPTIONS = [
  { value: '0 8 1 * *', label: '1st of every month at 8 AM' },
  { value: '0 8 5 * *', label: '5th of every month at 8 AM' },
  { value: '0 8 15 * *', label: '15th of every month at 8 AM' },
  { value: '0 8 * * 1', label: 'Every Monday at 8 AM' },
  { value: '0 8 * * 5', label: 'Every Friday at 8 AM' },
  { value: '0 8 1 1,4,7,10 *', label: 'Quarterly (1st of Jan, Apr, Jul, Oct)' },
];

interface Props {
  agencyId: string;
  canManage: boolean;
}

const ScheduledReportsManager: React.FC<Props> = ({ agencyId, canManage }) => {
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ScheduledReport>>({});
  const [emailInput, setEmailInput] = useState('');

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('agency_scheduled_reports')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at');

    if (error) {
      // Table may not exist yet — that's fine
      console.log('Scheduled reports table not yet available');
    }
    setSchedules((data as unknown as ScheduledReport[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handleNew = () => {
    setEditing({
      agency_id: agencyId,
      report_type: 'vms_utilization',
      schedule_cron: '0 8 1 * *',
      recipient_emails: [],
      is_active: true,
    });
    setEmailInput('');
    setEditOpen(true);
  };

  const addEmail = () => {
    const email = emailInput.trim();
    if (!email || !email.includes('@')) return;
    setEditing(prev => ({
      ...prev,
      recipient_emails: [...(prev.recipient_emails || []), email],
    }));
    setEmailInput('');
  };

  const removeEmail = (index: number) => {
    setEditing(prev => ({
      ...prev,
      recipient_emails: (prev.recipient_emails || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!editing.report_type || !editing.schedule_cron || !(editing.recipient_emails?.length)) {
      toast.error('Report type, schedule, and at least one recipient are required');
      return;
    }

    const record = {
      agency_id: agencyId,
      report_type: editing.report_type,
      schedule_cron: editing.schedule_cron,
      recipient_emails: editing.recipient_emails,
      is_active: editing.is_active ?? true,
    };

    if (editing.id) {
      const { error } = await (supabase as any)
        .from('agency_scheduled_reports')
        .update(record)
        .eq('id', editing.id);
      if (error) { toast.error('Failed to update schedule'); return; }
    } else {
      const { error } = await (supabase as any)
        .from('agency_scheduled_reports')
        .insert(record);
      if (error) { toast.error('Failed to create schedule'); return; }
    }

    toast.success('Report schedule saved');
    setEditOpen(false);
    fetchSchedules();
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await (supabase as any)
      .from('agency_scheduled_reports')
      .update({ is_active: !currentActive })
      .eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    fetchSchedules();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('agency_scheduled_reports')
      .delete()
      .eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Schedule deleted');
    fetchSchedules();
  };

  const getScheduleLabel = (cron: string) => {
    return SCHEDULE_OPTIONS.find(o => o.value === cron)?.label || cron;
  };

  const getReportLabel = (type: string) => {
    return REPORT_TYPES.find(r => r.value === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Report Delivery
        </h3>
        {canManage && (
          <Button size="sm" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-1" /> New Schedule
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Last Sent</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="w-[80px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-sm">{getReportLabel(s.report_type)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {getScheduleLabel(s.schedule_cron)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {s.recipient_emails.slice(0, 2).map((e, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <Mail className="h-2.5 w-2.5 mr-1" />{e}
                            </Badge>
                          ))}
                          {s.recipient_emails.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{s.recipient_emails.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.last_sent_at ? new Date(s.last_sent_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={() => canManage && toggleActive(s.id, s.is_active)}
                          disabled={!canManage}
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {schedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No scheduled reports. Set up automatic delivery of SEMAP, VMS, and other reports.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Edit Schedule' : 'New Scheduled Report'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select
                value={editing.report_type || 'vms_utilization'}
                onValueChange={v => setEditing(p => ({ ...p, report_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Delivery Schedule</Label>
              <Select
                value={editing.schedule_cron || '0 8 1 * *'}
                onValueChange={v => setEditing(p => ({ ...p, schedule_cron: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recipient Emails</Label>
              <div className="flex gap-2">
                <Input
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="director@pha.gov"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                />
                <Button variant="outline" size="sm" onClick={addEmail}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(editing.recipient_emails || []).map((email, i) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    {email}
                    <button onClick={() => removeEmail(i)} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editing.is_active ?? true}
                onCheckedChange={v => setEditing(p => ({ ...p, is_active: v }))}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" /> Save Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledReportsManager;
