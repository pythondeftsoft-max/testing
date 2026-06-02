import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, User, Phone, Mail } from 'lucide-react';

interface VoucherManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

const VoucherManagementModal = ({ isOpen, onClose, userId, onSuccess }: VoucherManagementModalProps) => {
  const [formData, setFormData] = useState({
    voucherNumber: '',
    voucherType: 'Housing Choice Voucher',
    housingAuthority: '',
    caseworkerName: '',
    caseworkerPhone: '',
    caseworkerEmail: '',
    expirationDate: '',
    voucherAmount: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update tenant profile with voucher information
      const { error: profileError } = await supabase
        .from('tenant_profiles')
        .update({
          voucher_status: 'yes',
          voucher_holder: true,
          housing_authority: formData.housingAuthority,
          voucher_amount: parseFloat(formData.voucherAmount) || null
        })
        .eq('user_id', userId);

      if (profileError) {
        throw profileError;
      }

      toast({
        title: "Voucher Information Updated",
        description: "Your voucher details have been saved successfully.",
      });

      onSuccess();
      onClose();
      setFormData({
        voucherNumber: '',
        voucherType: 'Housing Choice Voucher',
        housingAuthority: '',
        caseworkerName: '',
        caseworkerPhone: '',
        caseworkerEmail: '',
        expirationDate: '',
        voucherAmount: ''
      });
    } catch (error: any) {
      console.error('Error updating voucher information:', error);
      toast({
        title: "Error",
        description: "Failed to update voucher information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Voucher Information
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Voucher Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Voucher Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="voucherNumber">Voucher Number *</Label>
                <Input
                  id="voucherNumber"
                  value={formData.voucherNumber}
                  onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                  placeholder="e.g., HCV-2024-005678"
                  required
                />
              </div>

              <div>
                <Label htmlFor="voucherType">Voucher Type *</Label>
                <select
                  id="voucherType"
                  value={formData.voucherType}
                  onChange={(e) => setFormData({ ...formData, voucherType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Housing Choice Voucher">Housing Choice Voucher</option>
                  <option value="Project-Based Voucher">Project-Based Voucher</option>
                  <option value="VASH">VASH</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="housingAuthority">Housing Authority *</Label>
                <Input
                  id="housingAuthority"
                  value={formData.housingAuthority}
                  onChange={(e) => setFormData({ ...formData, housingAuthority: e.target.value })}
                  placeholder="e.g., Metropolitan Housing Authority"
                  required
                />
              </div>

              <div>
                <Label htmlFor="voucherAmount">Monthly Voucher Amount *</Label>
                <Input
                  id="voucherAmount"
                  type="number"
                  value={formData.voucherAmount}
                  onChange={(e) => setFormData({ ...formData, voucherAmount: e.target.value })}
                  placeholder="e.g., 900"
                  required
                />
              </div>

              <div>
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Caseworker Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Caseworker Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="caseworkerName">Caseworker Name</Label>
                <Input
                  id="caseworkerName"
                  value={formData.caseworkerName}
                  onChange={(e) => setFormData({ ...formData, caseworkerName: e.target.value })}
                  placeholder="e.g., Jennifer Smith"
                />
              </div>

              <div>
                <Label htmlFor="caseworkerPhone">Phone Number</Label>
                <Input
                  id="caseworkerPhone"
                  type="tel"
                  value={formData.caseworkerPhone}
                  onChange={(e) => setFormData({ ...formData, caseworkerPhone: e.target.value })}
                  placeholder="e.g., (314) 555-0123"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="caseworkerEmail">Email Address</Label>
                <Input
                  id="caseworkerEmail"
                  type="email"
                  value={formData.caseworkerEmail}
                  onChange={(e) => setFormData({ ...formData, caseworkerEmail: e.target.value })}
                  placeholder="e.g., j.smith@mha.gov"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : 'Save Voucher Information'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VoucherManagementModal;