import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Shield, AlertCircle, Check } from "lucide-react";
import { format } from 'date-fns';

interface TenantInsuranceEntryFormProps {
  propertyId: string;
  tenantId: string;
  existingInsurance?: any;
  onSave?: () => void;
  onCancel?: () => void;
}

export const TenantInsuranceEntryForm: React.FC<TenantInsuranceEntryFormProps> = ({
  propertyId,
  tenantId,
  existingInsurance,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    provider_name: existingInsurance?.provider_name || '',
    policy_number: existingInsurance?.policy_number || '',
    policy_type: existingInsurance?.policy_type || '',
    liability_coverage: existingInsurance?.liability_coverage || 100000,
    personal_property_coverage: existingInsurance?.personal_property_coverage || 25000,
    effective_date: existingInsurance?.effective_date || '',
    expiration_date: existingInsurance?.expiration_date || '',
    premium_amount: existingInsurance?.premium_amount || 0,
    payment_frequency: existingInsurance?.payment_frequency || 'monthly',
    is_active: existingInsurance?.is_active ?? true,
    notes: existingInsurance?.notes || ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const insuranceData = {
        property_id: propertyId,
        tenant_id: tenantId,
        ...formData
      };

      if (existingInsurance?.id) {
        const { error } = await supabase
          .from('tenant_insurance')
          .update(insuranceData)
          .eq('id', existingInsurance.id);

        if (error) throw error;
        toast.success('Insurance information updated successfully!');
      } else {
        const { error } = await supabase
          .from('tenant_insurance')
          .insert(insuranceData);

        if (error) throw error;
        toast.success('Insurance information added successfully!');
      }

      onSave?.();
    } catch (error: any) {
      console.error('Error saving insurance:', error);
      toast.error('Failed to save insurance information: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    return formData.provider_name && 
           formData.policy_number && 
           formData.policy_type && 
           formData.effective_date && 
           formData.expiration_date &&
           new Date(formData.expiration_date) > new Date(formData.effective_date);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {existingInsurance ? 'Edit' : 'Add'} Tenant Insurance
        </CardTitle>
        <CardDescription>
          Enter the tenant's renters insurance information. All fields marked with * are required.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider and Policy Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Insurance Provider *</Label>
              <Input
                id="provider"
                value={formData.provider_name}
                onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                placeholder="e.g., State Farm, Allstate, GEICO"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy_number">Policy Number *</Label>
              <Input
                id="policy_number"
                value={formData.policy_number}
                onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                placeholder="e.g., SF-HO4-2024001"
                required
              />
            </div>
          </div>

          {/* Policy Type */}
          <div className="space-y-2">
            <Label htmlFor="policy_type">Policy Type *</Label>
            <Select 
              value={formData.policy_type} 
              onValueChange={(value) => setFormData({ ...formData, policy_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select policy type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HO-4">HO-4 (Standard Renters)</SelectItem>
                <SelectItem value="MSI">MSI (Master Insurance)</SelectItem>
                <SelectItem value="Third-party">Third-party Coverage</SelectItem>
                <SelectItem value="Basic Liability">Basic Liability</SelectItem>
                <SelectItem value="Comprehensive Coverage">Comprehensive Coverage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Coverage Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liability">Liability Coverage ($) *</Label>
              <Input
                id="liability"
                type="number"
                min="0"
                step="1000"
                value={formData.liability_coverage}
                onChange={(e) => setFormData({ ...formData, liability_coverage: Number(e.target.value) })}
                placeholder="100000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personal_property">Personal Property Coverage ($) *</Label>
              <Input
                id="personal_property"
                type="number"
                min="0"
                step="1000"
                value={formData.personal_property_coverage}
                onChange={(e) => setFormData({ ...formData, personal_property_coverage: Number(e.target.value) })}
                placeholder="25000"
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration_date">Expiration Date *</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Premium and Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="premium">Premium Amount ($)</Label>
              <Input
                id="premium"
                type="number"
                min="0"
                step="0.01"
                value={formData.premium_amount}
                onChange={(e) => setFormData({ ...formData, premium_amount: Number(e.target.value) })}
                placeholder="75.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Payment Frequency</Label>
              <Select 
                value={formData.payment_frequency} 
                onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Policy is currently active</Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the insurance policy..."
              rows={3}
            />
          </div>

          {/* Validation Warnings */}
          {formData.effective_date && formData.expiration_date && 
           new Date(formData.expiration_date) <= new Date(formData.effective_date) && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                Expiration date must be after the effective date.
              </span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!validateForm() || isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>Processing...</>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {existingInsurance ? 'Update' : 'Save'} Insurance
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};