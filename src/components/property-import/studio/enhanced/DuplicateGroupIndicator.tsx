import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Users, Link, Unlink } from 'lucide-react';
import type { DuplicateSet } from '@/types/propertyImport';
import { cn } from '@/lib/utils';

interface DuplicateGroupIndicatorProps {
  duplicateGroup?: DuplicateSet;
  groupId?: string;
  confidence?: number;
  onSeparate?: (groupId: string, rowIndex: number) => void;
  onMerge?: (groupId: string, keepIndex: number, removeIndices: number[]) => void;
  rowIndex: number;
  className?: string;
}

export function DuplicateGroupIndicator({
  duplicateGroup,
  groupId,
  confidence = 0,
  onSeparate,
  onMerge,
  rowIndex,
  className
}: DuplicateGroupIndicatorProps) {
  if (!duplicateGroup && !groupId) {
    return null;
  }

  const groupSize = duplicateGroup?.member_indices?.length || 1;
  const groupConfidence = duplicateGroup?.confidence || confidence;
  
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 border-red-200 bg-red-50';
    if (score >= 0.6) return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    return 'text-blue-600 border-blue-200 bg-blue-50';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const getDuplicateDisplayText = (size: number, confidence: number) => {
    // With our improved logic, high confidence duplicates are true duplicates
    if (confidence >= 0.9) {
      return size > 1 ? `${size} duplicates` : 'Duplicate';
    }
    // Lower confidence might be multi-unit or uncertain
    return size > 1 ? `${size} similar` : 'Similar';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "cursor-pointer hover:bg-muted/50 gap-1 text-xs",
              getConfidenceColor(groupConfidence),
              className
            )}
          >
            <Users className="h-3 w-3" />
            {getDuplicateDisplayText(groupSize, groupConfidence)}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Duplicate Group</h4>
            <Badge variant="secondary" className="text-xs">
              {getConfidenceLabel(groupConfidence)} ({Math.round(groupConfidence * 100)}%)
            </Badge>
          </div>
          
          {duplicateGroup && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Group ID:</strong> {duplicateGroup.group_id}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Rows:</strong> {duplicateGroup.member_indices.map(idx => idx + 1).join(', ')}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Reason:</strong> {duplicateGroup.reasoning}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-2 border-t">
            {onSeparate && groupId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSeparate(groupId, rowIndex)}
                className="flex-1 gap-1"
              >
                <Unlink className="h-3 w-3" />
                Separate
              </Button>
            )}
            {onMerge && groupId && duplicateGroup && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const otherIndices = duplicateGroup.member_indices.filter(idx => idx !== rowIndex);
                  onMerge(groupId, rowIndex, otherIndices);
                }}
                className="flex-1 gap-1"
              >
                <Link className="h-3 w-3" />
                Merge
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}