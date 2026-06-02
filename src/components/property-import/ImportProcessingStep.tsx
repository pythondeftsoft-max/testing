import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Home, ArrowLeft, ArrowRight, Play, AlertCircle, Eye, Search, CheckCircle, Target, AlertTriangle } from 'lucide-react';
import { PipelinePopout } from './studio/popouts/PipelinePopout';
import { DataGridPopout } from './studio/popouts/DataGridPopout';
import { InspectorPopout } from './studio/popouts/InspectorPopout';
import { QualityMetricsPopout } from './studio/popouts/QualityMetricsPopout';
import { usePropertyImport } from './ImportContext';
import ImportValidationErrors from './ImportValidationErrors';
import ProcessingResultsTable from './ProcessingResultsTable';
import ProcessingErrorSummary from './ProcessingErrorSummary';
import ProcessingActions from './ProcessingActions';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ProcessingPipelineRail } from './studio/ProcessingPipelineRail';
import { ProcessingDataGrid } from './studio/ProcessingDataGrid';
import { ProcessingInspector } from './studio/ProcessingInspector';
import { ProcessingActionBar } from './studio/ProcessingActionBar';
import { useImportStudio } from '@/stores/importStudioStore';
import { useSelectiveReprocessing } from '@/hooks/useSelectiveReprocessing';
import { useQualityMonitoring } from '@/hooks/useQualityMonitoring';
import type { ProcessingRowResult } from '@/types/propertyImport';

