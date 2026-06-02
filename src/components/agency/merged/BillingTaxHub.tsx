import React from 'react';
import { Receipt } from 'lucide-react';
import { HubTabs, HubTabsList, HubTabsTrigger, HubTabsContent } from './HubTabs';
import AgencyContractManager from '../AgencyContractManager';
import AgencyInvoiceGenerator from '../AgencyInvoiceGenerator';
import AgencyTaxCenter from '../AgencyTaxCenter';

interface Props {
  agencyId: string;
  staffId: string;
  showBilling?: boolean;
}

const BillingTaxHub: React.FC<Props> = ({ agencyId, staffId, showBilling }) => {
  const defaultTab = showBilling ? 'billing' : 'tax';
  return (
    <HubTabs defaultValue={defaultTab} className="space-y-4">
      <HubTabsList>
        {showBilling && (
          <HubTabsTrigger value="billing"><Receipt className="w-4 h-4" /> Billing</HubTabsTrigger>
        )}
        <HubTabsTrigger value="tax"><Receipt className="w-4 h-4" /> Tax Center</HubTabsTrigger>
      </HubTabsList>

      {showBilling && (
        <HubTabsContent value="billing">
          <div className="space-y-4">
            <div className="flex justify-end">
              <AgencyInvoiceGenerator agencyId={agencyId} />
            </div>
            <AgencyContractManager agencyId={agencyId} />
          </div>
        </HubTabsContent>
      )}
      <HubTabsContent value="tax">
        <AgencyTaxCenter agencyId={agencyId} staffUserId={staffId} />
      </HubTabsContent>
    </HubTabs>
  );
};

export default BillingTaxHub;
