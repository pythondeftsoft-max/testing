import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface TenantRental {
  id: string;
  user_id: string;
  address_text: string;
  landlord_name: string | null;
  monthly_rent: number;
  currency_code: string;
  start_month: number | null;
  start_year: number | null;
  end_month: number | null;
  end_year: number | null;
  created_at: string;
}

interface CreateRentalInput {
  address_text: string;
  landlord_name?: string;
  monthly_rent: number;
  currency_code: string;
  start_month?: number;
  start_year?: number;
  end_month?: number;
  end_year?: number;
}

export const useTenantRentals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tenant-rentals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_rentals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TenantRental[];
    },
    enabled: !!user,
  });
};

export const useCreateTenantRental = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRentalInput) => {
      if (!user) throw new Error('Not authenticated');

      const isNewCurrent = !input.end_month && !input.end_year;

      // Auto-close existing current rentals if the new one is "current"
      if (isNewCurrent && input.start_month && input.start_year) {
        const { data: currentRentals } = await supabase
          .from('tenant_rentals')
          .select('id, address_text')
          .eq('user_id', user.id)
          .is('end_month', null)
          .is('end_year', null);

        if (currentRentals && currentRentals.length > 0) {
          // Calculate previous month
          let prevMonth = input.start_month - 1;
          let prevYear = input.start_year;
          if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
          }

          for (const rental of currentRentals) {
            await supabase
              .from('tenant_rentals')
              .update({ end_month: prevMonth, end_year: prevYear })
              .eq('id', rental.id)
              .eq('user_id', user.id);
          }

          const names = currentRentals.map(r => r.address_text).join(', ');
          toast({
            title: 'Previous rental closed',
            description: `Rental at ${names} marked as ended`,
          });
        }
      }

      // Overlap check: fetch all rentals (after auto-close) and validate
      const { data: allRentals } = await supabase
        .from('tenant_rentals')
        .select('id, address_text, start_month, start_year, end_month, end_year')
        .eq('user_id', user.id);

      if (allRentals && input.start_month && input.start_year) {
        const newStart = input.start_year * 12 + input.start_month;
        const newEnd = (input.end_year && input.end_month) ? input.end_year * 12 + input.end_month : Infinity;

        const conflict = allRentals.find(r => {
          if (!r.start_month || !r.start_year) return false;
          const exStart = r.start_year * 12 + r.start_month;
          const exEnd = (r.end_year && r.end_month) ? r.end_year * 12 + r.end_month : Infinity;
          return newStart <= exEnd && newEnd >= exStart;
        });

        if (conflict) {
          throw new Error(`Date range overlaps with existing rental at "${conflict.address_text}". You cannot have two rentals for the same period.`);
        }
      }

      const { data, error } = await supabase
        .from('tenant_rentals')
        .insert({
          user_id: user.id,
          address_text: input.address_text,
          landlord_name: input.landlord_name || null,
          monthly_rent: input.monthly_rent,
          currency_code: input.currency_code,
          start_month: input.start_month || null,
          start_year: input.start_year || null,
          end_month: input.end_month || null,
          end_year: input.end_year || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-rentals'] });
      toast({ title: 'Rental saved', description: 'Your rental has been added.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateTenantRental = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: CreateRentalInput & { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Overlap check: fetch all rentals except the one being edited
      const { data: allRentals } = await supabase
        .from('tenant_rentals')
        .select('id, address_text, start_month, start_year, end_month, end_year')
        .eq('user_id', user.id)
        .neq('id', id);

      if (allRentals && input.start_month && input.start_year) {
        const newStart = input.start_year * 12 + input.start_month;
        const newEnd = (input.end_year && input.end_month) ? input.end_year * 12 + input.end_month : Infinity;

        const conflict = allRentals.find(r => {
          if (!r.start_month || !r.start_year) return false;
          const exStart = r.start_year * 12 + r.start_month;
          const exEnd = (r.end_year && r.end_month) ? r.end_year * 12 + r.end_month : Infinity;
          return newStart <= exEnd && newEnd >= exStart;
        });

        if (conflict) {
          throw new Error(`Date range overlaps with existing rental at "${conflict.address_text}". You cannot have two rentals for the same period.`);
        }
      }

      const { data, error } = await supabase
        .from('tenant_rentals')
        .update({
          address_text: input.address_text,
          landlord_name: input.landlord_name || null,
          monthly_rent: input.monthly_rent,
          currency_code: input.currency_code,
          start_month: input.start_month || null,
          start_year: input.start_year || null,
          end_month: input.end_month || null,
          end_year: input.end_year || null,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-rentals'] });
      toast({ title: 'Rental updated', description: 'Your rental has been updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteTenantRental = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tenant_rentals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-rentals'] });
      toast({ title: 'Rental deleted', description: 'Your rental has been removed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};
