import React from 'react';
import { Calculator, AlertTriangle, Landmark, Database } from 'lucide-react';
import { HubTabs, HubTabsList, HubTabsTrigger, HubTabsContent } from './HubTabs';
import AgencyRentCalculator from '../AgencyRentCalculator';
import AgencyEivCenter from '../../eiv/AgencyEivCenter';
import AgencyTenantLedger from '../AgencyTenantLedger';
import ComparablesDatabase from '../comparables/ComparablesDatabase';

interface Props {
  agencyId: string;
  staffId: string;
  canManage: boolean;
  showRentCalc: boolean;
  showComparables?: boolean;
}

const RentIncomeHub: React.FC<Props> = ({ agencyId, staffId, canManage, showRentCalc, showComparables }) => {
  const defaultTab = showRentCalc ? 'rent' : 'ledger';
  return (
    <HubTabs defaultValue={defaultTab} className="space-y-4">
      <HubTabsList>
        {showRentCalc && (
          <HubTabsTrigger value="rent"><Calculator className="w-4 h-4" /> Rent Calc</HubTabsTrigger>
        )}
        <HubTabsTrigger value="eiv"><AlertTriangle className="w-4 h-4" /> EIV Income</HubTabsTrigger>
        <HubTabsTrigger value="ledger"><Landmark className="w-4 h-4" /> Tenant Ledger</HubTabsTrigger>
        {showComparables && (
          <HubTabsTrigger value="comparables"><Database className="w-4 h-4" /> Comparables</HubTabsTrigger>
        )}
      </HubTabsList>

      {showRentCalc && (
        <HubTabsContent value="rent">
          <AgencyRentCalculator agencyId={agencyId} staffId={staffId} canManage={canManage} />
        </HubTabsContent>
      )}
      <HubTabsContent value="eiv">
        <AgencyEivCenter agencyId={agencyId} />
      </HubTabsContent>
      <HubTabsContent value="ledger">
        <AgencyTenantLedger agencyId={agencyId} staffId={staffId} canManage={canManage} />
      </HubTabsContent>
      {showComparables && (
        <HubTabsContent value="comparables">
          <ComparablesDatabase agencyId={agencyId} staffId={staffId} canManage={canManage} />
        </HubTabsContent>
      )}
    </HubTabs>
  );
};

export default RentIncomeHub;
