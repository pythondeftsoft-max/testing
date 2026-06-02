import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { Loader2, CreditCard, CheckCircle, XCircle } from "lucide-react";

interface PlaidLinkProps {
  configId: string;
  onSuccess?: (data: any) => void;
  onExit?: (error: any) => void;
  isConnected?: boolean;
  institutionName?: string;
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

export const PlaidLink: React.FC<PlaidLinkProps> = ({
  configId,
  onSuccess,
  onExit,
  isConnected = false,
  institutionName
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
      
      const { data, error } = await supabase.functions.invoke('plaid-hap-sync', {
        body: { action: 'link_token' }
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
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('plaid-hap-sync', {
        body: {
          action: 'connect',
          configId,
          plaidData: {
            public_token: publicToken,
            metadata
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Connected to ${data.institution} successfully. Auto-tracking is now enabled.`,
      });

      onSuccess?.(data);
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
  }, [configId, onSuccess, toast]);

  const handlePlaidExit = useCallback((error: any, metadata: any) => {
    if (error) {
      console.error('Plaid Link error:', error);
      toast({
        title: "Connection Cancelled",
        description: error.display_message || "Bank connection was cancelled.",
        variant: "destructive",
      });
    }
    onExit?.(error);
  }, [onExit, toast]);

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
      let token = linkToken;
      if (!token) {
        token = await createLinkToken();
      }

      const plaidLink = window.Plaid.create({
        token,
        onSuccess: handlePlaidSuccess,
        onExit: handlePlaidExit,
        onEvent: (eventName: string, metadata: any) => {
          console.log('Plaid Link event:', eventName, metadata);
        },
      });

      plaidLink.open();
    } catch (error) {
      console.error('Error opening Plaid Link:', error);
    }
  }, [scriptLoaded, linkToken, createLinkToken, handlePlaidSuccess, handlePlaidExit, toast]);

  const handleDisconnect = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('plaid-hap-sync', {
        body: {
          action: 'disconnect',
          configId
        }
      });

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: "Bank account disconnected successfully. Auto-tracking is now disabled.",
      });

      onSuccess?.(data);
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect bank account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [configId, onSuccess, toast]);

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div className="flex-1">
          <p className="font-medium">Connected to {institutionName}</p>
          <p className="text-sm text-muted-foreground">Auto-tracking enabled</p>
        </div>
        <Button
          onClick={handleDisconnect}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg">
      <CreditCard className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="font-medium">Connect Bank Account</p>
        <p className="text-sm text-muted-foreground">
          Automatically track HAP payments from your bank
        </p>
      </div>
      <Button
        onClick={openPlaidLink}
        disabled={loading || !scriptLoaded}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        Connect Bank
      </Button>
    </div>
  );
};