import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface LogPaymentInput {
  address_text: string;
  landlord_name?: string;
  monthly_rent: number;
  currency_code: string;
  month: number;
  year: number;
  payment_date?: string;
  notes?: string;
  proofFile?: File;
  proof_url?: string;
  plaid_transaction_id?: string;
  plaid_transaction_data?: Record<string, unknown>;
  tenant_rental_id?: string;
}

export const useLogRentPayment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LogPaymentInput) => {
      if (!user) throw new Error('Not authenticated');

      let proof_url: string | null = input.proof_url || null;

      if (!proof_url && input.proofFile) {
        const ext = input.proofFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('rent-proof')
          .upload(filePath, input.proofFile);

        if (uploadError) throw uploadError;
        proof_url = filePath;
      }

      const { data, error } = await supabase
        .from('self_reported_rent')
        .upsert({
          user_id: user.id,
          address_text: input.address_text,
          landlord_name: input.landlord_name || null,
          monthly_rent: input.monthly_rent,
          currency_code: input.currency_code,
          month: input.month,
          year: input.year,
          payment_date: input.payment_date || null,
          notes: input.notes || null,
          proof_url,
          plaid_transaction_id: input.plaid_transaction_id || null,
          plaid_transaction_data: input.plaid_transaction_data || null,
        } as any, { onConflict: 'user_id,address_text,month,year' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['self-reported-rent'] });
      queryClient.invalidateQueries({ queryKey: ['unified-rent-history'] });

      const hasBankProof = !!variables.plaid_transaction_id;
      const hasFileProof = !!variables.proofFile;

      // Award points if any proof was provided
      if (hasBankProof || hasFileProof) {
        try {
          const { data: pointsResult, error: pointsError } = await supabase.functions.invoke(
            'log-rent-payment-points',
            {
              body: {
                rent_entry_id: data.id,
                month: variables.month,
                year: variables.year,
                has_file_proof: hasFileProof,
                has_bank_proof: hasBankProof,
              },
            }
          );

          if (pointsError) throw pointsError;

          const pts = pointsResult?.points_awarded ?? 0;
          const tier = pointsResult?.tier ?? '';

          if (pts > 0) {
            let description = `Your rent payment has been recorded. +${pts} pts`;
            if (tier === 'bank_current') description = `Bank verified · +${pts} pts earned`;
            else if (tier === 'bank_backdated') description = `Bank verified (backdated) · +${pts} pts earned`;
            else if (tier === 'file') description = `Payment logged with proof · +${pts} pts earned`;

            toast({ title: 'Payment logged', description });
          } else {
            toast({ title: 'Payment logged', description: 'Your rent payment has been recorded.' });
          }

          // Refresh points balance
          queryClient.invalidateQueries({ queryKey: ['user-points'] });
          queryClient.invalidateQueries({ queryKey: ['points-history'] });
        } catch (pointsErr) {
          // Points failure is non-critical — payment was already saved
          console.error('Points award failed (non-critical):', pointsErr);
          toast({ title: 'Payment logged', description: 'Your rent payment has been recorded.' });
        }
      } else {
        toast({ title: 'Payment logged', description: 'Your rent payment has been recorded.' });
      }

    },
    onError: (error: any) => {
      // Still refresh in case data was saved before the error
      queryClient.invalidateQueries({ queryKey: ['self-reported-rent'] });
      queryClient.invalidateQueries({ queryKey: ['unified-rent-history'] });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};
