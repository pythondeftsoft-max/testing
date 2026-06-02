import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Cog, Eye, Loader2, CheckCircle, ArrowLeft, Brain } from 'lucide-react';
import { ImportProvider } from '@/components/property-import/ImportContext';
import { ImportUploadStep } from '@/components/property-import/ImportUploadStep';
import { FieldMappingStep } from '@/components/property-import/FieldMappingStep';
import ImportProcessingStep from '@/components/property-import/ImportProcessingStep';
import ImportReviewStep from '@/components/property-import/ImportReviewStep';
import ImportSubmittingStep from '@/components/property-import/ImportSubmittingStep';
import ImportCompletedStep from '@/components/property-import/ImportCompletedStep';
import { usePropertyImport } from '@/components/property-import/ImportContext';
import type { PropertyImportData } from '@/types/propertyImport';

function PropertyImportPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portfolioId = searchParams.get('portfolioId');
  
  const { 
    importStep, 
    importData, 
    addressProcessingResult, 
    validationErrors, 
    resetImport,
    submitImport,
    goToStep,
    setCsvDataAndGoToProcessing,
    setPortfolioId
  } = usePropertyImport();

  const [uploadedCsvData, setUploadedCsvData] = useState<PropertyImportData[] | null>(null);

  // Set portfolio ID when component mounts
  React.useEffect(() => {
    if (portfolioId && setPortfolioId) {
      setPortfolioId(portfolioId);
    }
  }, [portfolioId, setPortfolioId]);

  const handleBackToDashboard = () => {
    resetImport();
    navigate('/dashboard');
  };

  const handleUploadNext = (csvData: PropertyImportData[]) => {
    setUploadedCsvData(csvData);
    goToStep('field-mapping');
  };

  const handleMappingComplete = (mappedData: PropertyImportData[]) => {
    console.log('🔥 PropertyImportPage: handleMappingComplete called with', mappedData.length, 'rows');
    console.log('📊 First mapped row sample:', mappedData[0]);
    console.log('🚀 About to call setCsvDataAndGoToProcessing...');
    
    try {
      const result = setCsvDataAndGoToProcessing(mappedData);
      console.log('✅ setCsvDataAndGoToProcessing result:', result);
    } catch (error) {
      console.error('❌ Error in setCsvDataAndGoToProcessing:', error);
    }
  };

  const getStepIcon = () => {
    switch (importStep.step) {
      case 'upload':
        return <Upload className="h-6 w-6" />;
      case 'field-mapping':
        return <Brain className="h-6 w-6" />;
      case 'processing':
        return <Cog className="h-6 w-6" />;
      case 'review':
        return <Eye className="h-6 w-6" />;
      case 'submitting':
        return <Loader2 className="h-6 w-6 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6" />;
      default:
        return <Upload className="h-6 w-6" />;
    }
  };

  const getStepTitle = () => {
    switch (importStep.step) {
      case 'upload':
        return 'Upload Property Data';
      case 'field-mapping':
        return 'AI Field Mapping';
      case 'processing':
        return 'Processing Addresses';
      case 'review':
        return 'Review & Validate';
      case 'submitting':
        return 'Importing Properties';
      case 'completed':
        return 'Import Completed';
      default:
        return 'Property Import';
    }
  };

  const renderCurrentStep = () => {
    switch (importStep.step) {
      case 'upload':
        return <ImportUploadStep onNextStep={handleUploadNext} />;
      case 'field-mapping':
        return uploadedCsvData ? (
          <FieldMappingStep 
            csvData={uploadedCsvData}
            onMappingComplete={handleMappingComplete}
            onBack={() => goToStep('upload')}
          />
        ) : <ImportUploadStep onNextStep={handleUploadNext} />;
      case 'processing':
        return <ImportProcessingStep />;
      case 'review':
        return <ImportReviewStep />;
      case 'submitting':
        return <ImportSubmittingStep />;
      case 'completed':
        return <ImportCompletedStep />;
      default:
        return <ImportUploadStep onNextStep={handleUploadNext} />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBackToDashboard}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getStepIcon()}
            {getStepTitle()}
          </CardTitle>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${importStep.progress}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {renderCurrentStep()}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PropertyImportPage() {
  return (
    <ImportProvider>
      <PropertyImportPageContent />
    </ImportProvider>
  );
}