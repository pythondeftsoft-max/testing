import React from 'react';
import ApplicationReviewQueue from './intake/ApplicationReviewQueue';

interface AgencyApplicationsProps {
  agencyId: string;
  agencySlug?: string;
  canManage: boolean;
}

const AgencyApplications: React.FC<AgencyApplicationsProps> = ({ agencyId, agencySlug, canManage }) => (
  <ApplicationReviewQueue agencyId={agencyId} agencySlug={agencySlug} canManage={canManage} />
);

export default AgencyApplications;
