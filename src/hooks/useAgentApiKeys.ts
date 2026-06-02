import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentApiKey {
  id: string;
  name: string;
  api_key_hash: string;
  description: string | null;
  permissions: string[] | null;
  rate_limit_per_minute: number | null;
  is_active: boolean | null;
  request_count: number | null;
  last_used_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

// Generate a secure random API key
const generateSecureKey = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return 'ok_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Hash the API key using SHA-256
const hashApiKey = async (key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

export const useAgentApiKeys = () => {
  const queryClient = useQueryClient();

  const keysQuery = useQuery({
    queryKey: ['agent-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AgentApiKey[];
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async ({
      name,
      description,
      permissions,
      rateLimitPerMinute,
    }: {
      name: string;
      description?: string;
      permissions: string[];
      rateLimitPerMinute: number;
    }) => {
      const rawKey = generateSecureKey();
      const keyHash = await hashApiKey(rawKey);

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('agent_api_keys').insert({
        name,
        description: description || null,
        api_key_hash: keyHash,
        permissions,
        rate_limit_per_minute: rateLimitPerMinute,
        is_active: true,
        created_by: userData.user?.id || null,
      });

      if (error) throw error;

      // Return the raw key to show to user once
      return { rawKey, name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-api-keys'] });
      toast.success(`API key "${data.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create API key', { description: error.message });
    },
  });

  const updateKeyMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<AgentApiKey, 'name' | 'description' | 'permissions' | 'rate_limit_per_minute' | 'is_active'>>;
    }) => {
      const { error } = await supabase
        .from('agent_api_keys')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-api-keys'] });
      toast.success('API key updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update API key', { description: error.message });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-api-keys'] });
      toast.success('API key deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete API key', { description: error.message });
    },
  });

  const toggleKeyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('agent_api_keys')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['agent-api-keys'] });
      toast.success(`API key ${isActive ? 'enabled' : 'disabled'} successfully`);
    },
    onError: (error: Error) => {
      toast.error('Failed to update API key status', { description: error.message });
    },
  });

  const recycleKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const rawKey = generateSecureKey();
      const keyHash = await hashApiKey(rawKey);

      const { data: keyData } = await supabase
        .from('agent_api_keys')
        .select('name')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('agent_api_keys')
        .update({
          api_key_hash: keyHash,
          request_count: 0,
          last_used_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      return { rawKey, name: keyData?.name || 'API Key' };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-api-keys'] });
      toast.success(`API key "${data.name}" recycled successfully`);
    },
    onError: (error: Error) => {
      toast.error('Failed to recycle API key', { description: error.message });
    },
  });

  return {
    keys: keysQuery.data || [],
    isLoading: keysQuery.isLoading,
    error: keysQuery.error,
    createKey: createKeyMutation.mutateAsync,
    isCreating: createKeyMutation.isPending,
    updateKey: updateKeyMutation.mutate,
    isUpdating: updateKeyMutation.isPending,
    deleteKey: deleteKeyMutation.mutateAsync,
    isDeleting: deleteKeyMutation.isPending,
    toggleKey: toggleKeyMutation.mutate,
    isToggling: toggleKeyMutation.isPending,
    recycleKey: recycleKeyMutation.mutateAsync,
    isRecycling: recycleKeyMutation.isPending,
  };
};
