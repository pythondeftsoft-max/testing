import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  plan_type: string | null;
  role: string | null;
  current_period_end: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
  date_subscribed: string;
  subscription_units: number | null;
  autopay_enabled: boolean | null;
  last_payment_amount: number | null;
  last_payment_date: string | null;
  is_white_label?: boolean;
  white_label_company?: string;
  white_label_domain?: string;
  monthly_cost?: number;
}

export interface AdminInvoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  due_date: number | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  number: string | null;
  customer_id?: string;
  customer_email?: string;
  user_name?: string;
  user_email?: string;
  user_id?: string;
  plan_name?: string;
  period_start?: number;
  period_end?: number;
}

export const useAdminSubscriptions = (search?: string, role?: string) => {
  return useQuery({
    queryKey: ['admin-subscriptions', search, role],
    queryFn: async () => {
      // Call the RPC function for regular subscriptions
      const { data, error } = await supabase
        .rpc('get_admin_subscriptions_with_payments');

      if (error) throw error;

      // Fetch white label configs with pricing
      const { data: whiteLabelConfigs } = await supabase
        .from('white_label_configs')
        .select(`
          id,
          user_id,
          company_name,
          custom_domain,
          custom_subdomain,
          created_at,
          monthly_cost,
          subscription_tier,
          approval_status
        `);

      // Get user emails for white label configs
      const whiteLabelUserIds = whiteLabelConfigs?.map(c => c.user_id) || [];
      const { data: whiteLabelUsers } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', whiteLabelUserIds);

      const userEmailMap = new Map(whiteLabelUsers?.map(u => [u.id, u.email]) || []);

      // Transform white label configs to subscription format
      const whiteLabelSubs = whiteLabelConfigs?.map(config => ({
        id: config.id,
        user_id: config.user_id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: config.approval_status === 'approved' ? 'active' : 'pending',
        plan_type: 'white_label',
        role: 'white_label',
        current_period_end: null,
        created_at: config.created_at,
        user_email: userEmailMap.get(config.user_id),
        user_name: config.company_name || 'Unknown',
        date_subscribed: config.created_at,
        subscription_units: null,
        autopay_enabled: null,
        last_payment_amount: config.monthly_cost,
        last_payment_date: null,
        is_white_label: true,
        white_label_company: config.company_name,
        white_label_domain: config.custom_domain || config.custom_subdomain,
        monthly_cost: config.monthly_cost,
      })) || [];

      // Combine regular and white label subscriptions
      let allSubscriptions = [...(data || []), ...whiteLabelSubs];

      // Apply client-side filtering for search and role
      if (search) {
        const searchLower = search.toLowerCase();
        allSubscriptions = allSubscriptions.filter((sub: any) => 
          sub.user_first_name?.toLowerCase().includes(searchLower) ||
          sub.user_last_name?.toLowerCase().includes(searchLower) ||
          sub.white_label_company?.toLowerCase().includes(searchLower) ||
          sub.white_label_domain?.toLowerCase().includes(searchLower) ||
          sub.stripe_customer_id?.toLowerCase().includes(searchLower)
        );
      }

      if (role) {
        allSubscriptions = allSubscriptions.filter((sub: any) => sub.role === role);
      }

      return allSubscriptions.map((sub: any) => ({
        ...sub,
        user_name: sub.is_white_label 
          ? sub.white_label_company 
          : `${sub.user_first_name || ''} ${sub.user_last_name || ''}`.trim() || 'Unknown',
        date_subscribed: sub.created_at,
      })) as AdminSubscription[];
    },
    staleTime: 30000,
  });
};

export const useAdminCustomerPortal = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-customer-portal', {
        body: { customerId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    },
  });
};

export const useAdminSyncSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-sync-subscription', {
        body: { customerId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Synced ${data.synced} subscription(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync subscription",
        variant: "destructive",
      });
    },
  });
};

export const useAdminCancelSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ subscriptionId, cancelImmediately = false }: { 
      subscriptionId: string; 
      cancelImmediately?: boolean 
    }) => {
      const { data, error } = await supabase.functions.invoke('admin-cancel-subscription', {
        body: { subscriptionId, cancelImmediately }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: variables.cancelImmediately 
          ? "Subscription canceled immediately" 
          : "Subscription will cancel at period end",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });
};

export const useAdminInvoices = (customerId?: string) => {
  return useQuery({
    queryKey: ['admin-invoices', customerId],
    queryFn: async () => {
      if (!customerId) return { invoices: [], has_more: false };
      
      const { data, error } = await supabase.functions.invoke('admin-list-invoices', {
        body: { customerId, limit: 20 }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
    staleTime: 60000,
  });
};

export const useAdminAllInvoices = () => {
  return useQuery({
    queryKey: ['admin-all-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-list-all-invoices', {
        body: { limit: 100 },
      });

      if (error) throw error;
      return data as { invoices: AdminInvoice[], has_more: boolean };
    },
    staleTime: 60000,
  });
};