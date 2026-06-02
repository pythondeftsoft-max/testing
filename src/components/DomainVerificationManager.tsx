import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Copy, ExternalLink, RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DomainVerification {
  id: string;
  domain: string;
  verification_token: string;
  verification_status: string;
  verification_method: string;
  verified_at: string | null;
  created_at: string;
  last_checked_at?: string | null;
  needs_reverification?: boolean;
  verification_attempts?: number;
  reset_at?: string | null;
  reset_by?: string | null;
}

interface DomainVerificationManagerProps {
  whiteLabelConfigId: string;
}

export const DomainVerificationManager = ({ whiteLabelConfigId }: DomainVerificationManagerProps) => {
  const [verifying, setVerifying] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [reverifying, setReverifying] = useState<string | null>(null);
  const [checkingDns, setCheckingDns] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: verifications, isLoading } = useQuery({
    queryKey: ['domain-verifications', whiteLabelConfigId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_verifications')
        .select('*')
        .eq('white_label_config_id', whiteLabelConfigId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DomainVerification[];
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (verification: DomainVerification) => {
      const response = await supabase.functions.invoke('verify-domain', {
        body: {
          domain: verification.domain,
          verification_token: verification.verification_token
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: data.verified ? "Domain Verified" : "Verification Failed",
        description: data.message,
        variant: data.verified ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['domain-verifications'] });
    },
    onError: (error) => {
      toast({
        title: "Verification Error",
        description: "Failed to verify domain: " + error.message,
        variant: "destructive",
      });
    },
  });

  const resetDomainMutation = useMutation({
    mutationFn: async (verification: DomainVerification) => {
      setResetting(verification.id);
      const response = await supabase.functions.invoke('reset-domain-verification', {
        body: {
          domain: verification.domain,
          verification_id: verification.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Domain Verification Reset",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['domain-verifications'] });
      setResetting(null);
    },
    onError: (error) => {
      toast({
        title: "Reset Error",
        description: "Failed to reset domain verification: " + error.message,
        variant: "destructive",
      });
      setResetting(null);
    },
  });

  const reverifyDomainMutation = useMutation({
    mutationFn: async (verification: DomainVerification) => {
      setReverifying(verification.id);
      const response = await supabase.functions.invoke('reverify-domain', {
        body: {
          domain: verification.domain,
          verification_token: verification.verification_token,
          verification_id: verification.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: data.verified ? "Domain Re-verified" : "Re-verification Failed",
        description: data.message,
        variant: data.verified ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['domain-verifications'] });
      setReverifying(null);
    },
    onError: (error) => {
      toast({
        title: "Re-verification Error",
        description: "Failed to re-verify domain: " + error.message,
        variant: "destructive",
      });
      setReverifying(null);
    },
  });

  const checkDnsStatusMutation = useMutation({
    mutationFn: async (verification: DomainVerification) => {
      setCheckingDns(verification.id);
      const response = await supabase.functions.invoke('check-dns-status', {
        body: {
          domain: verification.domain,
          verification_token: verification.verification_token
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.recordFound) {
        toast({
          title: "DNS Record Found ✅",
          description: data.message,
        });
      } else {
        toast({
          title: "DNS Record Not Found ❌",
          description: data.message,
          variant: "destructive",
        });
      }
      setCheckingDns(null);
    },
    onError: (error) => {
      toast({
        title: "DNS Check Failed",
        description: "Failed to check DNS status: " + error.message,
        variant: "destructive",
      });
      setCheckingDns(null);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "DNS record value copied to clipboard",
    });
  };

  const getStatusBadge = (verification: DomainVerification) => {
    const { verification_status, needs_reverification } = verification;
    
    if (needs_reverification) {
      return <Badge variant="outline" className="border-orange-500 text-orange-700"><AlertTriangle className="w-3 h-3 mr-1" />Needs Re-verification</Badge>;
    }
    
    switch (verification_status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const formatLastChecked = (verification: DomainVerification) => {
    const { last_checked_at, verified_at } = verification;
    const date = last_checked_at || verified_at;
    
    if (!date) return null;
    
    return new Date(date).toLocaleString();
  };

  if (isLoading) {
    return <div>Loading domain verifications...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Domain Verification</h3>
        <p className="text-sm text-muted-foreground">
          Verify ownership of your custom domain by adding a DNS TXT record
        </p>
      </div>

      {verifications?.map((verification) => (
        <Card key={verification.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{verification.domain}</CardTitle>
                <CardDescription className="space-y-1">
                  <div>Created {new Date(verification.created_at).toLocaleDateString()}</div>
                  {formatLastChecked(verification) && (
                    <div className="text-xs">
                      Last checked: {formatLastChecked(verification)}
                    </div>
                  )}
                  {verification.verification_attempts && verification.verification_attempts > 0 && (
                    <div className="text-xs">
                      Verification attempts: {verification.verification_attempts}
                    </div>
                  )}
                </CardDescription>
              </div>
              {getStatusBadge(verification)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {verification.verification_status === 'pending' && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-medium">Add this TXT record to your DNS settings:</p>
                    
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">Name: _wl-verification.{verification.domain}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`_wl-verification.${verification.domain}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">Type: TXT</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono break-all">
                          Value: wl-verification={verification.verification_token}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`wl-verification=${verification.verification_token}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p>1. Add the TXT record to your domain's DNS settings</p>
                      <p>2. Wait for DNS propagation (up to 24 hours)</p>
                      <p>3. Click "Verify Domain" below</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {verification.verification_status === 'verified' && verification.verified_at && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Domain verified successfully on {new Date(verification.verified_at).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}

            {verification.verification_status === 'failed' && (
              <Alert variant="destructive">
                <XCircle className="w-4 h-4" />
                <AlertDescription>
                  Domain verification failed. Please check your DNS settings and try again.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 flex-wrap">
              {verification.verification_status === 'pending' && (
                <Button
                  onClick={() => verifyDomainMutation.mutate(verification)}
                  disabled={verifyDomainMutation.isPending}
                  size="sm"
                >
                  {verifyDomainMutation.isPending ? 'Verifying...' : 'Verify Domain'}
                </Button>
              )}

              {verification.verification_status === 'verified' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reverifyDomainMutation.mutate(verification)}
                  disabled={reverifying === verification.id}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${reverifying === verification.id ? 'animate-spin' : ''}`} />
                  {reverifying === verification.id ? 'Re-verifying...' : 'Re-verify Domain'}
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resetting === verification.id}
                  >
                    <RotateCcw className={`w-3 h-3 mr-1 ${resetting === verification.id ? 'animate-spin' : ''}`} />
                    {resetting === verification.id ? 'Resetting...' : 'Reset Verification'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Domain Verification</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will generate a new verification token and reset the verification status to pending. 
                      You will need to update your DNS record with the new token. Are you sure you want to continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetDomainMutation.mutate(verification)}>
                      Reset Verification
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkDnsStatusMutation.mutate(verification)}
                disabled={checkingDns === verification.id}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${checkingDns === verification.id ? 'animate-spin' : ''}`} />
                {checkingDns === verification.id ? 'Checking...' : 'Check DNS'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {(!verifications || verifications.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No domain verifications found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Save your settings with a custom domain to start verification
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};