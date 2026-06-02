
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TenantProfileDisplay from './TenantProfileDisplay';
import TenantDocuments from './TenantDocuments';
import TenantLeaseInfo from './TenantLeaseInfo';
import TenantVoucherInfo from './TenantVoucherInfo';
import TenantSection8Portal from './tenant-section8/TenantSection8Portal';
import { Bell, FileText, Home, User, CreditCard, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TenantProfileProps {
  tenantId: string;
  canEdit?: boolean;
}

const TenantProfile = ({ tenantId, canEdit = false }: TenantProfileProps) => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="lease" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Lease Details
          </TabsTrigger>
          <TabsTrigger value="voucher" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Voucher Info
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="section8" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Section 8
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <TenantProfileDisplay tenantId={tenantId} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="lease" className="space-y-6">
          <TenantLeaseInfo userId={tenantId} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="voucher" className="space-y-6">
          <TenantVoucherInfo userId={tenantId} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <TenantDocuments userId={tenantId} />
        </TabsContent>

        <TabsContent value="section8" className="space-y-6">
          <TenantSection8Portal 
            userId={tenantId}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantProfile;
