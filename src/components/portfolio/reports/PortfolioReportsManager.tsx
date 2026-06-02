import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Building, 
  BarChart3,
  Calculator,
  CreditCard,
  PiggyBank,
  Receipt,
  Download,
  FileSpreadsheet,
  Target,
  Calendar,
  AlertTriangle,
  Wrench,
  PieChart
} from 'lucide-react';
import { ReportCard } from './ReportCard';
import { 
  generatePortfolioPerformancePDF,
  generateCollectionsDelinquencyPDF, 
  generateLeasePipelinePDF,
  generateMaintenanceEfficiencyPDF
} from "@/utils/portfolioReportUtils";
import { 
  generateAnalyticsReport, 
  generatePropertyReport
} from '@/utils/pdfReportUtils';
import { RawDataExportModal } from "./RawDataExportModal";
import { toast } from "sonner";

interface PortfolioReportsManagerProps {
  portfolioId: string;
  currentUserId: string;
}

interface ReportItem {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'accounting' | 'property' | 'financial';
  icon: typeof FileText;
  generatePDF: () => Promise<void>;
  generateExcel?: () => Promise<void>;
}

const PortfolioReportsManager: React.FC<PortfolioReportsManagerProps> = ({
  portfolioId,
  currentUserId
}) => {
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [isRawDataModalOpen, setIsRawDataModalOpen] = useState(false);
  const portfolioName = `Portfolio-${portfolioId.slice(0, 8)}`;

  // Generic function for reports that don't have specific implementations yet
  const generateGenericPDF = async (reportName: string) => {
    const pdf = new (await import('jspdf')).default('p', 'mm', 'a4');
    const margin = 20;
    
    // Header
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OpenKey', margin, 15);
    
    // Report content
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text(reportName, margin, 50);
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 65);
    pdf.text('This report is currently under development.', margin, 80);
    pdf.text('Specific data implementation will be available soon.', margin, 90);
    
    const fileName = `${reportName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const businessReports: ReportItem[] = [
    {
      id: 'portfolio-performance',
      name: 'Portfolio Performance',
      description: 'Key metrics including occupancy, vacancy rate, and revenue summary',
      category: 'business',
      icon: Target,
      generatePDF: () => generatePortfolioPerformancePDF(portfolioId, portfolioName, selectedDateRange.startDate, selectedDateRange.endDate)
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity overview',
      category: 'business',
      icon: BarChart3,
      generatePDF: () => generateGenericPDF('Balance Sheet')
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      description: 'Operating, investing, and financing activities',
      category: 'business',
      icon: TrendingUp,
      generatePDF: () => generateGenericPDF('Cash Flow Statement')
    },
    {
      id: 'profit-loss',
      name: 'Profit & Loss',
      description: 'Revenue, expenses, and net income',
      category: 'business',
      icon: DollarSign,
      generatePDF: () => generateGenericPDF('Profit & Loss')
    }
  ];

  const accountingReports: ReportItem[] = [
    {
      id: 'account-register',
      name: 'Account Register',
      description: 'Detailed transaction history by account',
      category: 'accounting',
      icon: Receipt,
      generatePDF: () => generateGenericPDF('Account Register')
    },
    {
      id: 'chart-accounts',
      name: 'Chart of Accounts',
      description: 'Complete listing of all accounts',
      category: 'accounting',
      icon: Calculator,
      generatePDF: () => generateGenericPDF('Chart of Accounts')
    },
    {
      id: 'banking',
      name: 'Banking Report',
      description: 'Bank account reconciliation and details',
      category: 'accounting',
      icon: CreditCard,
      generatePDF: () => generateGenericPDF('Banking Report')
    }
  ];

  const propertyReports: ReportItem[] = [
    {
      id: 'rent-roll',
      name: 'Rent Roll',
      description: 'Current rent status for all properties',
      category: 'property',
      icon: Building,
      generatePDF: () => generateGenericPDF('Rent Roll')
    },
    {
      id: 'owner-statement',
      name: 'Owner Statement',
      description: 'Financial summary for property owners',
      category: 'property',
      icon: FileText,
      generatePDF: () => generateGenericPDF('Owner Statement')
    },
    {
      id: 'property-reserves',
      name: 'Property Reserve Funds',
      description: 'Reserve fund balances and allocations',
      category: 'property',
      icon: PiggyBank,
      generatePDF: () => generateGenericPDF('Property Reserve Funds')
    }
  ];

  const financialReports: ReportItem[] = [
    {
      id: 'management-fees',
      name: 'Management Fees',
      description: 'Fee calculations and breakdowns',
      category: 'financial',
      icon: Calculator,
      generatePDF: () => generateGenericPDF('Management Fees')
    },
    {
      id: 'lease-transactions',
      name: 'Lease Transactions',
      description: 'All lease-related financial transactions',
      category: 'financial',
      icon: Receipt,
      generatePDF: () => generateGenericPDF('Lease Transactions')
    },
    {
      id: 'vendor-transactions',
      name: 'Vendor Transactions',
      description: 'Payments and transactions with vendors',
      category: 'financial',
      icon: CreditCard,
      generatePDF: () => generateGenericPDF('Vendor Transactions')
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Portfolio Reports
          </CardTitle>
          <CardDescription>
            Generate comprehensive financial and management reports for your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={selectedDateRange.startDate}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={selectedDateRange.endDate}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business">Business Overview</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="property">Property Management</TabsTrigger>
          <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="accounting" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountingReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="property" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propertyReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Download className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Export Portfolio Data</h3>
                    <p className="text-sm text-muted-foreground">Export raw data to CSV files</p>
                  </div>
                </div>
                <Button onClick={() => setIsRawDataModalOpen(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      <RawDataExportModal
        isOpen={isRawDataModalOpen}
        onClose={() => setIsRawDataModalOpen(false)}
        portfolioId={portfolioId}
        portfolioName={portfolioName}
      />
    </div>
  );
};

export default PortfolioReportsManager;