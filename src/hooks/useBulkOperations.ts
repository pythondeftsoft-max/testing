import { useState, useCallback } from 'react';
import type { ProcessingRowResult } from '@/types/propertyImport';
import { useImportStudio } from '@/stores/importStudioStore';
import { toast } from 'sonner';

interface BulkOperation {
  id: string;
  name: string;
  description: string;
  apply: (data: ProcessingRowResult[], indices: number[]) => ProcessingRowResult[];
  condition?: (row: ProcessingRowResult) => boolean;
}

const BULK_OPERATIONS: BulkOperation[] = [
  {
    id: 'format-zip-codes',
    name: 'Format ZIP Codes',
    description: 'Standardize ZIP code format (5 digits or 5+4)',
    apply: (data, indices) => {
      const newData = [...data];
      indices.forEach(index => {
        const row = newData[index];
        if (row.original_data?.zipcode) {
          const zip = row.original_data.zipcode.toString().replace(/\D/g, '');
          if (zip.length >= 5) {
            const formatted = zip.length > 5 ? `${zip.slice(0, 5)}-${zip.slice(5, 9)}` : zip.slice(0, 5);
            newData[index] = {
              ...row,
              original_data: { ...row.original_data, zipcode: formatted },
              processed_data: row.processed_data ? { 
                ...row.processed_data, 
                components: {
                  ...row.processed_data.components,
                  zipcode: formatted
                },
                full_address: row.processed_data.full_address?.replace(/\d{5}(-\d{4})?/, formatted)
              } : undefined
            };
          }
        }
      });
      return newData;
    },
    condition: (row) => {
      const zip = row.original_data?.zipcode?.toString();
      return zip ? !/^\d{5}(-\d{4})?$/.test(zip) : false;
    }
  },
  {
    id: 'normalize-states',
    name: 'Normalize State Abbreviations',
    description: 'Convert state names to standard 2-letter abbreviations',
    apply: (data, indices) => {
      const stateMap: Record<string, string> = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
        'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
        'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
        'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
        'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
        'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
        'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
        'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
      };

      const newData = [...data];
      indices.forEach(index => {
        const row = newData[index];
        if (row.original_data?.state) {
          const state = row.original_data.state.toString().toLowerCase().trim();
          const normalized = stateMap[state] || row.original_data.state;
          if (normalized !== row.original_data.state) {
            newData[index] = {
              ...row,
              original_data: { ...row.original_data, state: normalized },
              processed_data: row.processed_data ? { 
                ...row.processed_data, 
                components: {
                  ...row.processed_data.components,
                  state: normalized
                },
                full_address: row.processed_data.full_address?.replace(
                  new RegExp(row.original_data.state, 'gi'), 
                  normalized
                )
              } : undefined
            };
          }
        }
      });
      return newData;
    },
    condition: (row) => {
      const state = row.original_data?.state?.toString();
      return state ? state.length > 2 : false;
    }
  },
  {
    id: 'standardize-property-types',
    name: 'Standardize Property Types',
    description: 'Normalize property type values to standard categories',
    apply: (data, indices) => {
      const typeMap: Record<string, string> = {
        'single family': 'Single Family Home',
        'single-family': 'Single Family Home',
        'sfh': 'Single Family Home',
        'house': 'Single Family Home',
        'apartment': 'Apartment',
        'apt': 'Apartment',
        'condo': 'Condominium',
        'condominium': 'Condominium',
        'townhouse': 'Townhouse',
        'townhome': 'Townhouse',
        'duplex': 'Duplex',
        'triplex': 'Triplex',
        'fourplex': 'Fourplex',
        'mobile home': 'Mobile Home',
        'manufactured home': 'Mobile Home'
      };

      const newData = [...data];
      indices.forEach(index => {
        const row = newData[index];
        if (row.original_data?.property_type) {
          const type = row.original_data.property_type.toString().toLowerCase().trim();
          const normalized = typeMap[type] || row.original_data.property_type;
          newData[index] = {
            ...row,
            original_data: { ...row.original_data, property_type: normalized }
          };
        }
      });
      return newData;
    }
  },
  {
    id: 'fix-phone-numbers',
    name: 'Format Phone Numbers',
    description: 'Standardize phone number format to (XXX) XXX-XXXX',
    apply: (data, indices) => {
      const newData = [...data];
      indices.forEach(index => {
        const row = newData[index];
        // Skip phone formatting for now as contact_phone is not in the base schema
        // This would be implemented when contact fields are added to PropertyImportData
      });
      return newData;
    },
    condition: (row) => {
      // Always return false since contact_phone is not in the base schema
      return false;
    }
  }
];

