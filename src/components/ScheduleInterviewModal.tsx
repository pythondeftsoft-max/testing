import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, MapPin, Phone, Video, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
  landlordId: string;
  onInterviewScheduled: () => void;
}

const ScheduleInterviewModal = ({ 
  isOpen, 
  onClose, 
  application, 
  landlordId,
  onInterviewScheduled 
}: ScheduleInterviewModalProps) => {
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

  const handleSchedule = async () => {
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

      const appointmentNotes = notes;

      const { data: appointmentData, error } = await supabase
        .from('viewing_appointments')
        .insert({
          landlord_id: landlordId,
          tenant_id: application.tenant_id,
          property_id: application.property_id,
          appointment_date: appointmentDateTime.toISOString(),
          viewing_type: interviewType,
          status: 'scheduled',
          notes: appointmentNotes,
          desired_rent: application.properties?.monthly_rent || 0
        })
        .select()
        .single();

      if (error) throw error;

      // Create a message in the messages table with appointment details
      if (appointmentData) {
        // Get property address for message
        const { data: propertyData } = await supabase
          .from('properties')
          .select('address')
          .eq('id', application.property_id)
          .single();

        // Insert message with appointment extension
        await supabase.from('messages').insert({
          property_application_id: application.id,
          sender_id: landlordId,
          message_text: `Appointment Scheduled for ${propertyData?.address || 'property'}`,
          extension: 'appointment',
          payload: {
            appointment_id: appointmentData.id,
            appointment_date: appointmentDateTime.toISOString(),
            viewing_type: interviewType,
            notes: appointmentNotes,
            property_address: propertyData?.address
          },
          created_by_tenant: false
        });
      }

      toast({
        title: "Meeting Scheduled",
        description: `Meeting scheduled for ${format(appointmentDateTime, 'PPP')} at ${selectedTime}`,
      });

      onInterviewScheduled();
      onClose();
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('');
      setInterviewType('');
      setNotes('');
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in_person': return <MapPin className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'phone': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_person': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Application Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-gray-400" />
                <div>
                  <h3 className="font-semibold">
                    {application.profiles?.first_name} {application.profiles?.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{application.properties?.address}</p>
                  <Badge variant="outline" className="mt-1">
                    {application.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Meeting Type *</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger>
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video Call (Zoom)
                  </div>
                </SelectItem>
                <SelectItem value="phone">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Call
                  </div>
                </SelectItem>
                <SelectItem value="in_person">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    In Person
                  </div>
                </SelectItem>
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
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information for the meeting..."
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedDate && selectedTime && interviewType && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Meeting Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(interviewType)}
                    <Badge className={getTypeBadgeColor(interviewType)}>
                      {interviewType === 'video' ? 'Video Call' : 
                       interviewType === 'phone' ? 'Phone Call' : 'In Person'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSchedule} 
              disabled={loading || !selectedDate || !selectedTime || !interviewType}
              className="flex-1"
            >
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleInterviewModal;