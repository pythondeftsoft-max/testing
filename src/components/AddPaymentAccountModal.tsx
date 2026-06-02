import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Shield, Info } from 'lucide-react';
import { validateRoutingNumber, validateAccountNumber } from '@/utils/banking';
import { usePaymentAccounts } from '@/hooks/usePaymentAccounts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddPaymentAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId: string;
  portfolioId?: string;
}

export const AddPaymentAccountModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userId, 
  portfolioId 
}: AddPaymentAccountModalProps) => {
  const { refreshAccounts } = usePaymentAccounts(userId, portfolioId);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    bank_name: '',
    account_holder_name: '',
    account_type: '' as 'checking' | 'savings' | '',
    routing_number: '',
    account_number: '',
    is_default: false
  });
  const [validationErrors, setValidationErrors] = useState({
    routing_number: '',
    account_number: ''
  });

  const validateForm = () => {
    const errors = { routing_number: '', account_number: '' };
    let isValid = true;

    if (formData.routing_number && !validateRoutingNumber(formData.routing_number)) {
      errors.routing_number = 'Invalid routing number';
      isValid = false;
    }

    if (formData.account_number && !validateAccountNumber(formData.account_number)) {
      errors.account_number = 'Account number must be 4-17 digits';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label.trim() || !formData.account_holder_name.trim() || 
        !formData.account_type || !formData.routing_number || !formData.account_number) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('checkbook-add-funding-source', {
        body: {
          label: formData.label,
          bank_name: formData.bank_name,
          account_holder_name: formData.account_holder_name,
          account_type: formData.account_type,
          routing_number: formData.routing_number,
          account_number: formData.account_number,
          portfolio_id: portfolioId !== 'everything' ? portfolioId : undefined,
          is_default: formData.is_default
        }
      });

      if (error) throw error;

      toast({
        title: "Bank Account Linked",
        description: `"${formData.label}" has been successfully linked`,
      });

      handleClose();
      await refreshAccounts();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error linking bank account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link bank account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      label: '',
      bank_name: '',
      account_holder_name: '',
      account_type: '' as 'checking' | 'savings' | '',
      routing_number: '',
      account_number: '',
      is_default: false
    });
    setValidationErrors({ routing_number: '', account_number: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Link Bank Account
          </DialogTitle>
        </DialogHeader>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Security Notice:</strong> We never store your full bank details. 
            Account and routing numbers are sent directly to our secure payment processor 
            and only the last 4 digits are saved for display.
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="label">Account Label *</Label>
              <Input
                id="label"
                placeholder="e.g., Chase Operating"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                placeholder="e.g., Chase Bank"
                value={formData.bank_name}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_holder_name">Account Holder Name *</Label>
            <Input
              id="account_holder_name"
              placeholder="Full name on the account"
              value={formData.account_holder_name}
              onChange={(e) => setFormData(prev => ({ ...prev, account_holder_name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Account Type *</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value as 'checking' | 'savings' }))}
              required
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="routing_number">Routing Number *</Label>
              <Input
                id="routing_number"
                placeholder="9-digit routing number"
                maxLength={9}
                value={formData.routing_number}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, routing_number: value }));
                  if (value) validateForm();
                }}
                required
              />
              {validationErrors.routing_number && (
                <p className="text-sm text-destructive">{validationErrors.routing_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input
                id="account_number"
                placeholder="Account number"
                maxLength={17}
                value={formData.account_number}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, account_number: value }));
                  if (value) validateForm();
                }}
                required
              />
              {validationErrors.account_number && (
                <p className="text-sm text-destructive">{validationErrors.account_number}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_default: checked === true }))
              }
            />
            <Label htmlFor="is_default" className="text-sm">
              Set as default account
            </Label>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isLoading || !formData.label.trim() || !formData.account_holder_name.trim() || 
                       !formData.account_type || !formData.routing_number || !formData.account_number}
              className="flex-1"
            >
              {isLoading ? 'Linking...' : 'Link Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};