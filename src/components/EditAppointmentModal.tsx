import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onAppointmentUpdated: () => void;
}

const EditAppointmentModal = ({ 
  isOpen, 
  onClose, 
  appointment,
  onAppointmentUpdated 
}: EditAppointmentModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  useEffect(() => {
    if (appointment && isOpen) {
      const appointmentDate = new Date(appointment.appointment_date);
      setSelectedDate(appointmentDate);
      setSelectedTime(format(appointmentDate, 'HH:mm'));
      setInterviewType(appointment.viewing_type || '');
      setNotes(appointment.notes || '');
    }
  }, [appointment, isOpen]);

  const handleUpdate = async () => {
    if (!selectedDate || !selectedTime || !interviewType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase
        .from('viewing_appointments')
        .update({
          appointment_date: appointmentDateTime.toISOString(),
          viewing_type: interviewType,
          notes: notes,
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Appointment Updated",
        description: `Meeting updated for ${format(appointmentDateTime, 'PPP')} at ${selectedTime}`,
      });

      onAppointmentUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setSelectedDate(undefined);
    setSelectedTime('');
    setInterviewType('');
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Meeting Type *</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger>
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video Call (Zoom)</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meeting Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Meeting Time *</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Update meeting notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={loading || !selectedDate || !selectedTime || !interviewType}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Updating...' : 'Update Meeting'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentModal;