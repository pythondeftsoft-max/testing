import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Building2, CreditCard, Settings, ExternalLink } from 'lucide-react';
import { usePropertyPaymentSettings } from '@/hooks/usePropertyPaymentSettings';
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useStripeConnectAccounts } from "@/hooks/useStripeConnectAccounts";

interface PropertyPaymentSettingsPanelProps {
  properties: Array<{
    id: string;
    address: string;
    monthly_rent: number;
  }>;
  userId: string;
}

export function PropertyPaymentSettingsPanel({ properties, userId }: PropertyPaymentSettingsPanelProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const { settings, isLoading, updateSettings } = usePropertyPaymentSettings(selectedPropertyId || undefined);
  const { accounts } = useBankAccounts();
  const { accounts: stripeConnectAccounts } = useStripeConnectAccounts(userId);
  
  // Auto-select first property if available
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const handlePayoutAccountChange = async (accountId: string, type: 'stripe_connect' | 'bank_account') => {
    if (!selectedPropertyId) return;
    
    const updates: any = {};

    if (type === 'stripe_connect') {
      updates.receivables_connect_account_id = accountId;
    } else {
      updates.payout_bank_account_id = accountId === 'none' ? null : accountId;
    }
    
    await updateSettings(updates);
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const linkedAccounts = accounts.filter(account => account.status === 'linked');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Property Payment Settings
        </CardTitle>
        <CardDescription>
          Configure payment preferences for each property, including default payout accounts and Stripe routing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Property Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Property</label>
          <Select value={selectedPropertyId || ''} onValueChange={setSelectedPropertyId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a property to configure" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{property.address}</span>
                    <Badge variant="outline" className="text-xs">
                      ${property.monthly_rent}/mo
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProperty && (
          <div className="space-y-6 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4" />
              Settings for {selectedProperty.address}
            </div>

            {/* Stripe Connect Account */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Routing</CardTitle>
                <CardDescription>
                  Configure how rent payments for this property are processed and deposited
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="stripe-connect-account">Stripe Connect Account</Label>
                  <Select
                    value={(settings as any)?.receivables_connect_account_id || ''}
                    onValueChange={(value) => handlePayoutAccountChange(value, 'stripe_connect')}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Connect account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Use default account</SelectItem>
                      {stripeConnectAccounts
                        .filter(account => account.onboarding_complete)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name} {account.is_default && '(Default)'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose which Stripe Connect account will receive rent payments for this property
                  </p>
                </div>

                <div>
                  <Label htmlFor="payout-account">Payout Bank Account</Label>
                  <Select
                    value={settings?.payout_bank_account_id || 'none'}
                    onValueChange={(value) => handlePayoutAccountChange(value, 'bank_account')}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default payout account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default (choose each time)</SelectItem>
                      {linkedAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <span>{account.account_name || 'Unknown Account'}</span>
                            {account.mask && <span className="text-muted-foreground">••••{account.mask}</span>}
                            <span className="text-xs text-muted-foreground">
                              {account.institution_name}
                            </span>
                            {account.metadata?.checkbook_sync_status === 'synced' && (
                              <Badge variant="outline" className="text-xs">
                                Checkbook Ready
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set which bank account should receive automatic payouts from the Connect account
                  </p>
                </div>
                
                {((settings as any)?.receivables_connect_account_id || settings?.payout_bank_account_id) && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      ✓ Payment routing configured for this property
                    </p>
                    <div className="mt-2 text-xs text-green-700">
                      {(settings as any)?.receivables_connect_account_id && (
                        <p>• Rent payments will be processed through your selected Connect account</p>
                      )}
                      {settings?.payout_bank_account_id && (
                        <p>• Funds will be automatically transferred to your selected bank account</p>
                      )}
                    </div>
                  </div>
                )}

                {linkedAccounts.length === 0 && (
                  <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    No linked bank accounts found. Connect a bank account first to set up payout preferences.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Status */}
            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Current Configuration</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stripe Connect Account:</span>
                  <span>
                    {(settings as any)?.receivables_connect_account_id 
                      ? stripeConnectAccounts.find(acc => acc.id === (settings as any).receivables_connect_account_id)?.account_name || 'Unknown'
                      : 'Default account'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payout Account:</span>
                  <span>
                    {settings?.payout_bank_account_id 
                      ? linkedAccounts.find(acc => acc.id === settings.payout_bank_account_id)?.account_name || 'Unknown'
                      : 'No default set'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Checkbook Status:</span>
                  <span>
                    {settings?.payout_bank_account_id && 
                     linkedAccounts.find(acc => acc.id === settings.payout_bank_account_id)?.metadata?.checkbook_sync_status === 'synced' 
                      ? 'Ready for payouts' 
                      : 'Not configured'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedProperty && properties.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No properties found</p>
            <p className="text-sm">Add properties to configure payment settings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}