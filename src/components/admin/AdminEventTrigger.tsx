
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Award, Zap, CheckCircle, Users, Building, User } from 'lucide-react';
import { usePortfolioEvents, ProcessPortfolioEventParams } from '@/hooks/usePortfolioEvents';

interface AdminEventTriggerProps {
  portfolioId: string;
  properties?: Array<{ id: string; address: string }>;
  tenants?: Array<{ id: string; name: string; email: string }>;
  landlords?: Array<{ id: string; name: string; email: string; role: string }>;
  portfolios?: Array<{ id: string; name: string }>;
}

type EventFieldType = 'property' | 'tenant' | 'user' | 'portfolio' | 'early_payment' | 'months_retained';

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
    fields: ['property', 'tenant', 'user'] as EventFieldType[]
  },
  { 
    value: 'maintenance_completion', 
    label: 'Maintenance Completion', 
    points: 25, 
    description: 'Points for completing maintenance request',
    fields: ['property', 'user'] as EventFieldType[]
  },
  { 
    value: 'lease_renewal', 
    label: 'Lease Renewal', 
    points: 60, 
    description: 'Points for successful lease renewal',
    fields: ['property', 'tenant', 'user', 'months_retained'] as EventFieldType[]
  },
  { 
    value: 'property_inspection', 
    label: 'Property Inspection', 
    points: 30, 
    description: 'Points for property inspection completion',
    fields: ['property', 'user'] as EventFieldType[]
  },
  { 
    value: 'portfolio_management', 
    label: 'Portfolio Management', 
    points: 75, 
    description: 'Points for portfolio management activities',
    fields: ['portfolio', 'user'] as EventFieldType[]
  },
] as const;

const AdminEventTrigger = ({ 
  portfolioId, 
  properties = [], 
  tenants = [], 
  landlords = [], 
  portfolios = [] 
}: AdminEventTriggerProps) => {
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [targetPortfolioId, setTargetPortfolioId] = useState<string>(portfolioId);
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

    if (userId) {
      metadata.assignedUserId = userId;
    }

    const params: ProcessPortfolioEventParams = {
      eventType: selectedEvent as any,
      portfolioId: targetPortfolioId,
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
    setUserId('');
    setTargetPortfolioId(portfolioId);
    setIsEarlyPayment(false);
    setMonthsRetained('');
    setNotes('');
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-lg">Admin: Trigger Points Event</CardTitle>
        </div>
        <CardDescription>
          Manually trigger point-earning events for users across portfolios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Portfolio Selection */}
        {selectedEventType && selectedEventType.fields.includes('portfolio' as EventFieldType) && (
          <div className="space-y-2">
            <Label htmlFor="portfolio" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Portfolio
            </Label>
            <Select value={targetPortfolioId} onValueChange={setTargetPortfolioId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a portfolio" />
              </SelectTrigger>
              <SelectContent>
                {portfolios.map((portfolio) => (
                  <SelectItem key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Property Selection */}
        {selectedEventType && selectedEventType.fields.includes('property' as EventFieldType) && (
          <div className="space-y-2">
            <Label htmlFor="property" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Property
            </Label>
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

        {/* Tenant Selection */}
        {selectedEventType && selectedEventType.fields.includes('tenant' as EventFieldType) && (
          <div className="space-y-2">
            <Label htmlFor="tenant" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tenant
            </Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    <div className="flex flex-col">
                      <span>{tenant.name}</span>
                      <span className="text-xs text-gray-500">{tenant.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* User Selection (Landlord/PM/Invited) */}
        {selectedEventType && selectedEventType.fields.includes('user' as EventFieldType) && (
          <div className="space-y-2">
            <Label htmlFor="user" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Assign to User
            </Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {landlords.map((landlord) => (
                  <SelectItem key={landlord.id} value={landlord.id}>
                    <div className="flex flex-col">
                      <span>{landlord.name}</span>
                      <span className="text-xs text-gray-500">{landlord.email} • {landlord.role}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Early Payment Checkbox */}
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

        {/* Months Retained */}
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

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Admin Notes</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes about this event..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
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

        {/* Preview */}
        {selectedEventType && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
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

export default AdminEventTrigger;
