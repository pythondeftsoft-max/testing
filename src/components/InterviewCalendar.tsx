import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Video, Phone, MapPin, User, X, Trash2, Edit, Wrench } from 'lucide-react';
import EditAppointmentModal from './EditAppointmentModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InterviewCalendarProps {
  landlordId: string;
}

interface CalendarAppointment {
  id: string;
  appointment_date: string;
  type: 'viewing' | 'maintenance';
  viewing_type?: string;
  status: string;
  notes?: string;
  properties?: any;
  profiles?: any;
  maintenance_request?: any;
  vendor?: any;
}

const InterviewCalendar = ({ landlordId }: InterviewCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [viewingAppointments, setViewingAppointments] = useState<any[]>([]);
  const [maintenanceAppointments, setMaintenanceAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllAppointments();
  }, [currentMonth, landlordId]);

  const fetchAllAppointments = async () => {
    try {
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      // Fetch viewing appointments
      const { data: viewingData, error: viewingError } = await supabase
        .from('viewing_appointments')
        .select(`
          *,
          properties (
            id,
            address,
            street_address,
            city,
            state
          ),
          profiles:tenant_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('landlord_id', landlordId)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())
        .order('appointment_date', { ascending: true });

      if (viewingError) throw viewingError;
      setViewingAppointments(viewingData || []);

      // Fetch maintenance appointments for landlord's properties
      const { data: landlordProperties } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId);

      if (landlordProperties && landlordProperties.length > 0) {
        const propertyIds = landlordProperties.map(p => p.id);
        
        const { data: maintenanceData, error: maintenanceError } = await supabase
          .from('maintenance_appointments')
          .select(`
            *,
            properties:property_id (
              id,
              address,
              street_address
            ),
            maintenance_requests (
              id,
              title,
              tenant_id,
              properties (
                id,
                address,
                street_address
              )
            ),
            maintenance_vendors:vendor_id (
              company_name,
              contact_name,
              phone
            )
          `)
          .gte('scheduled_date', startDate.toISOString())
          .lte('scheduled_date', endDate.toISOString())
          .order('scheduled_date', { ascending: true });

        if (maintenanceError) {
          console.error('Error fetching maintenance appointments:', maintenanceError);
        } else {
          // Filter to only include appointments for landlord's properties
          // Check both direct property_id AND maintenance_requests.properties.id
          const filteredMaintenance = (maintenanceData || []).filter(apt => {
            const directPropertyId = apt.property_id;
            const requestPropertyId = apt.maintenance_requests?.properties?.id;
            return (directPropertyId && propertyIds.includes(directPropertyId)) ||
                   (requestPropertyId && propertyIds.includes(requestPropertyId));
          });
          setMaintenanceAppointments(filteredMaintenance);
        }
      } else {
        setMaintenanceAppointments([]);
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Combine all appointments for a given date
  const getAllAppointmentsForDate = (date: Date): CalendarAppointment[] => {
    const viewing = viewingAppointments
      .filter(apt => isSameDay(new Date(apt.appointment_date), date))
      .map(apt => ({
        ...apt,
        type: 'viewing' as const,
      }));

    const maintenance = maintenanceAppointments
      .filter(apt => isSameDay(new Date(apt.scheduled_date), date))
      .map(apt => ({
        id: apt.id,
        appointment_date: apt.scheduled_date,
        type: 'maintenance' as const,
        status: apt.status,
        notes: apt.notes,
        properties: apt.properties || apt.maintenance_requests?.properties,
        maintenance_request: apt.maintenance_requests,
        vendor: apt.maintenance_vendors,
      }));

    return [...viewing, ...maintenance].sort((a, b) => 
      new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );
  };

  const cancelAppointment = async (appointmentId: string) => {
    setDeletingId(appointmentId);
    try {
      const { error } = await supabase
        .from('viewing_appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled.",
      });

      fetchAllAppointments(); // Refresh the list
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    setDeletingId(appointmentId);
    try {
      const { error } = await supabase
        .from('viewing_appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Deleted",
        description: "The appointment has been permanently deleted.",
      });

      fetchAllAppointments(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeIcon = (type: string, appointmentType?: 'viewing' | 'maintenance') => {
    if (appointmentType === 'maintenance') {
      return <Wrench className="h-3 w-3" />;
    }
    switch (type) {
      case 'video': return <Video className="h-3 w-3" />;
      case 'phone': return <Phone className="h-3 w-3" />;
      case 'in_person': return <MapPin className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getTypeBadgeColor = (type: string, appointmentType?: 'viewing' | 'maintenance') => {
    if (appointmentType === 'maintenance') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'phone': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_person': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAppointmentColor = (apt: CalendarAppointment) => {
    if (apt.type === 'maintenance') return 'bg-orange-500';
    switch (apt.viewing_type) {
      case 'video': return 'bg-blue-500';
      case 'phone': return 'bg-green-500';
      case 'in_person': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendar
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={view} onValueChange={(value: 'month' | 'week' | 'day') => setView(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            {view === 'month' && (
              <div className="space-y-4">
                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((day, index) => {
                    const dayAppointments = getAllAppointmentsForDate(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    
                    return (
                      <div
                        key={index}
                        className={`
                          min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                          ${isToday(day) ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}
                          ${isSelected ? 'ring-2 ring-blue-500' : ''}
                          hover:bg-gray-50
                        `}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className={`
                          text-sm font-medium mb-1
                          ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}
                        `}>
                          {format(day, 'd')}
                        </div>
                        
                        <div className="space-y-1">
                          {dayAppointments.slice(0, 2).map((apt) => (
                            <div
                              key={apt.id}
                              className={`text-xs p-1 rounded text-white truncate ${getAppointmentColor(apt)}`}
                              title={apt.type === 'maintenance' 
                                ? `${format(new Date(apt.appointment_date), 'HH:mm')} - Maintenance`
                                : `${format(new Date(apt.appointment_date), 'HH:mm')} - ${apt.profiles?.first_name} ${apt.profiles?.last_name}`}
                            >
                              {apt.type === 'maintenance' ? '🔧 ' : ''}{format(new Date(apt.appointment_date), 'HH:mm')} {apt.type !== 'maintenance' && apt.profiles?.first_name}
                            </div>
                          ))}
                          {dayAppointments.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{dayAppointments.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointment Details Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-4">
                {getAllAppointmentsForDate(selectedDate).length > 0 ? (
                  getAllAppointmentsForDate(selectedDate).map((apt) => (
                    <Card key={apt.id} className={`border ${apt.type === 'maintenance' ? 'border-orange-200' : ''}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={getTypeBadgeColor(apt.viewing_type || '', apt.type)}>
                            {getTypeIcon(apt.viewing_type || '', apt.type)}
                            <span className="ml-1 capitalize">
                              {apt.type === 'maintenance' ? 'Maintenance' : (apt.viewing_type?.replace('_', ' ') || 'Appointment')}
                            </span>
                          </Badge>
                          <Badge variant="outline" className={getStatusBadgeColor(apt.status)}>
                            {apt.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {format(new Date(apt.appointment_date), 'h:mm a')}
                            </span>
                          </div>
                          
                          {apt.type === 'maintenance' ? (
                            <>
                              {apt.maintenance_request && (
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4 text-orange-500" />
                                  <span className="text-sm">
                                    {apt.maintenance_request.title}
                                  </span>
                                </div>
                              )}
                              {apt.vendor && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm">
                                    {apt.vendor.company_name || apt.vendor.contact_name}
                                    <span className="text-xs text-muted-foreground ml-1">(Vendor)</span>
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                {apt.profiles?.first_name} {apt.profiles?.last_name}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600 break-words">
                              {apt.properties?.street_address || apt.properties?.address}
                            </span>
                          </div>
                          
                          {apt.notes && (
                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded break-words">
                              {apt.notes}
                            </div>
                          )}
                          
                          {/* Action Buttons - only for viewing appointments */}
                          {apt.type === 'viewing' && apt.status !== 'cancelled' && (
                            <div className="flex pt-2 border-t justify-evenly items-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setEditingAppointment(apt)}
                                    disabled={deletingId === apt.id}
                                    className="h-8 w-8"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit appointment</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => cancelAppointment(apt.id)}
                                    disabled={deletingId === apt.id}
                                    className="h-8 w-8"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Cancel appointment</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => deleteAppointment(apt.id)}
                                    disabled={deletingId === apt.id}
                                    className="h-8 w-8"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete appointment</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No appointments scheduled for this date.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click on a date to view appointments.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{viewingAppointments.length + maintenanceAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Video</p>
                <p className="text-2xl font-bold text-green-600">
                  {viewingAppointments.filter(apt => apt.viewing_type === 'video').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Phone</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {viewingAppointments.filter(apt => apt.viewing_type === 'phone').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">In Person</p>
                <p className="text-2xl font-bold text-purple-600">
                  {viewingAppointments.filter(apt => apt.viewing_type === 'in_person').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Maintenance</p>
                <p className="text-2xl font-bold text-orange-600">{maintenanceAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Appointment Modal */}
      <EditAppointmentModal
        isOpen={!!editingAppointment}
        onClose={() => setEditingAppointment(null)}
        appointment={editingAppointment}
        onAppointmentUpdated={fetchAllAppointments}
      />
    </div>
    </TooltipProvider>
  );
};

export default InterviewCalendar;