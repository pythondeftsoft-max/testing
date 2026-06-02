
import { supabase } from '@/integrations/supabase/client';
import { 
  ImportSession, 
  ImportResult, 
  AddressProcessingResult, 
  ImportTemplateOptions,
  PropertyImportData
} from '@/types/propertyImport';

export const generateImportTemplate = async (options: ImportTemplateOptions = {}) => {
  const { data, error } = await supabase.functions.invoke('generate-property-import-template', {
    body: options
  });

  if (error) {
    throw new Error(`Failed to generate template: ${error.message}`);
  }

  return data;
};

export const processPropertyAddresses = async (
  addresses: PropertyImportData[], 
  options: { 
    version?: number; 
    sessionId?: string; 
    indices?: number[] 
  } = {}
): Promise<AddressProcessingResult> => {
  const { version = 2, sessionId, indices } = options;
  
  console.log('Processing addresses:', addresses.length, 'properties', version >= 2 ? '(API v2)' : '(API v1)');
  
  const requestBody: any = { addresses };
  
  // Add V2 features
  if (version >= 2) {
    requestBody.version = version;
    requestBody.session_id = sessionId;
    if (indices) {
      requestBody.indices = indices;
    }
  }
  
  const { data, error } = await supabase.functions.invoke('process-property-addresses', {
    body: requestBody
  });

  console.log('Address processing result:', { data, error });

  if (error) {
    console.error('Address processing error:', error);
    throw new Error(`Failed to process addresses: ${error.message}`);
  }

  return data;
};

export const submitPropertyImport = async (
  importData: PropertyImportData[],
  filename: string,
  addressGroups: Record<string, number[]>,
  portfolioId?: string | null
) => {
  const { data, error } = await supabase.functions.invoke('process-property-import', {
    body: {
      import_data: importData,
      filename,
      address_groups: addressGroups,
      portfolio_id: portfolioId
    }
  });

  if (error) {
    throw new Error(`Failed to submit import: ${error.message}`);
  }

  return data;
};

export const getImportSession = async (sessionId: string): Promise<ImportSession> => {
  const { data, error } = await supabase
    .from('property_import_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch import session: ${error.message}`);
  }

  // Type assertion to ensure the status field matches our interface
  return {
    ...data,
    status: data.status as 'processing' | 'completed' | 'failed'
  } as unknown as ImportSession;
};

export const getImportResults = async (sessionId: string): Promise<ImportResult[]> => {
  const { data, error } = await supabase
    .from('property_import_results')
    .select('*')
    .eq('import_session_id', sessionId)
    .order('row_number');

  if (error) {
    throw new Error(`Failed to fetch import results: ${error.message}`);
  }

  // Type assertion to ensure the status field matches our interface
  return (data || []).map(result => ({
    ...result,
    status: result.status as 'success' | 'failed'
  })) as unknown as ImportResult[];
};

export const getUserImportSessions = async (): Promise<ImportSession[]> => {
  const { data, error } = await supabase
    .from('property_import_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch import sessions: ${error.message}`);
  }

  // Type assertion to ensure the status field matches our interface
  return (data || []).map(session => ({
    ...session,
    status: session.status as 'processing' | 'completed' | 'failed'
  })) as unknown as ImportSession[];
};
