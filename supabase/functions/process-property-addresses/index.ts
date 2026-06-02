import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AddressData {
  street_address: string;
  city: string;
  state: string;
  zipcode: string;
  property_type?: string;
  property_name?: string;
  unit_number?: string;
  unit_type?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
  square_feet?: string | number;
  monthly_rent?: string | number;
  deposit_amount?: string | number;
  pet_friendly?: string | boolean;
  parking_spots?: string | number;
  amenities?: string;
  unit_amenities?: string;
  lease_terms?: string;
  availability_date?: string;
  notes?: string;
}

interface ProcessingRequest {
  addresses: AddressData[];
  version?: number;
  session_id?: string;
  indices?: number[];
}

interface FieldConfidence {
  original_field: string;
  mapped_field: string;
  confidence: number;
  reasoning: string;
}

interface SchemaMap {
  unmapped_fields: string[];
  field_confidences: FieldConfidence[];
}

interface DuplicateSet {
  group_id: string;
  representative_index: number;
  member_indices: number[];
  confidence: number;
  reasoning: string;
  suggested_action: 'merge' | 'separate' | 'review';
}

interface AIInsights {
  property_type_detection?: {
    detected_type: string;
    confidence: number;
    reasoning: string;
  };
  data_quality_assessment?: {
    completeness_score: number;
    accuracy_score: number;
    consistency_score: number;
    issues: string[];
    suggestions: string[];
  };
  duplicate_analysis?: {
    is_likely_duplicate: boolean;
    duplicate_probability: number;
    similar_properties: string[];
    grouping_suggestions: string[];
  };
  error_analysis?: {
    detected_errors: Array<{
      field: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
      suggested_fix: string;
    }>;
    confidence_score: number;
  };
}

interface ProcessedAddress {
  normalized_address: string;
  full_address: string;
  components: {
    street_address: string;
    city: string;
    state: string;
    zipcode: string;
  };
  ai_insights?: AIInsights;
}

interface ProcessingRowResult {
  row_number: number;
  status: 'success' | 'failed' | 'warning';
  original_data: AddressData;
  processed_data?: ProcessedAddress;
  errors?: string[];
  warnings?: string[];
  ai_suggestions?: {
    improvements: string[];
    confidence: number;
    priority: 'low' | 'medium' | 'high';
  };
  // V2 additions
  original_index?: number;
  schema_map?: SchemaMap;
  duplicate_group_id?: string;
}

