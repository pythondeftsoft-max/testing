
export interface ImportSession {
  id: string;
  user_id: string;
  filename: string;
  total_rows: number;
  processed_rows?: number;
  successful_imports?: number;
  failed_imports?: number;
  status: 'processing' | 'completed' | 'failed';
  import_data?: {
    address_groups: Record<string, number[]>;
    total_properties: number;
  };
  created_at: string;
  completed_at?: string;
}

export interface ImportResult {
  id: string;
  import_session_id: string;
  row_number: number;
  property_id?: string;
  status: 'success' | 'failed';
  error_details?: {
    message: string;
    field?: string;
  };
  original_data: Record<string, any>;
  processed_data?: Record<string, any>;
  created_at: string;
}

export interface AIInsights {
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

export interface ProcessedAddress {
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

export interface ProcessingRowResult {
  row_number: number;
  status: 'success' | 'failed' | 'warning';
  original_data: PropertyImportData;
  processed_data?: ProcessedAddress;
  errors?: string[];
  warnings?: string[];
  ai_suggestions?: {
    improvements: string[];
    confidence: number;
    priority: 'low' | 'medium' | 'high';
  };
  // V2 API additions
  original_index?: number;
  schema_map?: SchemaMap;
  duplicate_group_id?: string;
}

export interface SchemaMap {
  unmapped_fields: string[];
  field_confidences: FieldConfidence[];
}

export interface FieldConfidence {
  original_field: string;
  mapped_field: string;
  confidence: number;
  reasoning: string;
}

export interface DuplicateSet {
  group_id: string;
  representative_index: number;
  member_indices: number[];
  confidence: number;
  reasoning: string;
  suggested_action: 'merge' | 'separate' | 'review';
}

export interface AddressProcessingResult {
  success: boolean;
  total_addresses: number;
  unique_properties: number;
  processed_addresses: ProcessedAddress[];
  address_groups: Record<string, number[]>;
  row_results: ProcessingRowResult[];
  ai_summary?: {
    overall_quality_score: number;
    total_duplicates_found: number;
    total_errors_detected: number;
    recommended_actions: string[];
    processing_confidence: number;
  };
  // V2 API additions
  version?: number;
  session_id?: string;
  request_indices?: number[];
  duplicates?: DuplicateSet[];
  unmapped_field_summary?: Record<string, number>;
  processing_metadata?: {
    ai_model_used: string;
    processing_time_ms: number;
    cache_hits: number;
  };
}

export interface AddressProcessingRequest {
  addresses: PropertyImportData[];
  // V2 API additions
  version?: number;
  session_id?: string;
  indices?: number[];
}

export interface ImportTemplateOptions {
  template_type?: 'simple' | 'units';
}

export interface PropertyImportData {
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

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}
