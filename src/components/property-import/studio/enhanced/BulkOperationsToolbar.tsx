import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Wand2, 
  Undo2, 
  Redo2, 
  Eye,
  CheckSquare,
  Settings
} from 'lucide-react';
import { useState } from 'react';
import { useImportStudio } from '@/stores/importStudioStore';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import type { ProcessingRowResult } from '@/types/propertyImport';

interface BulkOperationsToolbarProps {
  data: ProcessingRowResult[];
  onDataUpdate: (newData: ProcessingRowResult[]) => void;
  className?: string;
}

export function BulkOperationsToolbar({ 
  data, 
  onDataUpdate, 
  className 
}: BulkOperationsToolbarProps) {
  const { selectedRowIds, hasSelection, getSelectedCount } = useImportStudio();
  const [previewOperation, setPreviewOperation] = useState<string | null>(null);

  const {
    operations,
    applyBulkOperation,
    getApplicableOperations,
    getOperationPreview,
    undo,
    redo,
    canUndo,
    canRedo
  } = useBulkOperations(data, onDataUpdate);

  const applicableOperations = getApplicableOperations();
  const preview = previewOperation ? getOperationPreview(previewOperation) : null;

  const handleApplyWithPreview = (operationId: string) => {
    setPreviewOperation(null);
    applyBulkOperation(operationId);
  };

  if (!hasSelection()) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckSquare className="h-4 w-4" />
          Select rows to enable bulk operations
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <CheckSquare className="h-3 w-3" />
            {getSelectedCount()} selected
          </Badge>

          <Separator orientation="vertical" className="h-4" />

          {/* Bulk Operations Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Bulk Fix ({applicableOperations.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Available Operations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {applicableOperations.length === 0 ? (
                <DropdownMenuItem disabled>
                  No applicable operations for selection
                </DropdownMenuItem>
              ) : (
                applicableOperations.map((operation) => (
                  <DropdownMenuItem
                    key={operation.id}
                    onClick={() => setPreviewOperation(operation.id)}
                    className="flex-col items-start p-3"
                  >
                    <div className="font-medium">{operation.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {operation.description}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="gap-1"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="gap-1"
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewOperation} onOpenChange={() => setPreviewOperation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Bulk Operation
            </DialogTitle>
            <DialogDescription>
              {operations.find(op => op.id === previewOperation)?.description}
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {preview.totalChanges} changes will be made
                </Badge>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {preview.changes.map((change, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="font-medium text-sm">
                      Row {change.index + 1}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Before:</div>
                        <div className="font-mono text-xs bg-muted p-2 rounded">
                          {JSON.stringify(change.before.original_data, null, 1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">After:</div>
                        <div className="font-mono text-xs bg-green-50 p-2 rounded">
                          {JSON.stringify(change.after.original_data, null, 1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOperation(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => previewOperation && handleApplyWithPreview(previewOperation)}
              disabled={!preview || preview.totalChanges === 0}
            >
              Apply Changes ({preview?.totalChanges || 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}