// Schema registry for field mapping intelligence
const FIELD_SCHEMA = {
  'street_address': ['address', 'addr', 'street', 'street_addr', 'property_address'],
  'city': ['city', 'town', 'municipality'],
  'state': ['state', 'st', 'province', 'region'],
  'zipcode': ['zip', 'zipcode', 'zip_code', 'postal_code', 'postal'],
  'property_type': ['type', 'prop_type', 'property_type', 'building_type'],
  'property_name': ['name', 'property_name', 'building_name', 'complex_name'],
  'unit_number': ['unit', 'unit_num', 'unit_number', 'apt', 'apartment'],
  'unit_type': ['unit_type', 'apt_type', 'room_type'],
  'bedrooms': ['beds', 'bedrooms', 'bed_count', 'br'],
  'bathrooms': ['baths', 'bathrooms', 'bath_count', 'ba'],
  'square_feet': ['sqft', 'sq_ft', 'square_feet', 'area', 'size'],
  'monthly_rent': ['rent', 'monthly_rent', 'price', 'rental_price'],
  'deposit_amount': ['deposit', 'security_deposit', 'dep'],
  'pet_friendly': ['pets', 'pet_friendly', 'pets_allowed'],
  'parking_spots': ['parking', 'parking_spots', 'garage'],
  'amenities': ['amenities', 'features', 'property_amenities'],
  'unit_amenities': ['unit_amenities', 'unit_features', 'in_unit'],
  'lease_terms': ['lease', 'lease_terms', 'term'],
  'availability_date': ['available', 'availability', 'move_in', 'date_available'],
  'notes': ['notes', 'comments', 'description', 'remarks']
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('Processing property addresses request with enhanced AI');
    
    const requestData: ProcessingRequest = await req.json();
    const { addresses, version = 1, session_id, indices } = requestData;
    
    if (!addresses || !Array.isArray(addresses)) {
      throw new Error('Invalid addresses data provided');
    }

    const isV2Request = version >= 2;
    const isSelectiveReprocessing = indices && indices.length > 0;
    
    console.log(`Processing ${addresses.length} addresses (API v${version}${isSelectiveReprocessing ? ', selective' : ''})`);

    // Determine which indices to process
    const indicesToProcess = isSelectiveReprocessing ? indices : Array.from({ length: addresses.length }, (_, i) => i);
    
    const processedAddresses: ProcessedAddress[] = [];
    const addressGroups: Record<string, number[]> = {};
    const rowResults: ProcessingRowResult[] = [];
    const duplicateSets: DuplicateSet[] = [];
    let totalErrors = 0;
    let totalDuplicates = 0;
    let qualityScoreSum = 0;
    let cacheHits = 0;

    // Generate schema mapping for all addresses if V2
    const unmappedFieldSummary: Record<string, number> = {};
    let allFieldConfidences: FieldConfidence[] = [];

    if (isV2Request) {
      allFieldConfidences = generateSchemaMapping(addresses);
      calculateUnmappedFields(addresses, unmappedFieldSummary);
    }

    // Process each address with enhanced AI
    for (const index of indicesToProcess) {
      const address = addresses[index];
      
      try {
        // Normalize address components
        const normalizedStreet = normalizeStreetAddress(address.street_address || '');
        const normalizedCity = normalizeCity(address.city || '');
        const normalizedState = (address.state || '').trim().toUpperCase();
        const normalizedZipcode = normalizeZipcode(address.zipcode || '');

        // Create normalized address for grouping - include unit if available
        const unitSuffix = address.unit_number ? `|unit-${normalizeUnitNumber(address.unit_number)}` : '';
        const normalizedAddress = `${normalizedStreet}, ${normalizedCity}, ${normalizedState} ${normalizedZipcode}${unitSuffix}`.toLowerCase();
        
        // Create full display address
        const fullAddress = `${address.street_address}, ${address.city}, ${address.state} ${address.zipcode}`;

        // Generate AI insights
        const aiInsights = await generateAIInsights(address, addresses, index);
        
        const processedAddress: ProcessedAddress = {
          normalized_address: normalizedAddress,
          full_address: fullAddress,
          components: {
            street_address: address.street_address || '',
            city: address.city || '',
            state: address.state || '',
            zipcode: address.zipcode || ''
          },
          ai_insights: aiInsights
        };

        processedAddresses.push(processedAddress);

        // Group addresses (for multi-unit properties)
        if (!addressGroups[normalizedAddress]) {
          addressGroups[normalizedAddress] = [];
        }
        addressGroups[normalizedAddress].push(index);

        // Create enhanced row result
        const rowResult: ProcessingRowResult = {
          row_number: index + 1,
          status: determineRowStatus(address, aiInsights),
          original_data: address,
          processed_data: processedAddress,
          errors: aiInsights.error_analysis?.detected_errors?.map(e => e.issue) || [],
          warnings: aiInsights.data_quality_assessment?.issues || [],
          ai_suggestions: {
            improvements: aiInsights.data_quality_assessment?.suggestions || [],
            confidence: aiInsights.data_quality_assessment?.accuracy_score || 0.8,
            priority: determinePriority(aiInsights)
          }
        };

        // Add V2 enhancements
        if (isV2Request) {
          rowResult.original_index = index;
          rowResult.schema_map = {
            unmapped_fields: getUnmappedFieldsForRow(address),
            field_confidences: allFieldConfidences.filter(fc => 
              Object.keys(address).includes(fc.original_field)
            )
          };
        }

        rowResults.push(rowResult);

        // Update statistics
        if (aiInsights.error_analysis?.detected_errors?.length) {
          totalErrors += aiInsights.error_analysis.detected_errors.length;
        }
        if (aiInsights.duplicate_analysis?.is_likely_duplicate) {
          totalDuplicates++;
        }
        qualityScoreSum += (aiInsights.data_quality_assessment?.accuracy_score || 0.8);

      } catch (error) {
        console.error(`Error processing address at index ${index}:`, error);
        
        // Fallback processing
        const fallbackResult = createFallbackResult(address, index, isV2Request);
        rowResults.push(fallbackResult);
      }
    }

    // Generate enhanced duplicate detection for V2
    if (isV2Request) {
      const enhancedDuplicates = generateEnhancedDuplicateDetection(addressGroups, addresses);
      duplicateSets.push(...enhancedDuplicates);
      
      // Update row results with duplicate group IDs
      duplicateSets.forEach(duplicateSet => {
        duplicateSet.member_indices.forEach(memberIndex => {
          const rowResult = rowResults.find(r => r.original_index === memberIndex);
          if (rowResult) {
            rowResult.duplicate_group_id = duplicateSet.group_id;
          }
        });
      });
    }

    const uniqueProperties = Object.keys(addressGroups).length;
    const overallQualityScore = indicesToProcess.length > 0 ? qualityScoreSum / indicesToProcess.length : 0;
    const processingTime = Date.now() - startTime;

    // Generate recommended actions
    const recommendedActions = generateRecommendedActions(rowResults, totalDuplicates, totalErrors);

    console.log(`Processed ${indicesToProcess.length} addresses into ${uniqueProperties} unique properties (${processingTime}ms)`);

    // Build response based on API version
    const response: any = {
      success: true,
      total_addresses: addresses.length,
      unique_properties: uniqueProperties,
      processed_addresses: processedAddresses,
      address_groups: addressGroups,
      row_results: rowResults,
      ai_summary: {
        overall_quality_score: overallQualityScore,
        total_duplicates_found: totalDuplicates,
        total_errors_detected: totalErrors,
        recommended_actions: recommendedActions,
        processing_confidence: Math.min(overallQualityScore + 0.1, 0.95)
      }
    };

    // Add V2 enhancements
    if (isV2Request) {
      response.version = 2;
      response.session_id = session_id;
      response.request_indices = indices;
      response.duplicates = duplicateSets;
      response.unmapped_field_summary = unmappedFieldSummary;
      response.processing_metadata = {
        ai_model_used: 'gemini-1.5-flash-latest',
        processing_time_ms: processingTime,
        cache_hits: cacheHits
      };
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing addresses:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error))
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Enhanced field mapping intelligence
function generateSchemaMapping(addresses: AddressData[]): FieldConfidence[] {
  const confidences: FieldConfidence[] = [];
  
  // Get all unique field names from the addresses
  const allFields = new Set<string>();
  addresses.forEach(addr => {
    Object.keys(addr).forEach(field => allFields.add(field));
  });

  // Map each field to schema
  allFields.forEach(originalField => {
    const normalizedField = originalField.toLowerCase().replace(/[_\s-]/g, '_');
    
    let bestMatch = '';
    let bestConfidence = 0;
    let reasoning = '';

    // Check against schema registry
    Object.entries(FIELD_SCHEMA).forEach(([schemaField, synonyms]) => {
      const confidence = calculateFieldConfidence(normalizedField, synonyms);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = schemaField;
        reasoning = confidence > 0.8 ? 'Exact match' : 'Pattern similarity';
      }
    });

    if (bestConfidence > 0.3) {
      confidences.push({
        original_field: originalField,
        mapped_field: bestMatch,
        confidence: bestConfidence,
        reasoning: reasoning
      });
    }
  });

  return confidences;
}

