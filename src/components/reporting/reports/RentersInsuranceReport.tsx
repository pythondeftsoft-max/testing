import React from 'react';
import { RentersInsuranceReport as BaseRentersInsuranceReport } from '@/components/reports/RentersInsuranceReport';

interface RentersInsuranceReportProps {
  portfolioId?: string;
  onBack: () => void;
}

export const RentersInsuranceReport: React.FC<RentersInsuranceReportProps> = (props) => {
  return <BaseRentersInsuranceReport {...props} />;
};