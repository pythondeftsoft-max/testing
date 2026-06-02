
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Receipt, Calculator, CheckCircle, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { MaintenanceCost, useMaintenanceCosts } from '@/hooks/useMaintenanceCosts';
import { formatCurrency } from '@/lib/formatters';
import PermissionGuard from '@/components/permissions/PermissionGuard';

interface CostDetailsDialogProps {
  cost: MaintenanceCost;
  isOpen: boolean;
  onClose: () => void;
  portfolioId?: string;
}

const CostDetailsDialog = ({ cost, isOpen, onClose, portfolioId }: CostDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    cost_type: cost.cost_type,
    description: cost.description,
    quantity: cost.quantity,
    unit_cost: cost.unit_cost,
    receipt_url: cost.receipt_url || ''
  });

  const { updateCost, approveCost, deleteCost } = useMaintenanceCosts();

  const totalCost = formData.quantity * formData.unit_cost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateCost.mutateAsync({
        id: cost.id,
        ...formData,
        receipt_url: formData.receipt_url || undefined
      });

      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error('Error updating cost:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await approveCost.mutateAsync(cost.id);
      onClose();
    } catch (error) {
      console.error('Error approving cost:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this cost entry?')) {
      try {
        await deleteCost.mutateAsync(cost.id);
        onClose();
      } catch (error) {
        console.error('Error deleting cost:', error);
      }
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusBadge = () => {
    if (cost.approved_at) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Cost Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cost Status and Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusBadge()}
              <div className="text-sm text-gray-600">
                Created: {format(new Date(cost.created_at), 'MMM dd, yyyy')}
              </div>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(cost.total_cost)}</div>
          </div>

          {/* Approval Info */}
          {cost.approved_at && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Approved</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Approved on {format(new Date(cost.approved_at), 'MMM dd, yyyy')}
                  {cost.approved_by && <span> by authorized user</span>}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Edit Form or Display */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cost Type */}
              <div className="space-y-2">
                <Label htmlFor="cost_type">Cost Type</Label>
                <Select
                  value={formData.cost_type}
                  onValueChange={(value) => handleInputChange('cost_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="materials">Materials</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="permits">Permits</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Quantity and Unit Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_cost">Unit Cost</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="unit_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => handleInputChange('unit_cost', parseFloat(e.target.value) || 0)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Total Cost Display */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Total Cost:</span>
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(totalCost)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Receipt URL */}
              <div className="space-y-2">
                <Label htmlFor="receipt_url">Receipt URL</Label>
                <Input
                  id="receipt_url"
                  type="url"
                  value={formData.receipt_url}
                  onChange={(e) => handleInputChange('receipt_url', e.target.value)}
                  placeholder="https://example.com/receipt.pdf"
                />
              </div>

              {/* Edit Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCost.isPending}>
                  {updateCost.isPending ? 'Updating...' : 'Update Cost'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Cost Details Display */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Cost Type</Label>
                  <div className="capitalize">{cost.cost_type.replace('_', ' ')}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Cost</Label>
                  <div className="text-xl font-bold">{formatCurrency(cost.total_cost)}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <div className="mt-1">{cost.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Quantity</Label>
                  <div>{cost.quantity}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Unit Cost</Label>
                  <div>{formatCurrency(cost.unit_cost)}</div>
                </div>
              </div>

              {cost.receipt_url && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Receipt</Label>
                  <div>
                    <a 
                      href={cost.receipt_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Receipt
                    </a>
                  </div>
                </div>
              )}

               {/* Actions */}
               <div className="flex justify-between pt-4">
                 <div className="flex space-x-2">
                   <PermissionGuard 
                     object="portfolio.maintenance" 
                     action="edit" 
                     scope="portfolio" 
                     portfolioId={portfolioId}
                   >
                     <Button variant="outline" onClick={() => setIsEditing(true)}>
                       Edit
                     </Button>
                   </PermissionGuard>
                   {!cost.approved_at && (
                     <Button onClick={handleApprove} disabled={approveCost.isPending}>
                       {approveCost.isPending ? 'Approving...' : 'Approve'}
                     </Button>
                   )}
                 </div>
                 <PermissionGuard 
                   object="portfolio.maintenance" 
                   action="delete" 
                   scope="portfolio" 
                   portfolioId={portfolioId}
                 >
                   <Button 
                     variant="destructive" 
                     onClick={handleDelete}
                     disabled={deleteCost.isPending}
                   >
                     {deleteCost.isPending ? 'Deleting...' : 'Delete'}
                   </Button>
                 </PermissionGuard>
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CostDetailsDialog;
