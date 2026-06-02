import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, CheckCircle, XCircle, AlertCircle, Info, Link, Copy } from 'lucide-react';
import { useCheckbook } from '@/hooks/useCheckbook';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  timestamp: string;
  user_id: string;
  tests: Array<{
    test: string;
    status: 'PASS' | 'FAIL' | 'SKIP' | 'INFO';
    details: any;
  }>;
}

export const CheckbookTestPanel = () => {
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const { testConnection, isLoading } = useCheckbook();
  const { toast } = useToast();

  const runTest = async () => {
    const results = await testConnection();
    if (results) {
      setTestResults(results);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'SKIP':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-100 text-green-800';
      case 'FAIL':
        return 'bg-red-100 text-red-800';
      case 'SKIP':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  const webhookUrl = `${window.location.origin.replace('localhost:8080', 'localhost:54321')}/functions/v1/checkbook-webhook`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Checkbook Integration Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Test your Checkbook API configuration and connectivity before creating payouts.
          </p>
          
          <Button 
            onClick={runTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Running Tests...' : 'Run Integration Test'}
          </Button>

          <Alert>
            <Link className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Webhook URL: <code className="text-sm bg-muted px-1 rounded">{webhookUrl}</code></span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>

          {testResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Test Results</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(testResults.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="grid gap-3">
                {testResults.tests.map((test, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(test.status)}
                          <span className="font-medium">{test.test}</span>
                        </div>
                        <Badge className={getStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                      </div>
                      
                      {test.details && (
                        <div className="mt-3 space-y-2">
                          <Tabs defaultValue="summary" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="summary">Summary</TabsTrigger>
                              <TabsTrigger value="details">Details</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="summary" className="space-y-2">
                              {test.test === 'Environment Variables' && (
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>API Key:</span>
                                    <span className={test.details.has_api_key ? 'text-green-600' : 'text-red-600'}>
                                      {test.details.has_api_key ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>API Base:</span>
                                    <span className={test.details.has_api_base ? 'text-green-600' : 'text-red-600'}>
                                      {test.details.has_api_base ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Webhook Secret:</span>
                                    <span className={test.details.has_webhook_secret ? 'text-green-600' : 'text-red-600'}>
                                      {test.details.has_webhook_secret ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  {test.details.api_base_url && (
                                    <div className="col-span-2 flex justify-between">
                                      <span>Base URL:</span>
                                      <code className="text-xs bg-muted px-1 rounded">
                                        {test.details.api_base_url}
                                      </code>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {test.test === 'Checkbook API Connectivity' && (
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className={test.details.response_ok ? 'text-green-600' : 'text-red-600'}>
                                      {test.details.status_code} {test.details.response_ok ? '(Success)' : '(Failed)'}
                                    </span>
                                  </div>
                                  {test.details.user_data && (
                                    <div className="flex justify-between">
                                      <span>User ID:</span>
                                      <span className="text-blue-600">{test.details.user_data.id}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {test.test === 'Database Connectivity' && (
                                <div className="text-sm">
                                  <div className="flex justify-between">
                                    <span>Connection:</span>
                                    <span className={test.details.can_query ? 'text-green-600' : 'text-red-600'}>
                                      {test.details.can_query ? 'Success' : 'Failed'}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {test.test === 'Webhook Endpoint' && (
                                <div className="space-y-2">
                                  <div className="text-sm">
                                    <p className="font-medium">Configure this URL in your Checkbook dashboard:</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                                        {test.details.webhook_url}
                                      </code>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => copyToClipboard(test.details.webhook_url)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </TabsContent>
                            
                            <TabsContent value="details">
                              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                                {JSON.stringify(test.details, null, 2)}
                              </pre>
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};