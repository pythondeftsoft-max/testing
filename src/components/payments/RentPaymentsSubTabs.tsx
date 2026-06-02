import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, CreditCard, FileText } from 'lucide-react';
import { RentPaymentForm } from './RentPaymentForm';
import TenantLeaseRenewals from '@/components/TenantLeaseRenewals';

interface RentPaymentsSubTabsProps {
  overviewContent: React.ReactNode;
  userId: string;
  properties: any[];
}

export const RentPaymentsSubTabs = ({ 
  overviewContent, 
  userId, 
  properties 
}: RentPaymentsSubTabsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSubTab = searchParams.get('subTab') || 'overview';
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  // Update activeSubTab when URL changes
  useEffect(() => {
    const urlSubTab = searchParams.get('subTab');
    if (urlSubTab && urlSubTab !== activeSubTab) {
      setActiveSubTab(urlSubTab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveSubTab(value);
    // Clear subTab param from URL when user manually changes tabs
    const params = new URLSearchParams(searchParams);
    params.delete('subTab');
    setSearchParams(params);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="command-tabs grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="overview" className="command-tab-trigger">
          <Home className="h-4 w-4 mr-2" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="payment" className="command-tab-trigger">
          <CreditCard className="h-4 w-4 mr-2" />
          Make Payment
        </TabsTrigger>
        <TabsTrigger value="lease-renewal" className="command-tab-trigger">
          <FileText className="h-4 w-4 mr-2" />
          Lease Renewal
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {overviewContent}
      </TabsContent>

      <TabsContent value="payment" className="space-y-6">
        <RentPaymentForm userId={userId} properties={properties} />
      </TabsContent>

      <TabsContent value="lease-renewal" className="space-y-6">
        <TenantLeaseRenewals userId={userId} />
      </TabsContent>
      </Tabs>
    </div>
  );
};
