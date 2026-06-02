
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InternationalPreferences from '@/components/settings/InternationalPreferences';
import { TenantMarketplaceSettings } from '@/components/settings/TenantMarketplaceSettings';
import { MarketplaceModeToggle } from '@/components/admin/MarketplaceModeToggle';
import { SystemConfigManager } from '@/components/admin/SystemConfigManager';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminReports } from '@/components/admin/AdminReports';
import { AdminBilling } from '@/components/admin/AdminBilling';
import { PaymentAccountsManager } from "@/components/PaymentAccountsManager";
import { StripeConnectOnboarding } from "@/components/StripeConnectOnboarding";
import { StripeConnectAccountsManager } from "@/components/StripeConnectAccountsManager";
import { PropertyPaymentSettingsPanel } from "@/components/PropertyPaymentSettingsPanel";
import { useAuth } from "@/hooks/useAuth";
import { useProperties } from "@/hooks/useProperties";
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useStripeConnectAccounts } from '@/hooks/useStripeConnectAccounts';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, User, Bell, Lock, Settings2, BarChart3, FileText, Cog, CreditCard, Building2, Plus } from 'lucide-react';
import { PaymentAllocationsTab } from "@/components/PaymentAllocationsTab";
import { useLanguage } from '@/contexts/LanguageContext';

const Settings = () => {
  const { t } = useLanguage();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const { user } = useAuth();
  const { properties } = useProperties(user?.id || '');
  const { accounts: connectAccounts, createAccount } = useStripeConnectAccounts(user?.id || '');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const handleCreateAccount = async () => {
    setIsCreatingAccount(true);
    try {
      const result = await createAccount({
        account_name: `Account ${connectAccounts.length + 1}`,
        business_type: 'individual',
      });
      
      if (result?.onboarding_url) {
        window.open(result.onboarding_url, '_blank');
      }
    } catch (error) {
      console.error('Error creating account:', error);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleCompleteSetup = async (accountId: string) => {
    // Implementation for completing setup would go here
    console.log('Complete setup for account:', accountId);
  };

  const handleManageAccount = async (accountId: string) => {
    // Implementation for managing account would go here  
    console.log('Manage account:', accountId);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        <Tabs defaultValue="international" className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="international" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('settings.tabs.international')}
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('settings.tabs.profile')}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('settings.tabs.payments')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t('settings.tabs.notifications')}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('settings.tabs.security')}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {t('settings.tabs.admin')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="international" className="space-y-6">
            <InternationalPreferences />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <TenantMarketplaceSettings />
            
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profileInfo')}</CardTitle>
                <CardDescription>{t('settings.profileInfoDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('settings.comingSoon')}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Tabs defaultValue="setup" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="setup" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t('settings.paymentTabs.setup')}
                </TabsTrigger>
                <TabsTrigger value="allocations" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  {t('settings.paymentTabs.allocations')}
                </TabsTrigger>
                <TabsTrigger value="individual" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t('settings.paymentTabs.individual')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="setup" className="space-y-6">
                {/* Stripe Connect Accounts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      {t('settings.receivingAccounts')}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.receivingAccountsDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {connectAccounts.length === 0 ? (
                      <div className="text-center py-8">
                        <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {t('settings.noReceivingAccounts')}
                        </p>
                        <Button onClick={handleCreateAccount} disabled={isCreatingAccount}>
                          {isCreatingAccount ? t('common.loading') : t('settings.addReceivingAccount')}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4">
                          {connectAccounts.map((account) => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between p-4 border border-border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <h4 className="font-medium">{account.account_name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {account.business_type || "Standard Account"}
                                  </p>
                                </div>
                                {account.is_default && (
                                  <Badge variant="secondary">{t('settings.globalDefault')}</Badge>
                                )}
                                <Badge variant={account.onboarding_complete ? "default" : "secondary"}>
                                  {account.onboarding_complete ? t('settings.active') : t('settings.setupRequired')}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {account.onboarding_complete && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleManageAccount(account.id)}
                                  >
                                    {t('settings.manage')}
                                  </Button>
                                )}
                                {!account.onboarding_complete && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleCompleteSetup(account.id)}
                                  >
                                    {t('settings.completeSetup')}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button 
                          onClick={handleCreateAccount} 
                          disabled={isCreatingAccount}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {isCreatingAccount ? t('common.loading') : t('settings.addReceivingAccount')}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                <PaymentAccountsManager 
                  userId={user?.id || ''} 
                />
              </TabsContent>

              <TabsContent value="allocations">
                <PaymentAllocationsTab 
                  properties={properties || []}
                  userId={user?.id || ''}
                />
              </TabsContent>

              <TabsContent value="individual">
                <PropertyPaymentSettingsPanel 
                  properties={properties || []}
                  userId={user?.id || ''}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.notificationPrefs')}</CardTitle>
                <CardDescription>{t('settings.notificationPrefsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('settings.comingSoon')}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.securitySettings')}</CardTitle>
                <CardDescription>{t('settings.securitySettingsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('settings.comingSoon')}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    {t('settings.adminTabs.overview')}
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {t('settings.adminTabs.analytics')}
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('settings.adminTabs.reports')}
                  </TabsTrigger>
                  <TabsTrigger value="system-config" className="flex items-center gap-2">
                    <Cog className="h-4 w-4" />
                    {t('settings.adminTabs.systemConfig')}
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t('settings.adminTabs.billing')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <MarketplaceModeToggle />
                </TabsContent>

                <TabsContent value="analytics">
                  <AdminAnalytics />
                </TabsContent>

                <TabsContent value="reports">
                  <AdminReports />
                </TabsContent>

                <TabsContent value="system-config">
                  <SystemConfigManager />
                </TabsContent>

                <TabsContent value="billing">
                  <AdminBilling />
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
