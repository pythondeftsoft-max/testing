
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Building2, ArrowRightLeft, FileText, RefreshCw, ClipboardCheck, Search, Users, FileSignature, UserCheck, DollarSign, Wrench, Receipt } from 'lucide-react';
import VoucherStatusTab from './VoucherStatusTab';
import AgencyEnrollmentTab from './AgencyEnrollmentTab';
import PortingTab from './PortingTab';
import TenantS8DocumentsTab from './TenantS8DocumentsTab';
import TenantRecertifications from '@/components/tenant/TenantRecertifications';
import TenantConditionChecklist from '@/components/tenant/TenantConditionChecklist';
import TenantInspectionsTab from './TenantInspectionsTab';
import TenantHouseholdTab from './TenantHouseholdTab';
import TenantLeaseViewerTab from './TenantLeaseViewerTab';
import TenantScreeningStatusTab from './TenantScreeningStatusTab';
import TenantRentLedgerTab from './TenantRentLedgerTab';
import TenantWorkOrdersTab from './TenantWorkOrdersTab';
import AccommodationRequestForm from './AccommodationRequestForm';
import TenantRepaymentView from './TenantRepaymentView';
import TenantSpecialClaimNotice from './TenantSpecialClaimNotice';

interface TenantSection8PortalProps {
  userId: string;
  currentUserId: string | null;
}

const TenantSection8Portal = ({ userId, currentUserId }: TenantSection8PortalProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Section 8 Portal</h2>
          <p className="text-sm text-muted-foreground">Manage your voucher, enrollment, and porting</p>
        </div>
      </div>

      <Tabs defaultValue="voucher" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="voucher" className="flex items-center gap-2 text-xs sm:text-sm">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">My Voucher</span>
            <span className="sm:hidden">Voucher</span>
          </TabsTrigger>
          <TabsTrigger value="enrollment" className="flex items-center gap-2 text-xs sm:text-sm">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Agency Enrollment</span>
            <span className="sm:hidden">Enroll</span>
          </TabsTrigger>
          <TabsTrigger value="porting" className="flex items-center gap-2 text-xs sm:text-sm">
            <ArrowRightLeft className="h-4 w-4" />
            Porting
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">My Documents</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="rent-ledger" className="flex items-center gap-2 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Rent Ledger</span>
            <span className="sm:hidden">Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="flex items-center gap-2 text-xs sm:text-sm">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Maintenance</span>
            <span className="sm:hidden">Maint</span>
          </TabsTrigger>
          <TabsTrigger value="recertification" className="flex items-center gap-2 text-xs sm:text-sm">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Recertification</span>
            <span className="sm:hidden">Recert</span>
          </TabsTrigger>
          <TabsTrigger value="moveinout" className="flex items-center gap-2 text-xs sm:text-sm">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Move-In/Out</span>
            <span className="sm:hidden">Move</span>
          </TabsTrigger>
          <TabsTrigger value="inspections" className="flex items-center gap-2 text-xs sm:text-sm">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Inspections</span>
            <span className="sm:hidden">HQS</span>
          </TabsTrigger>
          <TabsTrigger value="household" className="flex items-center gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Household</span>
            <span className="sm:hidden">HH</span>
          </TabsTrigger>
          <TabsTrigger value="my-lease" className="flex items-center gap-2 text-xs sm:text-sm">
            <FileSignature className="h-4 w-4" />
            <span className="hidden sm:inline">My Lease</span>
            <span className="sm:hidden">Lease</span>
          </TabsTrigger>
          <TabsTrigger value="screening-status" className="flex items-center gap-2 text-xs sm:text-sm">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Screening</span>
            <span className="sm:hidden">Screen</span>
          </TabsTrigger>
          <TabsTrigger value="repayments" className="flex items-center gap-2 text-xs sm:text-sm">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Repayments</span>
            <span className="sm:hidden">Pay</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voucher">
          <VoucherStatusTab userId={userId} />
        </TabsContent>
        <TabsContent value="enrollment">
          <AgencyEnrollmentTab userId={userId} />
        </TabsContent>
        <TabsContent value="porting">
          <PortingTab userId={userId} />
        </TabsContent>
        <TabsContent value="documents">
          <TenantS8DocumentsTab userId={userId} />
        </TabsContent>
        <TabsContent value="rent-ledger">
          <TenantRentLedgerTab userId={userId} />
        </TabsContent>
        <TabsContent value="work-orders">
          <TenantWorkOrdersTab userId={userId} />
        </TabsContent>
        <TabsContent value="recertification">
          <TenantRecertifications />
        </TabsContent>
        <TabsContent value="moveinout">
          <TenantConditionChecklist />
        </TabsContent>
        <TabsContent value="inspections">
          <TenantInspectionsTab userId={userId} />
        </TabsContent>
        <TabsContent value="household" className="space-y-4">
          <TenantHouseholdTab userId={userId} />
          <AccommodationRequestForm userId={userId} />
        </TabsContent>
        <TabsContent value="repayments" className="space-y-4">
          <TenantRepaymentView userId={userId} />
          <TenantSpecialClaimNotice userId={userId} />
        </TabsContent>
        <TabsContent value="my-lease">
          <TenantLeaseViewerTab userId={userId} />
        </TabsContent>
        <TabsContent value="screening-status">
          <TenantScreeningStatusTab userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantSection8Portal;