function calculateFieldConfidence(field: string, synonyms: string[]): number {
  // Exact match
  if (synonyms.includes(field)) return 1.0;
  
  // Partial match
  const maxSimilarity = Math.max(...synonyms.map(synonym => 
    calculateStringSimilarity(field, synonym)
  ));
  
  return maxSimilarity;
}

function calculateUnmappedFields(addresses: AddressData[], summary: Record<string, number>): void {
  const allFields = new Set<string>();
  addresses.forEach(addr => {
    Object.keys(addr).forEach(field => allFields.add(field));
  });

  allFields.forEach(field => {
    const isKnownField = Object.values(FIELD_SCHEMA).some(synonyms => 
      synonyms.includes(field.toLowerCase())
    );
    
    if (!isKnownField) {
      summary[field] = addresses.filter(addr => addr[field as keyof AddressData]).length;
    }
  });
}

function getUnmappedFieldsForRow(address: AddressData): string[] {
  return Object.keys(address).filter(field => {
    const normalizedField = field.toLowerCase();
    return !Object.values(FIELD_SCHEMA).some(synonyms => 
      synonyms.includes(normalizedField)
    );
  });
}

// Enhanced duplicate detection with unit-aware logic
function generateEnhancedDuplicateDetection(addressGroups: Record<string, number[]>, addresses: AddressData[]): DuplicateSet[] {
  const duplicateSets: DuplicateSet[] = [];
  let groupCounter = 0;

  // Create building-level groups to detect true duplicates
  const buildingGroups: Record<string, number[]> = {};
  
  // Group by base address (without unit)
  Object.entries(addressGroups).forEach(([fullAddress, indices]) => {
    const baseAddress = fullAddress.split('|unit-')[0]; // Remove unit suffix
    if (!buildingGroups[baseAddress]) {
      buildingGroups[baseAddress] = [];
    }
    buildingGroups[baseAddress].push(...indices);
  });

  // Analyze each building group for true duplicates
  Object.entries(buildingGroups).forEach(([baseAddress, indices]) => {
    if (indices.length < 2) return;

    // Group by unit number to find true duplicates
    const unitGroups: Record<string, number[]> = {};
    
    indices.forEach(index => {
      const address = addresses[index];
      const unitKey = address.unit_number 
        ? normalizeUnitNumber(address.unit_number).toLowerCase()
        : 'no-unit';
      
      if (!unitGroups[unitKey]) {
        unitGroups[unitKey] = [];
      }
      unitGroups[unitKey].push(index);
    });

    // Create duplicate sets only for true duplicates (same address + same unit)
    Object.entries(unitGroups).forEach(([unitKey, unitIndices]) => {
      if (unitIndices.length > 1) {
        // Multiple properties with same address AND same unit = true duplicates
        const duplicateSet: DuplicateSet = {
          group_id: `dup_${++groupCounter}`,
          representative_index: unitIndices[0],
          member_indices: unitIndices,
          confidence: 0.95,
          reasoning: unitKey === 'no-unit' 
            ? 'Identical addresses without unit numbers - likely duplicates'
            : `Identical addresses with same unit (${unitKey}) - likely duplicates`,
          suggested_action: 'review'
        };

        duplicateSets.push(duplicateSet);
      }
    });
  });

  return duplicateSets;
}

