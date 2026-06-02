import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMaintenanceAppointments } from '@/hooks/useMaintenanceAppointments';
import { useAllPropertiesWithUnits } from '@/hooks/useAllPropertiesWithUnits';
import { usePropertyTenants } from '@/hooks/usePropertyTenants';
import { useToast } from '@/hooks/use-toast';

interface CreateAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  requests: any[];
  vendors: any[];
  portfolioId?: string;
  userId?: string;
}

const CreateAppointmentDialog = ({ 
  open, 
  onClose, 
  requests, 
  vendors, 
  portfolioId,
  userId
}: CreateAppointmentDialogProps) => {
  const [formData, setFormData] = useState({
    maintenance_request_id: '',
    vendor_id: '',
    scheduled_date: undefined as Date | undefined,
    scheduled_time: '09:00',
    estimated_duration: 0,
    notes: '',
    is_recurring: false,
    recurring_pattern: null
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  
  // Time picker state
  const [selectedHour, setSelectedHour] = useState<string>('9');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('AM');

  // Convert 12-hour to 24-hour format
  const formatTimeTo24Hour = (hour: string, minute: string, period: string): string => {
    let h = parseInt(hour);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  // Sync time dropdowns with formData.scheduled_time
  useEffect(() => {
    const time24 = formatTimeTo24Hour(selectedHour, selectedMinute, selectedPeriod);
    setFormData(prev => ({ ...prev, scheduled_time: time24 }));
  }, [selectedHour, selectedMinute, selectedPeriod]);

  const { createAppointment } = useMaintenanceAppointments();
  const { toast } = useToast();

  // Fetch ALL properties in the portfolio (not just those with requests)
  const { data: allProperties = [] } = useAllPropertiesWithUnits(userId, portfolioId);

  // Fetch tenants for the selected property
  const { data: propertyTenants = [] } = usePropertyTenants(
    selectedPropertyId ? [selectedPropertyId] : [],
    !!selectedPropertyId
  );

  // Map properties to dropdown format
  const uniqueProperties = useMemo(() => {
    return allProperties.map(property => ({
      id: property.id,
      address: property.address
    }));
  }, [allProperties]);

  // Extract units for selected property from fetched properties
  const availableUnits = useMemo(() => {
    if (!selectedPropertyId) return [];
    const selectedProperty = allProperties.find(p => p.id === selectedPropertyId);
    return selectedProperty?.property_units?.map(unit => ({
      id: unit.id,
      unit_number: unit.unit_number,
      unit_name: null
    })) || [];
  }, [allProperties, selectedPropertyId]);

  // Filter tenants based on unit selection
  const availableTenants = useMemo(() => {
    if (!selectedPropertyId) return [];
    
    return propertyTenants
      .filter(tenant => {
        // If unit is selected, only show tenant for that unit
        if (selectedUnitId) {
          const selectedProperty = allProperties.find(p => p.id === selectedPropertyId);
          const selectedUnit = selectedProperty?.property_units?.find(u => u.id === selectedUnitId);
          // Match tenant's unit_number with selected unit's unit_number
          return selectedUnit?.unit_number === tenant.unit_number;
        }
        // Otherwise show all tenants for the property
        return true;
      })
      .map(tenant => ({
        id: tenant.tenant_id,
        name: `${tenant.profiles.first_name} ${tenant.profiles.last_name}`,
        unitNumber: tenant.unit_number,
        unitName: tenant.unit_name
      }));
  }, [propertyTenants, selectedPropertyId, selectedUnitId, allProperties]);

  // Filter requests based on property, unit, and tenant selection - only show OPEN requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Exclude completed requests - no need to schedule appointments for finished work
      if (req.status === 'completed') return false;
      if (selectedPropertyId && req.property_id !== selectedPropertyId) return false;
      if (selectedUnitId && req.unit_id !== selectedUnitId) return false;
      if (selectedTenantId && req.tenant_id !== selectedTenantId) return false;
      return true;
    });
  }, [requests, selectedPropertyId, selectedUnitId, selectedTenantId]);

  // Get tenant name from selected request
  const selectedRequest = useMemo(() => {
    return requests.find(req => req.id === formData.maintenance_request_id);
  }, [requests, formData.maintenance_request_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPropertyId || !formData.scheduled_date) {
      toast({
        title: "Validation Error",
        description: "Please select a property and date",
        variant: "destructive"
      });
      return;
    }

    try {
      const scheduledDateTime = new Date(formData.scheduled_date);
      const [hours, minutes] = formData.scheduled_time.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      await createAppointment.mutateAsync({
        maintenance_request_id: formData.maintenance_request_id || undefined,
        vendor_id: formData.vendor_id && formData.vendor_id !== '_other' ? formData.vendor_id : undefined,
        scheduled_date: scheduledDateTime.toISOString(),
        estimated_duration: formData.estimated_duration,
        notes: formData.notes || undefined,
        is_recurring: formData.is_recurring,
        recurring_pattern: formData.recurring_pattern,
        property_id: selectedPropertyId,
        unit_id: selectedUnitId || undefined,
        tenant_id: selectedTenantId || undefined,
      });

      // Reset form
      setFormData({
        maintenance_request_id: '',
        vendor_id: '',
        scheduled_date: undefined,
        scheduled_time: '09:00',
        estimated_duration: 0,
        notes: '',
        is_recurring: false,
        recurring_pattern: null
      });
      setSelectedPropertyId('');
      setSelectedUnitId('');
      setSelectedTenantId('');
      onClose();
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule Maintenance Appointment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property_filter">Property *</Label>
              <Select
                value={selectedPropertyId || '_all'}
                onValueChange={(value) => {
                  setSelectedPropertyId(value === '_all' ? '' : value);
                  setSelectedUnitId('');
                  setSelectedTenantId('');
                  setFormData(prev => ({ ...prev, maintenance_request_id: '' }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All properties</SelectItem>
                  {uniqueProperties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_filter">Unit (Optional Filter)</Label>
              <Select
                value={selectedUnitId || '_all'}
                onValueChange={(value) => {
                  setSelectedUnitId(value === '_all' ? '' : value);
                  setSelectedTenantId('');
                  setFormData(prev => ({ ...prev, maintenance_request_id: '' }));
                }}
                disabled={!selectedPropertyId || availableUnits.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All units</SelectItem>
                  {availableUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_name || `Unit ${unit.unit_number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_filter">Tenant (Optional Filter)</Label>
              <Select
                value={selectedTenantId || '_all'}
                onValueChange={(value) => {
                  setSelectedTenantId(value === '_all' ? '' : value);
                  setFormData(prev => ({ ...prev, maintenance_request_id: '' }));
                }}
                disabled={!selectedPropertyId || availableTenants.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedPropertyId ? (availableTenants.length === 0 ? "No tenants" : "All tenants") : "Select property first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All tenants</SelectItem>
                  {availableTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}{tenant.unitNumber ? ` (Unit ${tenant.unitNumber})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance_request">Maintenance Request (Optional)</Label>
              <Select
                value={formData.maintenance_request_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, maintenance_request_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select maintenance request" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRequests.map((request) => (
                    <SelectItem key={request.id} value={request.id}>
                      {request.title} - {request.priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor (Optional)</Label>
              <Select
                value={formData.vendor_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_other">Other (Landlord / Self / Not Listed)</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.company_name} - {vendor.contact_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_duration">Duration (minutes)</Label>
              <Input
                id="estimated_duration"
                type="number"
                min="0"
                max="480"
                step="30"
                value={formData.estimated_duration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scheduled Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.scheduled_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduled_date ? format(formData.scheduled_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.scheduled_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, scheduled_date: date }))}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Scheduled Time *</Label>
              <div className="flex gap-2">
                {/* Hour Select */}
                <Select value={selectedHour} onValueChange={setSelectedHour}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="Hr" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Minute Select */}
                <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                      <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                        {minute.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* AM/PM Select */}
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes for the appointment..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createAppointment.isPending}
            >
              {createAppointment.isPending ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentDialog;
