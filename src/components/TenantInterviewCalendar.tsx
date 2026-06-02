import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Video, Phone, MapPin, User, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TenantInterviewCalendarProps {
  tenantId: string;
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

const TenantInterviewCalendar = ({ tenantId }: TenantInterviewCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingAppointments, setViewingAppointments] = useState<any[]>([]);
  const [maintenanceAppointments, setMaintenanceAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllAppointments();
  }, [currentMonth, tenantId]);

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
          profiles:landlord_id (
            first_name,
            last_name,
            phone,
            email
          )
        `)
        .eq('tenant_id', tenantId)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())
        .order('appointment_date', { ascending: true });

      if (viewingError) throw viewingError;
      setViewingAppointments(viewingData || []);

      // Fetch tenant's housing info to also show appointments for their property/unit
      const { data: tenantHousing } = await supabase
        .from('property_units')
        .select('id, property_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'occupied');

      const housedPropertyIds = tenantHousing?.map(h => h.property_id) || [];
      const housedUnitIds = tenantHousing?.map(h => h.id) || [];

      // Fetch maintenance appointments - simplified query without RLS dependency
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
        // Filter to include appointments where:
        // 1. tenant_id matches directly, OR
        // 2. maintenance_requests.tenant_id matches, OR
        // 3. property_id matches tenant's housed property, OR
        // 4. unit_id matches tenant's housed unit
        const filteredMaintenance = (maintenanceData || []).filter((apt: any) => 
          apt.tenant_id === tenantId || 
          apt.maintenance_requests?.tenant_id === tenantId ||
          (apt.property_id && housedPropertyIds.includes(apt.property_id)) ||
          (apt.unit_id && housedUnitIds.includes(apt.unit_id))
        );
        setMaintenanceAppointments(filteredMaintenance);
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
                My Appointments
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
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
                              {apt.type === 'maintenance' ? '🔧 ' : ''}{format(new Date(apt.appointment_date), 'HH:mm')}
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
          </CardContent>
        </Card>

        {/* Appointment Details Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selectedDate ? (
              <div className="space-y-6">
                {getAllAppointmentsForDate(selectedDate).length > 0 ? (
                  getAllAppointmentsForDate(selectedDate).map((apt) => (
                    <Card key={apt.id} className={`border ${apt.type === 'maintenance' ? 'border-orange-200' : ''}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Badge className={`${getTypeBadgeColor(apt.viewing_type || '', apt.type)} px-2 py-1`}>
                            {getTypeIcon(apt.viewing_type || '', apt.type)}
                            <span className="ml-1 capitalize">
                              {apt.type === 'maintenance' ? 'Maintenance' : (apt.viewing_type?.replace('_', ' ') || 'Appointment')}
                            </span>
                          </Badge>
                          <Badge variant="outline" className={`${getStatusBadgeColor(apt.status)} px-2 py-1`}>
                            {apt.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="font-medium text-sm">
                              {format(new Date(apt.appointment_date), 'h:mm a')}
                            </span>
                          </div>
                          
                          {apt.type === 'maintenance' ? (
                            <>
                              {apt.maintenance_request && (
                                <div className="flex items-center gap-2.5">
                                  <Wrench className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                  <span className="text-sm leading-snug">
                                    {apt.maintenance_request.title}
                                  </span>
                                </div>
                              )}
                              {apt.vendor && (
                                <div className="flex items-center gap-2.5">
                                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="text-sm leading-snug">
                                    {apt.vendor.company_name || apt.vendor.contact_name}
                                    <span className="text-xs text-muted-foreground ml-1">(Vendor)</span>
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm leading-snug">
                                {apt.profiles?.first_name} {apt.profiles?.last_name}
                                <span className="text-xs text-muted-foreground ml-1">(Landlord)</span>
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2.5">
                            <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600 break-words leading-snug">
                              {apt.properties?.street_address || apt.properties?.address}
                            </span>
                          </div>
                          
                          {apt.notes && (
                            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded break-words leading-relaxed mt-1">
                              {apt.notes}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No appointments scheduled for this date.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click on a date to view appointments.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments Summary */}
      {(() => {
        const upcomingViewing = viewingAppointments.filter(apt => new Date(apt.appointment_date) >= new Date() && apt.status === 'scheduled');
        const upcomingMaintenance = maintenanceAppointments.filter(apt => new Date(apt.scheduled_date) >= new Date() && apt.status === 'scheduled');
        const allUpcoming = [
          ...upcomingViewing.map(apt => ({ ...apt, type: 'viewing' as const })),
          ...upcomingMaintenance.map(apt => ({ 
            ...apt, 
            type: 'maintenance' as const, 
            appointment_date: apt.scheduled_date,
            properties: apt.maintenance_requests?.properties 
          }))
        ].sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

        return allUpcoming.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allUpcoming.slice(0, 5).map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      {apt.type === 'maintenance' ? <Wrench className="h-3 w-3 text-orange-500" /> : getTypeIcon(apt.viewing_type, 'viewing')}
                      <span className="text-sm font-medium">
                        {format(new Date(apt.appointment_date), 'MMM d, h:mm a')}
                      </span>
                      {apt.type === 'maintenance' && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          Maintenance
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {apt.properties?.address}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
};

export default TenantInterviewCalendar;
