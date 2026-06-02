
import React, { useState, useMemo, useEffect } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useMaintenanceAppointments } from '@/hooks/useMaintenanceAppointments';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useMaintenanceVendors } from '@/hooks/useMaintenanceVendors';
import CreateAppointmentDialog from './CreateAppointmentDialog';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';

interface MaintenanceAppointmentSchedulerProps {
  userId: string;
  portfolioId?: string;
}

const MaintenanceAppointmentScheduler = ({ userId, portfolioId }: MaintenanceAppointmentSchedulerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const { appointments, isLoading, updateAppointment } = useMaintenanceAppointments(portfolioId);
  const { requests } = useMaintenanceRequests(portfolioId);
  const { vendors } = useMaintenanceVendors(portfolioId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'warning';
      case 'confirmed':
        return 'neutral'; 
      case 'in_progress':
        return 'occupied';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'destructive';
      case 'rescheduled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'rescheduled':
        return <Edit className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_date);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.scheduled_date) >= new Date())
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 5);

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduled_date);
    const today = new Date();
    return aptDate.toDateString() === today.toDateString();
  });

  // Unique properties for filter dropdown
  const uniqueProperties = useMemo(() => {
    const properties = appointments
      .filter(apt => apt.property_address)
      .map(apt => apt.property_address as string);
    return [...new Set(properties)].sort();
  }, [appointments]);

  // Available months for filter dropdown
  const availableMonths = useMemo(() => {
    const months = appointments.map(apt => {
      const date = new Date(apt.scheduled_date);
      return format(date, 'yyyy-MM');
    });
    const uniqueMonths = [...new Set(months)].sort().reverse();
    return uniqueMonths.map(month => ({
      value: month,
      label: format(new Date(month + '-01'), 'MMMM yyyy')
    }));
  }, [appointments]);

  // Filter appointments by property and month
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(apt => apt.property_address === propertyFilter);
    }
    
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(apt => {
        const aptMonth = format(new Date(apt.scheduled_date), 'yyyy-MM');
        return aptMonth === selectedMonth;
      });
    }
    
    return filtered;
  }, [appointments, propertyFilter, selectedMonth]);

  // Pagination calculations
  const totalItems = filteredAppointments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, propertyFilter, selectedMonth, portfolioId]);

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointment.mutateAsync({
        id: appointmentId,
        status: newStatus as any
      });
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }
  };

  const handleViewDetails = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" hover={false}>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Maintenance Appointments
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <CardEnhanced variant="elevated" hover={false}>
        <CardEnhancedHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardEnhancedTitle gradient>
              Maintenance Appointments
            </CardEnhancedTitle>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="mb-6">
            <Button 
              onClick={() => setShowCreateDialog(true)}
              variant="blue"
            >
              <Plus className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </div>
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
              <TabsTrigger 
                value="calendar"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                Calendar View
              </TabsTrigger>
              <TabsTrigger 
                value="list"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                List View
              </TabsTrigger>
              <TabsTrigger 
                value="today"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                Today's Schedule
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    modifiers={{
                      hasAppointment: (date) => getAppointmentsForDate(date).length > 0
                    }}
                    modifiersStyles={{
                      hasAppointment: { 
                        backgroundColor: 'hsl(var(--primary) / 0.1)',
                        color: 'hsl(var(--primary))',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-4">
                    {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a date'}
                  </h3>
                  {selectedDate && (
                    <div className="space-y-2">
                      {getAppointmentsForDate(selectedDate).length === 0 ? (
                        <p className="text-gray-500">No appointments scheduled for this date.</p>
                      ) : (
                        getAppointmentsForDate(selectedDate).map((appointment) => (
                           <div key={appointment.id} className="p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-all duration-200">
                             <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-2">
                                 {getStatusIcon(appointment.status)}
                                 <span className="font-semibold text-foreground">
                                   {format(new Date(appointment.scheduled_date), 'HH:mm')}
                                 </span>
                               </div>
                               <Badge 
                                 variant={getStatusColor(appointment.status)}
                                 className="flex items-center gap-1"
                               >
                                 {getStatusIcon(appointment.status)}
                                 {formatStatus(appointment.status)}
                               </Badge>
                             </div>
                             <p className="text-sm text-muted-foreground mb-3">
                               <Clock className="h-3 w-3 inline mr-1" />
                               Duration: {appointment.estimated_duration} minutes
                             </p>
                             <div className="flex gap-2">
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleViewDetails(appointment)}
                                  className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                               >
                                 View Details
                               </Button>
                               {appointment.status === 'scheduled' && (
                                 <Button
                                   size="sm"
                                   variant="blue"
                                   onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                                   className="hover:scale-105 transition-all duration-200"
                                 >
                                   <CheckCircle className="h-3 w-3 mr-1" />
                                   Confirm
                                 </Button>
                               )}
                               {appointment.status === 'confirmed' && (
                                 <Button
                                   size="sm"
                                   variant="gold"
                                   onClick={() => handleStatusUpdate(appointment.id, 'in_progress')}
                                   className="hover:scale-105 transition-all duration-200"
                                 >
                                   <AlertCircle className="h-3 w-3 mr-1" />
                                   Start
                                 </Button>
                               )}
                               {appointment.status === 'in_progress' && (
                                 <Button
                                   size="sm"
                                   variant="success"
                                   onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                   className="hover:scale-105 transition-all duration-200"
                                 >
                                   <CheckCircle className="h-3 w-3 mr-1" />
                                   Complete
                                 </Button>
                               )}
                             </div>
                           </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <div className="rounded-md border">
                 <div className="p-4 border-b bg-gradient-subtle-blue border-primary/20">
                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                     <h3 className="font-semibold text-primary flex items-center gap-2">
                       <CalendarIcon className="h-4 w-4" />
                       All Appointments {portfolioId === 'everything' ? '(All Portfolios)' : ''}
                     </h3>
                     <div className="flex flex-wrap items-center gap-3">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger className="w-[180px] bg-background">
                            <SelectValue placeholder="Filter by Month" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            {availableMonths.map(({ value, label }) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                          <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue placeholder="Filter by Property" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Properties</SelectItem>
                            {uniqueProperties.map((property) => (
                              <SelectItem key={property} value={property}>
                                {property}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                          <SelectTrigger className="w-[100px] bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                   </div>
                   {totalItems > 0 && (
                     <p className="text-sm text-primary/70 mt-2">
                       Showing {startIndex + 1}-{endIndex} of {totalItems} appointments
                     </p>
                   )}
                 </div>
                 {filteredAppointments.length === 0 ? (
                  <div className="p-8 text-center">
                      <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No appointments found</h3>
                      <p className="text-muted-foreground">
                        {(propertyFilter !== 'all' || selectedMonth !== 'all') ? 'Try changing the filters.' : 'Schedule your first maintenance appointment to get started.'}
                      </p>
                    </div>
                 ) : (
                   <>
                     <div className="overflow-x-auto">
                       <table className="w-full">
                         <thead className="bg-muted/50">
                           <tr>
                             <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date/Time</th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Property</th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor</th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant</th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-border">
                           {paginatedAppointments.map((appointment) => (
                             <tr key={appointment.id} className="hover:bg-muted/30 transition-colors">
                               <td className="px-4 py-3 whitespace-nowrap">
                                 <div className="font-medium text-foreground">
                                   {format(new Date(appointment.scheduled_date), 'MMM dd, yyyy')}
                                 </div>
                                 <div className="text-sm text-muted-foreground">
                                   {format(new Date(appointment.scheduled_date), 'HH:mm')} ({appointment.estimated_duration} min)
                                 </div>
                               </td>
                               <td className="px-4 py-3">
                                 <div className="text-sm text-foreground max-w-[200px] truncate">
                                   {appointment.property_address || '—'}
                                 </div>
                               </td>
                               <td className="px-4 py-3 whitespace-nowrap">
                                 <div className="text-sm text-foreground">
                                   {appointment.unit_name || '—'}
                                 </div>
                               </td>
                               <td className="px-4 py-3 whitespace-nowrap">
                                 <div className="text-sm text-foreground">
                                   {appointment.vendor_name || 'Not assigned'}
                                 </div>
                               </td>
                               <td className="px-4 py-3 whitespace-nowrap">
                                 <div className="text-sm text-foreground">
                                   {appointment.tenant_name || '—'}
                                 </div>
                               </td>
                               <td className="px-4 py-3">
                                 <div className="text-sm text-muted-foreground max-w-[150px] truncate">
                                   {appointment.notes || '—'}
                                 </div>
                               </td>
                               <td className="px-4 py-3 whitespace-nowrap">
                                 <Badge variant={getStatusColor(appointment.status)} className="flex items-center gap-1 w-fit">
                                   {getStatusIcon(appointment.status)}
                                   {formatStatus(appointment.status)}
                                 </Badge>
                               </td>
                               <td className="px-4 py-3 whitespace-nowrap">
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => handleViewDetails(appointment)}
                                   className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                                 >
                                   Details
                                 </Button>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                     {totalPages > 1 && (
                       <div className="flex items-center justify-between px-4 py-3 border-t">
                         <div className="text-sm text-muted-foreground">
                           Page {currentPage} of {totalPages}
                         </div>
                         <div className="flex items-center gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                             disabled={currentPage === 1}
                           >
                             <ChevronLeft className="h-4 w-4" />
                             Previous
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                             disabled={currentPage === totalPages}
                           >
                             Next
                             <ChevronRight className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
                     )}
                   </>
                 )}
              </div>
            </TabsContent>

            <TabsContent value="today" className="space-y-4">
              <div className="rounded-md border">
                 <div className="p-4 border-b bg-gradient-subtle-gold border-accent/20">
                   <h3 className="font-semibold text-accent flex items-center gap-2">
                     <Clock className="h-4 w-4" />
                     Today's Schedule
                   </h3>
                   <p className="text-sm text-accent/80">
                     {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                   </p>
                 </div>
                 <div className="divide-y">
                   {todayAppointments.length === 0 ? (
                     <div className="p-8 text-center">
                       <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                       <h3 className="text-lg font-semibold text-foreground mb-2">No appointments today</h3>
                       <p className="text-muted-foreground">You have a clear schedule for today.</p>
                     </div>
                   ) : (
                     todayAppointments.map((appointment) => (
                       <div key={appointment.id} className="p-4 table-row-hover">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             {getStatusIcon(appointment.status)}
                             <div>
                               <div className="font-semibold text-foreground">
                                 {format(new Date(appointment.scheduled_date), 'HH:mm')}
                               </div>
                               <div className="text-sm text-muted-foreground flex items-center gap-1">
                                 <Clock className="h-3 w-3" />
                                 Duration: {appointment.estimated_duration} minutes
                               </div>
                                {appointment.notes && (
                                  <div className="text-sm text-muted-foreground mt-1 break-words">
                                    {appointment.notes}
                                  </div>
                                )}
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <Badge variant={getStatusColor(appointment.status)} className="flex items-center gap-1">
                               {getStatusIcon(appointment.status)}
                               {formatStatus(appointment.status)}
                             </Badge>
                             <div className="flex gap-1">
                               {appointment.status === 'scheduled' && (
                                 <Button
                                   size="sm"
                                   variant="blue"
                                   onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                                   className="hover:scale-105 transition-all duration-200"
                                 >
                                   <CheckCircle className="h-3 w-3 mr-1" />
                                   Confirm
                                 </Button>
                               )}
                               {appointment.status === 'confirmed' && (
                                 <Button
                                   size="sm"
                                   variant="gold"
                                   onClick={() => handleStatusUpdate(appointment.id, 'in_progress')}
                                   className="hover:scale-105 transition-all duration-200"
                                 >
                                   <AlertCircle className="h-3 w-3 mr-1" />
                                   Start
                                 </Button>
                               )}
                               {appointment.status === 'in_progress' && (
                                 <Button
                                   size="sm"
                                   variant="success"
                                   onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                   className="hover:scale-105 transition-all duration-200"
                                 >
                                   <CheckCircle className="h-3 w-3 mr-1" />
                                   Complete
                                 </Button>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardEnhancedContent>
      </CardEnhanced>

      <CreateAppointmentDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        requests={requests}
        vendors={vendors}
        portfolioId={portfolioId}
        userId={userId}
      />

      <AppointmentDetailsDialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        appointment={selectedAppointment}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
};

export default MaintenanceAppointmentScheduler;
