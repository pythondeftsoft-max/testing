import React from 'react';
import { FileSignature, HandCoins } from 'lucide-react';
import { HubTabs, HubTabsList, HubTabsTrigger, HubTabsContent } from './HubTabs';
import SpecialClaimsList from '../special-claims/SpecialClaimsList';
import RepaymentAgreementsList from '../repayment/RepaymentAgreementsList';

interface Props {
  agencyId: string;
  canManage: boolean;
}

const ClaimsDebtHub: React.FC<Props> = ({ agencyId, canManage }) => (
  <HubTabs defaultValue="claims" className="space-y-4">
    <HubTabsList>
      <HubTabsTrigger value="claims"><FileSignature className="w-4 h-4" /> Special Claims</HubTabsTrigger>
      <HubTabsTrigger value="repayments"><HandCoins className="w-4 h-4" /> Repayments</HubTabsTrigger>
    </HubTabsList>
    <HubTabsContent value="claims">
      <SpecialClaimsList agencyId={agencyId} canManage={canManage} />
    </HubTabsContent>
    <HubTabsContent value="repayments">
      <RepaymentAgreementsList agencyId={agencyId} canManage={canManage} />
    </HubTabsContent>
  </HubTabs>
);

export default ClaimsDebtHub;
