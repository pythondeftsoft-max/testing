import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileDown, Calendar as CalendarIcon, Download, FileText, BarChart3, X } from 'lucide-react';
import { format } from 'date-fns';
import { generateAnalyticsReport } from '@/utils/pdfReportUtils';
import { PortfolioOverview, LeasePipeline, RentDelinquency, MaintenanceEfficiency, TopLatePayer } from '@/hooks/useLandlordAnalytics';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioOverview: PortfolioOverview | null;
  leasePipeline: LeasePipeline | null;
  rentDelinquency: RentDelinquency | null;
  maintenanceEfficiency: MaintenanceEfficiency | null;
  topLatePayers: TopLatePayer[];
  landlordName: string;
}

const ReportExportModal = ({
  isOpen,
  onClose,
  portfolioOverview,
  leasePipeline,
  rentDelinquency,
  maintenanceEfficiency,
  topLatePayers,
  landlordName
}: ReportExportModalProps) => {
  const [reportType, setReportType] = useState('comprehensive');
  const [dateRange, setDateRange] = useState('current');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    {
      value: 'comprehensive',
      label: 'Comprehensive Analytics Report',
      description: 'Complete portfolio overview with all metrics',
      icon: BarChart3
    },
    {
      value: 'executive',
      label: 'Executive Summary',
      description: 'High-level overview for stakeholders',
      icon: FileText
    },
    {
      value: 'financial',
      label: 'Financial Performance Report',
      description: 'Focus on rent collection and revenue',
      icon: FileDown
    }
  ];

  const dateRanges = [
    { value: 'current', label: 'Current Period' },
    { value: 'monthly', label: 'Monthly Report' },
    { value: 'quarterly', label: 'Quarterly Report' },
    { value: 'custom', label: 'Custom Date' }
  ];

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      
      const reportDate = dateRange === 'custom' && customDate 
        ? format(customDate, 'MMMM dd, yyyy')
        : format(new Date(), 'MMMM dd, yyyy');

      await generateAnalyticsReport({
        portfolioOverview,
        leasePipeline,
        rentDelinquency,
        maintenanceEfficiency,
        topLatePayers,
        landlordName,
        reportDate
      });

      // Close modal after successful generation
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black flex items-center">
              <FileDown className="w-5 h-5 mr-2 text-blue-600" />
              Export Analytics Report
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">OK</span>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">OpenKey Analytics Report</h3>
                  <p className="text-sm text-blue-700">Professional property management insights</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                {format(new Date(), 'MMM yyyy')}
              </Badge>
            </div>
            
            {portfolioOverview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-900">{portfolioOverview.total_units}</div>
                  <div className="text-xs text-blue-700">Total Units</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-900">{portfolioOverview.vacancy_rate.toFixed(1)}%</div>
                  <div className="text-xs text-blue-700">Vacancy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-900">{formatCurrency(portfolioOverview.gross_rent)}</div>
                  <div className="text-xs text-blue-700">Gross Rent</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-900">{formatCurrency(portfolioOverview.net_operating_income)}</div>
                  <div className="text-xs text-blue-700">NOI</div>
                </div>
              </div>
            )}
          </div>

          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-black mb-3">Report Type</label>
            <div className="grid grid-cols-1 gap-3">
              {reportTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      reportType === type.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => setReportType(type.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <IconComponent className={`w-5 h-5 mt-0.5 ${
                          reportType === type.value ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            reportType === type.value ? 'text-blue-900' : 'text-black'
                          }`}>
                            {type.label}
                          </h4>
                          <p className={`text-sm ${
                            reportType === type.value ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            {type.description}
                          </p>
                        </div>
                        {reportType === type.value && (
                          <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-sm font-medium text-black mb-3">Report Period</label>
            <div className="grid grid-cols-2 gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {dateRange === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate ? format(customDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={setCustomDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Report Features */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-black">Report Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">OpenKey Professional Branding</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Included</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Portfolio Performance Metrics</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Included</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Property-Level Breakdowns</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Included</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Executive Summary</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Included</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Report will be downloaded as PDF
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateReport} 
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportExportModal;