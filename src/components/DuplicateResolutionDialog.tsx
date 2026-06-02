
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Home, Building } from 'lucide-react';
import { DuplicateCheckResult } from '@/utils/duplicateDetection';

interface DuplicateResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateResult: DuplicateCheckResult;
  onProceedAnyway: () => void;
  onCancel: () => void;
  actionType: 'add' | 'edit' | 'import';
}

export function DuplicateResolutionDialog({
  open,
  onOpenChange,
  duplicateResult,
  onProceedAnyway,
  onCancel,
  actionType
}: DuplicateResolutionDialogProps) {
  const isSingleFamily = duplicateResult.duplicateType === 'single_family';
  const existingCount = isSingleFamily 
    ? duplicateResult.existingProperties?.length || 0
    : duplicateResult.existingUnits?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <DialogTitle>Duplicate Property Detected</DialogTitle>
          </div>
          <DialogDescription>
            {isSingleFamily ? (
              <>
                A property with this address already exists in your portfolio. 
                Adding duplicate single-family properties is not recommended.
              </>
            ) : (
              <>
                A unit with this number already exists in this property. 
                Each unit must have a unique number.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              {isSingleFamily ? (
                <>
                  <Home className="h-4 w-4" />
                  Existing Properties ({existingCount})
                </>
              ) : (
                <>
                  <Building className="h-4 w-4" />
                  Existing Units ({existingCount})
                </>
              )}
            </h4>
            
            <div className="space-y-2">
              {isSingleFamily ? (
                duplicateResult.existingProperties?.map(prop => (
                  <div key={prop.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{prop.address}</span>
                    <Badge variant="secondary" className="text-xs">
                      {prop.property_type}
                    </Badge>
                  </div>
                ))
              ) : (
                duplicateResult.existingUnits?.map(unit => (
                  <div key={unit.id} className="flex items-center justify-between text-sm">
                    <span>Unit {unit.unit_number}</span>
                    <Badge variant="secondary" className="text-xs">
                      Existing
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            {/* Block "Proceed Anyway" for all duplicate cases */}
          </div>

          {/* Updated messaging for all cases */}
          <p className="text-xs text-muted-foreground text-center">
            Duplicate properties are not allowed. Please review your data or choose a different address.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
