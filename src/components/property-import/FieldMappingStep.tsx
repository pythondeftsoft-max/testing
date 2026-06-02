import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePropertyImport } from './ImportContext';
import type { PropertyImportData } from '@/types/propertyImport';

interface FieldMapping {
  csvHeader: string;
  mappedField: string;
  confidence: number;
  reasoning: string;
}

interface MappingResponse {
  mappings: FieldMapping[];
  unmappedFields: string[];
  suggestions: string[];
}

interface FieldMappingStepProps {
  csvData: PropertyImportData[];
  onMappingComplete: (mappedData: PropertyImportData[]) => void;
  onBack: () => void;
}

const standardFields = [
  { value: 'street_address', label: 'Street Address', required: true },
  { value: 'city', label: 'City', required: true },
  { value: 'state', label: 'State', required: true },
  { value: 'zipcode', label: 'Zip Code', required: true },
  { value: 'property_type', label: 'Property Type', required: false },
  { value: 'property_name', label: 'Property Name', required: false },
  { value: 'unit_number', label: 'Unit Number', required: false },
  { value: 'unit_type', label: 'Unit Type', required: false },
  { value: 'bedrooms', label: 'Bedrooms', required: false },
  { value: 'bathrooms', label: 'Bathrooms', required: false },
  { value: 'square_feet', label: 'Square Feet', required: false },
  { value: 'monthly_rent', label: 'Monthly Rent', required: false },
  { value: 'deposit_amount', label: 'Deposit Amount', required: false },
  { value: 'pet_friendly', label: 'Pet Friendly', required: false },
  { value: 'parking_spots', label: 'Parking Spots', required: false },
  { value: 'amenities', label: 'Amenities', required: false },
  { value: 'unit_amenities', label: 'Unit Amenities', required: false },
  { value: 'lease_terms', label: 'Lease Terms', required: false },
  { value: 'availability_date', label: 'Availability Date', required: false },
  { value: 'notes', label: 'Notes', required: false },
];

