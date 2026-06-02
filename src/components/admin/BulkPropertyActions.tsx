import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEnhancedAdminActions } from '@/hooks/useEnhancedAdminActions';
import { CheckSquare, Square, Edit, Trash2, ArrowRight, Users } from 'lucide-react';
import { OwnershipTransferModal } from './OwnershipTransferModal';

interface Property {
  id: string;
  street_1?: string;
  address?: string;
  monthly_rent?: number;
  status: string;
  owner_id: string;
  portfolio_id?: string;
}

interface BulkPropertyActionsProps {
  properties: Property[];
  selectedProperties: string[];
  onSelectionChange: (propertyIds: string[]) => void;
}

export const BulkPropertyActions: React.FC<BulkPropertyActionsProps> = ({
  properties,
  selectedProperties,
  onSelectionChange
}) => {
  const { batchUpdateProperties, softDeleteProperty, isLoading } = useEnhancedAdminActions();
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showOwnershipTransfer, setShowOwnershipTransfer] = useState(false);
  const [bulkValues, setBulkValues] = useState({
    status: '',
    on_market: '',
    monthly_rent: '',
    portfolio_id: '',
    reason: ''
  });

  const handleSelectAll = () => {
    if (selectedProperties.length === properties.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(properties.map(p => p.id));
    }
  };

  const handlePropertySelect = (propertyId: string) => {
    if (selectedProperties.includes(propertyId)) {
      onSelectionChange(selectedProperties.filter(id => id !== propertyId));
    } else {
      onSelectionChange([...selectedProperties, propertyId]);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProperties.length === 0 || !bulkAction) return;

    const updates: any = {};
    
    switch (bulkAction) {
      case 'status':
        if (bulkValues.status) updates.status = bulkValues.status;
        break;
      case 'market':
        if (bulkValues.on_market) updates.on_market = bulkValues.on_market;
        break;
      case 'rent':
        if (bulkValues.monthly_rent) updates.monthly_rent = bulkValues.monthly_rent;
        break;
      case 'portfolio':
        updates.portfolio_id = bulkValues.portfolio_id || null;
        break;
    }

    if (Object.keys(updates).length === 0) return;

    try {
      await batchUpdateProperties.mutateAsync({
        propertyIds: selectedProperties,
        updates,
        reason: bulkValues.reason || `Bulk ${bulkAction} update`,
        metadata: { bulk_action_type: bulkAction }
      });
      
      // Reset form
      setBulkAction('');
      setBulkValues({
        status: '',
        on_market: '',
        monthly_rent: '',
        portfolio_id: '',
        reason: ''
      });
      onSelectionChange([]);
    } catch (error) {
      console.error('Bulk update failed:', error);
    }
  };

  const selectedCount = selectedProperties.length;
  const allSelected = selectedCount === properties.length && properties.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < properties.length;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="p-1"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : someSelected ? (
                <div className="w-4 h-4 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-sm" />
                </div>
              ) : (
                <Square className="w-4 h-4" />
              )}
            </Button>
            <span>Bulk Actions</span>
            {selectedCount > 0 && (
              <Badge variant="secondary">
                {selectedCount} selected
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      {selectedCount > 0 && (
        <CardContent className="space-y-4">
          {/* Property Selection Display */}
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {selectedProperties.map(propertyId => {
              const property = properties.find(p => p.id === propertyId);
              return property ? (
                <Badge key={propertyId} variant="outline" className="text-xs">
                  {property.street_1 || property.address || `Property ${propertyId.slice(0, 8)}`}
                </Badge>
              ) : null;
            })}
          </div>

          {/* Bulk Action Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bulk action" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Update Status</SelectItem>
                    <SelectItem value="market">Update Market Listing</SelectItem>
                    <SelectItem value="rent">Update Rent</SelectItem>
                    <SelectItem value="portfolio">Transfer Portfolio</SelectItem>
                    <SelectItem value="ownership">Transfer Ownership</SelectItem>
                    <SelectItem value="soft_delete">Soft Delete</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            {/* Action-specific inputs */}
            {bulkAction === 'status' && (
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={bulkValues.status} onValueChange={(value) => setBulkValues(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="for_sale">For Sale</SelectItem>
                    <SelectItem value="under_contract">Under Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkAction === 'market' && (
              <div className="space-y-2">
                <Label>Market Status</Label>
                <Select value={bulkValues.on_market} onValueChange={(value) => setBulkValues(prev => ({ ...prev, on_market: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select market status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Listed on Market</SelectItem>
                    <SelectItem value="false">Not Listed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkAction === 'rent' && (
              <div className="space-y-2">
                <Label>Monthly Rent</Label>
                <Input
                  type="number"
                  placeholder="Enter rent amount"
                  value={bulkValues.monthly_rent}
                  onChange={(e) => setBulkValues(prev => ({ ...prev, monthly_rent: e.target.value }))}
                />
              </div>
            )}

            {bulkAction === 'portfolio' && (
              <div className="space-y-2">
                <Label>Portfolio ID (leave empty to remove)</Label>
                <Input
                  placeholder="Enter portfolio ID or leave empty"
                  value={bulkValues.portfolio_id}
                  onChange={(e) => setBulkValues(prev => ({ ...prev, portfolio_id: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Reason field */}
          {bulkAction && (
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="Enter reason for bulk update..."
                value={bulkValues.reason}
                onChange={(e) => setBulkValues(prev => ({ ...prev, reason: e.target.value }))}
                rows={2}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {bulkAction === 'ownership' ? (
              <Button 
                onClick={() => setShowOwnershipTransfer(true)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Transfer Ownership ({selectedCount} Properties)
              </Button>
            ) : bulkAction === 'soft_delete' ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Soft Delete {selectedCount} Properties
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Soft Delete</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to soft delete {selectedCount} properties. They will be hidden but can be restored later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={async () => {
                        try {
                          for (const propertyId of selectedProperties) {
                            await softDeleteProperty.mutateAsync({
                              propertyId,
                              reason: bulkValues.reason || 'Bulk soft delete from admin panel'
                            });
                          }
                          onSelectionChange([]);
                          setBulkAction('');
                        } catch (error) {
                          console.error('Bulk soft delete failed:', error);
                        }
                      }}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Soft Delete Properties
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    disabled={!bulkAction || isLoading}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Apply to {selectedCount} Properties
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to apply "{bulkAction}" changes to {selectedCount} properties. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkUpdate}>
                      Apply Changes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button 
              variant="outline" 
              onClick={() => onSelectionChange([])}
              disabled={isLoading}
            >
              Clear Selection
            </Button>
          </div>
        </CardContent>
      )}

      {/* Ownership Transfer Modal */}
      <OwnershipTransferModal
        isOpen={showOwnershipTransfer}
        onClose={() => setShowOwnershipTransfer(false)}
        properties={selectedProperties.map(id => {
          const property = properties.find(p => p.id === id);
          return {
            id,
            address: property?.street_1 || property?.address || `Property ${id.slice(0, 8)}`,
            owner_id: property?.owner_id || '',
            monthly_rent: property?.monthly_rent
          };
        })}
      />
    </Card>
  );
};