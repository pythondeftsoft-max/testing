import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Bell, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';

interface AgencyCalendarProps {
  agencyId: string;
  staffId: string;
  canManage: boolean;
}

const EVENT_TYPES = [
  { value: 'inspection', label: 'Inspection', color: 'bg-blue-500' },
  { value: 'recertification', label: 'Recertification', color: 'bg-amber-500' },
  { value: 'hearing', label: 'Hearing', color: 'bg-red-500' },
  { value: 'custom', label: 'Custom', color: 'bg-primary' },
];

const AgencyCalendar: React.FC<AgencyCalendarProps> = ({ agencyId, staffId, canManage }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'custom',
    scheduled_at: '',
    duration_minutes: '60',
    location: '',
    description: '',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['agency-calendar', agencyId, format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_calendar_events')
        .select('*, agency_staff(user_id, profiles:user_id(full_name))')
        .eq('agency_id', agencyId)
        .gte('scheduled_at', monthStart.toISOString())
        .lte('scheduled_at', monthEnd.toISOString())
        .order('scheduled_at');
      if (error) throw error;
      return data || [];
    },
  });

  // Pending appointment requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['agency-pending-appointments', agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_calendar_events')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('request_status', 'requested')
        .order('scheduled_at');
      if (error) return [];
      return data || [];
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('agency_calendar_events')
        .update({ request_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['agency-calendar', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['agency-pending-appointments', agencyId] });
      toast({ title: `Appointment ${status}` });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const createEventMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('agency_calendar_events')
        .insert({
          agency_id: agencyId,
          title: newEvent.title,
          event_type: newEvent.event_type,
          scheduled_at: newEvent.scheduled_at,
          duration_minutes: parseInt(newEvent.duration_minutes) || 60,
          location: newEvent.location || null,
          description: newEvent.description || null,
          staff_id: staffId,
          request_status: 'confirmed',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-calendar', agencyId] });
      setDialogOpen(false);
      setNewEvent({ title: '', event_type: 'custom', scheduled_at: '', duration_minutes: '60', location: '', description: '' });
      toast({ title: 'Event created' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = monthStart.getDay();

  const filteredEvents = filterType === 'all' ? events : events.filter((e: any) => e.event_type === filterType);

  const getEventsForDay = (day: Date) => filteredEvents.filter((e: any) => isSameDay(parseISO(e.scheduled_at), day));
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Pending Appointment Requests Banner */}
      {canManage && pendingRequests.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-500/10 dark:border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <Bell className="w-4 h-4" />
              {pendingRequests.length} Pending Appointment Request{pendingRequests.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded border border-border bg-card text-sm">
                <div>
                  <p className="font-medium text-foreground">{req.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested: {format(parseISO(req.scheduled_at), 'MMM d, yyyy h:mm a')}
                    {req.description && ` — ${req.description}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'confirmed' })}
                    disabled={updateRequestMutation.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" /> Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'cancelled' })}
                    disabled={updateRequestMutation.isPending}
                  >
                    <X className="h-3 w-3 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Agency Calendar
        </h3>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Event</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Calendar Event</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Event title" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={newEvent.event_type} onValueChange={v => setNewEvent(p => ({ ...p, event_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date & Time</Label>
                    <Input type="datetime-local" value={newEvent.scheduled_at} onChange={e => setNewEvent(p => ({ ...p, scheduled_at: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={newEvent.duration_minutes} onChange={e => setNewEvent(p => ({ ...p, duration_minutes: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} placeholder="Optional" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <Button onClick={() => createEventMutation.mutate()} disabled={!newEvent.title || !newEvent.scheduled_at || createEventMutation.isPending} className="w-full">
                    {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {Array.from({ length: startDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[60px]" />
              ))}
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[60px] p-1 border rounded text-left transition-colors
                      ${isToday(day) ? 'border-primary bg-primary/5' : 'border-border'}
                      ${isSelected ? 'ring-2 ring-primary' : ''}
                      hover:bg-accent/50`}
                  >
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e: any) => {
                        const typeConfig = EVENT_TYPES.find(t => t.value === e.event_type);
                        return (
                          <div key={e.id} className={`h-1.5 rounded-full ${typeConfig?.color || 'bg-primary'}`} title={e.title} />
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Detail */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a day'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Click a day to view events</p>
            ) : selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events scheduled</p>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((e: any) => {
                  const typeConfig = EVENT_TYPES.find(t => t.value === e.event_type);
                  return (
                    <div key={e.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${typeConfig?.color || 'bg-primary'}`} />
                        <span className="text-sm font-medium text-foreground">{e.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{typeConfig?.label || e.event_type}</Badge>
                        {e.request_status === 'requested' && (
                          <Badge className="bg-orange-500/10 text-orange-600 text-xs">Pending</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(e.scheduled_at), 'h:mm a')} · {e.duration_minutes}min
                      </div>
                      {e.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {e.location}
                        </div>
                      )}
                      {e.description && (
                        <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        {EVENT_TYPES.map(t => (
          <div key={t.value} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${t.color}`} /> {t.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgencyCalendar;
