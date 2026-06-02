import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, Phone, MapPin, Home } from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentMessageCardProps {
  message: any;
  isSender: boolean;
  userType: 'landlord' | 'tenant';
  onUpdate?: () => void;
  senderName?: string;
}

const AppointmentMessageCard = ({ message, isSender, userType, onUpdate, senderName }: AppointmentMessageCardProps) => {
  const payload = message.payload || {};
  const appointmentDate = payload.appointment_date ? new Date(payload.appointment_date) : null;
  const viewingType = payload.viewing_type || 'video';
  const location = payload.location;
  const zoomLink = payload.zoom_link;
  const phoneNumber = payload.phone_number;
  const notes = payload.notes;
  const propertyAddress = payload.property_address;

  const getTypeIcon = () => {
    switch (viewingType) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in_person': return <MapPin className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeBorderColor = () => {
    switch (viewingType) {
      case 'video': return 'border-l-blue-500';
      case 'phone': return 'border-l-green-500';
      case 'in_person': return 'border-l-purple-500';
      default: return 'border-l-gray-500';
    }
  };

  const getTypeBadgeColor = () => {
    switch (viewingType) {
      case 'video': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'phone': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_person': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = () => {
    switch (viewingType) {
      case 'video': return 'Video Call';
      case 'phone': return 'Phone Call';
      case 'in_person': return 'In Person';
      default: return 'Appointment';
    }
  };

  return (
    <Card className={`border-l-4 ${getTypeBorderColor()} hover:bg-accent/30 transition-colors`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-semibold">Appointment Scheduled</span>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Scheduled
          </Badge>
        </div>

        {/* Scheduled By */}
        <div className="text-xs text-muted-foreground">
          Scheduled by: {isSender ? 'You' : (senderName || 'Landlord')}
        </div>

        {/* Date and Time */}
        {appointmentDate && (
          <div className="space-y-2">
            <div className="text-2xl font-bold text-foreground">
              {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2 text-lg font-medium text-muted-foreground">
              <Clock className="h-5 w-5" />
              {format(appointmentDate, 'h:mm a')}
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="flex items-center gap-2">
          <Badge className={getTypeBadgeColor()}>
            {getTypeIcon()}
            <span className="ml-1">{getTypeLabel()}</span>
          </Badge>
        </div>

        {/* Property Address */}
        {propertyAddress && (
          <div className="flex items-start gap-2 text-sm">
            <Home className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{propertyAddress}</span>
          </div>
        )}

        {/* Contact Info */}
        {(zoomLink || phoneNumber || location) && (
          <div className="flex items-start gap-2 text-sm bg-muted/50 p-3 rounded-md">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              {zoomLink && (
                <a 
                  href={zoomLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {zoomLink}
                </a>
              )}
              {phoneNumber && (
                <a 
                  href={`tel:${phoneNumber}`}
                  className="text-blue-600 hover:underline"
                >
                  {phoneNumber}
                </a>
              )}
              {location && (
                <span className="text-muted-foreground">{location}</span>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <span className="font-medium">Notes:</span> {notes}
          </div>
        )}

        {/* Footer with timestamp */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          Scheduled {format(new Date(message.created_at), 'PPp')}
        </div>
      </div>
    </Card>
  );
};

export default AppointmentMessageCard;
