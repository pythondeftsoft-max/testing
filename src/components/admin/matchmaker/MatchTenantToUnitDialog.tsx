import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, Home, Bed, Bath, DollarSign, Building2, Send } from 'lucide-react';
import { useCreateMatchProposal } from '@/hooks/useMatchProposals';

interface MatchTenantToUnitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
}

export const MatchTenantToUnitDialog: React.FC<MatchTenantToUnitDialogProps> = ({
  isOpen,
  onClose,
  tenantId,
  tenantName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const createMatchProposal = useCreateMatchProposal();

  // Fetch available units
  const { data: availableUnits, isLoading } = useQuery({
    queryKey: ['available-units-for-matching'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_units')
        .select(`
          id,
          unit_number,
          unit_name,
          bedrooms,
          bathrooms,
          monthly_rent,
          on_market,
          properties!inner (
            id,
            address,
            city,
            state,
            zipcode,
            unit_count,
            on_market,
            deleted_at
          )
        `)
        .is('properties.deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Filter to only show units that are actually on market
      const onMarketUnits = data?.filter((unit: any) => {
        const isMultiUnit = unit.properties?.unit_count > 1;
        
        if (isMultiUnit) {
          return unit.on_market === true;
        } else {
          return unit.properties?.on_market === true;
        }
      }) || [];

      return onMarketUnits;
    },
    enabled: isOpen,
    refetchOnMount: 'always',
  });

  // Filter units by search term
  const filteredUnits = availableUnits?.filter(unit => {
    const searchLower = searchTerm.toLowerCase();
    const property = unit.properties as any;
    return (
      property?.address?.toLowerCase().includes(searchLower) ||
      property?.city?.toLowerCase().includes(searchLower) ||
      unit.unit_name?.toLowerCase().includes(searchLower) ||
      unit.unit_number?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectUnit = (unit: any) => {
    setSelectedUnit(unit);
  };

  const handleConfirmMatch = async () => {
    if (!selectedUnit) return;

    await createMatchProposal.mutateAsync({
      tenantId,
      unitId: selectedUnit.id,
      adminNotes: notes || undefined,
    });
    
    // Reset form
    setSelectedUnit(null);
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Send Property Match to Tenant</DialogTitle>
          <DialogDescription>
            {selectedUnit 
              ? `Confirm match proposal for ${tenantName}`
              : `Select a property to propose to ${tenantName} (${availableUnits?.length || 0} units available)`
            }
          </DialogDescription>
        </DialogHeader>

        {!selectedUnit ? (
          <>
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address, city, or unit number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Available units list - Scrollable */}
            <ScrollArea className="h-[500px] mt-4 pr-4">
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))
                ) : filteredUnits && filteredUnits.length > 0 ? (
                  filteredUnits.map((unit) => {
                    const property = unit.properties as any;
                    const isMultiUnit = property?.unit_count > 1;
                    return (
                      <div
                        key={unit.id}
                        className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleSelectUnit(unit)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Home className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <h4 className="font-semibold text-sm truncate">
                                {property?.address || 'Unknown Address'}
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                {unit.unit_name || unit.unit_number || 'Unit 1'}
                              </Badge>
                              {isMultiUnit && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Building2 className="h-3 w-3" />
                                  Multi-unit
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {property?.city}, {property?.state} {property?.zipcode}
                            </p>
                            <div className="flex gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{unit.bedrooms} bed</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{unit.bathrooms} bath</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>${unit.monthly_rent}/mo</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectUnit(unit);
                            }}
                            disabled={createMatchProposal.isPending}
                            className="flex-shrink-0"
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchTerm ? (
                      <div>
                        <p className="font-medium">No units found matching "{searchTerm}"</p>
                        <p className="text-sm mt-1">
                          Total available: {availableUnits?.length || 0} units
                        </p>
                      </div>
                    ) : (
                      <p>No available units on market</p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Selected unit summary */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Home className="h-4 w-4" />
                <h3 className="font-medium">
                  {(selectedUnit.properties as any)?.address}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedUnit.unit_name || `Unit ${selectedUnit.unit_number}`} • 
                {selectedUnit.bedrooms} bed, {selectedUnit.bathrooms} bath • 
                ${selectedUnit.monthly_rent}/mo
              </p>
            </div>

            {/* Info about the flow */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">What happens next?</h4>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Tenant receives this property match and can express interest</li>
                <li>If interested, landlord reviews and decides to approve or deny</li>
                <li>If approved, tenant becomes primary applicant (normal flow continues)</li>
              </ol>
            </div>

            {/* Notes for tenant */}
            <div className="space-y-2">
              <Label htmlFor="notes">Note for Tenant (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note explaining why this property is a great fit..."
                rows={3}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setSelectedUnit(null)}
                disabled={createMatchProposal.isPending}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmMatch}
                disabled={createMatchProposal.isPending}
              >
                {createMatchProposal.isPending ? 'Sending...' : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Match to Tenant
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