// Helper function to normalize unit numbers
function normalizeUnitNumber(unitNumber: string): string {
  return unitNumber.toString().trim().toLowerCase()
    .replace(/^(apt|apartment|unit|#|ste|suite)\s*/i, '')
    .replace(/[^\w]/g, '');
}

function createFallbackResult(address: AddressData, index: number, isV2: boolean): ProcessingRowResult {
  const result: ProcessingRowResult = {
    row_number: index + 1,
    status: 'warning',
    original_data: address,
    errors: [],
    warnings: ['AI processing unavailable - using basic processing'],
    ai_suggestions: {
      improvements: ['Manual review recommended'],
      confidence: 0.5,
      priority: 'medium'
    }
  };

  if (isV2) {
    result.original_index = index;
    result.schema_map = {
      unmapped_fields: getUnmappedFieldsForRow(address),
      field_confidences: []
    };
  }

  return result;
}

// AI Enhancement Functions
async function generateAIInsights(address: AddressData, allAddresses: AddressData[], currentIndex: number): Promise<AIInsights> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!geminiApiKey) {
    console.warn('Gemini API key not configured, skipping AI insights');
    return generateBasicInsights(address, allAddresses, currentIndex);
  }

  try {
    const prompt = createAnalysisPrompt(address, allAddresses, currentIndex);
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      throw new Error('No response from Gemini API');
    }

    return parseAIResponse(aiResponse, address, allAddresses, currentIndex);
    
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return generateBasicInsights(address, allAddresses, currentIndex);
  }
}

function createAnalysisPrompt(address: AddressData, allAddresses: AddressData[], currentIndex: number): string {
  const addressSample = allAddresses.slice(0, Math.min(5, allAddresses.length));
  
  return `Analyze this property data for quality, type detection, and potential duplicates. Return a JSON response only.

Current Property:
${JSON.stringify(address, null, 2)}

Sample of all properties (for duplicate detection):
${JSON.stringify(addressSample, null, 2)}

Provide analysis in this exact JSON format:
{
  "property_type_detection": {
    "detected_type": "apartment|house|condo|townhouse|other",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
  },
  "data_quality_assessment": {
    "completeness_score": 0.0-1.0,
    "accuracy_score": 0.0-1.0,
    "consistency_score": 0.0-1.0,
    "issues": ["list of issues found"],
    "suggestions": ["list of improvement suggestions"]
  },
  "duplicate_analysis": {
    "is_likely_duplicate": boolean,
    "duplicate_probability": 0.0-1.0,
    "similar_properties": ["list of similar addresses"],
    "grouping_suggestions": ["suggestions for grouping"]
  },
  "error_analysis": {
    "detected_errors": [
      {
        "field": "field name",
        "issue": "description",
        "severity": "low|medium|high",
        "suggested_fix": "how to fix"
      }
    ],
    "confidence_score": 0.0-1.0
  }
}`;
}

