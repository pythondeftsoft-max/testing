import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { EnhancedIssuesTab } from '../inspector/EnhancedIssuesTab';
import { EnhancedMappingTab } from '../inspector/EnhancedMappingTab';
import { EnhancedAITab } from '../inspector/EnhancedAITab';
import type { ProcessingRowResult } from '@/types/propertyImport';
import { useState } from 'react';

interface InspectorPopoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProcessingRowResult[];
  selectedRowIndex?: number;
  onRowUpdate?: (index: number, updates: Partial<ProcessingRowResult>) => void;
  onRowSelect?: (index: number) => void;
}

export function InspectorPopout({ 
  open, 
  onOpenChange, 
  data, 
  selectedRowIndex, 
  onRowUpdate,
  onRowSelect 
}: InspectorPopoutProps) {
  const [activeTab, setActiveTab] = useState('issues');
  const [showComparison, setShowComparison] = useState(false);
  
  const selectedRow = selectedRowIndex !== undefined ? data[selectedRowIndex] : null;

  const handleFixIssue = (field: string, value: string) => {
    if (selectedRowIndex !== undefined && onRowUpdate) {
      const updates: Partial<ProcessingRowResult> = {
        processed_data: {
          ...selectedRow?.processed_data,
          [field]: value
        }
      };
      onRowUpdate(selectedRowIndex, updates);
    }
  };

  const handleFieldMap = (originalField: string, targetField: string) => {
    if (selectedRowIndex !== undefined && onRowUpdate) {
      console.log('Mapping field:', originalField, 'to:', targetField);
    }
  };

  const handleBulkMap = (mappings: Record<string, string>) => {
    if (selectedRowIndex !== undefined && onRowUpdate) {
      console.log('Bulk mapping:', mappings);
    }
  };

  const handleApplySuggestion = (field: string, value: string) => {
    handleFixIssue(field, value);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!onRowSelect || selectedRowIndex === undefined) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedRowIndex - 1)
      : Math.min(data.length - 1, selectedRowIndex + 1);
    
    onRowSelect(newIndex);
  };

  const getRowStatus = (row: ProcessingRowResult) => {
    if (row.status === 'failed') return { label: 'Failed', variant: 'destructive' as const };
    if (row.status === 'warning') return { label: 'Warning', variant: 'secondary' as const };
    return { label: 'Success', variant: 'default' as const };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle>Row Inspector</DialogTitle>
              {selectedRow && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Row {(selectedRowIndex || 0) + 1} of {data.length}
                  </Badge>
                  <Badge {...getRowStatus(selectedRow)}>
                    {getRowStatus(selectedRow).label}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedRow && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowComparison(!showComparison)}
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Compare
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedRowIndex === 0}
                    onClick={() => handleNavigate('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedRowIndex === data.length - 1}
                    onClick={() => handleNavigate('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!selectedRow ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="text-lg font-medium text-muted-foreground">
                  No Row Selected
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select a row from the data grid to view detailed information, fix issues, and apply AI suggestions.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex">
              {/* Main Inspector Content */}
              <div className={`flex-1 ${showComparison ? 'w-1/2' : 'w-full'}`}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-3 mx-4">
                    <TabsTrigger value="issues">Issues & Fixes</TabsTrigger>
                    <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
                    <TabsTrigger value="ai">AI Insights</TabsTrigger>
                  </TabsList>

                  <TabsContent value="issues" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full p-4">
                      <EnhancedIssuesTab 
                        row={selectedRow} 
                        onFixIssue={handleFixIssue}
                      />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="mapping" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full p-4">
                      <EnhancedMappingTab 
                        row={selectedRow}
                        onFieldMap={handleFieldMap}
                        onBulkMap={handleBulkMap}
                      />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="ai" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full p-4">
                      <EnhancedAITab 
                        row={selectedRow}
                        onApplySuggestion={handleApplySuggestion}
                      />
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Before/After Comparison */}
              {showComparison && (
                <div className="w-1/2 border-l">
                  <div className="p-4 border-b">
                    <h3 className="font-medium">Before / After Comparison</h3>
                  </div>
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-6">
                      {/* Original Data */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Original Data</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {Object.entries(selectedRow.original_data || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-mono text-xs">{String(value) || 'N/A'}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Processed Data */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Processed Data</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {Object.entries(selectedRow.processed_data || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-mono text-xs">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value) || 'N/A'}
                              </span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Changes Made */}
                      {selectedRow.errors && selectedRow.errors.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Issues Detected</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {selectedRow.errors.map((error, index) => (
                                <div key={index} className="text-xs text-red-600 dark:text-red-400">
                                  • {error}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}