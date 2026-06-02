
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Home, Users, MapPin, ArrowRight, ArrowLeft, Edit, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { usePropertyImport } from './ImportContext';
import ImportDataTable from './ImportDataTable';
import AddressGroupsVisualization from './AddressGroupsVisualization';
import AIQualityOverview from './AIQualityOverview';
import SmartSuggestions from './SmartSuggestions';
import DuplicateManager from './DuplicateManager';

const ImportReviewStep = () => {
  const { 
    addressProcessingResult, 
    importData, 
    submitImport,
    validationErrors,
    goToStep,
    updateImportData
  } = usePropertyImport();

  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  if (!addressProcessingResult || !importData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available for review</p>
      </div>
    );
  }

  const handleSubmit = () => {
    submitImport();
  };

  const handleApplyBulkSuggestion = (suggestionType: string, rowIndices: number[]) => {
    // Apply AI suggestions based on type
    const updatedData = [...importData];
    
    rowIndices.forEach(index => {
      const row = updatedData[index];
      const aiResult = addressProcessingResult.row_results[index];
      
      if (suggestionType.includes('property_type') && aiResult?.processed_data?.ai_insights?.property_type_detection) {
        row.property_type = aiResult.processed_data.ai_insights.property_type_detection.detected_type;
      }
    });
    
    updateImportData(updatedData);
  };

  const handleMergeDuplicates = (groupKey: string, keepIndex: number, removeIndices: number[]) => {
    const updatedData = importData.filter((_, index) => !removeIndices.includes(index));
    updateImportData(updatedData);
  };

  const handleSeparateDuplicates = (groupKey: string, rowIndex: number) => {
    // Mark as separate in address groups (implementation would update the grouping)
    console.log('Separating duplicates for group:', groupKey, 'row:', rowIndex);
  };

  return (
    <div className="space-y-4">
      {/* Compact Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-xl font-bold">{addressProcessingResult.total_addresses}</span>
            <span className="text-xs text-muted-foreground">Addresses</span>
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-center gap-2">
            <Home className="h-4 w-4 text-green-600" />
            <span className="text-xl font-bold">{addressProcessingResult.unique_properties}</span>
            <span className="text-xs text-muted-foreground">Properties</span>
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-xl font-bold">
              {Object.values(addressProcessingResult.address_groups).reduce((sum, group) => sum + group.length, 0)}
            </span>
            <span className="text-xs text-muted-foreground">Units</span>
          </div>
        </Card>
      </div>

      {/* AI Quality Overview */}
      <AIQualityOverview addressProcessingResult={addressProcessingResult} />

      {/* Smart Suggestions */}
      <SmartSuggestions 
        addressProcessingResult={addressProcessingResult}
        importData={importData}
        onApplyBulkSuggestion={handleApplyBulkSuggestion}
      />

      {/* Duplicate Manager */}
      {addressProcessingResult.ai_summary?.total_duplicates_found > 0 && (
        <DuplicateManager
          addressProcessingResult={addressProcessingResult}
          importData={importData}
          onMergeDuplicates={handleMergeDuplicates}
          onSeparateDuplicates={handleSeparateDuplicates}
        />
      )}

      {/* Enhanced Data Review - Now the main focus */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Edit className="h-5 w-5" />
              Review & Edit Import Data
            </CardTitle>
            {/* Validation Status integrated into header */}
            {validationErrors.length > 0 ? (
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{validationErrors.length} Errors</Badge>
                <span className="text-xs text-muted-foreground">
                  Must be fixed before importing
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Ready to Import
                </Badge>
                <span className="text-xs text-green-600">All data validated</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Review all properties and units. Edit fields, bulk edit, or remove items as needed.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <ImportDataTable
            data={importData}
            onDataChange={updateImportData}
            addressGroups={addressProcessingResult.address_groups}
            validationErrors={validationErrors}
            addressProcessingResult={addressProcessingResult}
          />
        </CardContent>
      </Card>

      {/* Collapsible Analytics Section */}
      <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Import Analytics
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Property groupings overview
                  </span>
                  {analyticsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-4">
              <AddressGroupsVisualization 
                addressGroups={addressProcessingResult.address_groups}
                importData={importData}
              />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Compact Processing Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Import Process</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">1</div>
              <div>
                <p className="font-medium">Create Properties</p>
                <p className="text-xs text-muted-foreground">{addressProcessingResult.unique_properties} properties</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">2</div>
              <div>
                <p className="font-medium">Create Units</p>
                <p className="text-xs text-muted-foreground">Associate with properties</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">3</div>
              <div>
                <p className="font-medium">Set Availability</p>
                <p className="text-xs text-muted-foreground">Mark units as available</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between gap-3 pt-2">
        <Button 
          variant="outline"
          onClick={() => goToStep('processing')}
          size="lg"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Processing
        </Button>
        
        <Button 
          onClick={handleSubmit}
          disabled={validationErrors.length > 0}
          size="lg"
          className="gap-2"
        >
          Start Import
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ImportReviewStep;
