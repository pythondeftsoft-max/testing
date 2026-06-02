import React from 'react';
import { AccountsReceivableReport } from './reports/AccountsReceivableReport';
import { BalanceSheetReport } from './reports/BalanceSheetReport';
import { GeneralLedgerReport } from './reports/GeneralLedgerReport';
import { GeneralLedgerConsolidatedReport } from './reports/GeneralLedgerConsolidatedReport';
import { IncomeStatementReport } from './reports/IncomeStatementReport';
import { IncomeStatementConsolidatedReport } from './reports/IncomeStatementConsolidatedReport';
import { IncomeStatementDetailedReport } from './reports/IncomeStatementDetailedReport';
import PropertyStatementReport from './reports/PropertyStatementReport';
import { RentalOwnerEndingBalancesReport } from './reports/RentalOwnerEndingBalancesReport';
import { RentalOwnerStatementReport } from './reports/RentalOwnerStatementReport';
import { TrialBalanceReport } from './reports/TrialBalanceReport';
import { TrialBalanceConsolidatedReport } from './reports/TrialBalanceConsolidatedReport';
import { VendorLedgerReport } from './reports/VendorLedgerReport';
import { CurrentDelinquentTenantsReport } from './reports/CurrentDelinquentTenantsReport';
import { LeasesEndingReport } from './reports/LeasesEndingReport';
import ComprehensiveAnalyticsReport from './reports/ComprehensiveAnalyticsReport';
import { RentPaidReport } from './reports/RentPaidReport';
import { RentRollReport } from './reports/RentRollReport';
import { RentersInsuranceReport } from '@/components/reports/RentersInsuranceReport';
import { CompletedTasksReport } from '@/components/reports/CompletedTasksReport';
import { OpenTasksReport } from '@/components/reports/OpenTasksReport';
import { WorkOrdersReport } from '@/components/reports/WorkOrdersReport';
import { TaskPerformanceReport } from '@/components/reports/TaskPerformanceReport';
import { VacancyAnalysisReport } from './reports/VacancyAnalysisReport';

interface ReportRouterProps {
  reportId: string;
  portfolioId?: string;
  onBack: () => void;
}

export const ReportRouter: React.FC<ReportRouterProps> = ({ reportId, portfolioId, onBack }) => {
  const renderReport = () => {
    switch (reportId) {
      case 'accounts-receivable':
        return <AccountsReceivableReport onBack={onBack} portfolioId={portfolioId} />;

      case 'balance-sheet':
        return <BalanceSheetReport onBack={onBack} portfolioId={portfolioId} />;

      case 'property-statement':
        return <PropertyStatementReport onBack={onBack} portfolioId={portfolioId} />;

      case 'general-ledger':
        return <GeneralLedgerReport onBack={onBack} portfolioId={portfolioId} />;

      case 'general-ledger-consolidated':
        return <GeneralLedgerConsolidatedReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'income-statement':
        return <IncomeStatementReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'income-statement-consolidated':
        return <IncomeStatementConsolidatedReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'income-statement-detailed':
        return <IncomeStatementDetailedReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'rental-owner-ending-balances':
        return <RentalOwnerEndingBalancesReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'rental-owner-statement':
        return <RentalOwnerStatementReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'trial-balance':
        return <TrialBalanceReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'trial-balance-consolidated':
        return <TrialBalanceConsolidatedReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'vendor-ledger':
        return <VendorLedgerReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'comprehensive':
        return <ComprehensiveAnalyticsReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'delinquent-tenants':
      case 'current-delinquent-tenants':
        return <CurrentDelinquentTenantsReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'leases-ending':
        return <LeasesEndingReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'rent-paid':
        return <RentPaidReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'rent-roll':
        return <RentRollReport onBack={onBack} portfolioId={portfolioId} />;
      
      case 'renters-insurance':
        return <RentersInsuranceReport portfolioId={portfolioId} onBack={onBack} />;
      
      case 'completed-tasks':
        return <CompletedTasksReport portfolioId={portfolioId} onBack={onBack} />;
      
      case 'open-tasks':
        return <OpenTasksReport portfolioId={portfolioId} onBack={onBack} />;
      
      case 'work-orders':
        return <WorkOrdersReport portfolioId={portfolioId} onBack={onBack} />;
      
      case 'task-performance':
        return <TaskPerformanceReport portfolioId={portfolioId} onBack={onBack} />;
      
      case 'vacancy-analysis':
        return <VacancyAnalysisReport onBack={onBack} portfolioId={portfolioId} />;
      
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Report Not Found</h2>
            <p className="text-muted-foreground">The requested report could not be found.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderReport()}
    </div>
  );
};