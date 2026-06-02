import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, AlertTriangle, CalendarDays, Upload, File, Loader2, CalendarPlus } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type RecertStatus = 'upcoming' | 'docs_requested' | 'under_review' | 'completed' | 'overdue';

interface Recertification {
  id: string;
  due_date: string;
  status: RecertStatus;
  type: string;
  notes: string | null;
  document_checklist: any;
  created_at: string;
  completed_at: string | null;
  agency_id: string;
}

const STATUS_CONFIG: Record<RecertStatus, { label: string; icon: React.ElementType; badgeClass: string }> = {
  upcoming: { label: 'Upcoming', icon: CalendarDays, badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  docs_requested: { label: 'Docs Requested', icon: FileText, badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  under_review: { label: 'Under Review', icon: Clock, badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  completed: { label: 'Completed', icon: CheckCircle, badgeClass: 'bg-[hsl(var(--chart-2)/0.1)] text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2)/0.2)]' },
  overdue: { label: 'Overdue', icon: AlertTriangle, badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function getUrgencyBadge(dueDate: string, status: RecertStatus) {
  if (status === 'completed') return null;
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: 'bg-destructive text-destructive-foreground' };
  if (days <= 30) return { label: `${days}d left`, className: 'bg-destructive text-destructive-foreground' };
  if (days <= 60) return { label: `${days}d left`, className: 'bg-orange-500 text-white' };
  return { label: `${days}d left`, className: 'bg-[hsl(var(--chart-2))] text-white' };
}

// --- Document Upload Section ---
const RecertDocUpload: React.FC<{ recertId: string; agencyId: string; userId: string }> = ({ recertId, agencyId, userId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: docs = [] } = useQuery({
    queryKey: ['recert-docs', recertId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_documents')
        .select('id, file_name, file_path, file_size, created_at')
        .eq('entity_type', 'recertification')
        .eq('entity_id', recertId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'pdf';
        const path = `${agencyId}/recert/${recertId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { contentType: file.type });
        if (uploadErr) throw uploadErr;

        const { error: insertErr } = await (supabase as any)
          .from('agency_documents')
          .insert({
            agency_id: agencyId,
            entity_type: 'recertification',
            entity_id: recertId,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: userId,
            document_category: 'recertification',
          });
        if (insertErr) throw insertErr;
      }
      toast.success('Documents uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['recert-docs', recertId] });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs"
        >
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          Upload Documents
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {docs.length > 0 && (
        <div className="space-y-1">
          {docs.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <File className="h-3 w-3 shrink-0" />
              <span className="truncate">{doc.file_name}</span>
              <span className="text-[10px] shrink-0">{format(new Date(doc.created_at), 'MMM d')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Appointment Request ---
const AppointmentRequestButton: React.FC<{ recert: Recertification; userId: string }> = ({ recert, userId }) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('agency_calendar_events')
        .insert({
          agency_id: recert.agency_id,
          title: `Recert Appointment — ${recert.type.replace('_', ' ')}`,
          event_type: 'recertification',
          scheduled_at: new Date(date).toISOString(),
          duration_minutes: 30,
          description: note || `Tenant-requested appointment for ${recert.type} recertification`,
          entity_type: 'recertification',
          entity_id: recert.id,
          request_status: 'requested',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Appointment requested — your caseworker will confirm');
      setOpen(false);
      setDate('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['tenant-appointments'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to request appointment'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
          <CalendarPlus className="h-3 w-3 mr-1" /> Request Appt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request Recertification Appointment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Preferred Date & Time</Label>
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Any scheduling preferences..." />
          </div>
          <Button
            onClick={() => requestMutation.mutate()}
            disabled={!date || requestMutation.isPending}
            className="w-full"
          >
            {requestMutation.isPending ? 'Requesting...' : 'Submit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TenantRecertifications: React.FC = () => {
  const { user } = useAuth();

  const { data: recerts, isLoading } = useQuery({
    queryKey: ['tenant-recertifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('agency_recertifications')
        .select('id, due_date, status, type, notes, document_checklist, created_at, completed_at, agency_id')
        .eq('tenant_id', user.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data || []) as Recertification[];
    },
    enabled: !!user?.id,
  });

  // Tenant's upcoming confirmed appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['tenant-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('agency_calendar_events')
        .select('id, title, scheduled_at, request_status, location')
        .eq('entity_type', 'recertification')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at');
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recerts || recerts.length === 0) {
    return (
      <CardEnhanced>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recertification Tracker
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-center py-8 space-y-2">
            <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">No recertifications on file.</p>
            <p className="text-sm text-muted-foreground/70">When your annual or interim income review is scheduled, it will appear here.</p>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  const active = recerts.filter(r => r.status !== 'completed');
  const completed = recerts.filter(r => r.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Upcoming Appointments */}
      {appointments.length > 0 && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-sm flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" /> Your Appointments
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent className="space-y-2">
            {appointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-sm">
                <div>
                  <p className="font-medium">{appt.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(appt.scheduled_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <Badge className={appt.request_status === 'confirmed' ? 'bg-[hsl(var(--chart-2)/0.1)] text-[hsl(var(--chart-2))]' : 'bg-orange-500/10 text-orange-600'}>
                  {appt.request_status === 'confirmed' ? 'Confirmed' : 'Pending'}
                </Badge>
              </div>
            ))}
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      <CardEnhanced>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recertification Tracker
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent className="space-y-4">
          {active.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No active recertifications — you're all caught up!</p>
          )}
          {active.map(recert => {
            const cfg = STATUS_CONFIG[recert.status] || STATUS_CONFIG.upcoming;
            const urgency = getUrgencyBadge(recert.due_date, recert.status);
            const Icon = cfg.icon;
            const showUpload = recert.status === 'docs_requested';
            return (
              <div key={recert.id} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium capitalize">{recert.type.replace('_', ' ')} Review</p>
                      <p className="text-sm text-muted-foreground">Due {format(new Date(recert.due_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
                    {urgency && <Badge className={urgency.className}>{urgency.label}</Badge>}
                    {user && <AppointmentRequestButton recert={recert} userId={user.id} />}
                  </div>
                </div>
                {showUpload && user && (
                  <RecertDocUpload recertId={recert.id} agencyId={recert.agency_id} userId={user.id} />
                )}
              </div>
            );
          })}
        </CardEnhancedContent>
      </CardEnhanced>

      {completed.length > 0 && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-sm text-muted-foreground">Completed</CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent className="space-y-3">
            {completed.map(recert => (
              <div key={recert.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-card/50 gap-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-[hsl(var(--chart-2))]" />
                  <div>
                    <p className="text-sm font-medium capitalize">{recert.type.replace('_', ' ')} Review</p>
                    <p className="text-xs text-muted-foreground">Completed {recert.completed_at ? format(new Date(recert.completed_at), 'MMM d, yyyy') : ''}</p>
                  </div>
                </div>
                <Badge className="bg-[hsl(var(--chart-2)/0.1)] text-[hsl(var(--chart-2))]">Done</Badge>
              </div>
            ))}
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};

export default TenantRecertifications;
