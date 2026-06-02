import { useMutation } from '@tanstack/react-query';
import { processPropertyAddresses } from '@/services/propertyImportApi';
import type { PropertyImportData, ProcessingRowResult, AddressProcessingResult } from '@/types/propertyImport';
import { toast } from 'sonner';
import { useImportStudio } from '@/stores/importStudioStore';

interface SelectiveReprocessingOptions {
  data: ProcessingRowResult[];
  sessionId?: string;
  onSuccess?: (result: AddressProcessingResult, mergedData: ProcessingRowResult[]) => void;
}

export const useSelectiveReprocessing = ({ data, sessionId, onSuccess }: SelectiveReprocessingOptions) => {
  const { selectedRowIds, clearSelection } = useImportStudio();

  const mergeResults = (
    originalData: ProcessingRowResult[],
    newResults: ProcessingRowResult[],
    processedIndices: number[]
  ): ProcessingRowResult[] => {
    const mergedData = [...originalData];
    
    // Map new results back to original indices
    newResults.forEach((newResult, resultIndex) => {
      const originalIndex = processedIndices[resultIndex];
      if (originalIndex !== undefined && originalIndex < mergedData.length) {
        mergedData[originalIndex] = {
          ...newResult,
          // Preserve original index information
          original_index: originalIndex,
        };
      }
    });
    
    return mergedData;
  };

  const selectiveReprocessMutation = useMutation({
    mutationFn: async (indices: number[]) => {
      // Extract original data for selected indices
      const selectedData: PropertyImportData[] = indices.map(index => {
        const row = data[index];
        return row.original_data;
      }).filter(Boolean);

      if (selectedData.length === 0) {
        throw new Error('No valid data found for selected rows');
      }

      // Call API v2 with selective indices
      const result = await processPropertyAddresses(selectedData, {
        version: 2,
        sessionId,
        indices
      });

      return { result, indices };
    },
    onSuccess: ({ result, indices }) => {
      // Merge results back into original data using row_results
      const mergedData = mergeResults(data, result.row_results || [], indices);
      
      // Clear selection
      clearSelection();
      
      toast.success(`Reprocessed ${indices.length} rows successfully`);
      
      // Call success callback with merged data
      onSuccess?.(result, mergedData);
    },
    onError: (error) => {
      console.error('Selective reprocessing error:', error);
      toast.error(`Failed to reprocess selected rows: ${error.message}`);
    }
  });

  const reprocessSelected = () => {
    const indices = Array.from(selectedRowIds);
    if (indices.length === 0) {
      toast.warning('No rows selected for reprocessing');
      return;
    }

    selectiveReprocessMutation.mutate(indices);
  };

  const reprocessFailed = () => {
    const failedIndices = data
      .map((row, index) => row.status === 'failed' ? index : -1)
      .filter(index => index !== -1);

    if (failedIndices.length === 0) {
      toast.warning('No failed rows found to reprocess');
      return;
    }

    selectiveReprocessMutation.mutate(failedIndices);
  };

  const reprocessByCondition = (condition: (row: ProcessingRowResult) => boolean) => {
    const indices = data
      .map((row, index) => condition(row) ? index : -1)
      .filter(index => index !== -1);

    if (indices.length === 0) {
      toast.warning('No rows match the reprocessing condition');
      return;
    }

    selectiveReprocessMutation.mutate(indices);
  };

  return {
    reprocessSelected,
    reprocessFailed,
    reprocessByCondition,
    isReprocessing: selectiveReprocessMutation.isPending,
    reprocessingError: selectiveReprocessMutation.error,
  };
};