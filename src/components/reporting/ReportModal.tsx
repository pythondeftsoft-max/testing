import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Calendar, FileText, Download, Clock, CheckCircle, BarChart3, TrendingUp, DollarSign, Home, Users, Percent, Filter, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { useEnhancedPortfolioAnalytics } from '@/hooks/useEnhancedPortfolioAnalytics';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import ReportGenerator from './ReportGenerator';
import WhiteLabelBranding from '@/components/WhiteLabelBranding';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: string;
  portfolioId?: string;
  userId: string;
}

type ReportPeriod = 'current' | '30d' | '90d' | '6m' | '1y' | 'custom';
type ExportFormat = 'pdf' | 'excel';

interface ReportFilters {
  propertyIds?: string[];
  propertyTypes: string[];
  occupancyRange: [number, number];
  rentRange: [number, number];
  maintenanceStatus: string[];
  paymentStatus: string[];
  includeVacant: boolean;
  includeVoucher: boolean;
  selectedSections: string[];
}

const ReportModal = ({ isOpen, onClose, reportType, portfolioId, userId }: ReportModalProps) => {
  const [selectedReportType, setSelectedReportType] = useState<string>(reportType || 'comprehensive');
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('current');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const { toast } = useToast();
  
  // Fetch portfolio metrics for display
  const { data: metrics, isLoading: metricsLoading } = usePortfolioMetrics(portfolioId || 'everything');
  const { data: enhancedAnalytics } = useEnhancedPortfolioAnalytics(userId, portfolioId);

  // Advanced filters state
  const [filters, setFilters] = useState<ReportFilters>({
    propertyTypes: [],
    occupancyRange: [0, 100],
    rentRange: [0, 5000],
    maintenanceStatus: [],
    paymentStatus: [],
    includeVacant: true,
    includeVoucher: true,
    selectedSections: ['executive', 'financial', 'property', 'maintenance', 'payment', 'lease']
  });

  const reportTypes = [
    {
      id: 'comprehensive',
      title: 'Comprehensive Analytics Report',
      description: 'Complete portfolio overview with detailed metrics and analysis',
      features: ['Executive Summary', 'Financial Performance', 'Property Rankings', 'Maintenance Analytics', 'Payment Performance', 'Lease Pipeline', 'Geographic Analysis'],
      icon: BarChart3,
      estimatedTime: '3-4 minutes'
    },
    {
      id: 'executive',
      title: 'Executive Summary',
      description: 'High-level overview for stakeholders and investors',
      features: ['Key Performance Indicators', 'Portfolio Health Score', 'Revenue Summary', 'Strategic Insights', 'Market Position'],
      icon: TrendingUp,
      estimatedTime: '1-2 minutes'
    },
    {
      id: 'financial',
      title: 'Financial Performance Report',
      description: 'Detailed financial analysis and profitability metrics',
      features: ['Revenue Analysis', 'Expense Breakdown', 'NOI & Cash Flow', 'Collection Performance', 'HAP Analytics', 'Cost Per Unit'],
      icon: DollarSign,
      estimatedTime: '2-3 minutes'
    },
    {
      id: 'operational',
      title: 'Operational Performance Report',
      description: 'Operational efficiency and maintenance analytics',
      features: ['Maintenance Metrics', 'Response Times', 'Vendor Performance', 'Cost Analysis', 'Request Categories', 'Efficiency Trends'],
      icon: Settings,
      estimatedTime: '2-3 minutes'
    }
  ];

  const availableSections = [
    { id: 'executive', label: 'Executive Summary', description: 'High-level KPIs and insights' },
    { id: 'financial', label: 'Financial Performance', description: 'Revenue, expenses, and profitability' },
    { id: 'property', label: 'Property Analysis', description: 'Individual property performance' },
    { id: 'maintenance', label: 'Maintenance Analytics', description: 'Request volumes and costs' },
    { id: 'payment', label: 'Payment Performance', description: 'Collection rates and delinquency' },
    { id: 'lease', label: 'Lease Pipeline', description: 'Expiration and renewal analysis' },
    { id: 'geographic', label: 'Geographic Analysis', description: 'Performance by location' }
  ];

  const currentReport = reportTypes.find(r => r.id === selectedReportType) || reportTypes[0];

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      const generator = new ReportGenerator();
      
      const dateRange = selectedPeriod === 'custom' 
        ? { startDate: customStartDate, endDate: customEndDate }
        : { period: selectedPeriod };

      await generator.generateReport({
        type: selectedReportType,
        format: selectedFormat,
        portfolioId,
        userId,
        filters,
        reportTitle: reportTitle || currentReport.title,
        ...dateRange
      });

      toast({
        title: "Report Generated Successfully",
        description: `Your ${reportTitle || currentReport.title.toLowerCase()} has been generated and downloaded.`,
      });

      onClose();
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Report Generation Failed",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4 pr-24">
          <WhiteLabelBranding 
            className="text-lg font-semibold text-openkey-blue" 
            showLogo={true}
            showCompanyName={true}
          />
          <Badge className="absolute right-24 top-4 bg-openkey-gold text-white">Sep 2025</Badge>
          <DialogTitle className="text-xl font-bold text-openkey-blue">
            OpenKey Analytics Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics Preview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Home className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-primary">Total Units</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {enhancedAnalytics?.enhancedMetrics.totalUnits || 0}
              </p>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-primary">Occupancy</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {formatPercentage(enhancedAnalytics?.enhancedMetrics.occupancyRate || 0)}
              </p>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-primary">Gross Revenue</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(enhancedAnalytics?.enhancedMetrics.grossRevenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-primary">Health Score</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {Math.round(enhancedAnalytics?.enhancedMetrics.portfolioHealthScore || 0)}%
              </p>
            </div>
          </div>

          {/* Report Configuration */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Report Type & Title */}
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-primary">Report Type</label>
                <RadioGroup value={selectedReportType} onValueChange={setSelectedReportType}>
                  {reportTypes.map((report) => {
                    const IconComponent = report.icon;
                    return (
                      <div key={report.id} className="flex items-start space-x-3 p-3 border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
                        <RadioGroupItem value={report.id} id={report.id} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={report.id} className="flex items-center gap-2 cursor-pointer">
                            <IconComponent className="w-4 h-4 text-primary" />
                            <span className="font-medium text-primary">{report.title}</span>
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Est. {report.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Custom Report Title (Optional)</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={currentReport.title}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>
            </div>

            {/* Right Column - Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-primary">Report Filters</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="h-8"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  {showAdvancedFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>

              {showAdvancedFilters && (
                <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
                  {/* Property Types */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-primary">Property Types</label>
                    <div className="flex flex-wrap gap-2">
                      {['single_family', 'multi_unit', 'commercial', 'condo', 'townhouse'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={filters.propertyTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFilter('propertyTypes', [...filters.propertyTypes, type]);
                              } else {
                                updateFilter('propertyTypes', filters.propertyTypes.filter(t => t !== type));
                              }
                            }}
                          />
                          <Label htmlFor={type} className="text-xs capitalize">{type.replace('_', ' ')}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Occupancy Range */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-primary">Occupancy Rate: {filters.occupancyRange[0]}% - {filters.occupancyRange[1]}%</label>
                    <Slider
                      value={filters.occupancyRange}
                      onValueChange={(value) => updateFilter('occupancyRange', value as [number, number])}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Include Options */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeVacant"
                        checked={filters.includeVacant}
                        onCheckedChange={(checked) => updateFilter('includeVacant', checked as boolean)}
                      />
                      <Label htmlFor="includeVacant" className="text-xs">Include Vacant Properties</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeVoucher"
                        checked={filters.includeVoucher}
                        onCheckedChange={(checked) => updateFilter('includeVoucher', checked as boolean)}
                      />
                      <Label htmlFor="includeVoucher" className="text-xs">Include HAP/Voucher Properties</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Report Sections */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-primary">Report Sections</label>
            <div className="grid grid-cols-2 gap-3">
              {availableSections.map((section) => (
                <div key={section.id} className="flex items-start space-x-2 p-2 border border-primary/20 rounded-lg">
                  <Checkbox
                    id={section.id}
                    checked={filters.selectedSections.includes(section.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateFilter('selectedSections', [...filters.selectedSections, section.id]);
                      } else {
                        updateFilter('selectedSections', filters.selectedSections.filter(s => s !== section.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor={section.id} className="text-xs font-medium text-primary cursor-pointer">
                      {section.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Period & Format Selection */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-primary">Report Period</label>
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as ReportPeriod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last 12 Months</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>

              {selectedPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full mt-1 px-2 py-1 border border-input rounded-md text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full mt-1 px-2 py-1 border border-input rounded-md text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-primary">Export Format</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedFormat === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setSelectedFormat('pdf')}
                  className="justify-start h-8 text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  PDF Report
                </Button>
                <Button
                  variant={selectedFormat === 'excel' ? 'default' : 'outline'}
                  onClick={() => setSelectedFormat('excel')}
                  className="justify-start h-8 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Excel Export
                </Button>
              </div>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateReport} 
              disabled={isGenerating || filters.selectedSections.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;