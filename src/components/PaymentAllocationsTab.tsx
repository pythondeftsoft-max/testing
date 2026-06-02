import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ConnectAccountSelect } from './ConnectAccountSelect';
import { EffectiveAccountLabel } from './EffectiveAccountLabel';
import { Building2, Settings, RefreshCw, AlertTriangle } from 'lucide-react';
import { usePropertyPaymentSettings } from '@/hooks/usePropertyPaymentSettings';
import { useStripeConnectAccounts } from '@/hooks/useStripeConnectAccounts';
import { usePortfolioPaymentSettings } from '@/hooks/usePortfolioPaymentSettings';
import { useConnectAccountSync } from '@/hooks/useConnectAccountSync';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';

interface PaymentAllocationsTabProps {
  userId: string;
  selectedPortfolio?: string;
  properties?: Array<{
    id: string;
    address: string;
    monthly_rent: number;
    portfolio_id?: string;
  }>;
}

export function PaymentAllocationsTab({ userId, selectedPortfolio, properties: propProperties }: PaymentAllocationsTabProps) {
  const { accounts: stripeAccounts, refreshAccounts } = useStripeConnectAccounts(userId);
  const { settings: portfolioSettings, updateSettings: updatePortfolioSettings, isLoading: portfolioLoading } = usePortfolioPaymentSettings(selectedPortfolio);
  const { syncAccounts, isSyncing } = useConnectAccountSync();
  const { portfolios } = useUserPortfolios(userId);
  const [selectedAssignments, setSelectedAssignments] = useState<Record<string, string>>({});
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [bulkAccount, setBulkAccount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [fetchedProperties, setFetchedProperties] = useState<Array<{
    id: string;
    address: string;
    monthly_rent: number;
    portfolio_id?: string;
  }>>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [showPortfolioGate, setShowPortfolioGate] = useState(false);
  const { toast } = useToast();

  // Accounts are loaded by the hook automatically

  // Show portfolio gate if everything is selected but no properties provided
  useEffect(() => {
    if (selectedPortfolio === 'everything' && !propProperties) {
      setShowPortfolioGate(true);
      return;
    }
    setShowPortfolioGate(false);
  }, [selectedPortfolio, propProperties]);

  // Fetch properties if selectedPortfolio is provided
  useEffect(() => {
    if (selectedPortfolio && selectedPortfolio !== 'everything' && !propProperties) {
      const fetchProperties = async () => {
        setIsLoadingProperties(true);
        try {
          const { data, error } = await supabase
            .from('properties')
            .select('id, address, monthly_rent, portfolio_id')
            .eq('portfolio_id', selectedPortfolio);

          if (error) throw error;
          setFetchedProperties(data || []);
        } catch (error: any) {
          console.error('Error fetching properties:', error);
          toast({
            title: "Error",
            description: "Failed to fetch properties",
            variant: "destructive",
          });
        } finally {
          setIsLoadingProperties(false);
        }
      };

      fetchProperties();
    }
  }, [selectedPortfolio, propProperties, userId, toast]);

  // Use either provided properties or fetched properties
  const properties = propProperties || fetchedProperties;

  const handleRefreshAccounts = async () => {
    await syncAccounts(userId);
    await refreshAccounts();
  };

  const handleAccountChange = async (propertyId: string, accountId: string) => {
    if (accountId === '') return; // No change selected
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('property_payment_settings')
        .upsert({
          property_id: propertyId,
          stripe_connect_account_id: (accountId === 'default' || accountId === '') ? null : accountId,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'property_id' 
        });

      if (error) throw error;
      
      const accountName = (accountId === 'default' || accountId === '') ? 'Default/Unassigned' : 
        stripeAccounts.find(acc => acc.id === accountId)?.account_name || 'Selected account';
      
      toast({
        title: "Success",
        description: `Updated payment routing for property to: ${accountName}`,
      });
      
      // Clear the selection after applying
      setSelectedAssignments(prev => {
        const updated = { ...prev };
        delete updated[propertyId];
        return updated;
      });
    } catch (error: any) {
      console.error('Error updating property payment settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update property payment settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePropertySelect = (propertyId: string, checked: boolean) => {
    setSelectedProperties(prev => {
      const updated = new Set(prev);
      if (checked) {
        updated.add(propertyId);
      } else {
        updated.delete(propertyId);
      }
      return updated;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProperties(new Set(properties.map(p => p.id)));
    } else {
      setSelectedProperties(new Set());
    }
  };

  const handleClearProperty = async (propertyId: string) => {
    setIsUpdating(true);
    try {
      await supabase
        .from('property_payment_settings')
        .delete()
        .eq('property_id', propertyId);
      
      toast({
        title: "Success",
        description: "Cleared property override - now using portfolio/default settings",
      });
    } catch (error: any) {
      console.error('Error clearing property payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to clear property settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdate = async (targetProperties?: string[]) => {
    if (bulkAccount === '') return;
    
    const propertiesToUpdate = targetProperties || (selectedProperties.size > 0 ? Array.from(selectedProperties) : properties.map(p => p.id));
    
    setIsUpdating(true);
    try {
      const updates = propertiesToUpdate.map(async (propertyId) => {
        const { error } = await supabase
          .from('property_payment_settings')
          .upsert({
            property_id: propertyId,
            stripe_connect_account_id: (bulkAccount === 'default' || bulkAccount === '') ? null : bulkAccount,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'property_id' 
          });
        
        if (error) throw error;
      });

      await Promise.all(updates);
      
      const accountName = (bulkAccount === 'default' || bulkAccount === '') ? 'Default/Unassigned' : 
        stripeAccounts.find(acc => acc.id === bulkAccount)?.account_name || 'Selected account';
      
      toast({
        title: "Success",
        description: `Updated payment routing for ${propertiesToUpdate.length} properties to: ${accountName}`,
      });
      
      setBulkAccount('');
      setSelectedProperties(new Set());
    } catch (error: any) {
      console.error('Error updating payment settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update payment settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePortfolioCascade = async () => {
    if (!portfolioSettings?.connect_account_id) return;
    
    await handleBulkUpdate(properties.map(p => p.id));
  };

  const completedAccounts = stripeAccounts.filter(acc => acc.onboarding_complete);

  return (
    <div className="space-y-6">
      {/* Portfolio Context Banner */}
      {selectedPortfolio && selectedPortfolio !== 'everything' && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-medium text-foreground">
                Portfolio Settings: {portfolios.find(p => p.id === selectedPortfolio)?.client_name || 'Unknown Portfolio'}
              </h3>
              <p className="text-sm text-muted-foreground">
                You're configuring payment settings for this specific portfolio. Changes will only affect properties in this portfolio.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Payment Allocations
              </CardTitle>
              <CardDescription>
                Assign Stripe Connect accounts to properties for payment routing. This determines which account receives rent payments for each property.
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefreshAccounts} 
              variant="outline" 
              size="sm"
              disabled={isLoadingProperties || isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Refresh Accounts'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showPortfolioGate && (
            <div className="space-y-6">
              {portfolios.length === 0 ? (
                <div className="p-6 border border-orange-200 bg-orange-50 rounded-lg text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                  <h4 className="font-medium text-orange-900 mb-2">No Portfolios Available</h4>
                  <p className="text-sm text-orange-700 mb-4">
                    You don't have access to any portfolios yet. Contact your administrator to be assigned to a portfolio.
                  </p>
                </div>
              ) : (
                <div className="p-6 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Select a Portfolio</h4>
                      <p className="text-sm text-blue-700">
                        Choose which portfolio you'd like to configure payment allocations for:
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                      <PortfolioSelectorDropdown
                        selectedPortfolio={selectedPortfolio}
                        onPortfolioChange={(portfolioId) => {
                          // This will be handled by the parent component
                          console.log('PaymentAllocationsTab: Portfolio selected:', portfolioId);
                        }}
                        userId={userId}
                        disableInternalNavigation={true}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!showPortfolioGate && (
            <>
              {isLoadingProperties && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading properties...</p>
                </div>
              )}
              
              {!isLoadingProperties && completedAccounts.length === 0 && (
                <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-orange-600" />
                    <h4 className="font-medium text-orange-900">No Stripe Connect accounts configured</h4>
                  </div>
                  <p className="text-sm text-orange-700 mb-3">
                    You can still configure payment allocations. Properties will use "Default/Unassigned" until you connect a Stripe merchant account.
                  </p>
                  <Button 
                    onClick={handleRefreshAccounts} 
                    variant="outline" 
                    size="sm"
                    className="border-orange-300 hover:bg-orange-100"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Connect Stripe Account
                  </Button>
                </div>
              )}
              
              {!isLoadingProperties && (
                <div className="space-y-6">
                  {/* Portfolio Default Section */}
                  {selectedPortfolio && selectedPortfolio !== 'everything' && (
                    <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Portfolio Default Receiving Account</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Set a default account for all properties in this portfolio (overrides global default)
                        </p>
                        <div className="flex items-center gap-3">
                          <ConnectAccountSelect
                            userId={userId}
                            value={portfolioSettings?.connect_account_id || ''}
                            onValueChange={(value) => {
                              updatePortfolioSettings({ connect_account_id: value || null });
                            }}
                            placeholder="Default/Unassigned"
                            showDefault={false}
                            disabled={portfolioLoading}
                          />
                          <Button 
                            onClick={() => updatePortfolioSettings({ connect_account_id: null })}
                            variant="outline"
                            size="sm"
                            disabled={portfolioLoading}
                          >
                            Clear to Default
                          </Button>
                          {portfolioSettings?.connect_account_id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="secondary" size="sm" disabled={portfolioLoading}>
                                  Apply to All Properties
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Apply Portfolio Default to All Properties?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will override any existing property-specific settings and apply the portfolio default account to all {properties.length} properties in this portfolio.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handlePortfolioCascade}>
                                    Apply to All
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bulk Assignment Section */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Bulk Assignment</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Override portfolio defaults for specific properties
                      </p>
                      <div className="flex items-center gap-3">
                        <ConnectAccountSelect
                          userId={userId}
                          value={bulkAccount}
                          onValueChange={setBulkAccount}
                          placeholder="Select account to assign"
                          showDefault={true}
                        />
                        <Button 
                          onClick={() => handleBulkUpdate()}
                          disabled={isUpdating || bulkAccount === ''}
                          size="sm"
                          variant="outline"
                        >
                          {isUpdating ? "Applying..." : "Apply to All"}
                        </Button>
                        {selectedProperties.size > 0 && (
                          <Button 
                            onClick={() => handleBulkUpdate(Array.from(selectedProperties))}
                            disabled={isUpdating || bulkAccount === ''}
                            size="sm"
                          >
                            {isUpdating ? "Applying..." : `Apply to Selected (${selectedProperties.size})`}
                          </Button>
                        )}
                      </div>
                      {selectedProperties.size > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedProperties.size} properties selected
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Property Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedProperties.size === properties.length && properties.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Monthly Rent</TableHead>
                          <TableHead>Effective Receiving Account</TableHead>
                          <TableHead>Override Assignment</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {properties.map((property) => (
                          <TableRow key={property.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedProperties.has(property.id)}
                                onCheckedChange={(checked) => handlePropertySelect(property.id, !!checked)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {property.address}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                ${property.monthly_rent?.toLocaleString()}/mo
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <EffectiveAccountLabel 
                                propertyId={property.id} 
                                portfolioId={property.portfolio_id || selectedPortfolio}
                                userId={userId}
                              />
                            </TableCell>
                            <TableCell>
                              <ConnectAccountSelect
                                userId={userId}
                                value={selectedAssignments[property.id] || ''}
                                onValueChange={(value) => handleAccountChange(property.id, value)}
                                placeholder="Set override"
                                showDefault={true}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => handleClearProperty(property.id)}
                                variant="ghost"
                                size="sm"
                                disabled={isUpdating}
                              >
                                Clear
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {properties.length === 0 && (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No properties found</p>
                      <p className="text-sm text-muted-foreground">Add properties to configure payment routing</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}