function parseAIResponse(aiResponse: string, address: AddressData, allAddresses: AddressData[], currentIndex: number): AIInsights {
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as AIInsights;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return generateBasicInsights(address, allAddresses, currentIndex);
  }
}

function generateBasicInsights(address: AddressData, allAddresses: AddressData[], currentIndex: number): AIInsights {
  const completenessScore = calculateCompleteness(address);
  const detectedType = detectPropertyTypeBasic(address);
  const duplicateAnalysis = findBasicDuplicates(address, allAddresses, currentIndex);
  const errors = detectBasicErrors(address);

  return {
    property_type_detection: {
      detected_type: detectedType,
      confidence: 0.7,
      reasoning: 'Basic pattern matching analysis'
    },
    data_quality_assessment: {
      completeness_score: completenessScore,
      accuracy_score: 0.8,
      consistency_score: 0.75,
      issues: errors.map(e => e.issue),
      suggestions: errors.map(e => e.suggested_fix)
    },
    duplicate_analysis: duplicateAnalysis,
    error_analysis: {
      detected_errors: errors,
      confidence_score: 0.7
    }
  };
}

function calculateCompleteness(address: AddressData): number {
  const requiredFields = ['street_address', 'city', 'state', 'zipcode'];
  const optionalFields = ['property_type', 'bedrooms', 'bathrooms', 'monthly_rent'];
  
  const requiredComplete = requiredFields.filter(field => address[field as keyof AddressData]).length;
  const optionalComplete = optionalFields.filter(field => address[field as keyof AddressData]).length;
  
  return (requiredComplete * 0.7 + optionalComplete * 0.3) / (requiredFields.length * 0.7 + optionalFields.length * 0.3);
}

function detectPropertyTypeBasic(address: AddressData): string {
  const text = `${address.property_type || ''} ${address.property_name || ''} ${address.unit_type || ''}`.toLowerCase();
  
  if (text.includes('apartment') || text.includes('apt') || address.unit_number) return 'apartment';
  if (text.includes('condo') || text.includes('condominium')) return 'condo';
  if (text.includes('townhouse') || text.includes('town house')) return 'townhouse';
  if (text.includes('house') || text.includes('single family')) return 'house';
  
  return 'other';
}

function findBasicDuplicates(address: AddressData, allAddresses: AddressData[], currentIndex: number): {
  is_likely_duplicate: boolean;
  duplicate_probability: number;
  similar_properties: string[];
  grouping_suggestions: string[];
} {
  const currentNormalized = `${address.street_address || ''} ${address.city || ''} ${address.state || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
  const currentUnit = normalizeUnitNumber(address.unit_number || '');
  const similarProperties: string[] = [];
  let trueDuplicateFound = false;
  
  allAddresses.forEach((otherAddress, index) => {
    if (index !== currentIndex) {
      const otherNormalized = `${otherAddress.street_address || ''} ${otherAddress.city || ''} ${otherAddress.state || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
      const otherUnit = normalizeUnitNumber(otherAddress.unit_number || '');
      const similarity = calculateStringSimilarity(currentNormalized, otherNormalized);
      
      if (similarity > 0.8) {
        // Check if this is a true duplicate (same address + same unit) or multi-unit
        const sameUnit = currentUnit === otherUnit || (!currentUnit && !otherUnit);
        
        if (sameUnit) {
          trueDuplicateFound = true;
          similarProperties.push(`${otherAddress.street_address}, ${otherAddress.city}, ${otherAddress.state}${otherAddress.unit_number ? ` Unit ${otherAddress.unit_number}` : ''}`);
        }
        // Don't add to similar properties if it's just different units in same building
      }
    }
  });
  
  const duplicateProbability = trueDuplicateFound ? Math.max(0.8, similarProperties.length * 0.3) : 0;
  
  return {
    is_likely_duplicate: trueDuplicateFound,
    duplicate_probability: Math.min(duplicateProbability, 0.95),
    similar_properties: similarProperties,
    grouping_suggestions: trueDuplicateFound 
      ? ['Review for potential duplicate entries'] 
      : []
  };
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  const commonWords = words1.filter(word => words2.includes(word));
  
  return commonWords.length / Math.max(words1.length, words2.length);
}

