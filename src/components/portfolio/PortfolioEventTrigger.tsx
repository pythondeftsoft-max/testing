
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Award, Zap, CheckCircle } from 'lucide-react';
import { usePortfolioEvents, ProcessPortfolioEventParams } from '@/hooks/usePortfolioEvents';

interface PortfolioEventTriggerProps {
  portfolioId: string;
  properties?: Array<{ id: string; address: string }>;
  tenants?: Array<{ id: string; name: string }>;
}

type EventFieldType = 'property' | 'tenant' | 'early_payment' | 'months_retained';

const EVENT_TYPES = [
  { 
    value: 'rent_payment', 
    label: 'Rent Payment', 
    points: 50, 
    description: 'Points for rent payment received',
    fields: ['property', 'tenant', 'early_payment'] as EventFieldType[]
  },
  { 
    value: 'lease_signing', 
    label: 'Lease Signing', 
    points: 100, 
    description: 'Points for new lease agreement',
    fields: ['property', 'tenant'] as EventFieldType[]
  },
  { 
    value: 'maintenance_completion', 
    label: 'Maintenance Completion', 
    points: 25, 
    description: 'Points for completing maintenance request',
    fields: ['property'] as EventFieldType[]
  },
  { 
    value: 'lease_renewal', 
    label: 'Lease Renewal', 
    points: 60, 
    description: 'Points for successful lease renewal',
    fields: ['property', 'tenant', 'months_retained'] as EventFieldType[]
  },
  { 
    value: 'property_inspection', 
    label: 'Property Inspection', 
    points: 30, 
    description: 'Points for property inspection completion',
    fields: ['property'] as EventFieldType[]
  },
] as const;

const PortfolioEventTrigger = ({ portfolioId, properties = [], tenants = [] }: PortfolioEventTriggerProps) => {
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  const [isEarlyPayment, setIsEarlyPayment] = useState(false);
  const [monthsRetained, setMonthsRetained] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { processEvent } = usePortfolioEvents();

  const selectedEventType = EVENT_TYPES.find(event => event.value === selectedEvent);

  const handleTriggerEvent = () => {
    if (!selectedEvent) return;

    const metadata: Record<string, any> = {};
    
    if (isEarlyPayment && selectedEvent === 'rent_payment') {
      metadata.isEarly = true;
    }
    
    if (monthsRetained && selectedEvent === 'lease_renewal') {
      metadata.monthsRetained = parseInt(monthsRetained);
    }

    if (notes) {
      metadata.notes = notes;
    }

    const params: ProcessPortfolioEventParams = {
      eventType: selectedEvent as any,
      portfolioId,
      propertyId: propertyId || undefined,
      tenantId: tenantId || undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    processEvent.mutate(params);
  };

  const resetForm = () => {
    setSelectedEvent('');
    setPropertyId('');
    setTenantId('');
    setIsEarlyPayment(false);
    setMonthsRetained('');
    setNotes('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-base">Trigger Points Event</CardTitle>
        </div>
        <CardDescription>
          Manually trigger point-earning events for testing or missed activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="event-type">Event Type</Label>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Select an event type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((event) => (
                <SelectItem key={event.value} value={event.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{event.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {event.points} pts
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEventType && (
            <p className="text-sm text-muted-foreground">
              {selectedEventType.description}
            </p>
          )}
        </div>

        {/* Conditional Fields */}
        {selectedEventType && selectedEventType.fields.includes('property' as EventFieldType) && (
          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedEventType && selectedEventType.fields.includes('tenant' as EventFieldType) && (
          <div className="space-y-2">
            <Label htmlFor="tenant">Tenant</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedEventType && selectedEventType.fields.includes('early_payment' as EventFieldType) && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="early-payment" 
              checked={isEarlyPayment}
              onCheckedChange={(checked) => setIsEarlyPayment(checked === true)}
            />
            <Label htmlFor="early-payment" className="text-sm">
              Early payment (20% bonus)
            </Label>
          </div>
        )}

        {selectedEventType && selectedEventType.fields.includes('months_retained' as EventFieldType) && (
          <div className="space-y-2">
            <Label htmlFor="months-retained">Months Retained</Label>
            <Input
              id="months-retained"
              type="number"
              placeholder="12"
              value={monthsRetained}
              onChange={(e) => setMonthsRetained(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes about this event..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex space-x-2 pt-4">
          <Button 
            onClick={handleTriggerEvent}
            disabled={!selectedEvent || processEvent.isPending}
            className="flex-1"
          >
            {processEvent.isPending ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Award Points
              </>
            )}
          </Button>
          <Button variant="outline" onClick={resetForm}>
            Reset
          </Button>
        </div>

        {selectedEventType && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 text-blue-800">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                This will award {selectedEventType.points} points
                {isEarlyPayment && selectedEvent === 'rent_payment' && ' (+20% early payment bonus)'}
                {monthsRetained && selectedEvent === 'lease_renewal' && ` (${Math.min(parseInt(monthsRetained) / 12, 2)}x retention multiplier)`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioEventTrigger;
