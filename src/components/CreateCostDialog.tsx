
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Receipt, Calculator } from 'lucide-react';
import { useMaintenanceCosts } from '@/hooks/useMaintenanceCosts';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { formatCurrency } from '@/lib/formatters';

interface CreateCostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId?: string;
}

const CreateCostDialog = ({ isOpen, onClose, portfolioId }: CreateCostDialogProps) => {
  const [formData, setFormData] = useState({
    maintenance_request_id: '',
    cost_type: '',
    description: '',
    quantity: 1,
    unit_cost: 0,
    receipt_url: ''
  });

  const { createCost } = useMaintenanceCosts();
  const { requests } = useMaintenanceRequests(portfolioId);

  const totalCost = formData.quantity * formData.unit_cost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.maintenance_request_id || !formData.cost_type || !formData.description) {
      return;
    }

    try {
      await createCost.mutateAsync({
        maintenance_request_id: formData.maintenance_request_id,
        cost_type: formData.cost_type as any,
        description: formData.description,
        quantity: formData.quantity,
        unit_cost: formData.unit_cost,
        receipt_url: formData.receipt_url || undefined
      });

      // Reset form
      setFormData({
        maintenance_request_id: '',
        cost_type: '',
        description: '',
        quantity: 1,
        unit_cost: 0,
        receipt_url: ''
      });

      onClose();
    } catch (error) {
      console.error('Error creating cost:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Add Maintenance Cost
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Maintenance Request Selection */}
          <div className="space-y-2">
            <Label htmlFor="maintenance_request">Maintenance Request *</Label>
            <Select
              value={formData.maintenance_request_id}
              onValueChange={(value) => handleInputChange('maintenance_request_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a maintenance request" />
              </SelectTrigger>
              <SelectContent>
                {requests.map((request) => (
                  <SelectItem key={request.id} value={request.id}>
                    {request.title} - {(request as any).properties?.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost Type */}
          <div className="space-y-2">
            <Label htmlFor="cost_type">Cost Type *</Label>
            <Select
              value={formData.cost_type}
              onValueChange={(value) => handleInputChange('cost_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cost type" />
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
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the cost item..."
              rows={3}
            />
          </div>

          {/* Quantity and Unit Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
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
              <Label htmlFor="unit_cost">Unit Cost *</Label>
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
              <div className="text-sm text-gray-600 mt-1">
                {formData.quantity} × {formatCurrency(formData.unit_cost)} = {formatCurrency(totalCost)}
              </div>
            </CardContent>
          </Card>

          {/* Receipt URL */}
          <div className="space-y-2">
            <Label htmlFor="receipt_url">Receipt URL (optional)</Label>
            <Input
              id="receipt_url"
              type="url"
              value={formData.receipt_url}
              onChange={(e) => handleInputChange('receipt_url', e.target.value)}
              placeholder="https://example.com/receipt.pdf"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.maintenance_request_id || !formData.cost_type || !formData.description || createCost.isPending}
            >
              {createCost.isPending ? 'Creating...' : 'Create Cost'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCostDialog;
