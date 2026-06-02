import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type OcrDocType = 'paystub' | 'lease';

export interface PaystubExtraction {
  employer_name: string;
  employee_name: string;
  pay_period_start: string | null;
  pay_period_end: string | null;
  pay_date: string | null;
  gross_pay: number;
  net_pay: number;
  ytd_gross: number;
  ytd_net: number;
  pay_frequency: string;
  hours_worked: number | null;
  hourly_rate: number | null;
  annual_gross_estimate: number;
  confidence: Record<string, 'high' | 'medium' | 'low'>;
  warnings: string[];
  file_name: string;
}

export interface LeaseExtraction {
  tenant_names: string[];
  landlord_name: string;
  landlord_phone: string;
  landlord_email: string;
  property_address: string;
  unit_number: string;
  city: string;
  state: string;
  zip: string;
  monthly_rent: number;
  security_deposit: number;
  pet_deposit: number;
  lease_start_date: string | null;
  lease_end_date: string | null;
  term_months: number;
  bedroom_count: number | null;
  bathroom_count: number | null;
  utilities_paid_by_tenant: string[];
  utilities_paid_by_landlord: string[];
  appliances_provided: string[];
  late_fee: number;
  confidence: Record<string, 'high' | 'medium' | 'low'>;
  warnings: string[];
  file_name: string;
}

export function useDocumentOcr() {
  const [extracting, setExtracting] = useState(false);
  const [paystub, setPaystub] = useState<PaystubExtraction | null>(null);
  const [lease, setLease] = useState<LeaseExtraction | null>(null);

  const extract = useCallback(async (file: File, docType: OcrDocType) => {
    setExtracting(true);
    try {
      const fnName = docType === 'paystub' ? 'extract-paystub-ocr' : 'extract-lease-ocr';
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke(fnName, { body: formData });
      if (error) throw error;

      if (!data?.success) {
        toast.error(data?.error || 'Extraction failed');
        return null;
      }

      if (docType === 'paystub') {
        setPaystub(data.data);
      } else {
        setLease(data.data);
      }
      toast.success(`Extracted ${docType === 'paystub' ? 'pay stub' : 'lease'} data`);
      return data.data;
    } catch (e) {
      console.error('ocr extract', e);
      toast.error('Could not process document');
      return null;
    } finally {
      setExtracting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPaystub(null);
    setLease(null);
  }, []);

  return { extracting, paystub, lease, extract, reset };
}