export const useBulkOperations = (
  data: ProcessingRowResult[],
  onDataUpdate: (newData: ProcessingRowResult[]) => void
) => {
  const { selectedRowIds, clearSelection } = useImportStudio();
  const [changeHistory, setChangeHistory] = useState<ProcessingRowResult[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = useCallback((currentData: ProcessingRowResult[]) => {
    setChangeHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...currentData]);
      return newHistory.slice(-10); // Keep last 10 changes
    });
    setHistoryIndex(prev => Math.min(prev + 1, 9));
  }, [historyIndex]);

  const applyBulkOperation = useCallback((operationId: string, indices?: number[]) => {
    const operation = BULK_OPERATIONS.find(op => op.id === operationId);
    if (!operation) {
      toast.error('Operation not found');
      return;
    }

    const targetIndices = indices || Array.from(selectedRowIds);
    if (targetIndices.length === 0) {
      toast.warning('No rows selected for bulk operation');
      return;
    }

    // Save current state to history
    saveToHistory(data);

    // Apply operation
    const newData = operation.apply(data, targetIndices);
    
    // Count actual changes
    const changedCount = targetIndices.filter(index => {
      return JSON.stringify(data[index]) !== JSON.stringify(newData[index]);
    }).length;

    if (changedCount === 0) {
      toast.info('No changes were needed for the selected rows');
      return;
    }

    onDataUpdate(newData);
    clearSelection();
    toast.success(`${operation.name} applied to ${changedCount} rows`);
  }, [data, selectedRowIds, saveToHistory, onDataUpdate, clearSelection]);

  const getApplicableOperations = useCallback(() => {
    const selectedIndices = Array.from(selectedRowIds);
    if (selectedIndices.length === 0) return [];

    return BULK_OPERATIONS.filter(operation => {
      if (!operation.condition) return true;
      return selectedIndices.some(index => operation.condition!(data[index]));
    });
  }, [selectedRowIds, data]);

  const getOperationPreview = useCallback((operationId: string) => {
    const operation = BULK_OPERATIONS.find(op => op.id === operationId);
    if (!operation) return null;

    const selectedIndices = Array.from(selectedRowIds);
    if (selectedIndices.length === 0) return null;

    const previewData = operation.apply(data, selectedIndices);
    const changes = selectedIndices
      .map(index => ({
        index,
        before: data[index],
        after: previewData[index]
      }))
      .filter(change => JSON.stringify(change.before) !== JSON.stringify(change.after))
      .slice(0, 5); // Show first 5 changes

    return { changes, totalChanges: changes.length };
  }, [data, selectedRowIds]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousData = changeHistory[historyIndex - 1];
      onDataUpdate(previousData);
      setHistoryIndex(prev => prev - 1);
      toast.success('Changes undone');
    }
  }, [historyIndex, changeHistory, onDataUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < changeHistory.length - 1) {
      const nextData = changeHistory[historyIndex + 1];
      onDataUpdate(nextData);
      setHistoryIndex(prev => prev + 1);
      toast.success('Changes redone');
    }
  }, [historyIndex, changeHistory, onDataUpdate]);

  return {
    operations: BULK_OPERATIONS,
    applyBulkOperation,
    getApplicableOperations,
    getOperationPreview,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < changeHistory.length - 1
  };
};