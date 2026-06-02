import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAdminActions } from '@/hooks/useEnhancedAdminActions';
import { ArrowRight, Users, Building2, AlertTriangle } from 'lucide-react';

interface OwnershipTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Array<{
    id: string;
    address: string;
    owner_id: string;
    monthly_rent?: number;
  }>;
}

interface Owner {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string;
}

export const OwnershipTransferModal: React.FC<OwnershipTransferModalProps> = ({
  isOpen,
  onClose,
  properties
}) => {
  const { toast } = useToast();
  const { transferOwnership, isLoading } = useEnhancedAdminActions();
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [reason, setReason] = useState('');

  // Fetch all landlords for owner selection
  const { data: owners = [] } = useQuery({
    queryKey: ['landlords'],
    queryFn: async (): Promise<Owner[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, company_name')
        .eq('user_type', 'landlord')
        .order('first_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // Get unique current owners
  const currentOwnerIds = [...new Set(properties.map(p => p.owner_id))];
  const currentOwners = owners.filter(owner => currentOwnerIds.includes(owner.id));

  const handleTransfer = async () => {
    if (!selectedNewOwner || properties.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a new owner.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Transfer each property individually
      for (const property of properties) {
        await transferOwnership.mutateAsync({
          propertyId: property.id,
          newOwnerId: selectedNewOwner,
          reason: reason || `Bulk ownership transfer from admin panel`,
          metadata: {
            bulk_transfer: true,
            property_count: properties.length,
            previous_owner_id: property.owner_id
          }
        });
      }

      toast({
        title: "Ownership Transferred",
        description: `Successfully transferred ownership of ${properties.length} properties.`
      });

      onClose();
    } catch (error: any) {
      console.error('Transfer failed:', error);
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer ownership. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatOwnerName = (owner: Owner) => {
    return owner.company_name || `${owner.first_name} ${owner.last_name}`;
  };

  const totalValue = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Transfer Property Ownership
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transfer Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Transfer Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Properties to Transfer</Label>
                  <div className="text-2xl font-bold">{properties.length}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Monthly Rent</Label>
                  <div className="text-2xl font-bold">
                    ${totalValue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Current Owners */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Current Owners</Label>
                <div className="flex flex-wrap gap-2">
                  {currentOwners.map(owner => (
                    <Badge key={owner.id} variant="outline">
                      {formatOwnerName(owner)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Properties List */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Properties</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {properties.map(property => (
                    <div key={property.id} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                      <span>{property.address}</span>
                      {property.monthly_rent && (
                        <span className="font-medium">${property.monthly_rent.toLocaleString()}/mo</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Owner Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_owner">New Owner *</Label>
              <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new owner" />
                </SelectTrigger>
                <SelectContent>
                  {owners
                    .filter(owner => !currentOwnerIds.includes(owner.id))
                    .map(owner => (
                      <SelectItem key={owner.id} value={owner.id}>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {formatOwnerName(owner)}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">Transfer Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for ownership transfer..."
                rows={3}
              />
            </div>
          </div>

          {/* Warning */}
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Important Notice
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    This action will transfer ownership of {properties.length} properties. 
                    The new owner will gain full access and control over these properties. 
                    This action is logged in the audit trail.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleTransfer} 
              disabled={!selectedNewOwner || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Transferring...' : `Transfer ${properties.length} Properties`}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};