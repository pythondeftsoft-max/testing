import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import HapHub from './merged/HapHub';
import RentIncomeHub from './merged/RentIncomeHub';
import ClaimsDebtHub from './merged/ClaimsDebtHub';
import BillingTaxHub from './merged/BillingTaxHub';
import { GroupSetupPanel } from './shared/GroupSetupTab';

interface AgencyFinanceGroupProps {
  agencyId: string;
  agencyName: string;
  staffId: string;
  canManage: boolean;
  canEditHAP: boolean;
  showHAPContracts: boolean;
  showHAPBatching: boolean;
  showRentCalc: boolean;
  showBilling?: boolean;
  showComparables?: boolean;
  isAdmin?: boolean;
  value?: string;
  onValueChange?: (v: string) => void;
}

const AgencyFinanceGroup: React.FC<AgencyFinanceGroupProps> = ({
  agencyId, agencyName, staffId, canManage, canEditHAP,
  showHAPContracts, showHAPBatching, showRentCalc, showBilling, showComparables, isAdmin,
  value, onValueChange,
}) => {
  const showHap = showHAPContracts || showHAPBatching;
  const defaultTab = showHap ? 'hap' : 'rent_income';
  const tabsProps = value !== undefined ? { value, onValueChange } : { defaultValue: defaultTab };

  return (
    <Tabs {...tabsProps} className="space-y-4">
      {showHap && (
        <TabsContent value="hap">
          <HapHub
            agencyId={agencyId}
            agencyName={agencyName}
            canManage={canManage}
            canEditHAP={canEditHAP}
            showHAPContracts={showHAPContracts}
            showHAPBatching={showHAPBatching}
          />
        </TabsContent>
      )}

      <TabsContent value="rent_income">
        <RentIncomeHub
          agencyId={agencyId}
          staffId={staffId}
          canManage={canManage}
          showRentCalc={showRentCalc}
          showComparables={showComparables}
        />
      </TabsContent>

      <TabsContent value="claims_debt">
        <ClaimsDebtHub agencyId={agencyId} canManage={canManage} />
      </TabsContent>

      <TabsContent value="billing_tax">
        <BillingTaxHub agencyId={agencyId} staffId={staffId} showBilling={showBilling} />
      </TabsContent>

      {isAdmin && (
        <GroupSetupPanel
          agencyId={agencyId}
          categories={['Money']}
          heading="Money Setup — Standards, Limits, Schedules & Utilities"
        />
      )}
    </Tabs>
  );
};

export default AgencyFinanceGroup;
