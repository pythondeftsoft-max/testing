import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Calendar, TrendingUp, BarChart3, DollarSign, Search, Star, ChevronDown, ChevronUp,
  Users, Home, Wrench, Receipt, PieChart, Calculator, ClipboardList, UserCheck, AlertCircle,
  Clock, CheckCircle, Activity, Building, Key, CreditCard, Wallet, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import ReportModal from './ReportModal';
// import BulkReportWizard from './BulkReportWizard'; // Temporarily disabled
import WhiteLabelBranding from '@/components/WhiteLabelBranding';
import { ReportRouter } from './ReportRouter';

interface ReportingDashboardProps {
  portfolioId?: string;
  userId: string;
}

const ReportingDashboard = ({ portfolioId, userId }: ReportingDashboardProps) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['favorites', 'financial', 'rental', 'task']);
  const [favoriteReports, setFavoriteReports] = useState<string[]>(['comprehensive', 'rent-roll', 'accounts-receivable']);
  // const [selectedBulkReports, setSelectedBulkReports] = useState<string[]>([]); // Temporarily disabled
  // const [activeTab, setActiveTab] = useState<string>('individual'); // Temporarily disabled
  const [currentReport, setCurrentReport] = useState<string | null>(null);

  // Scroll to top when a report is opened
  useEffect(() => {
    if (currentReport) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentReport]);

  const reportCategories = {
    favorites: {
      name: 'Favorites',
      icon: Star,
      reports: []
    },
    financial: {
      name: 'Financial Reports',
      icon: DollarSign,
      reports: [
        { id: 'accounts-receivable', name: 'Accounts Receivable Summary', description: 'Outstanding balances and payment tracking', icon: Receipt },
        { id: 'balance-sheet', name: 'Balance Sheet', description: 'Assets, liabilities, and equity summary', icon: Calculator },
        { id: 'general-ledger', name: 'General Ledger', description: 'Complete accounting transaction history', icon: ClipboardList },
        { id: 'general-ledger-consolidated', name: 'General Ledger Consolidated', description: 'Consolidated account summaries across properties', icon: Calculator },
        { id: 'income-statement', name: 'Income Statement', description: 'Revenue and expense summary', icon: TrendingUp },
        { id: 'income-statement-consolidated', name: 'Income Statement Consolidated', description: 'Consolidated revenue and expense summary across all properties', icon: Calculator },
        { id: 'income-statement-detailed', name: 'Income Statement Detailed', description: 'Individual transaction details with line-by-line breakdown', icon: ClipboardList },
        { id: 'property-statement', name: 'Property Statement', description: 'Individual property financial performance', icon: Building },
        { id: 'rental-owner-ending-balances', name: 'Rental Owner Ending Balances Report', description: 'Show ending cash balances by property/owner', icon: Wallet },
        { id: 'rental-owner-statement', name: 'Rental Owner Statement', description: 'Comprehensive owner statement with cash flow', icon: UserCheck },
        { id: 'trial-balance', name: 'Trial Balance', description: 'Individual property account balances', icon: Calculator },
        { id: 'trial-balance-consolidated', name: 'Trial Balance Consolidated', description: 'Consolidated account balances across properties', icon: BarChart3 },
        { id: 'vendor-ledger', name: 'Vendor Ledger', description: 'Vendor payment history and outstanding balances', icon: Receipt },
        { id: 'comprehensive', name: 'Comprehensive Analytics Report', description: 'Complete portfolio financial overview', icon: PieChart }
      ]
    },
    rental: {
      name: 'Rental Reports',
      icon: Home,
      reports: [
        { id: 'delinquent-tenants', name: 'Delinquent Tenants', description: 'Tenants with overdue payments', icon: AlertCircle },
        { id: 'leases-ending', name: 'Leases Ending', description: 'Upcoming lease expirations', icon: Calendar },
        { id: 'rent-paid', name: 'Rent Paid Report', description: 'Payment history and status', icon: CreditCard },
        { id: 'rent-roll', name: 'Rent Roll', description: 'Detailed rent and occupancy summary', icon: ClipboardList },
        { id: 'renters-insurance', name: 'Renters Insurance', description: 'Tenant insurance policies and coverage', icon: Shield }
      ]
    },
    task: {
      name: 'Task Reports',
      icon: Wrench,
      reports: [
        { id: 'completed-tasks', name: 'Completed Tasks', description: 'Recently finished maintenance tasks', icon: CheckCircle },
        { id: 'open-tasks', name: 'Open Tasks', description: 'Pending maintenance and repairs', icon: Clock },
        { id: 'work-orders', name: 'Work Orders', description: 'Detailed work order tracking', icon: Wrench },
        { id: 'task-performance', name: 'Task Performance', description: 'Maintenance efficiency metrics', icon: Activity }
      ]
    }
  };

  // Get favorite reports
  const getFavoriteReports = () => {
    const allReports = Object.values(reportCategories).flatMap(category => category.reports);
    return allReports.filter(report => favoriteReports.includes(report.id));
  };

  reportCategories.favorites.reports = getFavoriteReports();

  // Filter reports based on search term
  const getFilteredReports = (reports: any[]) => {
    if (!searchTerm) return reports;
    return reports.filter(report => 
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleFavorite = (reportId: string) => {
    setFavoriteReports(prev => 
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // Temporarily disabled - Bulk reports feature
  // const toggleBulkReport = (reportId: string) => {
  //   setSelectedBulkReports(prev =>
  //     prev.includes(reportId)
  //       ? prev.filter(id => id !== reportId)
  //       : [...prev, reportId]
  //   );
  // };

  const handleGenerateReport = (reportType: string) => {
    // For specific reports that have dedicated components, route directly
    if (reportType === 'accounts-receivable' || reportType === 'balance-sheet' || reportType === 'general-ledger' || reportType === 'general-ledger-consolidated' || reportType === 'income-statement' || reportType === 'income-statement-consolidated' || reportType === 'income-statement-detailed' || reportType === 'property-statement' || reportType === 'rental-owner-ending-balances' || reportType === 'rental-owner-statement' || reportType === 'trial-balance' || reportType === 'trial-balance-consolidated' || reportType === 'vendor-ledger' || reportType === 'comprehensive' || reportType === 'delinquent-tenants' || reportType === 'current-delinquent-tenants' || reportType === 'leases-ending' || reportType === 'rent-paid' || reportType === 'rent-roll' || reportType === 'renters-insurance' || reportType === 'completed-tasks' || reportType === 'open-tasks' || reportType === 'work-orders' || reportType === 'task-performance') {
      setCurrentReport(reportType);
    } else {
      // For other reports, open the modal
      setSelectedReportType(reportType);
      setShowReportModal(true);
    }
  };

  const handleBackToReports = () => {
    setCurrentReport(null);
  };

  // Temporarily disabled - Bulk reports feature
  // const handleGenerateBulkReports = () => {
  //   if (selectedBulkReports.length > 0) {
  //     // Handle bulk report generation
  //     console.log('Generating bulk reports:', selectedBulkReports);
  //   }
  // };

  // Show specific report if one is selected
  if (currentReport) {
    return (
      <div className="space-y-6">
        <ReportRouter reportId={currentReport} portfolioId={portfolioId} onBack={handleBackToReports} />
      </div>
    );
  }

  const renderReportCard = (report: any, showFavorite = true, showCheckbox = false) => {
    const IconComponent = report.icon;
    const isFavorite = favoriteReports.includes(report.id);
    // const isSelected = selectedBulkReports.includes(report.id); // Temporarily disabled

    return (
      <CardEnhanced
        key={report.id}
        variant="elevated"
        hover
        className="card-hover-gold relative cursor-pointer"
        onClick={() => !showCheckbox && handleGenerateReport(report.id)}
      >
        <CardEnhancedHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {/* Temporarily disabled - Bulk reports feature */}
              {/* {showCheckbox && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleBulkReport(report.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )} */}
              <div className="p-2 rounded-lg bg-openkey-blue/10">
                <IconComponent className="h-5 w-5 text-openkey-blue" />
              </div>
              <div className="flex-1">
                <CardEnhancedTitle className="text-base font-semibold text-openkey-blue">
                  {report.name}
                </CardEnhancedTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.description}
                </p>
              </div>
            </div>
            {showFavorite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(report.id);
                }}
                className="p-1 h-8 w-8"
              >
                <Star 
                  className={`h-4 w-4 ${isFavorite ? 'fill-openkey-gold text-openkey-gold' : 'text-muted-foreground'}`} 
                />
              </Button>
            )}
          </div>
        </CardEnhancedHeader>
      </CardEnhanced>
    );
  };

  const renderCategory = (categoryId: string, category: any, showCheckbox = false) => {
    const isExpanded = expandedCategories.includes(categoryId);
    const filteredReports = getFilteredReports(category.reports);
    const CategoryIcon = category.icon;

    if (filteredReports.length === 0 && searchTerm) return null;

    return (
      <div key={categoryId} className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => toggleCategory(categoryId)}
          className="w-full justify-between p-4 h-auto border border-openkey-blue/20 hover:bg-openkey-blue/5"
        >
          <div className="flex items-center gap-3">
            <CategoryIcon className="h-5 w-5 text-openkey-blue" />
            <span className="font-semibold text-openkey-blue">{category.name}</span>
            <Badge variant="secondary" className="ml-2">
              {filteredReports.length}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-openkey-blue" />
          ) : (
            <ChevronDown className="h-4 w-4 text-openkey-blue" />
          )}
        </Button>

        {isExpanded && filteredReports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
            {filteredReports.map(report => renderReportCard(report, !showCheckbox, showCheckbox))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-blue-gold text-white relative overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Portfolio Reports
              </h1>
              <p className="text-white/90 text-lg">
                Generate comprehensive reports for your portfolio performance and analytics
              </p>
            </div>
            <div className="flex items-center">
              <Button 
                onClick={() => setShowReportModal(true)}
                className="bg-openkey-blue text-white hover:bg-openkey-blue/90 shadow-lg"
              >
                <FileText className="w-5 h-5 mr-2" />
                Create Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-openkey-blue/20 focus:border-openkey-blue"
        />
      </div>

      {/* Tabs - Bulk Reports Temporarily Disabled */}
      <Tabs defaultValue="individual" className="w-full">
        {/* <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="individual">Individual Reports</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Reports</TabsTrigger>
        </TabsList> */}
        
        {/* Description */}
        <div className="text-center max-w-2xl mx-auto mt-4 mb-6">
          <p className="text-muted-foreground">
            Select a specific report type below and run it for your chosen properties and units. Click on any report card to get started, or use the 'Create Report' button above for a custom report configuration.
          </p>
        </div>

        {/* Individual Reports Tab */}
        <TabsContent value="individual" className="space-y-6 mt-8">
          {Object.entries(reportCategories).map(([categoryId, category]) => 
            renderCategory(categoryId, category, false)
          )}
        </TabsContent>

        {/* Bulk Reports Tab - Temporarily Disabled */}
        {/* <TabsContent value="bulk" className="space-y-6 mt-8">
          <BulkReportWizard reportCategories={reportCategories} />
        </TabsContent> */}
      </Tabs>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedReportType('');
        }}
        reportType={selectedReportType}
        portfolioId={portfolioId}
        userId={userId}
      />
    </div>
  );
};

export default ReportingDashboard;