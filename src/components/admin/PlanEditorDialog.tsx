import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscriptionPlans';

interface PlanEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: SubscriptionPlan | null;
  onSave: (plan: any) => void;
  isLoading?: boolean;
}

export const PlanEditorDialog = ({ open, onOpenChange, plan, onSave, isLoading }: PlanEditorDialogProps) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: 0,
    currency: 'USD',
    billing_interval: 'month',
    description: '',
    target_audience: '',
    role: 'landlord' as 'tenant' | 'landlord' | 'both',
    is_active: true,
    display_order: 0,
    features: [] as string[],
    limits: { properties: 0, applications: 0 } as Record<string, any>,
  });

  const [newFeature, setNewFeature] = useState('');
  const [propertiesUnlimited, setPropertiesUnlimited] = useState(false);
  const [applicationsUnlimited, setApplicationsUnlimited] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        id: plan.id,
        name: plan.name,
        price: plan.price / 100, // Convert from cents to dollars for display
        currency: plan.currency,
        billing_interval: plan.billing_interval,
        description: plan.description || '',
        target_audience: plan.target_audience || '',
        role: plan.role,
        is_active: plan.is_active,
        display_order: plan.display_order,
      features: Array.isArray(plan.features) ? plan.features : [],
        limits: (plan.limits || { properties: 0, applications: 0 }) as Record<string, any>,
      });
      setPropertiesUnlimited(plan.limits?.properties === 'unlimited');
      setApplicationsUnlimited(plan.limits?.applications === 'unlimited');
    } else {
      // Reset form for new plan
      setFormData({
        id: '',
        name: '',
        price: 0,
        currency: 'USD',
        billing_interval: 'month',
        description: '',
        target_audience: '',
        role: 'landlord',
        is_active: true,
        display_order: 0,
        features: [],
        limits: { properties: 0, applications: 0 },
      });
      setPropertiesUnlimited(false);
      setApplicationsUnlimited(false);
    }
  }, [plan, open]);

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    const limits = {
      properties: propertiesUnlimited ? 'unlimited' : formData.limits.properties,
      applications: applicationsUnlimited ? 'unlimited' : formData.limits.applications,
    };

    const planData = {
      ...formData,
      price: Math.round(formData.price * 100), // Convert to cents
      limits,
    };

    if (plan) {
      // Update existing plan
      onSave({ id: plan.id, ...planData });
    } else {
      // Create new plan - remove id field
      const { id, ...newPlanData } = planData;
      onSave(newPlanData);
    }
  };

  const priceDisplay = formData.price === 0 ? 'Free' : `$${formData.price}/${formData.billing_interval}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          <DialogDescription>
            {plan ? 'Update subscription plan details' : 'Create a new subscription plan'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Pro Plan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id">Plan ID</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                placeholder="pro"
                disabled={!!plan}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="9.99"
              />
              <p className="text-xs text-muted-foreground">{priceDisplay}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing">Billing</Label>
              <Select value={formData.billing_interval} onValueChange={(value) => setFormData(prev => ({ ...prev, billing_interval: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="landlord">Landlord</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Target Audience</Label>
            <Input
              id="target"
              value={formData.target_audience}
              onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
              placeholder="Professional Landlords"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Advanced features for professional landlords"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Features</Label>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
                placeholder="Add a feature"
              />
              <Button type="button" size="icon" onClick={handleAddFeature}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {feature}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveFeature(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Properties Limit</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={formData.limits.properties}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    limits: { ...prev.limits, properties: parseInt(e.target.value) || 0 }
                  }))}
                  disabled={propertiesUnlimited}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={propertiesUnlimited}
                    onCheckedChange={setPropertiesUnlimited}
                  />
                  <Label className="text-sm">Unlimited</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applications Limit</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={formData.limits.applications}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    limits: { ...prev.limits, applications: parseInt(e.target.value) || 0 }
                  }))}
                  disabled={applicationsUnlimited}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={applicationsUnlimited}
                    onCheckedChange={setApplicationsUnlimited}
                  />
                  <Label className="text-sm">Unlimited</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active Plan</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                className="w-24"
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
