
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhiteLabelConfig {
  id?: string;
  user_id?: string;
  company_name?: string;
  company_logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_subdomain?: string;
  custom_domain?: string;
  favicon_url?: string;
  footer_text?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
  subscription_tier?: string;
  theme_preset?: string;
  landing_page_config?: any;
  email_template_config?: any;
  advanced_customization?: any;
  created_at?: string;
  updated_at?: string;
}

export const useWhiteLabel = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get white label config for user
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['white-label-config', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!userId,
  });

  // Create or update white label config
  const saveMutation = useMutation({
    mutationFn: async (configData: Partial<WhiteLabelConfig>) => {
      if (!userId) throw new Error('User ID is required');

      const payload = {
        ...configData,
        user_id: userId,
      };

      if (config?.id) {
        // Update existing config
        const { data, error } = await supabase
          .from('white_label_configs')
          .update(payload)
          .eq('id', config.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('white_label_configs')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['white-label-config', userId] });
      toast({
        title: "White Label Settings Saved",
        description: "Your branding configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error saving white label config:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save white label settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Upload file to white label assets bucket
  const uploadFile = async (file: File, folder: string = '') => {
    if (!userId) throw new Error('User ID is required');

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${folder}${folder ? '/' : ''}${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('white-label-assets')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('white-label-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  return {
    config,
    isLoading,
    error,
    saveConfig: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    uploadFile,
  };
};

// Hook for getting white label config by subdomain (public access)
export const useWhiteLabelBySubdomain = (subdomain: string) => {
  return useQuery({
    queryKey: ['white-label-subdomain', subdomain],
    queryFn: async () => {
      if (!subdomain) return null;

      // Race the query against a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 8000);
      });

      try {
        const queryPromise = (async () => {
          // Use SECURITY DEFINER RPC that returns ONLY safe branding columns
          // (no contact_email/phone/address) for anonymous visitors.
          const { data: safeData } = await supabase
            .rpc('get_white_label_public_by_subdomain', {
              subdomain_param: subdomain
            });

          if (safeData && safeData.length > 0) {
            return safeData[0];
          }

          // Fallback to regular subdomain lookup (for lovable subdomains)
          const { data } = await supabase
            .rpc('get_white_label_config_by_subdomain', {
              subdomain_param: subdomain
            });

          return data?.[0] || null;
        })();

        return await Promise.race([queryPromise, timeoutPromise]);
      } catch (error: any) {
        if (error.message === 'Query timeout') {
          console.warn('White label subdomain lookup timed out');
          return null;
        }
        throw error;
      }
    },
    enabled: !!subdomain,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on timeout
  });
};

// Hook for getting white label config by domain (public access)
export const useWhiteLabelByDomain = (domain: string) => {
  return useQuery({
    queryKey: ['white-label-domain', domain],
    queryFn: async () => {
      if (!domain) return null;

      // Race the query against a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 8000);
      });

      try {
        const queryPromise = supabase
          .rpc('get_white_label_config_by_domain', {
            domain_param: domain
          })
          .then(({ data }) => data?.[0] || null);

        return await Promise.race([queryPromise, timeoutPromise]);
      } catch (error: any) {
        if (error.message === 'Query timeout') {
          console.warn('White label domain lookup timed out');
          return null;
        }
        throw error;
      }
    },
    enabled: !!domain,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on timeout
  });
};
