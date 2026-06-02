import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, DollarSign, Home, Calendar, FileText, Users, Building2, AlertCircle, Send, CheckCircle2 } from "lucide-react";
import { useBulkPayouts } from "@/hooks/useBulkPayouts";
import { useToast } from "@/hooks/use-toast";
import { useUserPortfolios } from "@/hooks/useUserPortfolios";
import { BankAccountSelector } from "./BankAccountSelector";
import { MultiPropertySelector } from "./MultiPropertySelector";
import { RentSplitInputs } from "./RentSplitInputs";
import { QuickAddPropertiesDialog } from "./QuickAddPropertiesDialog";
import { RecipientBankAccountSelector } from "./RecipientBankAccountSelector";
import PortfolioSelectorDropdown from "@/components/PortfolioSelectorDropdown";

interface BulkPayoutFlowProps {
  userId: string;
  portfolioId?: string;
  onComplete?: () => void;
}

interface PayoutItem {
  id: string;
  landlordId?: string;
  landlordName: string;
  landlordEmail: string;
  amount: string;
  recipientBankAccountId?: string;
  propertyId?: string;
  propertyAddress?: string;
  portfolioId?: string;
  portfolioName?: string;
  rentPeriodStart?: string;
  rentPeriodEnd?: string;
  notes?: string;
  isVoucher?: boolean;
  tenantPortion?: string;
  voucherPortion?: string;
  totalRent?: string;
}

