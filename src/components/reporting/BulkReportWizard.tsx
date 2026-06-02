import React, { useState } from 'react';
import { 
  Building, ChevronRight, ChevronLeft, Search, X, Plus, Trash2, 
  Calendar, Upload, FileText, Download, CheckCircle, Clock,
  ArrowRight, ArrowLeft, Settings2, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface BulkReportWizardProps {
  reportCategories: any;
}

const BulkReportWizard = ({ reportCategories }: BulkReportWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [availableReports, setAvailableReports] = useState<any[]>([]);
  const [selectedReports, setSelectedReports] = useState<any[]>([]);
  const [reportConfigs, setReportConfigs] = useState<{[key: string]: any}>({});
  const [attachments, setAttachments] = useState<any[]>([]);
  const [entitySearchTerm, setEntitySearchTerm] = useState('');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [showRecentReports, setShowRecentReports] = useState(true);

  const steps = [
    { id: 1, title: 'Select Properties', description: 'Choose properties for your reports' },
    { id: 2, title: 'Select Reports', description: 'Pick which reports to generate' },
    { id: 3, title: 'Configure Reports', description: 'Set individual report parameters' },
    { id: 4, title: 'Add Attachments', description: 'Optional: Upload additional files' },
    { id: 5, title: 'Review & Generate', description: 'Review selections and generate' }
  ];

  // Mock data - replace with actual data
  const mockProperties = [
    { id: '1', name: 'Sunset Apartments', address: '123 Main St', units: 24 },
    { id: '2', name: 'Harbor View Complex', address: '456 Oak Ave', units: 48 },
    { id: '3', name: 'Downtown Lofts', address: '789 Pine St', units: 12 },
    { id: '4', name: 'Greenfield Homes', address: '321 Elm Dr', units: 36 },
  ];

  const mockRecentReports = [
    { id: '1', name: 'Monthly Financial Bundle', created: '2024-01-15', status: 'Ready', reports: 5, entities: 3 },
    { id: '2', name: 'Q4 Performance Package', created: '2024-01-10', status: 'Processing', reports: 8, entities: 2 },
    { id: '3', name: 'Year-End Reports', created: '2024-01-05', status: 'Ready', reports: 12, entities: 4 },
  ];

  React.useEffect(() => {
    // Initialize available reports from categories
    const allReports = Object.values(reportCategories)
      .filter((category: any) => category.name !== 'Favorites')
      .flatMap((category: any) => category.reports);
    setAvailableReports(allReports);
  }, [reportCategories]);

  const handleEntityToggle = (entityId: string) => {
    setSelectedEntities(prev => 
      prev.includes(entityId) 
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const moveReportToSelected = (report: any) => {
    setSelectedReports(prev => [...prev, report]);
    setAvailableReports(prev => prev.filter(r => r.id !== report.id));
    // Initialize config for this report
    setReportConfigs(prev => ({
      ...prev,
      [report.id]: {
        startDate: '',
        endDate: '',
        accountingBasis: 'accrual',
        interval: 'monthly'
      }
    }));
  };

  const removeReportFromSelected = (report: any) => {
    setSelectedReports(prev => prev.filter(r => r.id !== report.id));
    setAvailableReports(prev => [...prev, report]);
    // Remove config for this report
    setReportConfigs(prev => {
      const newConfigs = { ...prev };
      delete newConfigs[report.id];
      return newConfigs;
    });
  };

  const updateReportConfig = (reportId: string, field: string, value: any) => {
    setReportConfigs(prev => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        [field]: value
      }
    }));
  };

  const removeReportConfig = (reportId: string) => {
    const report = selectedReports.find(r => r.id === reportId);
    if (report) {
      removeReportFromSelected(report);
    }
  };

  const filteredProperties = mockProperties.filter(prop =>
    prop.name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
    prop.address.toLowerCase().includes(entitySearchTerm.toLowerCase())
  );

  const filteredAvailableReports = availableReports.filter(report =>
    report.name.toLowerCase().includes(reportSearchTerm.toLowerCase())
  );

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return selectedEntities.length > 0;
      case 2: return selectedReports.length > 0;
      case 3: return true; // Always can proceed from config step
      case 4: return true; // Attachments are optional
      case 5: return true;
      default: return false;
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold text-sm
              ${currentStep >= step.id 
                ? 'bg-openkey-blue text-white border-openkey-blue' 
                : 'bg-white text-muted-foreground border-gray-300'
              }
            `}>
              {step.id}
            </div>
            <div className="ml-3 hidden md:block">
              <div className={`text-sm font-medium ${currentStep >= step.id ? 'text-openkey-blue' : 'text-muted-foreground'}`}>
                {step.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {step.description}
              </div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground mx-4 hidden md:block" />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <CardEnhanced variant="elevated" className="p-6">
      <CardEnhancedHeader>
        <CardEnhancedTitle className="text-xl text-openkey-blue">Select Properties</CardEnhancedTitle>
        <p className="text-muted-foreground">Choose which properties to include in your bulk reports</p>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={entitySearchTerm}
                onChange={(e) => setEntitySearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedEntities.length} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedEntities([])}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className={`
                  p-4 border rounded-lg cursor-pointer transition-all
                  ${selectedEntities.includes(property.id) 
                    ? 'border-openkey-blue bg-openkey-blue/5' 
                    : 'border-gray-200 hover:border-openkey-blue/50'
                  }
                `}
                onClick={() => handleEntityToggle(property.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={selectedEntities.includes(property.id)}
                      onChange={() => {}}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-openkey-blue">{property.name}</h4>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                      <p className="text-xs text-muted-foreground mt-1">{property.units} units</p>
                    </div>
                  </div>
                  <Building className="h-5 w-5 text-openkey-blue" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );

  const renderStep2 = () => (
    <CardEnhanced variant="elevated" className="p-6">
      <CardEnhancedHeader>
        <CardEnhancedTitle className="text-xl text-openkey-blue">Select Reports</CardEnhancedTitle>
        <p className="text-muted-foreground">Choose which reports to generate for the selected properties</p>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Reports */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-openkey-blue">Available Reports</h3>
              <Badge variant="secondary">{filteredAvailableReports.length}</Badge>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={reportSearchTerm}
                onChange={(e) => setReportSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAvailableReports.map((report) => {
                const IconComponent = report.icon;
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => moveReportToSelected(report)}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-4 w-4 text-openkey-blue" />
                      <div>
                        <div className="font-medium text-sm">{report.name}</div>
                        <div className="text-xs text-muted-foreground">{report.description}</div>
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-openkey-blue" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Reports */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-openkey-blue">Selected Reports</h3>
              <Badge variant="secondary">{selectedReports.length}</Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedReports.map((report) => {
                const IconComponent = report.icon;
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-openkey-blue/5 border-openkey-blue/20"
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-4 w-4 text-openkey-blue" />
                      <div>
                        <div className="font-medium text-sm">{report.name}</div>
                        <div className="text-xs text-muted-foreground">{report.description}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReportFromSelected(report)}
                      className="h-8 w-8 p-0 hover:bg-red-100"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                );
              })}
              {selectedReports.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No reports selected. Choose from available reports on the left.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );

  const renderStep3 = () => (
    <CardEnhanced variant="elevated" className="p-6">
      <CardEnhancedHeader>
        <CardEnhancedTitle className="text-xl text-openkey-blue">Configure Individual Reports</CardEnhancedTitle>
        <p className="text-muted-foreground">Set specific parameters for each selected report</p>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="space-y-6">
          {selectedReports.map((report) => {
            const IconComponent = report.icon;
            const config = reportConfigs[report.id] || {};
            
            return (
              <div key={report.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-openkey-blue" />
                    <div>
                      <h4 className="font-semibold text-openkey-blue">{report.name}</h4>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReportConfig(report.id)}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs font-medium">Start Date</Label>
                    <Input
                      type="date"
                      value={config.startDate || ''}
                      onChange={(e) => updateReportConfig(report.id, 'startDate', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">End Date</Label>
                    <Input
                      type="date"
                      value={config.endDate || ''}
                      onChange={(e) => updateReportConfig(report.id, 'endDate', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Accounting Basis</Label>
                    <Select
                      value={config.accountingBasis || 'accrual'}
                      onValueChange={(value) => updateReportConfig(report.id, 'accountingBasis', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accrual">Accrual</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Interval</Label>
                    <Select
                      value={config.interval || 'monthly'}
                      onValueChange={(value) => updateReportConfig(report.id, 'interval', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
          {selectedReports.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No reports to configure. Go back and select reports first.
            </div>
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );

  const renderStep4 = () => (
    <CardEnhanced variant="elevated" className="p-6">
      <CardEnhancedHeader>
        <CardEnhancedTitle className="text-xl text-openkey-blue">Add Attachments (Optional)</CardEnhancedTitle>
        <p className="text-muted-foreground">Upload additional files to include with your reports</p>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-openkey-blue/50 transition-colors">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Files</h3>
            <p className="text-muted-foreground mb-4">Drag and drop files here, or click to browse</p>
            <div className="flex justify-center gap-4">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Select OpenKey Files
              </Button>
            </div>
          </div>

          {attachments.length > 0 && (
            <div>
              <h4 className="font-medium text-openkey-blue mb-3">Uploaded Files</h4>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-openkey-blue" />
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-muted-foreground">{file.size}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-100">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );

  const renderStep5 = () => (
    <CardEnhanced variant="elevated" className="p-6">
      <CardEnhancedHeader>
        <CardEnhancedTitle className="text-xl text-openkey-blue">Review & Generate</CardEnhancedTitle>
        <p className="text-muted-foreground">Review your selections and generate the bulk reports</p>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-openkey-blue">{selectedEntities.length}</div>
              <div className="text-sm text-muted-foreground">Properties Selected</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-openkey-blue">{selectedReports.length}</div>
              <div className="text-sm text-muted-foreground">Reports to Generate</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-openkey-blue">{attachments.length}</div>
              <div className="text-sm text-muted-foreground">Files Attached</div>
            </div>
          </div>

          {/* Selected Properties */}
          <div>
            <h4 className="font-medium text-openkey-blue mb-3">Selected Properties</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedEntities.map((entityId) => {
                const property = mockProperties.find(p => p.id === entityId);
                return property ? (
                  <div key={entityId} className="flex items-center gap-2 p-2 border rounded text-sm">
                    <Building className="h-4 w-4 text-openkey-blue" />
                    <span>{property.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Selected Reports */}
          <div>
            <h4 className="font-medium text-openkey-blue mb-3">Reports to Generate</h4>
            <div className="space-y-2">
              {selectedReports.map((report) => {
                const IconComponent = report.icon;
                const config = reportConfigs[report.id] || {};
                return (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-4 w-4 text-openkey-blue" />
                      <span className="font-medium">{report.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {config.startDate && config.endDate && (
                        <span>{config.startDate} to {config.endDate}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-6">
            <Button 
              size="lg"
              className="bg-openkey-blue hover:bg-openkey-blue/90 text-white px-12 py-3"
              onClick={() => {
                // Handle generation
                console.log('Generating bulk reports...');
              }}
            >
              <FileText className="h-5 w-5 mr-2" />
              Generate Reports
            </Button>
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );

  const renderRecentReports = () => (
    <Collapsible open={showRecentReports} onOpenChange={setShowRecentReports}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto border border-openkey-blue/20 hover:bg-openkey-blue/5 mb-4">
          <span className="font-semibold text-openkey-blue">Recent Bulk Reports</span>
          <Badge variant="secondary">{mockRecentReports.length}</Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mb-6">
        <div className="space-y-2">
          {mockRecentReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <FileText className="h-5 w-5 text-openkey-blue" />
                <div>
                  <div className="font-medium">{report.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Created {report.created} • {report.reports} reports • {report.entities} properties
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant={report.status === 'Ready' ? 'default' : 'secondary'}
                  className={report.status === 'Ready' ? 'bg-green-100 text-green-800' : ''}
                >
                  {report.status === 'Ready' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {report.status}
                </Badge>
                {report.status === 'Ready' && (
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
          disabled={currentStep === 5 || !canProceedToNext()}
          className="bg-openkey-blue hover:bg-openkey-blue/90 text-white"
        >
          {currentStep === 5 ? 'Finish' : 'Next'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Recent Reports Section */}
      {renderRecentReports()}
    </div>
  );
};

export default BulkReportWizard;