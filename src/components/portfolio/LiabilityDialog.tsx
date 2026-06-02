import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus } from 'lucide-react';
import { useCreateLiability, CreateLiabilityParams } from '@/hooks/usePortfolioLiabilities';

interface LiabilityDialogProps {
  portfolioId: string;
  trigger?: React.ReactNode;
}

const LIABILITY_TYPES = [
  { value: 'debt', label: 'General Debt' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto_loan', label: 'Auto Loan' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'business_loan', label: 'Business Loan' },
  { value: 'line_of_credit', label: 'Line of Credit' },
  { value: 'other', label: 'Other' },
];

export const LiabilityDialog: React.FC<LiabilityDialogProps> = ({
  portfolioId,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateLiabilityParams>>({
    portfolio_id: portfolioId,
    liability_type: 'debt',
    is_secured: false,
    current_balance: 0,
    tags: [],
  });

  const createLiability = useCreateLiability();

  const handleInputChange = (field: keyof CreateLiabilityParams, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.liability_name || !formData.current_balance) return;

    await createLiability.mutateAsync(formData as CreateLiabilityParams);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      portfolio_id: portfolioId,
      liability_type: 'debt',
      is_secured: false,
      current_balance: 0,
      tags: [],
    });
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Minus className="w-4 h-4 mr-2" />
            Add Liability
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Liability</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="liability_name">
                  Liability Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="liability_name"
                  value={formData.liability_name || ''}
                  onChange={(e) => handleInputChange('liability_name', e.target.value)}
                  placeholder="e.g., Home Mortgage, Credit Card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="liability_type">Liability Type</Label>
                <Select
                  value={formData.liability_type}
                  onValueChange={(value) => handleInputChange('liability_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIABILITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_balance">
                  Current Balance <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="current_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.current_balance || ''}
                  onChange={(e) => handleInputChange('current_balance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="original_amount">Original Amount</Label>
                <Input
                  id="original_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.original_amount || ''}
                  onChange={(e) => handleInputChange('original_amount', parseFloat(e.target.value) || undefined)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.interest_rate || ''}
                  onChange={(e) => handleInputChange('interest_rate', parseFloat(e.target.value) || undefined)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly_payment">Monthly Payment</Label>
                <Input
                  id="monthly_payment"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_payment || ''}
                  onChange={(e) => handleInputChange('monthly_payment', parseFloat(e.target.value) || undefined)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maturity_date">Maturity Date</Label>
                <Input
                  id="maturity_date"
                  type="date"
                  value={formData.maturity_date || ''}
                  onChange={(e) => handleInputChange('maturity_date', e.target.value || undefined)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_secured"
                  checked={formData.is_secured || false}
                  onCheckedChange={(checked) => handleInputChange('is_secured', checked)}
                />
                <Label htmlFor="is_secured">Secured Debt</Label>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="liability_description">Description</Label>
            <Textarea
              id="liability_description"
              value={formData.liability_description || ''}
              onChange={(e) => handleInputChange('liability_description', e.target.value)}
              placeholder="Additional notes about this liability..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.liability_name || !formData.current_balance || createLiability.isPending}
            >
              {createLiability.isPending ? 'Adding...' : 'Add Liability'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};