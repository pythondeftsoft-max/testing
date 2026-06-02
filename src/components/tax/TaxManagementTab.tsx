
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Info } from 'lucide-react';
import { TaxProfileForm } from './TaxProfileForm';
import { TaxTransactionsList } from './TaxTransactionsList';
import { Tax1099Dashboard } from './Tax1099Dashboard';
import { TaxManagementHeader } from './TaxManagementHeader';
import { useTaxProfile, useTaxTransactions, useTax1099Forms, useTaxThresholds } from '@/hooks/useTaxData';
import PortfolioRoleGuard from '@/components/portfolio/PortfolioRoleGuard';
import AccountRoleGuard from '@/components/account/AccountRoleGuard';
import { IRSEfilePanel } from './IRSEfilePanel';
import { featureFlags } from '@/config/featureFlags';

interface TaxManagementTabProps {
  portfolioId?: string;
  userId: string;
}

export const TaxManagementTab: React.FC<TaxManagementTabProps> = ({
  portfolioId,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const currentYear = new Date().getFullYear();

  const { data: taxProfile, isLoading: profileLoading } = useTaxProfile(userId, portfolioId);
  const { data: taxTransactions, isLoading: transactionsLoading } = useTaxTransactions(portfolioId, currentYear);
  const { data: tax1099Forms, isLoading: formsLoading } = useTax1099Forms(portfolioId, currentYear);
  const { data: taxThresholds } = useTaxThresholds(currentYear);

  const getRequiredFormsCount = () => {
    if (!taxTransactions || !taxThresholds) return 0;
    
    const threshold = taxThresholds.find(t => t.form_type === '1099_misc')?.threshold_amount || 600;
    const payeeAmounts = taxTransactions.reduce((acc, transaction) => {
      const key = transaction.payee_id;
      acc[key] = (acc[key] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.values(payeeAmounts).filter(amount => amount >= threshold).length;
  };

  const requiredFormsCount = getRequiredFormsCount();
  const completedFormsCount = tax1099Forms?.filter(form => form.form_status === 'filed').length || 0;

  if (profileLoading || transactionsLoading || formsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Access control component
  const TaxManagementContent = () => (
    <div className="space-y-6 animate-fade-in-up">
      <TaxManagementHeader 
        currentYear={currentYear}
        taxProfileStatus={taxProfile?.status}
        transactionCount={taxTransactions?.length || 0}
        requiredFormsCount={requiredFormsCount}
        completedFormsCount={completedFormsCount}
      />

      {/* Alert for missing W-9 */}
      {!taxProfile && (
        <CardEnhanced variant="outlined" className="border-yellow-200 bg-yellow-50">
          <CardEnhancedContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">W-9 Information Required</h3>
                <p className="text-sm text-yellow-700">
                  Complete your tax information to enable 1099 reporting and comply with IRS requirements.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab('profile')}
                className="ml-auto"
              >
                Complete W-9
              </Button>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Tax Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">W-9 Profile</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="forms">1099 Forms</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <TaxProfileForm 
            userId={userId}
            portfolioId={portfolioId}
            existingProfile={taxProfile}
          />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <TaxTransactionsList 
            portfolioId={portfolioId}
            taxYear={currentYear}
          />
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Tax1099Dashboard 
            portfolioId={portfolioId}
            taxYear={currentYear}
            userId={userId}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <CardEnhanced variant="premium">
            <CardEnhancedHeader>
              <CardEnhancedTitle>Tax Settings</CardEnhancedTitle>
              <CardEnhancedDescription>
                Configure tax reporting preferences and thresholds
              </CardEnhancedDescription>
            </CardEnhancedHeader>
            <CardEnhancedContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Automatic Transaction Tracking</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically track payments above IRS thresholds for 1099 reporting
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Form Delivery Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Set how 1099 forms are delivered to recipients
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>

                {featureFlags.irsEfilingEnabled && (
                  <IRSEfilePanel portfolioId={portfolioId!} userId={userId} taxYear={currentYear} />
                )}

                {!featureFlags.irsEfilingEnabled && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>IRS E-Filing:</strong> Configure IRIS API credentials to enable direct IRS submission.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Current Tax Thresholds ({currentYear})</h3>
                  <div className="space-y-2">
                    {taxThresholds?.map((threshold) => (
                      <div key={threshold.id} className="flex justify-between text-sm">
                        <span>{threshold.form_type.toUpperCase()}</span>
                        <span>${threshold.threshold_amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Portfolio-based access control wrapper
  if (portfolioId) {
    return (
      <PortfolioRoleGuard
        portfolioId={portfolioId}
        userId={userId}
        requiredRoles={['admin_partner', 'editor']}
        fallback={
          <Alert className="border-destructive/50 text-destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Tax Management Access Required</strong>
              <br />
              You need Editor or Admin Partner access to manage tax information for this portfolio.
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Tax management includes W-9 collection, transaction tracking, and 1099 form generation.
              </span>
            </AlertDescription>
          </Alert>
        }
        showDeniedMessage={false}
      >
        <TaxManagementContent />
      </PortfolioRoleGuard>
    );
  }

  // Account-level access control for non-portfolio users
  return (
    <AccountRoleGuard
      requiredRoles={['owner', 'admin_partner']}
      fallback={
        <Alert className="border-destructive/50 text-destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Tax Management Access Required</strong>
            <br />
            You need Owner or Admin Partner access to manage tax information.
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              Tax management includes W-9 collection, transaction tracking, and 1099 form generation.
            </span>
          </AlertDescription>
        </Alert>
      }
      showDeniedMessage={false}
    >
      <TaxManagementContent />
    </AccountRoleGuard>
  );
};
