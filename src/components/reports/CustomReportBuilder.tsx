import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Save, Play, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ReportField {
  id: string;
  name: string;
  table: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  category: string;
}

interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: string;
}

interface CustomReport {
  id?: string;
  name: string;
  description: string;
  fields: string[];
  filters: ReportFilter[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  groupBy: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  format: 'table' | 'chart' | 'export';
  created_at?: string;
}

interface DatabaseReport {
  id: string;
  name: string;
  description: string;
  config: {
    fields: string[];
    filters: ReportFilter[];
    dateRange: {
      start: string | null;
      end: string | null;
    };
    groupBy: string[];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    format: 'table' | 'chart' | 'export';
  };
  user_id: string;
  created_at: string;
  updated_at: string;
}

const CustomReportBuilder = ({ userId, portfolioId }: { userId: string; portfolioId?: string }) => {
  const [availableFields] = useState<ReportField[]>([
    // Property fields
    { id: 'properties.address', name: 'Property Address', table: 'properties', type: 'text', category: 'Property' },
    { id: 'properties.monthly_rent', name: 'Monthly Rent', table: 'properties', type: 'number', category: 'Property' },
    { id: 'properties.current_market_value', name: 'Market Value', table: 'properties', type: 'number', category: 'Property' },
    { id: 'properties.property_type', name: 'Property Type', table: 'properties', type: 'text', category: 'Property' },
    { id: 'properties.bedrooms', name: 'Bedrooms', table: 'properties', type: 'number', category: 'Property' },
    { id: 'properties.bathrooms', name: 'Bathrooms', table: 'properties', type: 'number', category: 'Property' },
    { id: 'properties.status', name: 'Status', table: 'properties', type: 'text', category: 'Property' },
    { id: 'properties.created_at', name: 'Date Added', table: 'properties', type: 'date', category: 'Property' },
    
    // Financial fields
    { id: 'rent_payments.amount', name: 'Payment Amount', table: 'rent_payments', type: 'number', category: 'Financial' },
    { id: 'rent_payments.payment_date', name: 'Payment Date', table: 'rent_payments', type: 'date', category: 'Financial' },
    { id: 'rent_payments.days_late', name: 'Days Late', table: 'rent_payments', type: 'number', category: 'Financial' },
    { id: 'rent_payments.late_fee_amount', name: 'Late Fee', table: 'rent_payments', type: 'number', category: 'Financial' },
    
    // Maintenance fields
    { id: 'maintenance_requests.title', name: 'Maintenance Title', table: 'maintenance_requests', type: 'text', category: 'Maintenance' },
    { id: 'maintenance_requests.priority', name: 'Priority', table: 'maintenance_requests', type: 'text', category: 'Maintenance' },
    { id: 'maintenance_requests.status', name: 'Maintenance Status', table: 'maintenance_requests', type: 'text', category: 'Maintenance' },
    { id: 'maintenance_requests.estimated_cost', name: 'Estimated Cost', table: 'maintenance_requests', type: 'number', category: 'Maintenance' },
    { id: 'maintenance_requests.created_at', name: 'Request Date', table: 'maintenance_requests', type: 'date', category: 'Maintenance' },
    
    // Tenant fields
    { id: 'profiles.first_name', name: 'Tenant First Name', table: 'profiles', type: 'text', category: 'Tenant' },
    { id: 'profiles.last_name', name: 'Tenant Last Name', table: 'profiles', type: 'text', category: 'Tenant' },
    { id: 'profiles.email', name: 'Tenant Email', table: 'profiles', type: 'text', category: 'Tenant' },
  ]);

  const [report, setReport] = useState<CustomReport>({
    name: '',
    description: '',
    fields: [],
    filters: [],
    dateRange: { start: null, end: null },
    groupBy: [],
    sortBy: '',
    sortOrder: 'asc',
    format: 'table'
  });

  const [savedReports, setSavedReports] = useState<CustomReport[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedReports();
  }, [userId]);

  const transformDatabaseToReport = (dbData: any): CustomReport => {
    try {
      const config = typeof dbData.config === 'string' ? JSON.parse(dbData.config) : dbData.config;
      return {
        id: dbData.id,
        name: dbData.name,
        description: dbData.description,
        fields: config.fields || [],
        filters: config.filters || [],
        dateRange: {
          start: config.dateRange?.start ? new Date(config.dateRange.start) : null,
          end: config.dateRange?.end ? new Date(config.dateRange.end) : null,
        },
        groupBy: config.groupBy || [],
        sortBy: config.sortBy || '',
        sortOrder: config.sortOrder || 'asc',
        format: config.format || 'table',
        created_at: dbData.created_at,
      };
    } catch (error) {
      console.error('Error transforming database report:', error);
      return {
        id: dbData.id,
        name: dbData.name || 'Untitled Report',
        description: dbData.description || '',
        fields: [],
        filters: [],
        dateRange: { start: null, end: null },
        groupBy: [],
        sortBy: '',
        sortOrder: 'asc',
        format: 'table',
        created_at: dbData.created_at,
      };
    }
  };

