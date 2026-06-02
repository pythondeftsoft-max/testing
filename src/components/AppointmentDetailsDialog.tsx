
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMaintenanceAppointments } from '@/hooks/useMaintenanceAppointments';
import { useToast } from '@/hooks/use-toast';
import PermissionGuard from '@/components/permissions/PermissionGuard';

interface AppointmentDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: any;
  onStatusUpdate: (appointmentId: string, newStatus: string) => void;
  portfolioId?: string;
}

const AppointmentDetailsDialog = ({ 
  open, 
  onClose, 
  appointment, 
  onStatusUpdate,
  portfolioId 
}: AppointmentDetailsDialogProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateAppointment, deleteAppointment } = useMaintenanceAppointments();
  const { toast } = useToast();

  if (!appointment) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleConfirmation = async (type: 'tenant' | 'vendor', confirmed: boolean) => {
    setIsUpdating(true);
    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        [type === 'tenant' ? 'tenant_confirmed' : 'vendor_confirmed']: confirmed
      });
      
      toast({
        title: "Confirmation Updated",
        description: `${type === 'tenant' ? 'Tenant' : 'Vendor'} confirmation ${confirmed ? 'received' : 'removed'}`,
      });
    } catch (error) {
      console.error('Error updating confirmation:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(appointment.id, newStatus);
      toast({
        title: "Status Updated",
        description: `Appointment status changed to ${formatStatus(newStatus)}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteAppointment.mutateAsync(appointment.id);
        toast({
          title: "Appointment Deleted",
          description: "The appointment has been successfully deleted",
        });
        onClose();
      } catch (error) {
        console.error('Error deleting appointment:', error);
      }
    }
  };

  const canUpdateStatus = (currentStatus: string, newStatus: string) => {
    const statusFlow = {
      scheduled: ['confirmed', 'cancelled', 'rescheduled'],
      confirmed: ['in_progress', 'cancelled', 'rescheduled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: ['scheduled'],
      rescheduled: ['scheduled', 'confirmed']
    };
    return statusFlow[currentStatus as keyof typeof statusFlow]?.includes(newStatus) || false;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Appointment Details</span>
            <Badge className={getStatusColor(appointment.status)}>
              {formatStatus(appointment.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Scheduled Date
              </div>
              <p className="text-sm text-gray-600">
                {format(new Date(appointment.scheduled_date), 'EEEE, MMMM dd, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Time & Duration
              </div>
              <p className="text-sm text-gray-600">
                {format(new Date(appointment.scheduled_date), 'HH:mm')} 
                ({appointment.estimated_duration} minutes)
              </p>
            </div>
          </div>

          <Separator />

          {/* Confirmation Status */}
          <div className="space-y-3">
            <h4 className="font-medium">Confirmation Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Tenant Confirmation</span>
                </div>
                <div className="flex items-center gap-2">
                  {appointment.tenant_confirmed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConfirmation('tenant', !appointment.tenant_confirmed)}
                    disabled={isUpdating}
                  >
                    {appointment.tenant_confirmed ? 'Unconfirm' : 'Confirm'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Vendor Confirmation</span>
                </div>
                <div className="flex items-center gap-2">
                  {appointment.vendor_confirmed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConfirmation('vendor', !appointment.vendor_confirmed)}
                    disabled={isUpdating}
                  >
                    {appointment.vendor_confirmed ? 'Unconfirm' : 'Confirm'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Notes
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {appointment.notes}
                </p>
              </div>
            </>
          )}

          {/* Timing Information */}
          {(appointment.actual_start_time || appointment.actual_end_time) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Actual Timing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointment.actual_start_time && (
                    <div>
                      <p className="text-sm font-medium">Start Time</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(appointment.actual_start_time), 'HH:mm - MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  {appointment.actual_end_time && (
                    <div>
                      <p className="text-sm font-medium">End Time</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(appointment.actual_end_time), 'HH:mm - MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Status Actions */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Status Actions</h4>
            <div className="flex flex-wrap gap-2">
              {canUpdateStatus(appointment.status, 'confirmed') && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('confirmed')}
                  disabled={isUpdating}
                >
                  Confirm
                </Button>
              )}
              {canUpdateStatus(appointment.status, 'in_progress') && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdating}
                >
                  In Progress
                </Button>
              )}
              {canUpdateStatus(appointment.status, 'completed') && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdating}
                >
                  Complete
                </Button>
              )}
              {canUpdateStatus(appointment.status, 'cancelled') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              )}
              {canUpdateStatus(appointment.status, 'rescheduled') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('rescheduled')}
                  disabled={isUpdating}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Reschedule
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center space-x-2">
            <PermissionGuard 
              object="portfolio.maintenance" 
              action="edit" 
              scope="portfolio" 
              portfolioId={portfolioId}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUpdating(true)}
              >
                Update
              </Button>
            </PermissionGuard>
            <PermissionGuard 
              object="portfolio.maintenance" 
              action="delete" 
              scope="portfolio" 
              portfolioId={portfolioId}
            >
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </PermissionGuard>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetailsDialog;
