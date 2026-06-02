import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Info, FileText } from 'lucide-react';
import { useStripeConnection } from '@/hooks/useStripeConnection';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { formatDistanceToNow } from 'date-fns';

export const StripeConfigCard = () => {
  const { status, isLoading, testConnection } = useStripeConnection();
  const { data: platformConfig, isLoading: isLoadingConfig } = usePlatformConfig();
  const [hasTestedOnce, setHasTestedOnce] = useState(false);

  const handleTestConnection = async () => {
    await testConnection();
    setHasTestedOnce(true);
  };

  const openStripeDashboard = () => {
    window.open('https://dashboard.stripe.com', '_blank');
  };

  const openStripeLogs = (functionName: string) => {
    const projectId = 'kixsdhnfzjnxikmnbipi';
    window.open(
      `https://supabase.com/dashboard/project/${projectId}/functions/${functionName}/logs`,
      '_blank'
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
            </svg>
            Stripe Configuration
          </CardTitle>
          <CardDescription>
            Manage your Stripe payment processing setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Stripe is used to process placement fee payments from landlords. Test the connection to verify your setup.
            </AlertDescription>
          </Alert>

          {!hasTestedOnce ? (
            <div className="text-center py-8 space-y-4">
              <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Test Stripe Connection</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click below to verify your Stripe configuration and view account details
                </p>
              </div>
              <Button onClick={handleTestConnection} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : status ? (
            <div className="space-y-4">
              {/* Connection Status */}
              <Card className={status.connected ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {status.connected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {status.connected ? 'Stripe Connected' : 'Connection Failed'}
                      </p>
                      {status.connected ? (
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Account ID:</span>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">{status.accountId}</code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Email:</span>
                            <span>{status.email}</span>
                          </div>
                          {status.businessName && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Business:</span>
                              <span>{status.businessName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Type:</span>
                            <Badge variant="outline" className="text-xs">{status.accountType}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Currency:</span>
                            <span>{status.currency}</span>
                          </div>
                          {status.created && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Created:</span>
                              <span>{formatDistanceToNow(new Date(status.created), { addSuffix: true })}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-destructive mt-1">{status.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Capabilities */}
              {status.connected && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Account Status</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">Charges</span>
                        <Badge variant={status.chargesEnabled ? 'default' : 'secondary'} className="text-xs">
                          {status.chargesEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">Payouts</span>
                        <Badge variant={status.payoutsEnabled ? 'default' : 'secondary'} className="text-xs">
                          {status.payoutsEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">Details</span>
                        <Badge variant={status.detailsSubmitted ? 'default' : 'secondary'} className="text-xs">
                          {status.detailsSubmitted ? 'Submitted' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">Cards</span>
                        <Badge variant={status.capabilities?.card_payments === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {status.capabilities?.card_payments || 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleTestConnection} variant="outline" disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={openStripeDashboard} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Stripe Dashboard
                </Button>
              </div>
            </div>
          ) : null}

          {/* Platform Fee Configuration */}
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-base">Platform Fee Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingConfig ? (
                <Skeleton className="h-24 w-full" />
              ) : platformConfig?.config_value ? (
                <div className="space-y-3">
                  {Object.entries(platformConfig.config_value).map(([method, fees]: [string, any]) => (
                    <div key={method} className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium text-sm mb-2 capitalize">{method.replace('_', ' ')}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Stripe Fee: {fees.stripe_processing_fee}%</div>
                        <div>Platform Fee: {fees.platform_revenue_fee}%</div>
                        <div>Tenant Pays: {fees.tenant_pays_percent}%</div>
                        <div>Landlord Pays: {fees.landlord_pays_percent}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No fee configuration found</p>
              )}
            </CardContent>
          </Card>

          {/* Debugging Tools */}
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="text-base">Debugging & Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => openStripeLogs('create-placement-fee-payment')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Payment Creation Logs
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => openStripeLogs('placement-fee-webhook')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Payment Webhook Logs
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => openStripeLogs('stripe-connect-webhook')}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Stripe Connect Logs
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
