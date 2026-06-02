import React from 'react';
import AgencyReports from '@/components/agency/AgencyReports';

interface Props { agencyId: string; }

const GeneralAnalytics: React.FC<Props> = ({ agencyId }) => {
  return <AgencyReports agencyId={agencyId} />;
};

export default GeneralAnalytics;
