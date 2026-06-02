import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

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

const PROPERTY_FIELDS = [
  'street_address', 'city', 'state', 'zipcode', 'property_type', 'property_name',
  'unit_number', 'unit_type', 'bedrooms', 'bathrooms', 'square_feet',
  'monthly_rent', 'deposit_amount', 'pet_friendly', 'parking_spots',
  'amenities', 'unit_amenities', 'lease_terms', 'availability_date', 'notes'
];

const AGENCY_ENTITY_FIELDS: Record<string, string[]> = {
  tenants: [
    'first_name', 'last_name', 'full_name', 'email', 'phone',
    'household_size', 'annual_income', 'date_of_birth', 'ssn_last4', 'notes'
  ],
  vouchers: [
    'voucher_number', 'tenant_email', 'voucher_type', 'amount',
    'status', 'issued_at', 'expires_at', 'notes'
  ],
  waitlist: [
    'first_name', 'last_name', 'full_name', 'email', 'phone',
    'household_size', 'annual_income', 'waitlist_position',
    'priority_level', 'preference_points', 'application_date', 'notes'
  ],
  landlords: [
    'landlord_name', 'landlord_email', 'phone',
    'properties_count', 'payment_method', 'notes'
  ],
  placements: [
    'tenant_email', 'property_address', 'unit_number',
    'lease_start', 'lease_end', 'monthly_rent',
    'hap_amount', 'tenant_portion', 'notes'
  ],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AI Field Mapping request received');
    const { csvHeaders, entityType } = await req.json();

    if (!csvHeaders || !Array.isArray(csvHeaders)) {
      throw new Error('CSV headers are required and must be an array');
    }

    console.log('Processing headers:', csvHeaders, 'entityType:', entityType);

    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found in environment');
      throw new Error('AI service configuration error - API key missing');
    }

    // Pick the right field set based on entityType
    const standardFields = entityType && AGENCY_ENTITY_FIELDS[entityType]
      ? AGENCY_ENTITY_FIELDS[entityType]
      : PROPERTY_FIELDS;

    const contextLabel = entityType
      ? `${entityType} import`
      : 'property import';

    const prompt = `
You are an AI assistant that maps CSV headers to standardized ${contextLabel} fields. 

CSV Headers: ${csvHeaders.join(', ')}

Standard Fields Available: ${standardFields.join(', ')}

For each CSV header, determine the best matching standard field. Consider common variations and abbreviations.

Respond with a JSON object containing:
{
  "mappings": [
    {
      "csvHeader": "header_name",
      "mappedField": "standard_field_name",
      "confidence": 0.95,
      "reasoning": "Why this mapping makes sense"
    }
  ],
  "unmappedFields": ["headers with no good match"],
  "suggestions": ["recommendations for handling unmapped fields"]
}

Rules:
- Only map to exact standard field names from the list above
- Confidence should be 0.0-1.0
- If confidence is below 0.7, consider it unmapped
- Common variations: name->full_name, fname->first_name, lname->last_name, addr->street_address, rent->monthly_rent, beds->bedrooms, baths->bathrooms, sqft->square_feet, hh_size->household_size, income->annual_income
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      throw new Error('No response from Gemini API');
    }

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response');
    }

    const mappingResult: MappingResponse = JSON.parse(jsonMatch[0]);

    const validMappings = mappingResult.mappings.filter(mapping => 
      standardFields.includes(mapping.mappedField) && mapping.confidence >= 0.7
    );

    const mappedHeaders = validMappings.map(m => m.csvHeader);
    const unmappedHeaders = csvHeaders.filter(header => !mappedHeaders.includes(header));

    const result: MappingResponse = {
      mappings: validMappings,
      unmappedFields: unmappedHeaders,
      suggestions: mappingResult.suggestions || []
    };

    console.log('AI Field Mapping Result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-field-mapping function:', error);
    
    let errorMessage = (error instanceof Error ? error.message : String(error)) || 'Unknown error occurred';
    if (errorMessage.includes('API key')) {
      errorMessage = 'AI service configuration error. Please contact support.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      errorMessage = 'AI service temporarily unavailable. Please try again.';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage, mappings: [], unmappedFields: [], suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
