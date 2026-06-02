import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";

interface PlaidLinkAccountsProps {
  onSuccess?: (data: any) => void;
  onExit?: (error: any) => void;
  onPlaidOpen?: () => void;
  onPlaidClose?: () => void;
}

interface PlaidLinkObject {
  open: () => void;
  exit: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    Plaid: {
      create: (config: any) => PlaidLinkObject;
    };
  }
}

export const PlaidLinkAccounts: React.FC<PlaidLinkAccountsProps> = ({
  onSuccess,
  onExit,
  onPlaidOpen,
  onPlaidClose,
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const { toast } = useToast();

  // Load Plaid Link script
  useEffect(() => {
    if (window.Plaid) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Plaid Link script');
      toast({
        title: "Error",
        description: "Failed to load Plaid Link. Please try again.",
        variant: "destructive",
      });
    };
    
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [toast]);

  const createLinkToken = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('plaid-payment-methods', {
        body: { action: 'create_link_token' }
      });

      if (error) throw error;

      setLinkToken(data.link_token);
      return data.link_token;
    } catch (error) {
      console.error('Error creating link token:', error);
      toast({
        title: "Error",
        description: "Failed to initialize bank connection. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handlePlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    setLinkToken(null);
    onPlaidClose?.();
    try {
      setLoading(true);

      // Show immediate feedback that connection is in progress
      toast({
        title: "Bank Connected!",
        description: "Syncing transactions... This may take a moment.",
      });

      const { data, error } = await supabase.functions.invoke('plaid-payment-methods', {
        body: {
          action: 'exchange_public_token',
          public_token: publicToken,
          metadata
        }
      });

      if (error) throw error;

      // Check if transactions were synced or if they need more time
      const hasRetryableErrors = data.transactions_synced && 
        Object.values(data.transactions_synced).some((r: any) => r.retryable);
      
      if (hasRetryableErrors) {
        toast({
          title: "Connected Successfully!",
          description: `Linked to ${metadata.institution?.name || 'bank'}. Transactions are still syncing - check back in 1-2 minutes.`,
        });
      } else {
        const transactionCount = data.transactions_synced 
          ? Object.values(data.transactions_synced as Record<string, { transactions_stored?: number }>)
              .reduce((sum: number, r) => sum + (r.transactions_stored || 0), 0)
          : 0;
        toast({
          title: "Success!",
          description: transactionCount > 0 
            ? `Connected to ${metadata.institution?.name || 'bank'} and synced ${transactionCount} transactions.`
            : `Connected to ${metadata.institution?.name || 'bank'} successfully.`,
        });
      }

      onSuccess?.(data);

      // Populate local tenant_plaid_transactions table immediately (non-blocking)
      supabase.functions.invoke('plaid-payment-methods', {
        body: { action: 'sync_tenant_transactions' },
      }).catch(err => console.warn('Tenant transaction sync failed (non-critical):', err));
    } catch (error) {
      console.error('Error connecting account:', error);
      toast({
        title: "Error",
        description: "Failed to connect bank account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onPlaidClose, toast]);

  const handlePlaidExit = useCallback((error: any, metadata: any) => {
    setLinkToken(null);
    onPlaidClose?.();
    if (error) {
      console.error('Plaid Link error:', error);
      toast({
        title: "Connection Cancelled",
        description: error.display_message || "Bank connection was cancelled.",
        variant: "destructive",
      });
    }
    onExit?.(error);
  }, [onExit, onPlaidClose, toast]);

  const openPlaidLink = useCallback(async () => {
    if (!scriptLoaded || !window.Plaid) {
      toast({
        title: "Error",
        description: "Plaid Link is not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Always create a fresh token — never reuse a stale session
      const token = await createLinkToken();

      const plaidLink = window.Plaid.create({
        token,
        onSuccess: handlePlaidSuccess,
        onExit: handlePlaidExit,
        onEvent: (eventName: string, metadata: any) => {
          console.log('Plaid Link event:', eventName, metadata);
        },
      });

      onPlaidOpen?.();
      plaidLink.open();
    } catch (error) {
      console.error('Error opening Plaid Link:', error);
    }
  }, [scriptLoaded, createLinkToken, handlePlaidSuccess, handlePlaidExit, toast]);

  return (
    <Button
      onClick={openPlaidLink}
      disabled={loading || !scriptLoaded}
      className="flex items-center gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4" />
      )}
      {loading ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  );
};