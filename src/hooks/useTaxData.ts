import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { featureFlags } from '@/config/featureFlags';

export interface TaxProfile {
  id: string;
  user_id: string;
  portfolio_id?: string;
  entity_type: 'individual' | 'sole_proprietorship' | 'partnership' | 'c_corporation' | 's_corporation' | 'llc' | 'trust' | 'estate' | 'other';
  business_name?: string;
  individual_name?: string;
  tax_id_number?: string;
  tax_id_type: 'ssn' | 'ein' | 'itin';
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  backup_withholding_exempt: boolean;
  fatca_exempt: boolean;
  w9_form_url?: string;
  w9_submitted_at?: string;
  w9_verified_at?: string;
  w9_verified_by?: string;
  status: 'pending' | 'collected' | 'verified' | 'expired' | 'exempt';
  expiration_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TaxTransaction {
  id: string;
  portfolio_id?: string;
  payer_id: string;
  payee_id: string;
  property_id?: string;
  transaction_type: string;
  amount: number;
  payment_date: string;
  tax_year: number;
  form_type?: string;
  description?: string;
  invoice_number?: string;
  vendor_name?: string;
  category_code?: string;
  is_tax_exempt: boolean;
  exempt_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Tax1099Form {
  id: string;
  portfolio_id?: string;
  payer_id: string;
  payee_id: string;
  tax_year: number;
  form_type: string;
  total_amount: number;
  box_amounts: Record<string, number>;
  form_status: 'draft' | 'generated' | 'filed' | 'corrected' | 'voided';
  generated_at?: string;
  filed_at?: string;
  pdf_url?: string;
  recipient_copy_sent_at?: string;
  recipient_delivery_method?: 'email' | 'mail' | 'portal';
  created_at: string;
  updated_at: string;
}

export interface TaxThreshold {
  id: string;
  form_type: string;
  tax_year: number;
  threshold_amount: number;
  category_description?: string;
  is_active: boolean;
}

export interface Tax1099Requirement {
  requires_1099: boolean;
  total_amount: number;
  threshold_amount: number;
  transaction_count: number;
}

// Hook to fetch tax profile for a user/portfolio
export const useTaxProfile = (userId: string, portfolioId?: string) => {
  return useQuery({
    queryKey: ['taxProfile', userId, portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('tax_profiles')
        .select('*')
        .eq('user_id', userId);

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as TaxProfile | null;
    },
  });
};

// Hook to create or update tax profile
export const useTaxProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: any) => {
      const { data, error } = await supabase
        .from('tax_profiles')
        .upsert(profile)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['taxProfile'] });
      toast.success('Tax profile saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save tax profile: ' + error.message);
    },
  });
};

// Hook to fetch tax transactions
export const useTaxTransactions = (portfolioId?: string, taxYear?: number) => {
  return useQuery({
    queryKey: ['taxTransactions', portfolioId, taxYear],
    queryFn: async () => {
      let query = supabase
        .from('tax_transactions')
        .select('*')
        .order('payment_date', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      if (taxYear) {
        query = query.eq('tax_year', taxYear);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TaxTransaction[];
    },
  });
};

// Hook to check 1099 requirement
export const useTax1099Requirement = (
  payerId: string,
  payeeId: string,
  taxYear: number,
  formType: any = '1099_misc'
) => {
  return useQuery({
    queryKey: ['tax1099Requirement', payerId, payeeId, taxYear, formType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_1099_requirement', {
        p_payer_id: payerId,
        p_payee_id: payeeId,
        p_tax_year: taxYear,
        p_form_type: formType,
      });

      if (error) throw error;
      return data[0] as Tax1099Requirement;
    },
    enabled: !!(payerId && payeeId && taxYear),
  });
};

// Hook to fetch 1099 forms
export const useTax1099Forms = (portfolioId?: string, taxYear?: number) => {
  return useQuery({
    queryKey: ['tax1099Forms', portfolioId, taxYear],
    queryFn: async () => {
      let query = supabase
        .from('tax_forms_1099')
        .select('*')
        .order('created_at', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      if (taxYear) {
        query = query.eq('tax_year', taxYear);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Tax1099Form[];
    },
  });
};

// Hook to generate 1099 form
export const useGenerate1099Form = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: any) => {
      const { data, error } = await supabase
        .from('tax_forms_1099')
        .insert(formData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax1099Forms'] });
      toast.success('1099 form generated successfully');
    },
    onError: (error) => {
      toast.error('Failed to generate 1099 form: ' + error.message);
    },
  });
};

// Hook to fetch tax thresholds
export const useTaxThresholds = (taxYear?: number) => {
  return useQuery({
    queryKey: ['taxThresholds', taxYear],
    queryFn: async () => {
      let query = supabase
        .from('tax_thresholds')
        .select('*')
        .eq('is_active', true)
        .order('tax_year', { ascending: false });

      if (taxYear) {
        query = query.eq('tax_year', taxYear);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TaxThreshold[];
    },
  });
};

// Hook to track tax transaction
export const useTrackTaxTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      portfolioId?: string;
      payerId: string;
      payeeId: string;
      propertyId?: string;
      transactionType: string;
      amount: number;
      paymentDate: string;
      description?: string;
      originalTransactionId?: string;
      originalTransactionTable?: string;
    }) => {
      const { data, error } = await supabase.rpc('track_tax_transaction', {
        p_portfolio_id: params.portfolioId,
        p_payer_id: params.payerId,
        p_payee_id: params.payeeId,
        p_property_id: params.propertyId,
        p_transaction_type: params.transactionType,
        p_amount: params.amount,
        p_payment_date: params.paymentDate,
        p_description: params.description,
        p_original_transaction_id: params.originalTransactionId,
        p_original_transaction_table: params.originalTransactionTable,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxTransactions'] });
    },
    onError: (error) => {
      toast.error('Failed to track tax transaction: ' + error.message);
    },
  });
};