export function FieldMappingStep({ csvData, onMappingComplete, onBack }: FieldMappingStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing CSV headers...');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [aiSuggestions, setAiSuggestions] = useState<MappingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [aiSkipped, setAiSkipped] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const csvHeaders = csvData.length > 0 ? Object.keys(csvData[0]) : [];

  // COMPREHENSIVE DEBUGGING - Track component lifecycle
  console.log('🔍 FieldMappingStep MOUNTED/RENDERED with:', {
    csvDataLength: csvData.length,
    csvHeaders,
    isLoading,
    loadingMessage,
    mappings,
    aiSuggestions,
    error,
    showManualMapping,
    aiSkipped
  });

  useEffect(() => {
    console.log('🚀 useEffect triggered - starting field mapping analysis');
    console.log('📊 CSV Headers analysis:', { csvHeaders, length: csvHeaders.length });
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.warn('⏰ SAFETY TIMEOUT: 5 seconds elapsed, forcing manual mapping');
      setIsLoading(false);
      setShowManualMapping(true);
      setError('Analysis timed out. Please map fields manually.');
    }, 5000);
    
    try {
      // Check if headers are already standard - skip AI if so
      const hasStandardHeaders = csvHeaders.some(header => 
        standardFields.some(field => 
          field.value === header.toLowerCase().replace(/\s+/g, '_')
        )
      );

      console.log('🔍 Standard headers check:', { 
        hasStandardHeaders, 
        headerCount: csvHeaders.length,
        willUseFastPath: hasStandardHeaders && csvHeaders.length <= 10 
      });

      if (hasStandardHeaders && csvHeaders.length <= 10) {
        console.log('✅ Taking FAST PATH - applying direct mapping');
        clearTimeout(safetyTimeout);
        applyDirectMapping();
      } else {
        console.log('🤖 Taking AI PATH - generating AI mappings');
        clearTimeout(safetyTimeout);
        generateAIMappings();
      }
    } catch (err) {
      console.error('❌ Error in useEffect:', err);
      clearTimeout(safetyTimeout);
      setIsLoading(false);
      setShowManualMapping(true);
      setError('Error analyzing headers. Please map fields manually.');
    }
  }, []);

  const applyDirectMapping = () => {
    console.log('🎯 applyDirectMapping STARTED');
    setLoadingMessage('Smart mapping detected...');
    const initialMappings: Record<string, string> = {};
    
    console.log('🔄 Processing each CSV header for direct mapping:');
    csvHeaders.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
      const matchingField = standardFields.find(field => 
        field.value === normalizedHeader || 
        field.label.toLowerCase().replace(/\s+/g, '_') === normalizedHeader
      );
      
      console.log(`  📝 Header "${header}" -> normalized "${normalizedHeader}" -> matched field:`, matchingField?.value || 'NONE');
      
      if (matchingField) {
        initialMappings[header] = matchingField.value;
      }
    });
    
    console.log('✅ Direct mapping completed. Final mappings:', initialMappings);
    setMappings(initialMappings);
    console.log('⚡ Setting isLoading=false and aiSkipped=true');
    setIsLoading(false);
    setAiSkipped(true);
    console.log('🎯 applyDirectMapping FINISHED');
  };

  const generateAIMappings = async () => {
    console.log('🤖 generateAIMappings STARTED');
    
    const timeoutId = setTimeout(() => {
      console.log('⏰ 10 second timeout hit - updating loading message');
      setLoadingMessage('AI service is taking longer than expected...');
    }, 10000);

    const errorTimeoutId = setTimeout(() => {
      console.warn('⏰ AI field mapping timed out after 30 seconds');
      setError('AI mapping timed out. Falling back to manual mapping.');
      setShowManualMapping(true);
      setIsLoading(false);
    }, 30000);

    try {
      console.log('🔄 Setting loading states and calling AI service');
      setIsLoading(true);
      setError(null);
      setLoadingMessage('Calling AI service...');

      console.log('📡 Invoking ai-field-mapping edge function with headers:', csvHeaders);
      const { data, error } = await supabase.functions.invoke('ai-field-mapping', {
        body: { csvHeaders }
      });

      console.log('📨 AI service response received:', { data, error });
      
      clearTimeout(timeoutId);
      clearTimeout(errorTimeoutId);

      if (error) {
        console.error('❌ AI service returned error:', error);
        throw error;
      }

      console.log('✅ AI service success - processing suggestions');
      setLoadingMessage('Processing AI suggestions...');
      setAiSuggestions(data);
      
      // Apply AI suggestions to mappings
      const initialMappings: Record<string, string> = {};
      data.mappings.forEach((mapping: FieldMapping) => {
        console.log(`  🎯 AI mapping: "${mapping.csvHeader}" -> "${mapping.mappedField}" (${mapping.confidence})`);
        initialMappings[mapping.csvHeader] = mapping.mappedField;
      });
      
      console.log('✅ AI mappings applied:', initialMappings);
      setMappings(initialMappings);

    } catch (err) {
      clearTimeout(timeoutId);
      clearTimeout(errorTimeoutId);
      console.error('❌ Error generating AI mappings:', err);
      setError(`AI mapping failed: ${err.message || 'Unknown error'}. You can map fields manually below.`);
      setShowManualMapping(true);
    } finally {
      console.log('🏁 generateAIMappings finishing - setting isLoading=false');
      setIsLoading(false);
    }
    
    console.log('🤖 generateAIMappings FINISHED');
  };

  const handleSkipAI = () => {
    setIsLoading(false);
    setShowManualMapping(true);
    setAiSkipped(true);
    setError(null);
  };

  const handleRetryAI = () => {
    setError(null);
    setShowManualMapping(false);
    setAiSkipped(false);
    generateAIMappings();
  };

  const handleMappingChange = (csvHeader: string, standardField: string) => {
    setMappings(prev => ({
      ...prev,
      [csvHeader]: standardField
    }));
  };

  const getConfidenceBadge = (csvHeader: string) => {
    const suggestion = aiSuggestions?.mappings.find(m => m.csvHeader === csvHeader);
    if (!suggestion) return null;

    const variant = suggestion.confidence >= 0.9 ? 'default' : 
                   suggestion.confidence >= 0.7 ? 'secondary' : 'destructive';
    
    return (
      <Badge variant={variant} className="ml-2">
        {Math.round(suggestion.confidence * 100)}% confident
      </Badge>
    );
  };

  const handleContinue = () => {
    console.log('🚀 handleContinue CLICKED - starting data transformation');
    console.log('📊 Current mappings:', mappings);
    console.log('📋 Required fields check:', { 
      requiredFieldsMapped,
      requiredFields: standardFields.filter(f => f.required).map(f => f.value),
      mappedFields: Object.values(mappings)
    });
    
    if (!requiredFieldsMapped) {
      console.error('❌ Cannot continue - required fields not mapped');
      return;
    }

    if (isContinuing) {
      console.warn('⚠️ Already continuing, preventing duplicate action');
      return;
    }

    setIsContinuing(true);
    console.log('🔄 Transforming CSV data with mappings...');
    
    try {
      // Apply mappings to transform the data
      const mappedData = csvData.map((row, index) => {
        const newRow: PropertyImportData = {
          street_address: '',
          city: '',
          state: '',
          zipcode: ''
        };

        Object.entries(mappings).forEach(([csvHeader, standardField]) => {
          if (standardField && row[csvHeader as keyof PropertyImportData] !== undefined) {
            (newRow as any)[standardField] = row[csvHeader as keyof PropertyImportData];
            
            if (index === 0) { // Log first row mapping for debugging
              console.log(`  🔗 Mapping: ${csvHeader} -> ${standardField} = "${row[csvHeader as keyof PropertyImportData]}"`);
            }
          }
        });

        return newRow;
      });

      console.log('✅ Data transformation completed. Sample mapped row:', mappedData[0]);
      console.log('📤 Calling onMappingComplete with', mappedData.length, 'rows');
      
      onMappingComplete(mappedData);
      console.log('✅ onMappingComplete called successfully');
      
    } catch (error) {
      console.error('❌ Error in handleContinue:', error);
      setIsContinuing(false);
      setError(`Error processing data: ${error.message}`);
    }
  };

  const requiredFieldsMapped = standardFields
    .filter(field => field.required)
    .every(field => 
      Object.values(mappings).includes(field.value)
    );

  const getMappedStandardFields = () => {
    return Object.values(mappings).filter(Boolean);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Field Mapping
          </CardTitle>
          <CardDescription>
            {loadingMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">{loadingMessage}</p>
              <Button variant="outline" onClick={handleSkipAI} className="mt-4">
                Skip AI & Map Manually
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Field Mapping
          </CardTitle>
          <CardDescription>
            Review and adjust the AI-suggested field mappings below. Required fields must be mapped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {!showManualMapping && (
                  <div className="mt-2 space-x-2">
                    <Button variant="outline" size="sm" onClick={handleRetryAI}>
                      Retry AI
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSkipAI}>
                      Skip to Manual
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {aiSkipped && !error && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {showManualMapping ? 'Mapping fields manually.' : 'Smart mapping applied based on standard field names.'}
                {!showManualMapping && (
                  <Button variant="link" className="p-0 h-auto ml-2" onClick={() => setShowManualMapping(true)}>
                    Review mappings
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {aiSuggestions?.suggestions && aiSuggestions.suggestions.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>AI Suggestions:</strong>
                <ul className="mt-2 space-y-1">
                  {aiSuggestions.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm">• {suggestion}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            {csvHeaders.map(header => {
              const suggestion = aiSuggestions?.mappings.find(m => m.csvHeader === header);
              
              return (
                <div key={header} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{header}</span>
                      {getConfidenceBadge(header)}
                    </div>
                    {suggestion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {suggestion.reasoning}
                      </p>
                    )}
                  </div>
                  <div className="w-64">
                    <Select
                      value={mappings[header] || ''}
                      onValueChange={(value) => handleMappingChange(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Don't map</SelectItem>
                        {standardFields
                          .filter(field => 
                            !getMappedStandardFields().includes(field.value) || 
                            mappings[header] === field.value
                          )
                          .map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label} {field.required && '*'}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>

          {aiSuggestions?.unmappedFields && aiSuggestions.unmappedFields.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Unmapped fields:</strong> {aiSuggestions.unmappedFields.join(', ')}
                <br />
                These fields couldn't be automatically mapped and will be ignored during import.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <div className="flex gap-2">
              {(isLoading || error) && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    console.log('🚨 MANUAL BYPASS clicked');
                    setIsLoading(false);
                    setShowManualMapping(true);
                    setError(null);
                  }}
                >
                  Skip to Manual Mapping
                </Button>
              )}
              {/* EMERGENCY BYPASS - Skip directly to processing */}
              <Button 
                variant="destructive"
                onClick={() => {
                  console.log('🚨 EMERGENCY BYPASS: Skipping directly to processing');
                  console.log('📋 Using raw CSV data without field mapping transformation');
                  onMappingComplete(csvData);
                }}
                className="gap-2"
              >
                Skip to Processing (Use Raw Data)
              </Button>
              
              <Button 
                onClick={() => {
                  console.log('🔥 BUTTON CLICKED: Continue to Processing');
                  console.log('🔍 Button state check:', { 
                    requiredFieldsMapped, 
                    isLoading,
                    isContinuing,
                    mappingsCount: Object.keys(mappings).length 
                  });
                  handleContinue();
                }}
                disabled={!requiredFieldsMapped || isLoading || isContinuing}
                className="gap-2"
              >
                {(isLoading && !isContinuing) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting AI Analysis...
                  </>
                ) : isContinuing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue to Processing'
                )}
              </Button>
            </div>
          </div>

          {!requiredFieldsMapped && (
            <p className="text-sm text-destructive">
              Please map all required fields: {
                standardFields
                  .filter(field => field.required && !Object.values(mappings).includes(field.value))
                  .map(field => field.label)
                  .join(', ')
              }
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}