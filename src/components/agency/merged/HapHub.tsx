import React from 'react';
import { FileSignature, DollarSign, RefreshCw, Banknote } from 'lucide-react';
import { HubTabs, HubTabsList, HubTabsTrigger, HubTabsContent } from './HubTabs';
import AgencyHAPContracts from '../AgencyHAPContracts';
import AgencyHAPBatching from '../hap/AgencyHAPBatching';
import HAPReconciliation from '../HAPReconciliation';
import AgencyPaymentRails from '../AgencyPaymentRails';

interface Props {
  agencyId: string;
  agencyName: string;
  canManage: boolean;
  canEditHAP: boolean;
  showHAPContracts: boolean;
  showHAPBatching: boolean;
}

const HapHub: React.FC<Props> = ({
  agencyId, agencyName, canManage, canEditHAP, showHAPContracts, showHAPBatching,
}) => {
  const defaultTab = showHAPBatching ? 'batching' : showHAPContracts ? 'contracts' : 'rails';
  return (
    <HubTabs defaultValue={defaultTab} className="space-y-4">
      <HubTabsList>
        {showHAPContracts && (
          <HubTabsTrigger value="contracts"><FileSignature className="w-4 h-4" /> Contracts</HubTabsTrigger>
        )}
        {showHAPBatching && (
          <HubTabsTrigger value="batching"><DollarSign className="w-4 h-4" /> Batching</HubTabsTrigger>
        )}
        {showHAPBatching && (
          <HubTabsTrigger value="reconciliation"><RefreshCw className="w-4 h-4" /> Reconciliation</HubTabsTrigger>
        )}
        {showHAPBatching && (
          <HubTabsTrigger value="rails"><Banknote className="w-4 h-4" /> Payment Rails</HubTabsTrigger>
        )}
      </HubTabsList>

      {showHAPContracts && (
        <HubTabsContent value="contracts">
          <AgencyHAPContracts agencyId={agencyId} canManage={canManage} />
        </HubTabsContent>
      )}
      {showHAPBatching && (
        <HubTabsContent value="batching">
          <AgencyHAPBatching agencyId={agencyId} agencyName={agencyName} canEdit={canEditHAP} />
        </HubTabsContent>
      )}
      {showHAPBatching && (
        <HubTabsContent value="reconciliation">
          <HAPReconciliation agencyId={agencyId} />
        </HubTabsContent>
      )}
      {showHAPBatching && (
        <HubTabsContent value="rails">
          <AgencyPaymentRails agencyId={agencyId} canManage={canManage} />
        </HubTabsContent>
      )}
    </HubTabs>
  );
};

export default HapHub;
