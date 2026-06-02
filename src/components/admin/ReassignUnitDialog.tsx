import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Home, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Unit {
  id: string;
  unit_number: string;
  unit_name: string | null;
  property_id: string;
  status: string;
}

interface ReassignUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string | null;
  propertyId: string;
  currentUnitNumber?: string | null;
  tenantName?: string;
  onReassign: (applicationId: string, unitId: string, reason?: string) => Promise<boolean>;
}

const ReassignUnitDialog = ({
  open,
  onOpenChange,
  applicationId,
  propertyId,
  currentUnitNumber,
  tenantName,
  onReassign
}: ReassignUnitDialogProps) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && propertyId) {
      fetchUnits();
    }
  }, [open, propertyId]);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('property_units')
        .select('*')
        .eq('property_id', propertyId)
        .or('status.eq.available,status.eq.vacant')
        .order('unit_number');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const filteredUnits = units.filter(unit =>
    unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (unit.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handleReassign = async () => {
    if (!applicationId || !selectedUnitId) return;

    setLoading(true);
    const success = await onReassign(applicationId, selectedUnitId, reason);
    
    if (success) {
      setSelectedUnitId('');
      setReason('');
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setSelectedUnitId('');
    setReason('');
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Application</DialogTitle>
          <DialogDescription>
            Reassign {tenantName}'s application to a different unit
            {currentUnitNumber && ` (currently Unit ${currentUnitNumber})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Unit Search */}
          <div>
            <label className="text-sm font-medium mb-2 block">Search Available Units</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by unit number or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Unit Selection */}
          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
            {filteredUnits.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No available units found</p>
              </div>
            ) : (
              filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUnitId === unit.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedUnitId(unit.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Unit {unit.unit_number}
                        </Badge>
                        <Badge 
                          variant={unit.status === 'available' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {unit.status}
                        </Badge>
                      </div>
                      {unit.unit_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {unit.unit_name}
                        </p>
                      )}
                    </div>
                    {selectedUnitId === unit.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-medium mb-2 block">Reason (Optional)</label>
            <Textarea
              placeholder="Enter reason for reassignment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleReassign}
              disabled={!selectedUnitId || loading}
              className="flex-1"
            >
              {loading ? 'Reassigning...' : 'Reassign Application'}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReassignUnitDialog;