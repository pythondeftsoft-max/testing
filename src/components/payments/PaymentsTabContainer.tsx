import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, DollarSign, Tag } from 'lucide-react';
import { AllIncomingPaymentsTable } from './AllIncomingPaymentsTable';
import { PaymentTaggingTab } from './PaymentTaggingTab';
import { PaymentOverviewTab } from './PaymentOverviewTab';
import { usePaymentsTabStore } from '@/stores/paymentsTabStore';

interface PaymentsTabContainerProps {
  userId: string;
  portfolioId?: string;
}

export const PaymentsTabContainer = ({ userId, portfolioId }: PaymentsTabContainerProps) => {
  // Payment Tagging only visible at account-level "Everything" view for PMs
  const showPaymentTagging = portfolioId === 'everything';
  
  // Use Zustand store for controlled tab state (enables tour navigation)
  const { activeTab, setActiveTab } = usePaymentsTabStore();

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Payments</h1>
        <p className="text-lg opacity-90">Track all incoming rent and HAP payments</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'all-incoming' | 'tagging')} className="w-full">
        <TabsList className={`command-tabs grid w-full ${showPaymentTagging ? 'grid-cols-3' : 'grid-cols-2'}`} data-tour="payments-tabs">
          <TabsTrigger value="overview" className="command-tab-trigger flex items-center gap-2" data-tour="payments-tab-overview">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="all-incoming" className="command-tab-trigger flex items-center gap-2" data-tour="payments-tab-all-incoming">
            <DollarSign className="h-4 w-4" />
            <span>All Incoming</span>
          </TabsTrigger>
          {showPaymentTagging && (
            <TabsTrigger value="tagging" className="command-tab-trigger flex items-center gap-2" data-tour="payments-tab-tagging">
              <Tag className="h-4 w-4" />
              <span>Payment Tagging</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <PaymentOverviewTab landlordId={userId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="all-incoming" className="mt-6">
          <AllIncomingPaymentsTable landlordId={userId} portfolioId={portfolioId} />
        </TabsContent>

        {showPaymentTagging && (
          <TabsContent value="tagging" className="mt-6">
            <PaymentTaggingTab landlordId={userId} portfolioId={portfolioId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
