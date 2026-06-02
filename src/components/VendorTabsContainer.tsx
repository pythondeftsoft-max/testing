import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Receipt } from 'lucide-react';
import MaintenanceVendorManagement from './MaintenanceVendorManagement';
import VendorPaymentHistory from './VendorPaymentHistory';

interface VendorTabsContainerProps {
  userId: string;
  portfolioId?: string;
}

const VendorTabsContainer = ({ userId, portfolioId }: VendorTabsContainerProps) => {
  const searchParams = new URLSearchParams(window.location.search);
  const vendorSubtab = searchParams.get('vendorSubtab') || 'vendors';

  return (
    <div className="space-y-6">
      <Tabs defaultValue={vendorSubtab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Maintenance Vendors
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-6">
          <MaintenanceVendorManagement userId={userId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <VendorPaymentHistory userId={userId} portfolioId={portfolioId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorTabsContainer;
