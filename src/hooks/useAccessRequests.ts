import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLogRbacEvent } from '@/hooks/useLogRbacEvent';
import { useToast } from '@/hooks/use-toast';

export interface AccessRequest {
  id: string;
  requester_id: string;
  scope: 'account' | 'portfolio';
  portfolio_id: string | null;
  object_name: string;
  action: 'view' | 'edit' | 'delete' | 'create';
  justification: string | null;
  requested_duration_minutes: number;
  status: 'pending' | 'approved' | 'denied' | 'cancelled' | 'expired';
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  denied_by: string | null;
  denied_at: string | null;
  denial_reason: string | null;
}

export const useAccessRequests = () => {
  const { user } = useAuth();

  return useQuery<AccessRequest[]>({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching access requests:', error);
        throw error;
      }

      return data as AccessRequest[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateAccessRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logRbacEvent = useLogRbacEvent();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      scope: 'account' | 'portfolio';
      portfolioId: string | null;
      objectName: string;
      action: 'view' | 'edit' | 'delete' | 'create';
      justification: string;
      requestedDurationMinutes?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('access_requests')
        .insert({
          requester_id: user.id,
          scope: params.scope,
          portfolio_id: params.portfolioId,
          object_name: params.objectName,
          action: params.action,
          justification: params.justification,
          requested_duration_minutes: params.requestedDurationMinutes || 60,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the request creation
      logRbacEvent.mutate({
        scope: params.scope,
        object: params.objectName,
        action: params.action,
        portfolioId: params.portfolioId,
        allowed: false,
        metadata: {
          type: 'request_created',
          justification: params.justification,
          requested_duration_minutes: params.requestedDurationMinutes || 60,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast({
        title: 'Access Request Submitted',
        description: 'Your request has been submitted for review.',
      });
    },
    onError: (error) => {
      console.error('Error creating access request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit access request. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useApproveAccessRequest = () => {
  const queryClient = useQueryClient();
  const logRbacEvent = useLogRbacEvent();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      minutes?: number;
      reason?: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('approve_access_request', {
        p_request_id: params.requestId,
        p_minutes: params.minutes,
        p_reason: params.reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      queryClient.invalidateQueries({ queryKey: ['active-grants'] });
      
      toast({
        title: 'Request Approved',
        description: 'Access has been granted successfully.',
      });

      // Log the approval
      logRbacEvent.mutate({
        scope: 'account', // Will be overridden by actual request scope
        object: 'access_request',
        action: 'edit',
        allowed: true,
        metadata: {
          type: 'request_approved',
          request_id: variables.requestId,
          minutes: variables.minutes,
          reason: variables.reason,
        },
      });
    },
    onError: (error) => {
      console.error('Error approving access request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useDenyAccessRequest = () => {
  const queryClient = useQueryClient();
  const logRbacEvent = useLogRbacEvent();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      reason: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('deny_access_request', {
        p_request_id: params.requestId,
        p_reason: params.reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      
      toast({
        title: 'Request Denied',
        description: 'Access request has been denied.',
      });

      // Log the denial
      logRbacEvent.mutate({
        scope: 'account', // Will be overridden by actual request scope
        object: 'access_request',
        action: 'edit',
        allowed: true,
        metadata: {
          type: 'request_denied',
          request_id: variables.requestId,
          reason: variables.reason,
        },
      });
    },
    onError: (error) => {
      console.error('Error denying access request:', error);
      toast({
        title: 'Error',
        description: 'Failed to deny request. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useCancelAccessRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await (supabase as any).rpc('cancel_access_request', {
        p_request_id: requestId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast({
        title: 'Request Cancelled',
        description: 'Your access request has been cancelled.',
      });
    },
    onError: (error) => {
      console.error('Error cancelling access request:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel request. Please try again.',
        variant: 'destructive',
      });
    },
  });
};