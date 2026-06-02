import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, AlertCircle, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDomainVerification } from '@/hooks/useDomainVerification';

interface DomainManagementProps {
  configId: string;
  customDomain?: string;
  onDomainVerified: () => void;
}

const DomainManagement = ({ configId, customDomain, onDomainVerified }: DomainManagementProps) => {
  const [domain, setDomain] = useState(customDomain || '');
  const [verificationToken, setVerificationToken] = useState('');
  const [domainStatus, setDomainStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const {
    verifyCustomDomain,
    isVerifyingCustomDomain,
    testConfiguration,
    isTestingConfiguration,
    saveDomainSettings,
    isSavingDomainSettings,
    getCustomDomainStatus
  } = useDomainVerification(configId);

  // Load domain data from white_label_configs
  useEffect(() => {
    const loadDomainData = async () => {
      try {
        const { data, error } = await supabase
          .from('white_label_configs')
          .select('custom_domain, domain_verification_token, domain_verification_status')
          .eq('id', configId)
          .single();

        if (error) {
          console.error('Error loading domain data:', error);
          return;
        }

        if (data) {
          if (data.custom_domain) {
            setDomain(data.custom_domain);
          }
          if (data.domain_verification_token) {
            setVerificationToken(data.domain_verification_token);
          }
          if (data.domain_verification_status) {
            setDomainStatus(data.domain_verification_status);
          }
        }
      } catch (error) {
        console.error('Error loading domain data:', error);
      }
    };

    if (configId) {
      loadDomainData();
    }
  }, [configId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "TXT record value copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the value manually.",
        variant: "destructive",
      });
    }
  };

  const handleVerifyDomain = () => {
    if (!domain || !verificationToken) {
      toast({
        title: "Missing information",
        description: "Domain and verification token are required. Please save domain settings first.",
        variant: "destructive",
      });
      return;
    }

    verifyCustomDomain({ domain, verificationToken });
  };

  const handleTestConfiguration = () => {
    if (!domain) {
      toast({
        title: "Error",
        description: "Please enter a domain name",
        variant: "destructive",
      });
      return;
    }

    testConfiguration({ domain });
  };

  const handleSaveDomainSettings = () => {
    if (!domain) {
      toast({
        title: "Error",
        description: "Please enter a domain name",
        variant: "destructive",
      });
      return;
    }

    saveDomainSettings({ 
      configId, 
      domain, 
      autoRedirect: true 
    });

    // Reload domain data after saving
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('white_label_configs')
          .select('custom_domain, domain_verification_token, domain_verification_status')
          .eq('id', configId)
          .single();

        if (error) {
          console.error('Error reloading domain data:', error);
          return;
        }

        if (data) {
          if (data.custom_domain) {
            setDomain(data.custom_domain);
          }
          if (data.domain_verification_token) {
            setVerificationToken(data.domain_verification_token);
          }
          if (data.domain_verification_status) {
            setDomainStatus(data.domain_verification_status);
          }
        }
      } catch (error) {
        console.error('Error reloading domain data:', error);
      }
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Custom Domain Setup
        </CardTitle>
        <CardDescription>
          Connect your own domain to serve your white-labeled site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Domain Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Domain</label>
          <Input
            placeholder="yourdomain.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={domainStatus === 'verified'}
          />
          <p className="text-xs text-muted-foreground">
            Enter your custom domain without http:// or https://
          </p>
        </div>

        {/* Verification Status */}
        {domainStatus === 'verified' ? (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              Domain verified successfully! Your site is now accessible at <code>{domain}</code>
            </AlertDescription>
          </Alert>
        ) : verificationToken ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>DNS Verification Required</strong>
              <br />
              Add the following TXT record to your DNS settings:
            </AlertDescription>
          </Alert>
        ) : null}

        {/* DNS Instructions */}
        {verificationToken && domainStatus !== 'verified' && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div>
              <label className="text-sm font-medium">DNS Record Type</label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">TXT</Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Name/Host</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="px-2 py-1 bg-background rounded text-sm">
                  _wl-verification.{domain}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`_wl-verification.${domain}`)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Value</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="px-2 py-1 bg-background rounded text-sm">
                  {verificationToken}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(verificationToken)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                DNS changes can take up to 24-48 hours to propagate. Wait a few minutes after adding the record before verifying.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Additional DNS Records */}
        {domainStatus === 'verified' && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium">Additional DNS Configuration</h4>
            <p className="text-sm text-muted-foreground">
              Add these A records to point your domain to our servers:
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono">@</span>
                <span className="text-sm font-mono">185.158.133.1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono">www</span>
                <span className="text-sm font-mono">185.158.133.1</span>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                SSL certificates will be automatically provisioned within 24 hours of DNS propagation.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleSaveDomainSettings}
            disabled={isSavingDomainSettings || !domain}
          >
            {isSavingDomainSettings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Domain Settings"
            )}
          </Button>

          {verificationToken && domainStatus !== 'verified' && (
            <>
              <Button 
                onClick={handleVerifyDomain} 
                disabled={isVerifyingCustomDomain}
                className="w-full"
              >
                {isVerifyingCustomDomain ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Domain"
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleTestConfiguration}
                disabled={isTestingConfiguration}
              >
                {isTestingConfiguration ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Configuration"
                )}
              </Button>
            </>
          )}

          {domainStatus === 'verified' && (
            <Button variant="outline" disabled className="w-full">
              <Check className="mr-2 h-4 w-4" />
              Domain Verified
            </Button>
          )}
        </div>

        {/* Help Links */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Need help with DNS configuration?</p>
          <div className="flex gap-4">
            <a href="#" className="text-primary hover:underline">
              Cloudflare Guide
            </a>
            <a href="#" className="text-primary hover:underline">
              Namecheap Guide
            </a>
            <a href="#" className="text-primary hover:underline">
              GoDaddy Guide
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DomainManagement;