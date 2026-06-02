import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useImportStudio } from '@/stores/importStudioStore';
import type { ProcessingRowResult } from '@/types/propertyImport';
import { EnhancedIssuesTab } from './inspector/EnhancedIssuesTab';
import { EnhancedMappingTab } from './inspector/EnhancedMappingTab';
import { EnhancedAITab } from './inspector/EnhancedAITab';

interface ProcessingInspectorProps {
  data: ProcessingRowResult[];
  selectedRowIndex?: number;
  onRowUpdate?: (index: number, updates: Partial<ProcessingRowResult>) => void;
}

export function ProcessingInspector({ data, selectedRowIndex, onRowUpdate }: ProcessingInspectorProps) {
  const { inspectorCollapsed, toggleInspector } = useImportStudio();
  
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
      // Update field mapping logic here
      console.log('Mapping field:', originalField, 'to:', targetField);
    }
  };

  const handleBulkMap = (mappings: Record<string, string>) => {
    if (selectedRowIndex !== undefined && onRowUpdate) {
      // Update bulk mapping logic here
      console.log('Bulk mapping:', mappings);
    }
  };

  const handleApplySuggestion = (field: string, value: string) => {
    handleFixIssue(field, value);
  };

  if (inspectorCollapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleInspector}
          className="rotate-90"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Inspector</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleInspector}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
        {selectedRow && (
          <div className="text-xs text-muted-foreground">
            Row {(selectedRowIndex || 0) + 1} of {data.length}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {!selectedRow ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4">
            Select a row to view details
          </div>
        ) : (
          <Tabs defaultValue="issues" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-4">
              <TabsTrigger value="issues" className="text-xs">Issues</TabsTrigger>
              <TabsTrigger value="mapping" className="text-xs">Mapping</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">AI</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="flex-1 p-4 space-y-4 overflow-y-auto">
              <EnhancedIssuesTab 
                row={selectedRow} 
                onFixIssue={handleFixIssue}
              />
            </TabsContent>

            <TabsContent value="mapping" className="flex-1 p-4 space-y-4 overflow-y-auto">
              <EnhancedMappingTab 
                row={selectedRow}
                onFieldMap={handleFieldMap}
                onBulkMap={handleBulkMap}
              />
            </TabsContent>

            <TabsContent value="ai" className="flex-1 p-4 space-y-4 overflow-y-auto">
              <EnhancedAITab 
                row={selectedRow}
                onApplySuggestion={handleApplySuggestion}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// Legacy tabs removed - functionality moved to enhanced components