function detectBasicErrors(address: AddressData): Array<{
  field: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggested_fix: string;
}> {
  const errors: Array<{
    field: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggested_fix: string;
  }> = [];

  if (!address.street_address?.trim()) {
    errors.push({
      field: 'street_address',
      issue: 'Missing street address',
      severity: 'high',
      suggested_fix: 'Provide a complete street address'
    });
  }

  if (!address.city?.trim()) {
    errors.push({
      field: 'city',
      issue: 'Missing city',
      severity: 'high',
      suggested_fix: 'Provide the city name'
    });
  }

  if (!address.state?.trim()) {
    errors.push({
      field: 'state',
      issue: 'Missing state',
      severity: 'high',
      suggested_fix: 'Provide the state abbreviation'
    });
  }

  if (!address.zipcode?.trim()) {
    errors.push({
      field: 'zipcode',
      issue: 'Missing ZIP code',
      severity: 'medium',
      suggested_fix: 'Provide a valid ZIP code'
    });
  } else if (!/^\d{5}(-\d{4})?$/.test(address.zipcode.trim())) {
    errors.push({
      field: 'zipcode',
      issue: 'Invalid ZIP code format',
      severity: 'medium',
      suggested_fix: 'Use format: 12345 or 12345-6789'
    });
  }

  if (address.monthly_rent && isNaN(Number(address.monthly_rent))) {
    errors.push({
      field: 'monthly_rent',
      issue: 'Invalid rent amount',
      severity: 'medium',
      suggested_fix: 'Provide a numeric value for rent'
    });
  }

  if (address.bedrooms && isNaN(Number(address.bedrooms))) {
    errors.push({
      field: 'bedrooms',
      issue: 'Invalid bedroom count',
      severity: 'low',
      suggested_fix: 'Provide a numeric value for bedrooms'
    });
  }

  if (address.bathrooms && isNaN(Number(address.bathrooms))) {
    errors.push({
      field: 'bathrooms',
      issue: 'Invalid bathroom count',
      severity: 'low',
      suggested_fix: 'Provide a numeric value for bathrooms'
    });
  }

  return errors;
}

function determineRowStatus(address: AddressData, aiInsights: AIInsights): 'success' | 'failed' | 'warning' {
  const hasHighSeverityErrors = aiInsights.error_analysis?.detected_errors?.some(e => e.severity === 'high');
  const hasMediumSeverityErrors = aiInsights.error_analysis?.detected_errors?.some(e => e.severity === 'medium');
  const qualityScore = aiInsights.data_quality_assessment?.accuracy_score || 0;

  if (hasHighSeverityErrors || qualityScore < 0.3) {
    return 'failed';
  } else if (hasMediumSeverityErrors || qualityScore < 0.7) {
    return 'warning';
  } else {
    return 'success';
  }
}

function determinePriority(aiInsights: AIInsights): 'low' | 'medium' | 'high' {
  const hasHighSeverityErrors = aiInsights.error_analysis?.detected_errors?.some(e => e.severity === 'high');
  const qualityScore = aiInsights.data_quality_assessment?.accuracy_score || 0;

  if (hasHighSeverityErrors || qualityScore < 0.4) {
    return 'high';
  } else if (qualityScore < 0.7) {
    return 'medium';
  } else {
    return 'low';
  }
}

function generateRecommendedActions(rowResults: ProcessingRowResult[], totalDuplicates: number, totalErrors: number): string[] {
  const actions: string[] = [];

  if (totalErrors > 0) {
    actions.push(`Review and fix ${totalErrors} detected data errors before importing`);
  }

  if (totalDuplicates > 0) {
    actions.push(`Investigate ${totalDuplicates} potential duplicate properties`);
  }

  const failedRows = rowResults.filter(r => r.status === 'failed').length;
  if (failedRows > 0) {
    actions.push(`Address ${failedRows} failed rows with missing critical data`);
  }

  const warningRows = rowResults.filter(r => r.status === 'warning').length;
  if (warningRows > 0) {
    actions.push(`Review ${warningRows} rows with data quality warnings`);
  }

  if (actions.length === 0) {
    actions.push('Data quality looks good - ready to proceed with import');
  }

  return actions;
}

// Helper functions for address normalization
function normalizeStreetAddress(street: string): string {
  return street
    .trim()
    .toLowerCase()
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(boulevard|blvd)\b/g, 'blvd')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(lane|ln)\b/g, 'ln')
    .replace(/\b(court|ct)\b/g, 'ct')
    .replace(/\b(place|pl)\b/g, 'pl')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeZipcode(zip: string): string {
  const cleaned = zip.replace(/\D/g, '');
  return cleaned.substring(0, 5);
}