const ImportProcessingStep = () => {
  const { 
    csvData, 
    addressProcessingResult, 
    validationErrors,
    startProcessing,
    goToStep, 
    isProcessingAddresses,
    updateImportData
  } = usePropertyImport();

  const isComplete = addressProcessingResult && !isProcessingAddresses;
  const hasStartedProcessing = addressProcessingResult || isProcessingAddresses;
  const hasDetailedResults = addressProcessingResult?.row_results && addressProcessingResult.row_results.length > 0;

  const handleUpdateRow = (rowNumber: number, updatedData: any) => {
    // Update the row in the CSV data
    const updatedCsvData = csvData.map((row, index) => 
      index + 1 === rowNumber ? updatedData : row
    );
    updateImportData(updatedCsvData);
  };

  const handleReprocessRow = (rowNumber: number) => {
    // For now, just trigger a full reprocess
    // In a real implementation, you might want to process just this row
    startProcessing();
  };

  const handleReprocessAll = () => {
    startProcessing();
  };

  // If we have detailed results, show the new Import Studio
  if (hasDetailedResults && !isProcessingAddresses) {
    return (
      <ImportStudioInterface
        data={addressProcessingResult?.row_results || []}
        onReprocessSelected={handleReprocessAll}
        onReprocessFailed={handleReprocessAll}
        onContinue={() => goToStep('review')}
        onGoToUpload={() => goToStep('upload')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!hasStartedProcessing ? (
        <>
          {/* Data Review Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Review Your Data
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {csvData.length} rows ready for processing. Review the data below and click "Start Processing" when ready.
              </p>
            </CardHeader>
            <CardContent>
              {/* CSV Data Preview */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Data Preview (First 5 rows)</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border-r p-3 text-left font-medium">Row</th>
                        <th className="border-r p-3 text-left font-medium">Street Address</th>
                        <th className="border-r p-3 text-left font-medium">City</th>
                        <th className="border-r p-3 text-left font-medium">State</th>
                        <th className="border-r p-3 text-left font-medium">Zipcode</th>
                        <th className="border-r p-3 text-left font-medium">Bedrooms</th>
                        <th className="p-3 text-left font-medium">Bathrooms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="border-r p-3 font-mono text-xs">{index + 1}</td>
                          <td className="border-r p-3">{row.street_address}</td>
                          <td className="border-r p-3">{row.city}</td>
                          <td className="border-r p-3">{row.state}</td>
                          <td className="border-r p-3">{row.zipcode}</td>
                          <td className="border-r p-3">{row.bedrooms || '-'}</td>
                          <td className="p-3">{row.bathrooms || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvData.length > 5 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ... and {csvData.length - 5} more rows
                  </p>
                )}
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <h4 className="font-medium text-red-700 dark:text-red-400">
                      Validation Errors Found
                    </h4>
                  </div>
                  <ImportValidationErrors errors={validationErrors} />
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Please fix all validation errors before processing can begin.
                    </p>
                  </div>
                </div>
              )}

              {/* Processing Button */}
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => goToStep('upload')}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Upload
                </Button>
                
                <Button 
                  onClick={startProcessing}
                  disabled={validationErrors.length > 0}
                  className="gap-2 flex-1"
                  size="lg"
                >
                  <Play className="h-4 w-4" />
                  Start Processing
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Processing Status */}
          <div className="text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className={`p-4 rounded-full ${isComplete ? 'bg-green-100 dark:bg-green-950/20' : 'bg-primary/10'}`}>
                  {isComplete ? (
                    <Home className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {isComplete ? 'Processing Complete!' : 'Processing Addresses'}
                </h3>
                <p className="text-muted-foreground">
                  {isComplete 
                    ? 'Your property addresses have been successfully processed and grouped.'
                    : 'We\'re analyzing and normalizing your property addresses to group units and detect duplicates.'
                  }
                </p>
              </div>
            </div>
          </div>

      {/* Progress Information */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 inline-flex mb-3">
                <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium mb-1">Address Validation</h4>
              <p className="text-sm text-muted-foreground">
                Standardizing and validating property addresses
              </p>
            </div>
            
            <div className="text-center">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 inline-flex mb-3">
                <Home className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-medium mb-1">Property Grouping</h4>
              <p className="text-sm text-muted-foreground">
                Identifying unique properties and grouping units
              </p>
            </div>
            
            <div className="text-center">
              <div className={`p-3 rounded-lg ${isComplete ? 'bg-green-50 dark:bg-green-950/20' : 'bg-purple-50 dark:bg-purple-950/20'} inline-flex mb-3`}>
                {isComplete ? (
                  <Home className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <Loader2 className="h-6 w-6 text-purple-600 dark:text-purple-400 animate-spin" />
                )}
              </div>
              <h4 className="font-medium mb-1">
                {isComplete ? 'Ready for Review' : 'Data Processing'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {isComplete ? 'Data is ready for your review' : 'Preparing data for final review'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Results */}
      {hasDetailedResults && (
        <div className="space-y-6">
          {/* Error Summary */}
          <ProcessingErrorSummary 
            results={addressProcessingResult.row_results} 
            aiSummary={addressProcessingResult.ai_summary}
          />
          
          {/* Detailed Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Processing Results
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and edit any failed records below. All errors must be resolved before continuing.
              </p>
            </CardHeader>
            <CardContent>
              <ProcessingResultsTable 
                results={addressProcessingResult.row_results}
                onUpdateRow={handleUpdateRow}
                onReprocessRow={handleReprocessRow}
              />
            </CardContent>
          </Card>

          {/* Processing Actions */}
          <ProcessingActions 
            results={addressProcessingResult.row_results}
            onReprocessAll={handleReprocessAll}
            onGoToStep={goToStep}
            isReprocessing={isProcessingAddresses}
          />
        </div>
      )}

      {/* Legacy Processing Stats (fallback for old API responses) */}
      {addressProcessingResult && !hasDetailedResults && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {addressProcessingResult.total_addresses}
                </div>
                <div className="text-sm text-muted-foreground">Total Addresses</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {addressProcessingResult.unique_properties}
                </div>
                <div className="text-sm text-muted-foreground">Unique Properties</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isComplete && (
        <div className="text-sm text-muted-foreground">
          This process typically takes 30-60 seconds depending on the number of addresses.
        </div>
      )}

      {isComplete && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
            ✓ Processing completed successfully! Click "Continue to Review" to see your data.
          </p>
        </div>
      )}

          {/* Legacy Navigation (for old API responses without detailed results) */}
          {addressProcessingResult && !isProcessingAddresses && !hasDetailedResults && (
            <div className="flex justify-between gap-3 mt-6">
              <Button 
                variant="outline"
                onClick={() => goToStep('upload')}
                size="lg"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Upload
              </Button>
              
              <Button 
                onClick={() => goToStep('review')}
                size="lg"
                className="gap-2"
              >
                Continue to Review
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function ImportStudioInterface({ 
  data, 
  onReprocessSelected, 
  onReprocessFailed, 
  onContinue, 
  onGoToUpload 
}: {
  data: ProcessingRowResult[];
  onReprocessSelected: () => void;
  onReprocessFailed: () => void;
  onContinue: () => void;
  onGoToUpload: () => void;
}) {
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | undefined>();
  const [localData, setLocalData] = useState<ProcessingRowResult[]>(data);
  const { updateStageMetrics, sessionId, popouts, setPopoutOpen } = useImportStudio();
  
  // Initialize selective reprocessing and quality monitoring
  const { reprocessSelected, reprocessFailed, isReprocessing } = useSelectiveReprocessing({
    data: localData,
    sessionId,
    onSuccess: (result, mergedData) => {
      setLocalData(mergedData);
    }
  });
  
  const qualityMetrics = useQualityMonitoring(localData);

  // Update local data when prop changes
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Update stage metrics when data changes
  useEffect(() => {
    const currentData = localData.length > 0 ? localData : data;
    const metrics = {
      'field-mapping': { total: currentData.length, completed: currentData.length, issues: 0 },
      'address-validation': { 
        total: currentData.length, 
        completed: currentData.filter(r => r.processed_data?.full_address).length,
        issues: currentData.filter(r => r.status === 'failed' && r.errors?.some(e => e.includes('address'))).length
      },
      'duplicate-detection': { 
        total: currentData.length, 
        completed: currentData.length,
        issues: 0 // Will be properly implemented when duplicate detection is available
      },
      'quality-assessment': { 
        total: currentData.length, 
        completed: currentData.filter(r => r.processed_data?.ai_insights?.data_quality_assessment).length,
        issues: currentData.filter(r => r.status === 'warning' || r.status === 'failed').length
      },
      'ai-insights': { 
        total: currentData.length, 
        completed: currentData.filter(r => r.processed_data?.ai_insights).length,
        issues: currentData.filter(r => r.processed_data?.ai_insights?.data_quality_assessment?.suggestions?.length > 0).length
      },
    };
    updateStageMetrics(metrics);
  }, [localData, data, updateStageMetrics]);

  // Handle data updates from operations
  const handleDataUpdate = (newData: ProcessingRowResult[]) => {
    setLocalData(newData);
  };

  // Handle row updates from inspector
  const handleRowUpdate = (index: number, updates: Partial<ProcessingRowResult>) => {
    const newData = [...localData];
    newData[index] = { ...newData[index], ...updates };
    setLocalData(newData);
  };

  // Handle duplicate resolution
  const handleDuplicateResolve = (groupId: string, action: 'merge' | 'separate', rowIndex?: number) => {
    // Implement duplicate resolution logic
    console.log('Resolving duplicate:', { groupId, action, rowIndex });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div>
          <h1 className="text-2xl font-bold">Import Studio</h1>
          <p className="text-muted-foreground">Review and refine your property data</p>
        </div>
        <Button variant="outline" onClick={onGoToUpload}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Upload
        </Button>
      </div>

      {/* Compact Overview - Clickable Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPopoutOpen('pipeline', true)}>
          <CardContent className="p-4 text-center">
            <Search className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="font-medium">Pipeline</div>
            <div className="text-xs text-muted-foreground">View Processing Stages</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPopoutOpen('dataGrid', true)}>
          <CardContent className="p-4 text-center">
            <Home className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="font-medium">Data Grid</div>
            <div className="text-xs text-muted-foreground">{data.length} Records</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPopoutOpen('inspector', true)}>
          <CardContent className="p-4 text-center">
            <Eye className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="font-medium">Inspector</div>
            <div className="text-xs text-muted-foreground">Row Details</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPopoutOpen('qualityMetrics', true)}>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="font-medium">Quality</div>
            <div className="text-xs text-muted-foreground">Metrics & Analytics</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <ProcessingActionBar 
        data={localData}
        onReprocessSelected={reprocessSelected}
        onReprocessFailed={reprocessFailed}
        onContinue={onContinue}
        isProcessing={isReprocessing}
      />

      {/* Main Data Grid */}
      <div className="flex-1 min-h-0 p-4">
        <div className="h-full">
          <ProcessingDataGrid 
            data={localData} 
            onRowSelect={setSelectedRowIndex}
            onDataUpdate={handleDataUpdate}
            onDuplicateResolve={handleDuplicateResolve}
          />
        </div>
      </div>

      {/* Popout Dialogs */}
      <PipelinePopout open={popouts.pipeline} onOpenChange={(open) => setPopoutOpen('pipeline', open)} />
      <DataGridPopout open={popouts.dataGrid} onOpenChange={(open) => setPopoutOpen('dataGrid', open)} data={localData} onRowSelect={setSelectedRowIndex} onDataUpdate={handleDataUpdate} onDuplicateResolve={handleDuplicateResolve} />
      <InspectorPopout open={popouts.inspector} onOpenChange={(open) => setPopoutOpen('inspector', open)} data={localData} selectedRowIndex={selectedRowIndex} onRowUpdate={handleRowUpdate} onRowSelect={setSelectedRowIndex} />
      <QualityMetricsPopout open={popouts.qualityMetrics} onOpenChange={(open) => setPopoutOpen('qualityMetrics', open)} data={localData} />
    </div>
  );
}

export default ImportProcessingStep;