  const loadSavedReports = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedReports = (data || []).map(transformDatabaseToReport);
      setSavedReports(transformedReports);
    } catch (error) {
      console.error('Error loading saved reports:', error);
    }
  };

  const saveReport = async () => {
    if (!report.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report name",
        variant: "destructive",
      });
      return;
    }

    try {
      const configData = {
        fields: report.fields,
        filters: report.filters,
        dateRange: {
          start: report.dateRange.start?.toISOString() || null,
          end: report.dateRange.end?.toISOString() || null,
        },
        groupBy: report.groupBy,
        sortBy: report.sortBy,
        sortOrder: report.sortOrder,
        format: report.format
      };

      const { error } = await supabase
        .from('custom_reports')
        .insert({
          name: report.name,
          description: report.description,
          config: configData as any,
          user_id: userId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report saved successfully",
      });

      loadSavedReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report",
        variant: "destructive",
      });
    }
  };

  const runReport = async () => {
    if (report.fields.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one field",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      // For demonstration purposes, let's use the properties table
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(100);

      if (error) throw error;
      setReportData(data || []);
      
      toast({
        title: "Success",
        description: `Report generated with ${(data || []).length} records`,
      });
    } catch (error) {
      console.error('Error running report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const exportReport = () => {
    if (reportData.length === 0) {
      toast({
        title: "Error",
        description: "No data to export. Please run the report first.",
        variant: "destructive",
      });
      return;
    }

    const csv = convertToCSV(reportData, report.fields);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name || 'custom-report'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  const convertToCSV = (data: any[], fields: string[]) => {
    if (data.length === 0) return '';

    const headers = fields.map(field => {
      const fieldDef = availableFields.find(f => f.id === field);
      return fieldDef?.name || field;
    });

    const rows = data.map(item => {
      return fields.map(field => {
        const [table, column] = field.split('.');
        let value = item[column] || '';
        return typeof value === 'string' ? `"${value}"` : value;
      });
    });

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const addFilter = () => {
    setReport(prev => ({
      ...prev,
      filters: [...prev.filters, { field: '', operator: 'equals', value: '' }]
    }));
  };

  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    setReport(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    }));
  };

  const removeFilter = (index: number) => {
    setReport(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const fieldsByCategory = availableFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ReportField[]>);

  const loadSavedReport = (savedReport: CustomReport) => {
    setReport({
      name: savedReport.name,
      description: savedReport.description,
      fields: savedReport.fields,
      filters: savedReport.filters,
      dateRange: savedReport.dateRange,
      groupBy: savedReport.groupBy,
      sortBy: savedReport.sortBy,
      sortOrder: savedReport.sortOrder,
      format: savedReport.format
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Custom Report Builder
          </CardTitle>
          <CardDescription>
            Create custom reports by selecting fields, applying filters, and configuring output options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                value={report.name}
                onChange={(e) => setReport(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter report name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Input
                id="report-description"
                value={report.description}
                onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter report description"
              />
            </div>
          </div>

          {/* Field Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Fields</Label>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(fieldsByCategory).map(([category, fields]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {fields.map(field => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={report.fields.includes(field.id)}
                          onCheckedChange={(checked) => {
                            setReport(prev => ({
                              ...prev,
                              fields: checked 
                                ? [...prev.fields, field.id]
                                : prev.fields.filter(f => f !== field.id)
                            }));
                          }}
                        />
                        <Label htmlFor={field.id} className="text-sm">
                          {field.name}
                        </Label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Filters</Label>
              <Button onClick={addFilter} variant="outline" size="sm">
                Add Filter
              </Button>
            </div>
            
            {report.filters.map((filter, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-4 items-end">
                <div className="space-y-2">
                  <Label>Field</Label>
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(index, { field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(index, { operator: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Not Equals</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                      <SelectItem value="less_than">Less Than</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder="Enter value"
                  />
                </div>

                <Button 
                  onClick={() => removeFilter(index)} 
                  variant="outline" 
                  size="sm"
                  className="self-end"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Date Range</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {report.dateRange.start ? format(report.dateRange.start, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={report.dateRange.start || undefined}
                      onSelect={(date) => setReport(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, start: date || null } 
                      }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {report.dateRange.end ? format(report.dateRange.end, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={report.dateRange.end || undefined}
                      onSelect={(date) => setReport(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, end: date || null } 
                      }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={runReport} disabled={isRunning} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              {isRunning ? 'Running...' : 'Run Report'}
            </Button>
            <Button onClick={saveReport} variant="outline" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Report
            </Button>
            <Button onClick={exportReport} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Reports</CardTitle>
            <CardDescription>Load previously saved report configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {savedReports.map((savedReport) => (
                <div key={savedReport.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{savedReport.name}</h4>
                    <p className="text-sm text-muted-foreground">{savedReport.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Created: {savedReport.created_at ? new Date(savedReport.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSavedReport(savedReport)}
                  >
                    Load
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Results */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
            <CardDescription>{reportData.length} records found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    {report.fields.map(field => {
                      const fieldDef = availableFields.find(f => f.id === field);
                      return (
                        <th key={field} className="border border-gray-300 p-2 text-left">
                          {fieldDef?.name || field}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {reportData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      {report.fields.map(field => {
                        const [table, column] = field.split('.');
                        const value = row[column] || '';
                        return (
                          <td key={field} className="border border-gray-300 p-2">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 10 of {reportData.length} records. Export to see all data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomReportBuilder;