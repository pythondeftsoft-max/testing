import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Send, DollarSign, AlertCircle, CheckCircle2, Building2, Home, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBulkPayouts } from "@/hooks/useBulkPayouts";
import { useCheckbook } from "@/hooks/useCheckbook";
import { useToast } from "@/hooks/use-toast";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { BankAccountSelector } from "./BankAccountSelector";
import { MultiPropertySelector } from "./MultiPropertySelector";
import { RecipientBankAccountSelector } from "./RecipientBankAccountSelector";
import PortfolioSelectorDropdown from "@/components/PortfolioSelectorDropdown";

interface SimplifiedBulkPayoutFlowProps {
  userId: string;
  portfolioId?: string;
  onComplete?: () => void;
}

export const SimplifiedBulkPayoutFlow = ({ userId, portfolioId, onComplete }: SimplifiedBulkPayoutFlowProps) => {
  const [sourceBankAccountId, setSourceBankAccountId] = useState<string>("");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [selectedProperties, setSelectedProperties] = useState<any[]>([]);
  const [rentPeriodStart, setRentPeriodStart] = useState("");
  const [rentPeriodEnd, setRentPeriodEnd] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [recipientBankAccountId, setRecipientBankAccountId] = useState("");
  const [isVoucherProperty, setIsVoucherProperty] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(true);
  
  const { portfolios } = useUserPortfolios(userId);
  const { createBatch, addItemsToBatch, processBatch, isLoading: isBulkLoading } = useBulkPayouts();
  const { createPayout, isLoading: isCheckbookLoading } = useCheckbook();
  const { toast } = useToast();
  
  const isLoading = isBulkLoading || isCheckbookLoading;

  // Auto-fill logic when properties change
  useEffect(() => {
    if (selectedProperties.length > 0) {
      console.log('🏠 Selected Properties Data:', {
        count: selectedProperties.length,
        firstProperty: {
          address: selectedProperties[0]?.address,
          ownerName: selectedProperties[0]?.ownerName,
          ownerEmail: selectedProperties[0]?.ownerEmail,
          owner_id: selectedProperties[0]?.owner_id,
          monthly_rent: selectedProperties[0]?.monthly_rent,
          is_voucher_property: selectedProperties[0]?.is_voucher_property,
          defaultBankAccountId: selectedProperties[0]?.defaultBankAccountId
        }
      });
      
      const firstProperty = selectedProperties[0];
      
      // Check if all properties are from same landlord
      const allSameLandlord = selectedProperties.every(p => p.owner_id === firstProperty.owner_id);
      
      if (allSameLandlord && firstProperty.defaultBankAccountId) {
        setRecipientBankAccountId(firstProperty.defaultBankAccountId);
      }
      
      // Check if all properties are voucher properties
      const allVoucher = selectedProperties.every(p => p.is_voucher_property);
      setIsVoucherProperty(allVoucher);
      
      // Calculate amount
      if (allVoucher) {
        // Sum voucher portions
        const totalVoucherPortion = selectedProperties.reduce((sum, p) => 
          sum + (parseFloat(p.voucher_portion || '0')), 0
        );
        setAmount(totalVoucherPortion.toFixed(2));
      } else {
        // Sum total rents
        const totalRent = selectedProperties.reduce((sum, p) => 
          sum + (parseFloat(p.monthly_rent || '0')), 0
        );
        setAmount(totalRent.toFixed(2));
      }
      
      // Auto-generate memo
      if (selectedProperties.length > 1) {
        const propertyBreakdown = selectedProperties.map(p => {
          const propertyAmount = allVoucher 
            ? parseFloat(p.voucher_portion || '0')
            : parseFloat(p.monthly_rent || '0');
          return `${p.address} ($${propertyAmount.toFixed(2)})`;
        }).join(', ');
        setMemo(`Payment for ${selectedProperties.length} properties: ${propertyBreakdown}`);
      } else {
        setMemo(`Payment for ${firstProperty.address}`);
      }
    }
  }, [selectedProperties]);

  const handlePortfolioChange = (portId: string) => {
    setSelectedPortfolioId(portId);
    setSelectedProperties([]);
  };

  const handlePropertiesChange = (propertyIds: string[], propertiesData: any[]) => {
    setSelectedProperties(propertiesData);
  };

  const handleSendPayment = async () => {
    if (!validateForm()) return;

    if (!sourceBankAccountId) {
      toast({
        title: "Source account required",
        description: "Please select your source bank account",
        variant: "destructive"
      });
      return;
    }

    const firstProperty = selectedProperties[0];
    const landlordName = firstProperty?.ownerName || "";
    const landlordEmail = firstProperty?.ownerEmail || "";

    // Create payout request for Checkbook API
    const payoutRequest = {
      landlord_id: firstProperty?.owner_id || userId,
      portfolio_id: selectedPortfolioId,
      property_id: selectedProperties[0]?.id,
      amount: parseFloat(amount),
      recipient: {
        name: landlordName,
        email: landlordEmail,
        address: {
          line1: firstProperty?.address || firstProperty?.street || "Address on file",
          city: firstProperty?.city || "",
          state: firstProperty?.state || "",
          postal_code: firstProperty?.zipcode || firstProperty?.zip || "",
          country: "US"
        }
      },
      payout_method: 'ach' as const,
      memo: memo || `Payment for ${selectedProperties.map(p => p.address).join(', ')}`,
      source_account_id: sourceBankAccountId,
      due_date: rentPeriodEnd || undefined
    };

    const result = await createPayout(payoutRequest);

    if (result.success) {
      toast({
        title: "Payment sent successfully!",
        description: `$${amount} sent to ${landlordName}`,
      });
    }
  };

  const handlePayAnother = () => {
    // Clear form for next entry - no validation needed
    setSelectedPortfolioId("");
    setSelectedProperties([]);
    setRentPeriodStart("");
    setRentPeriodEnd("");
    setAmount("");
    setMemo("");
    setRecipientBankAccountId("");
    setIsVoucherProperty(false);
    
    toast({
      title: "Ready for next payout",
      description: "Form cleared for new entry"
    });
  };

  const validateForm = () => {
    if (!selectedPortfolioId) {
      toast({
        title: "Portfolio required",
        description: "Please select a portfolio",
        variant: "destructive"
      });
      return false;
    }

    if (selectedProperties.length === 0) {
      toast({
        title: "No properties selected",
        description: "Please select at least one property",
        variant: "destructive"
      });
      return false;
    }

    if (!recipientBankAccountId) {
      toast({
        title: "Bank account required",
        description: "Please select recipient's bank account",
        variant: "destructive"
      });
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const recipientLandlord = selectedProperties.length > 0 ? selectedProperties[0].ownerName : null;
  const hasVoucherWarning = selectedProperties.length > 0 && 
    !selectedProperties.every(p => p.is_voucher_property === selectedProperties[0].is_voucher_property);

  return (
    <div className="space-y-6">
      {/* Source Account */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Source Account</h3>
          <div className="space-y-2">
            <Label>Your Bank Account (Money FROM)</Label>
            <BankAccountSelector
              value={sourceBankAccountId}
              onChange={setSourceBankAccountId}
              label="Select your account"
            />
          </div>
        </div>
      </Card>

      {/* Single Payout Form - Collapsible */}
      <Collapsible open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
        <Card className="p-6">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payout Details 1</h3>
              <ChevronDown className={cn(
                "h-5 w-5 transition-transform duration-200",
                isPayoutOpen && "transform rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="space-y-6 mt-6">
              {/* Auto-filled Recipient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipient Name</Label>
                  <Input 
                    value={recipientLandlord || ''} 
                    disabled 
                    className="bg-muted"
                    placeholder={selectedProperties.length > 0 ? "Loading..." : "Select properties to auto-fill"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <Input 
                    value={selectedProperties[0]?.ownerEmail || ''} 
                    disabled 
                    className="bg-muted"
                    placeholder={selectedProperties.length > 0 ? "Loading..." : "Select properties to auto-fill"}
                  />
                </div>
              </div>

              {/* Portfolio & Properties */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Portfolio *</Label>
                  <PortfolioSelectorDropdown 
                    selectedPortfolio={selectedPortfolioId}
                    onPortfolioChange={handlePortfolioChange}
                    userId={userId}
                    disableInternalNavigation={true}
                    excludeEverything={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Properties *</Label>
                  {selectedPortfolioId ? (
                    <MultiPropertySelector
                      userId={userId}
                      portfolioId={selectedPortfolioId}
                      selectedPropertyIds={selectedProperties.map(p => p.id)}
                      onChange={handlePropertiesChange}
                    />
                  ) : (
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <span className="text-muted-foreground">Select portfolio first</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Mixed Voucher Warning */}
              {hasVoucherWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: You've selected both voucher and non-voucher properties. Consider processing them separately.
                  </AlertDescription>
                </Alert>
              )}

              {/* Recipient Bank Account */}
              <div className="space-y-2">
                <Label>Pay to Account (Recipient's bank) *</Label>
                {selectedProperties.length > 0 && selectedProperties[0]?.owner_id ? (
                  <RecipientBankAccountSelector
                    landlordId={selectedProperties[0].owner_id}
                    value={recipientBankAccountId}
                    onChange={setRecipientBankAccountId}
                  />
                ) : (
                  <Input 
                    disabled 
                    placeholder="Select properties to load recipient bank accounts"
                    className="bg-muted"
                  />
                )}
              </div>

              {/* Voucher Status */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isVoucherProperty}
                  onCheckedChange={(checked) => setIsVoucherProperty(checked === true)}
                  disabled={selectedProperties.length === 0 || selectedProperties.some(p => p.is_voucher_property)}
                />
                <Label>Section 8 / Voucher Properties</Label>
                {selectedProperties.some(p => p.is_voucher_property) && (
                  <Badge variant="secondary">Auto-detected</Badge>
                )}
              </div>

              {/* Rent Split Display (if voucher) */}
              {isVoucherProperty && selectedProperties.length > 0 && (
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Rent:</span>
                      <span className="font-medium">
                        ${selectedProperties.reduce((s, p) => s + parseFloat(p.monthly_rent || '0'), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tenant Portion:</span>
                      <span className="font-medium">
                        ${selectedProperties.reduce((s, p) => s + parseFloat(p.tenant_portion || '0'), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Voucher Portion:</span>
                      <span className="font-semibold text-primary">
                        ${selectedProperties.reduce((s, p) => s + parseFloat(p.voucher_portion || '0'), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Rent Period */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period Start</Label>
                  <Input
                    type="date"
                    value={rentPeriodStart}
                    onChange={(e) => setRentPeriodStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period End</Label>
                  <Input
                    type="date"
                    value={rentPeriodEnd}
                    onChange={(e) => setRentPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {selectedProperties.length > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Auto-calculated from {isVoucherProperty ? 'voucher portions' : 'property rents'}
                  </p>
                )}
              </div>

              {/* Memo */}
              <div className="space-y-2">
                <Label>Memo</Label>
                <Textarea
                  placeholder="Payment notes..."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                />
                {selectedProperties.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Auto-generated breakdown for {selectedProperties.length} properties
                  </p>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Action Buttons - Separate Section */}
      <div className="flex gap-2">
        <Button 
          onClick={handleSendPayment}
          className="flex-1 gap-2"
          disabled={!selectedPortfolioId || selectedProperties.length === 0 || !sourceBankAccountId || isLoading}
        >
          <Send className="h-4 w-4" />
          {isLoading ? "Sending..." : "Send Payment"}
        </Button>
        <Button 
          onClick={handlePayAnother}
          variant="outline"
          className="flex-1 gap-2"
        >
          <Plus className="h-4 w-4" />
          Pay Another
        </Button>
      </div>
    </div>
  );
};
