import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MessagingQuota {
  canMessage: boolean;
  messagesRemaining: number;
  reason?: string;
  loading: boolean;
  error: string | null;
  isPrimary?: boolean;
}

interface QuotaResponse {
  can_message: boolean;
  messages_remaining: number;
  reason?: string;
  is_primary?: boolean;
}

interface SendMessageResponse {
  success: boolean;
  message_id?: string;
  error_message?: string;
}

export const useMessagingQuota = (userId?: string, applicationId?: string, isLandlord?: boolean) => {
  const [quota, setQuota] = useState<MessagingQuota>({
    canMessage: false,
    messagesRemaining: 0,
    reason: '',
    loading: true,
    error: null,
  });

  const checkQuota = async () => {
    if (!userId || !applicationId) {
      setQuota(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setQuota(prev => ({ ...prev, loading: true, error: null }));

      // Use different quota check based on user role
      if (isLandlord) {
        // Landlord quota check - 5 message limit before decision required
        const { data, error } = await supabase.rpc('check_landlord_messaging_quota', {
          p_application_id: applicationId,
          p_landlord_id: userId
        });

        if (error) throw error;

        if (data) {
          const quotaData = (Array.isArray(data) ? data[0] : data) as { can_message: boolean; messages_remaining: number; reason: string; is_primary: boolean };
          setQuota({
            canMessage: quotaData.can_message,
            messagesRemaining: quotaData.messages_remaining,
            reason: quotaData.reason || '',
            loading: false,
            error: null,
            isPrimary: quotaData.is_primary || false,
          });
        } else {
          setQuota(prev => ({ ...prev, loading: false }));
        }
      } else {
        // Tenant quota check - wait for landlord to message first, then unlimited responses
        const { data, error } = await supabase.rpc('check_messaging_quota', {
          p_application_id: applicationId,
          p_tenant_id: userId
        });

        if (error) throw error;

        if (data) {
          const quotaData = (Array.isArray(data) ? data[0] : data) as unknown as QuotaResponse;
          setQuota({
            canMessage: quotaData.can_message,
            messagesRemaining: quotaData.messages_remaining,
            reason: quotaData.reason || '',
            loading: false,
            error: null,
            isPrimary: quotaData.is_primary,
          });
        } else {
          setQuota(prev => ({ ...prev, loading: false }));
        }
      }
    } catch (error: any) {
      console.error('Error checking messaging quota:', error);
      setQuota(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to check quota'
      }));
    }
  };

  const sendMessage = async (messageText: string, messagePayload?: any): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    if (!userId || !applicationId) {
      return { success: false, error: 'Missing user or application ID' };
    }

    try {
      // Determine if sender is a landlord or tenant
      // Check if the user owns any properties related to this application
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      const isLandlord = profile?.user_type === 'landlord' || profile?.user_type === 'property_manager';

      // Call the appropriate function based on user role
      const functionName = isLandlord ? 'send_landlord_message' : 'send_tenant_message';
      
      const { data, error } = await supabase.rpc(functionName, {
        application_id: applicationId,
        message_text: messageText,
        sender_id: userId,
        p_payload: messagePayload || null
      });

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0] as unknown as SendMessageResponse;
        if (result.success) {
          // Update quota optimistically for tenants (landlords have no quota)
          if (!isLandlord) {
            setQuota(prev => ({
              ...prev,
              messagesRemaining: Math.max(0, prev.messagesRemaining - 1)
            }));
          }
          return { success: true, messageId: result.message_id };
        } else {
          return { success: false, error: result.error_message };
        }
      }
      return { success: false, error: 'Unexpected response format' };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message || 'Failed to send message' };
    }
  };

  useEffect(() => {
    checkQuota();
  }, [userId, applicationId]);

  // Listen for primary applicant updates
  useEffect(() => {
    const handlePrimaryUpdate = () => {
      checkQuota();
    };
    
    window.addEventListener('primary-applicant-updated', handlePrimaryUpdate);
    return () => window.removeEventListener('primary-applicant-updated', handlePrimaryUpdate);
  }, [userId, applicationId]);

  return {
    ...quota,
    refetch: checkQuota,
    sendMessage,
  };
};