export const BulkPayoutFlow = ({ userId, portfolioId, onComplete }: BulkPayoutFlowProps) => {
  const [payoutItems, setPayoutItems] = useState<PayoutItem[]>([]);
  const [sourceBankAccountId, setSourceBankAccountId] = useState<string>("");
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const { portfolios } = useUserPortfolios(userId);
  
  // Multi-select state
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [selectedProperties, setSelectedProperties] = useState<any[]>([]);
  const [sharedRentPeriod, setSharedRentPeriod] = useState({
    start: "",
    end: ""
  });
  const [sharedNotes, setSharedNotes] = useState("");
  const [bulkVoucherMode, setBulkVoucherMode] = useState(false);
  const [bulkRentSplit, setBulkRentSplit] = useState({
    tenantPortion: "",
    voucherPortion: ""
  });
  
  // Manual entry state (for auto-fill fields)
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualBankAccountId, setManualBankAccountId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  
  const { createBatch, addItemsToBatch, processBatch, isLoading } = useBulkPayouts();
  const { toast } = useToast();

  const handlePortfolioChange = (portfolioId: string) => {
    setSelectedPortfolioId(portfolioId);
    setSelectedProperties([]); // Reset property selection when portfolio changes
  };

  const handlePropertiesChange = (propertyIds: string[], propertiesData: any[]) => {
    setSelectedProperties(propertiesData);
    
    // Smart auto-fill logic
    if (propertiesData.length > 0) {
      const firstProperty = propertiesData[0];
      
      // Check if all properties have same landlord
      const allSameLandlord = propertiesData.every(p => p.owner_id === firstProperty.owner_id);
      
      if (allSameLandlord && firstProperty.ownerName) {
        // Auto-fill name and email if all properties have same landlord
        if (!manualName || manualName === "") {
          setManualName(firstProperty.ownerName || "");
        }
        if (!manualEmail || manualEmail === "") {
          setManualEmail(firstProperty.ownerEmail || "");
        }
        // Auto-select default bank account if available
        if (!manualBankAccountId && firstProperty.defaultBankAccountId) {
          setManualBankAccountId(firstProperty.defaultBankAccountId);
        }
      }
      
      // Calculate total amount from all properties
      const totalRent = propertiesData.reduce((sum, prop) => {
        return sum + (parseFloat(prop.monthlyRent || "0"));
      }, 0);
      
      if (!manualAmount || manualAmount === "") {
        setManualAmount(totalRent.toFixed(2));
      }
    }
  };

  const handleAddRecipients = () => {
    // Validation
    if (!selectedPortfolioId) {
      toast({
        title: "Portfolio required",
        description: "Please select a portfolio first",
        variant: "destructive"
      });
      return;
    }

    if (selectedProperties.length === 0) {
      toast({
        title: "No properties selected",
        description: "Please select at least one property",
        variant: "destructive"
      });
      return;
    }

    // Group properties by landlord
    const landlordGroups = new Map<string, typeof selectedProperties>();
    selectedProperties.forEach(prop => {
      const key = prop.owner_id || 'unknown';
      if (!landlordGroups.has(key)) {
        landlordGroups.set(key, []);
      }
      landlordGroups.get(key)!.push(prop);
    });

    // Create payout items for each selected property
    // Use manual fields (which may have been auto-filled or manually edited)
    const newItems: PayoutItem[] = selectedProperties.map(property => {
      const monthlyRent = property.monthlyRent || 0;
      const amount = bulkVoucherMode && bulkRentSplit.voucherPortion
        ? bulkRentSplit.voucherPortion
        : monthlyRent.toString();

      return {
        id: crypto.randomUUID(),
        landlordId: property.owner_id,
        landlordName: manualName || property.ownerName || "",
        landlordEmail: manualEmail || property.ownerEmail || "",
        amount: amount,
        recipientBankAccountId: manualBankAccountId || property.defaultBankAccountId || undefined,
        propertyId: property.id,
        propertyAddress: property.address,
        portfolioId: selectedPortfolioId,
        portfolioName: portfolios?.find(p => p.id === selectedPortfolioId)?.client_name || "",
        rentPeriodStart: sharedRentPeriod.start,
        rentPeriodEnd: sharedRentPeriod.end,
        notes: sharedNotes || `Rent for ${property.address}`,
        isVoucher: bulkVoucherMode,
        tenantPortion: bulkVoucherMode ? bulkRentSplit.tenantPortion : "",
        voucherPortion: bulkVoucherMode ? bulkRentSplit.voucherPortion : "",
        totalRent: bulkVoucherMode ? monthlyRent.toString() : ""
      };
    });

    setPayoutItems([...payoutItems, ...newItems]);

    // Show success message with landlord summary
    const landlordCount = landlordGroups.size;
    toast({
      title: "Recipients added",
      description: `Added ${selectedProperties.length} properties for ${landlordCount} landlord${landlordCount !== 1 ? 's' : ''}`
    });

    // Reset form
    setSelectedPortfolioId("");
    setSelectedProperties([]);
    setSharedRentPeriod({ start: "", end: "" });
    setSharedNotes("");
    setBulkVoucherMode(false);
    setBulkRentSplit({ tenantPortion: "", voucherPortion: "" });
    setManualName("");
    setManualEmail("");
    setManualBankAccountId("");
    setManualAmount("");
  };

  const handleQuickAddProperties = (properties: any[]) => {
    const newItems = properties.map(property => ({
      id: crypto.randomUUID(),
      landlordId: property.owner_id,
      landlordName: property.ownerName || "",
      landlordEmail: property.ownerEmail || "",
      amount: property.monthly_rent?.toString() || "",
      recipientBankAccountId: property.defaultBankAccountId || undefined,
      propertyId: property.id,
      propertyAddress: property.address,
      portfolioId: property.portfolio_id,
      portfolioName: portfolios?.find(p => p.id === property.portfolio_id)?.client_name || "",
      totalRent: property.monthly_rent?.toString() || "",
      rentPeriodStart: "",
      rentPeriodEnd: "",
      notes: `Rent for ${property.address}`,
      isVoucher: false,
      tenantPortion: "",
      voucherPortion: ""
    }));

    setPayoutItems([...payoutItems, ...newItems]);
    toast({
      title: "Properties added",
      description: `Added ${properties.length} properties`
    });
  };

  const handleRemoveRecipient = (id: string) => {
    setPayoutItems(payoutItems.filter(item => item.id !== id));
  };

  const handleProcessBatch = async () => {
    if (payoutItems.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient",
        variant: "destructive"
      });
      return;
    }

    if (!sourceBankAccountId) {
      toast({
        title: "No bank account selected",
        description: "Please select a source bank account",
        variant: "destructive"
      });
      return;
    }

    const missingBankAccounts = payoutItems.filter(item => !item.recipientBankAccountId);
    if (missingBankAccounts.length > 0) {
      toast({
        title: "Missing bank accounts",
        description: `${missingBankAccounts.length} recipient(s) are missing bank account information`,
        variant: "destructive"
      });
      return;
    }

    try {
      const batch = await createBatch(
        `Bulk Payout - ${new Date().toLocaleDateString()}`,
        "",
        undefined
      );

      if (!batch) {
        throw new Error("Failed to create batch");
      }

      const items = payoutItems.map(item => ({
        landlord_id: item.landlordId || userId,
        amount: parseFloat(item.amount),
        payout_method: 'ach' as const,
        recipient_details: {
          name: item.landlordName,
          email: item.landlordEmail,
          recipient_bank_account_id: item.recipientBankAccountId,
          portfolio_id: item.portfolioId,
          portfolio_name: item.portfolioName,
          property_id: item.propertyId,
          property_address: item.propertyAddress,
          rent_period_start: item.rentPeriodStart,
          rent_period_end: item.rentPeriodEnd,
          notes: item.notes,
          rent_split: item.isVoucher ? {
            total_rent: parseFloat(item.totalRent || "0"),
            tenant_portion: parseFloat(item.tenantPortion || "0"),
            voucher_portion: parseFloat(item.voucherPortion || "0"),
            is_split: true
          } : undefined,
          source_bank_account_id: sourceBankAccountId
        }
      }));

      await addItemsToBatch(batch.id, items);
      await processBatch(batch.id);

      toast({
        title: "Success!",
        description: `Processed ${payoutItems.length} payouts`,
      });

      setPayoutItems([]);
      setSourceBankAccountId("");
      onComplete?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process batch payouts",
        variant: "destructive"
      });
    }
  };

  const totalAmount = payoutItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const itemsWithoutBankAccount = payoutItems.filter(item => !item.recipientBankAccountId).length;
  const uniquePortfolios = new Set(payoutItems.map(item => item.portfolioId).filter(Boolean)).size;
  const uniqueLandlords = new Set(payoutItems.map(item => item.landlordId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Header with Source Account and Quick Add */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Payouts Configuration
            </h3>
            <Button
              variant="outline"
              onClick={() => setQuickAddDialogOpen(true)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Quick Add from Properties
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Source Account (Where to send money FROM)</Label>
            <BankAccountSelector
              value={sourceBankAccountId}
              onChange={setSourceBankAccountId}
              label="Select your account"
            />
            <p className="text-sm text-muted-foreground">
              This is YOUR bank account that will be debited
            </p>
          </div>
        </div>
      </Card>

      {/* Add Recipients Form - All Fields Always Visible */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Add Recipients</h3>
          
          {/* Row 1: Name & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <Input 
                placeholder="Auto-filled from property selection"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              {manualName && selectedProperties.length > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Auto-filled (editable)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input 
                type="email"
                placeholder="Auto-filled from property selection"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
              />
              {manualEmail && selectedProperties.length > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Auto-filled (editable)
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Portfolio & Properties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Portfolio <span className="text-destructive">*</span>
              </Label>
              <PortfolioSelectorDropdown 
                selectedPortfolio={selectedPortfolioId}
                onPortfolioChange={handlePortfolioChange}
                userId={userId}
                disableInternalNavigation={true}
                excludeEverything={true}
              />
            </div>
            <div className="space-y-2">
              <Label>Properties (Multi-select)</Label>
              {selectedPortfolioId ? (
                <div className="space-y-2">
                  <MultiPropertySelector
                    userId={userId}
                    portfolioId={selectedPortfolioId}
                    selectedPropertyIds={selectedProperties.map(p => p.id)}
                    onChange={handlePropertiesChange}
                  />
                  {selectedProperties.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedProperties.length} properties selected
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-2.5 border rounded-md bg-muted/30">
                  Select a portfolio first
                </div>
              )}
            </div>
          </div>

          {/* Grouped Landlord Preview */}
          {selectedProperties.length > 0 && (() => {
            const landlordGroups = new Map<string, typeof selectedProperties>();
            selectedProperties.forEach(prop => {
              const key = prop.owner_id || 'unknown';
              if (!landlordGroups.has(key)) {
                landlordGroups.set(key, []);
              }
              landlordGroups.get(key)!.push(prop);
            });

            return (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      Ready to add {selectedProperties.length} properties:
                    </p>
                    <div className="space-y-1">
                      {Array.from(landlordGroups.entries()).map(([landlordId, props]) => {
                        const landlord = props[0];
                        const hasBankAccount = (landlord.bankAccountCount || 0) > 0;
                        
                        return (
                          <div key={landlordId} className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{landlord.ownerName || 'Unknown'}</span>
                            <Badge variant="secondary">{props.length} properties</Badge>
                            {hasBankAccount ? (
                              <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Bank linked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
                                <AlertCircle className="h-3 w-3" />
                                No bank account
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            );
          })()}

          {/* Row 3: Pay to Account (Recipient Bank) */}
          <div className="space-y-2">
            <Label>Pay to Account (Recipient's bank)</Label>
            {selectedProperties.length > 0 && selectedProperties[0]?.owner_id ? (
              <>
                <RecipientBankAccountSelector
                  landlordId={selectedProperties[0].owner_id}
                  value={manualBankAccountId}
                  onChange={setManualBankAccountId}
                />
                {manualBankAccountId && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Auto-filled (editable)
                  </p>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground p-2.5 border rounded-md bg-muted/30">
                Select properties to load recipient bank accounts
              </div>
            )}
          </div>

          {/* Row 4: Voucher Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              checked={bulkVoucherMode}
              onCheckedChange={(checked) => setBulkVoucherMode(checked === true)}
            />
            <Label>Section 8 / Voucher Properties</Label>
          </div>

          {/* Row 5: Rent Split (if voucher) */}
          {bulkVoucherMode && (
            <RentSplitInputs
              totalRent=""
              tenantPortion={bulkRentSplit.tenantPortion}
              voucherPortion={bulkRentSplit.voucherPortion}
              onTenantPortionChange={(value) => setBulkRentSplit({ ...bulkRentSplit, tenantPortion: value })}
              onVoucherPortionChange={(value) => setBulkRentSplit({ ...bulkRentSplit, voucherPortion: value })}
            />
          )}

          {/* Row 6: Rent Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rent Period Start</Label>
              <Input
                type="date"
                value={sharedRentPeriod.start}
                onChange={(e) => setSharedRentPeriod({ ...sharedRentPeriod, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rent Period End</Label>
              <Input
                type="date"
                value={sharedRentPeriod.end}
                onChange={(e) => setSharedRentPeriod({ ...sharedRentPeriod, end: e.target.value })}
              />
            </div>
          </div>

          {/* Row 7: Amount */}
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Auto-calculated from properties"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
            />
            {manualAmount && selectedProperties.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Auto-calculated: ${manualAmount}
                </p>
                {selectedProperties.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Sum of {selectedProperties.length} properties
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Row 8: Memo */}
          <div className="space-y-2">
            <Label>Memo (Optional)</Label>
            <Textarea
              placeholder="e.g., March 2025 rent payment"
              value={sharedNotes}
              onChange={(e) => setSharedNotes(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              This memo will apply to all selected properties
            </p>
          </div>

          <Button 
            onClick={handleAddRecipients} 
            className="w-full"
            disabled={!selectedPortfolioId || selectedProperties.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {selectedProperties.length > 0 ? selectedProperties.length : ''} Recipient{selectedProperties.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </Card>

      {/* Recipients List */}
      {payoutItems.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recipients ({payoutItems.length})</h3>
            
            <div className="space-y-3">
              {payoutItems.map((item) => (
                <Card key={item.id} className="p-4 border-l-4 border-l-primary">
                  <div className="space-y-3">
                    {/* Header: Recipient Info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{item.landlordName || "No name"}</h4>
                        <p className="text-sm text-muted-foreground">{item.landlordEmail || "No email"}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRecipient(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Property & Portfolio Badges */}
                    <div className="flex gap-2 flex-wrap">
                      {item.portfolioName && (
                        <Badge variant="outline" className="bg-blue-50">
                          <Building2 className="mr-1 h-3 w-3" />
                          {item.portfolioName}
                        </Badge>
                      )}
                      {item.propertyAddress && (
                        <Badge variant="outline">
                          <Home className="mr-1 h-3 w-3" />
                          {item.propertyAddress}
                        </Badge>
                      )}
                    </div>

                    {/* Payment Flow Visualization */}
                    <div className="bg-muted/50 p-3 rounded-md space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-semibold text-lg">${parseFloat(item.amount).toFixed(2)}</span>
                      </div>

                      {/* Show Split if Voucher */}
                      {item.isVoucher && item.tenantPortion && item.voucherPortion && (
                        <div className="text-xs space-y-1 border-t pt-2">
                          <div className="flex justify-between">
                            <span>Tenant Portion:</span>
                            <span>${parseFloat(item.tenantPortion).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Voucher Portion:</span>
                            <span>${parseFloat(item.voucherPortion).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Recipient's Bank Account */}
                      <div className="flex items-center gap-2 text-sm border-t pt-2">
                        <span className="text-muted-foreground">Pay to:</span>
                        {item.recipientBankAccountId ? (
                          <Badge variant="secondary" className="bg-green-50">
                            💰 Bank Account Linked
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            ⚠️ No Bank Account
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Notes Preview & Date Range */}
                    {(item.notes || (item.rentPeriodStart && item.rentPeriodEnd)) && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {item.notes && (
                          <div className="flex items-start gap-1">
                            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{item.notes.substring(0, 50)}{item.notes.length > 50 ? '...' : ''}</span>
                          </div>
                        )}
                        {item.rentPeriodStart && item.rentPeriodEnd && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.rentPeriodStart).toLocaleDateString()} - {new Date(item.rentPeriodEnd).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Enhanced Batch Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <div className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Batch Payment Summary
                </h3>

                {/* Source Account */}
                {sourceBankAccountId && (
                  <div className="flex justify-between text-sm bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <span>💸</span> Money FROM (Your Account):
                    </span>
                    <span className="font-medium">Selected</span>
                  </div>
                )}
                
                {/* Recipients Count */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Recipients:</span>
                  <span className="font-medium">{payoutItems.length}</span>
                </div>

                {/* Landlords Count */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unique Landlords:</span>
                  <span className="font-medium">{uniqueLandlords}</span>
                </div>

                {/* Portfolios Involved */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Portfolios Involved:</span>
                  <span className="font-medium">{uniquePortfolios}</span>
                </div>
                
                {/* Total Amount */}
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total to Send:</span>
                  <span className="text-primary">${totalAmount.toFixed(2)}</span>
                </div>

                {/* Warnings */}
                {itemsWithoutBankAccount > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {itemsWithoutBankAccount} recipient(s) missing bank account selection
                    </AlertDescription>
                  </Alert>
                )}

                {!sourceBankAccountId && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please select your source bank account
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleProcessBatch}
                  disabled={isLoading || payoutItems.length === 0 || itemsWithoutBankAccount > 0 || !sourceBankAccountId}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isLoading ? "Processing..." : `Process ${payoutItems.length} Payouts`}
                </Button>
              </div>
            </Card>
          </div>
        </Card>
      )}

      <QuickAddPropertiesDialog
        open={quickAddDialogOpen}
        onOpenChange={setQuickAddDialogOpen}
        userId={userId}
        onAddProperties={handleQuickAddProperties}
      />
    </div>
  );
};
