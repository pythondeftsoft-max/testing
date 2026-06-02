import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Building2, Plus, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethod {
  id: string;
  type: string;
  brand: string | null;
  last_four: string | null;
  stripe_payment_method_id: string;
}

interface ChangePaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  scheduleId: string;
  currentPaymentMethodId: string | null;
  paymentMethods: PaymentMethod[];
  onMethodChanged: () => void;
}

export const ChangePaymentMethodModal = ({
  isOpen,
  onClose,
  propertyId,
  scheduleId,
  currentPaymentMethodId,
  paymentMethods,
  onMethodChanged,
}: ChangePaymentMethodModalProps) => {
  const [selectedMethodId, setSelectedMethodId] = useState<string>(currentPaymentMethodId || '');
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const { toast } = useToast();

  const getPaymentMethodIcon = (type: string) => {
    return type === 'us_bank_account' ? Building2 : CreditCard;
  };

  const formatBrandName = (method: PaymentMethod) => {
    if (method.brand) {
      // Capitalize first letter of each word
      return method.brand
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return method.type === 'us_bank_account' ? 'Bank Account' : 'Card';
  };

  const handleSelectMethod = async () => {
    if (!selectedMethodId || selectedMethodId === currentPaymentMethodId) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const selectedMethod = paymentMethods.find(pm => pm.id === selectedMethodId);
      
      const { error } = await supabase
        .from('autopay_schedules')
        .update({ 
          payment_method_id: selectedMethodId,
          payment_method_type: selectedMethod?.type || 'card'
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Payment Method Updated",
        description: "Your autopay payment method has been changed.",
      });

      onMethodChanged();
      onClose();
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast({
        title: "Error",
        description: "Failed to update payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    setAddingNew(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-payment-method-checkout', {
        body: { 
          payment_method_types: ['card', 'us_bank_account'],
          property_id: propertyId,
          purpose: 'add_payment_method'
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error starting add payment method:', error);
      toast({
        title: "Error",
        description: "Failed to open payment method setup. Please try again.",
        variant: "destructive",
      });
      setAddingNew(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Payment Method</DialogTitle>
          <DialogDescription>
            Select a saved payment method or add a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {paymentMethods.length > 0 ? (
            <RadioGroup value={selectedMethodId} onValueChange={setSelectedMethodId}>
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = getPaymentMethodIcon(method.type);
                  const isCurrent = method.id === currentPaymentMethodId;
                  
                  return (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMethodId === method.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedMethodId(method.id)}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <div className="p-2 bg-muted rounded-full">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatBrandName(method)}</span>
                          {method.last_four && (
                            <span className="text-muted-foreground">••••{method.last_four}</span>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Check className="w-3 h-3" /> Currently selected
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No saved payment methods</p>
            </div>
          )}

          {/* Add New Payment Method Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddNew}
            disabled={addingNew}
          >
            {addingNew ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add New Payment Method
          </Button>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSelectMethod} 
            disabled={saving || !selectedMethodId || selectedMethodId === currentPaymentMethodId}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
