
import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { processPropertyAddresses, submitPropertyImport } from '@/services/propertyImportApi';
import { PropertyImportData, AddressProcessingResult, ImportValidationError } from '@/types/propertyImport';
import { toast } from 'sonner';
import { PROPERTY_IMPORT_KEYS } from '@/lib/queryKeys';

interface ImportStep {
  step: 'upload' | 'field-mapping' | 'processing' | 'review' | 'submitting' | 'completed';
  progress: number;
}

export const usePropertyImport = () => {
  const [importStep, setImportStep] = useState<ImportStep>({ step: 'upload', progress: 0 });
  const [csvData, setCsvData] = useState<PropertyImportData[]>([]);
  const [importData, setImportData] = useState<PropertyImportData[]>([]);
  const [addressProcessingResult, setAddressProcessingResult] = useState<AddressProcessingResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<ImportValidationError[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  
  // Create refs for debugging state changes
  const stepRef = useRef(importStep);
  stepRef.current = importStep;
  
  // Add a ref to guard re-entry across renders
  const navigatingRef = useRef(false);
  
  const queryClient = useQueryClient();

  const validateImportData = (data: PropertyImportData[]): ImportValidationError[] => {
    const errors: ImportValidationError[] = [];
    
    console.log('Validating import data:', data.length, 'rows');
    
    data.forEach((row, index) => {
      console.log(`Validating row ${index + 1}:`, {
        street_address: row.street_address,
        city: row.city,
        state: row.state,
        zipcode: row.zipcode
      });
      
      // Required fields validation - more lenient
      if (!row.street_address || row.street_address.toString().trim() === '') {
        errors.push({
          row: index + 1,
          field: 'street_address',
          message: 'Street address is required',
          value: row.street_address
        });
      }
      
      if (!row.city || row.city.toString().trim() === '') {
        errors.push({
          row: index + 1,
          field: 'city',
          message: 'City is required',
          value: row.city
        });
      }
      
      if (!row.state || row.state.toString().trim() === '') {
        errors.push({
          row: index + 1,
          field: 'state',
          message: 'State is required',
          value: row.state
        });
      }
      
      if (!row.zipcode || row.zipcode.toString().trim() === '') {
        errors.push({
          row: index + 1,
          field: 'zipcode',
          message: 'Zipcode is required',
          value: row.zipcode
        });
      }

      // Numeric validation
      if (row.bedrooms && isNaN(Number(row.bedrooms))) {
        errors.push({
          row: index + 1,
          field: 'bedrooms',
          message: 'Bedrooms must be a number',
          value: row.bedrooms
        });
      }
      
      if (row.bathrooms && isNaN(Number(row.bathrooms))) {
        errors.push({
          row: index + 1,
          field: 'bathrooms',
          message: 'Bathrooms must be a number',
          value: row.bathrooms
        });
      }

      if (row.monthly_rent && isNaN(Number(row.monthly_rent))) {
        errors.push({
          row: index + 1,
          field: 'monthly_rent',
          message: 'Monthly rent must be a number',
          value: row.monthly_rent
        });
      }
    });
    
    return errors;
  };

  const processAddressesMutation = useMutation({
    mutationFn: (addresses: PropertyImportData[]) => processPropertyAddresses(addresses),
    onMutate: () => {
      console.log('processAddressesMutation starting...');
    },
    onSuccess: (result) => {
      console.log('processAddressesMutation success:', result);
      setAddressProcessingResult(result);
      // Stay on processing step - user will manually advance
      setImportStep({ step: 'processing', progress: 50 });
      toast.success(`Processed ${result.total_addresses} addresses into ${result.unique_properties} unique properties`);
    },
    onError: (error) => {
      console.error('Address processing error:', error);
      toast.error(`Failed to process addresses: ${error.message}`);
      setImportStep({ step: 'upload', progress: 0 });
    }
  });

  const submitImportMutation = useMutation({
    mutationFn: async () => {
      if (!addressProcessingResult) {
        throw new Error('No address processing result available');
      }
      
      const filename = `import-${new Date().toISOString().split('T')[0]}.csv`;
      return submitPropertyImport(importData, filename, addressProcessingResult.address_groups, portfolioId);
    },
    onSuccess: (result) => {
      setSessionId(result.session_id);
      setImportStep({ step: 'completed', progress: 100 });
      toast.success(`Import completed: ${result.successful_imports} properties imported successfully`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: PROPERTY_IMPORT_KEYS.sessions });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (error) => {
      console.error('Import submission error:', error);
      toast.error('Failed to submit import');
      setImportStep({ step: 'review', progress: 60 });
    }
  });

  const setCsvDataAndGoToProcessing = useCallback((data: PropertyImportData[]) => {
    console.log('🔥 setCsvDataAndGoToProcessing CALLED with:', {
      dataLength: data?.length || 0,
      firstRow: data?.[0],
      currentStep: stepRef.current.step,
      currentProgress: stepRef.current.progress,
      navigatingRef: navigatingRef.current
    });

    // validate input once; no toasts here (keep this pure)
    if (!data || data.length === 0) {
      console.log('❌ setCsvDataAndGoToProcessing: No data provided - returning false');
      return false;
    }

    // hard guard: if we already navigated (or are already on processing), bail
    if (navigatingRef.current) {
      console.log('❌ setCsvDataAndGoToProcessing: Already navigating - returning false');
      return false;
    }
    if (stepRef.current.step === 'processing') {
      console.log('❌ setCsvDataAndGoToProcessing: Already on processing step - returning false');
      return false;
    }

    console.log('✅ setCsvDataAndGoToProcessing: All guards passed - proceeding with navigation');
    navigatingRef.current = true;

    console.log('📊 Setting CSV data...');
    setCsvData(data);
    
    console.log('🚀 Updating import step to processing...');
    setImportStep(prev => {
      console.log('📈 setImportStep callback - prev step:', prev);
      if (prev.step === 'processing') {
        console.log('⚠️ Already on processing, keeping current step');
        return prev;
      }
      // keep progress monotonic
      const nextProgress = Math.max(prev.progress, 25);
      const nextStep = { step: 'processing' as const, progress: nextProgress };
      console.log('✅ Moving to processing step:', nextStep);
      return nextStep;
    });

    // Reset navigation guard after a short delay
    setTimeout(() => {
      console.log('🔓 Resetting navigation guard');
      navigatingRef.current = false;
    }, 100);

    console.log('✅ setCsvDataAndGoToProcessing: Successfully completed - returning true');
    return true;
  }, []);

  const startProcessing = () => {
    console.log('Starting processing with CSV data:', csvData.length, 'rows');
    
    // Validate data first
    const errors = validateImportData(csvData);
    console.log('Validation errors found:', errors);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      console.log('Blocking processing due to validation errors:', errors);
      toast.error(`Cannot start processing: Found ${errors.length} validation errors. Please fix them first.`);
      return;
    }

    console.log('Validation passed, setting import data and starting address processing');
    setImportData(csvData);
    setImportStep({ step: 'processing', progress: 50 });
    
    console.log('About to call processAddressesMutation.mutate');
    toast.success('Starting address processing...');
    
    // Process addresses
    processAddressesMutation.mutate(csvData);
  };

  const submitImport = () => {
    setImportStep({ step: 'submitting', progress: 80 });
    submitImportMutation.mutate();
  };

  const goToStep = (step: 'upload' | 'field-mapping' | 'processing' | 'review' | 'submitting' | 'completed') => {
    // Only allow navigation to completed steps or next step
    const currentIndex = ['upload', 'field-mapping', 'processing', 'review', 'submitting', 'completed'].indexOf(importStep.step);
    const targetIndex = ['upload', 'field-mapping', 'processing', 'review', 'submitting', 'completed'].indexOf(step);
    
    if (targetIndex <= currentIndex || (targetIndex === currentIndex + 1 && addressProcessingResult)) {
      setImportStep({ step, progress: targetIndex * 20 });
    }
  };

  const updateImportData = (newData: PropertyImportData[]) => {
    setImportData(newData);
  };

  const resetImport = () => {
    setImportStep({ step: 'upload', progress: 0 });
    setCsvData([]);
    setImportData([]);
    setAddressProcessingResult(null);
    setValidationErrors([]);
    setSessionId(null);
  };

  return {
    importStep,
    csvData,
    importData,
    addressProcessingResult,
    validationErrors,
    sessionId,
    portfolioId,
    setPortfolioId,
    setCsvDataAndGoToProcessing,
    startProcessing,
    submitImport,
    resetImport,
    goToStep,
    updateImportData,
    validateImportData,
    isProcessingAddresses: processAddressesMutation.isPending,
    isSubmittingImport: submitImportMutation.isPending,
    error: processAddressesMutation.error || submitImportMutation.error
  };
};
