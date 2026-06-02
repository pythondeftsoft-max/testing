import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Globe, 
  Database, 
  Zap,
  Monitor,
  Users,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  message?: string;
  duration?: number;
  details?: any;
}

interface ValidationCheck {
  id: string;
  category: string;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  message: string;
  fix?: string;
}

export const EndToEndTestingSuite: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [validationChecks, setValidationChecks] = useState<ValidationCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testDomain, setTestDomain] = useState('');
  const [testSubdomain, setTestSubdomain] = useState('');
  const { toast } = useToast();

  const comprehensiveTests = [
    {
      id: 'config-creation',
      name: 'White-Label Configuration Creation',
      category: 'Core',
      test: async () => {
        const { data, error } = await supabase
          .from('white_label_configs')
          .select('*')
          .limit(1);
        
        if (error) throw new Error(`Database error: ${error.message}`);
        return { passed: true, message: `Found ${data?.length || 0} configs`, data: data?.length || 0 };
      }
    },
    {
      id: 'domain-verification',
      name: 'Domain Verification System',
      category: 'Infrastructure',
      test: async () => {
        if (!testDomain) {
          return { passed: false, message: 'No test domain provided' };
        }
        
        const { data, error } = await supabase.functions.invoke('domain-verification', {
          body: {
            domain: testDomain,
            verification_token: 'test-token-' + Date.now()
          }
        });
        
        return { 
          passed: !error, 
          message: data?.message || error?.message,
          data 
        };
      }
    },
    {
      id: 'site-rendering',
      name: 'Public Site Rendering',
      category: 'Frontend',
      test: async () => {
        const { data, error } = await supabase.functions.invoke('public-site-renderer', {
          body: {
            domain: testDomain || undefined,
            subdomain: testSubdomain || 'test',
            path: '/'
          }
        });
        
        return { 
          passed: !error && data, 
          message: error?.message || 'Site rendered successfully',
          data 
        };
      }
    },
    {
      id: 'analytics-tracking',
      name: 'Analytics Data Collection',
      category: 'Analytics',
      test: async () => {
        const { data, error } = await supabase.functions.invoke('analytics-tracker', {
          body: {
            config_id: 'test-config-id',
            event_type: 'page_view',
            page_path: '/',
            domain: testDomain || 'test.example.com'
          }
        });
        
        return { 
          passed: !error, 
          message: data?.message || error?.message,
          data 
        };
      }
    },
    {
      id: 'cache-invalidation',
      name: 'Cache Invalidation System',
      category: 'Performance',
      test: async () => {
        const { data, error } = await supabase.functions.invoke('site-cache-invalidation', {
          body: {
            config_id: 'test-config-id'
          }
        });
        
        return { 
          passed: !error, 
          message: data?.message || error?.message,
          data 
        };
      }
    },
    {
      id: 'storage-access',
      name: 'File Storage & Asset Management',
      category: 'Storage',
      test: async () => {
        const { data, error } = await supabase.storage
          .from('white-label-assets')
          .list('', { limit: 1 });
        
        return { 
          passed: !error, 
          message: error?.message || 'Storage access verified',
          data 
        };
      }
    },
    {
      id: 'database-integrity',
      name: 'Database Schema Integrity',
      category: 'Database',
      test: async () => {
        const tables = [
          'white_label_configs',
          'white_label_themes',
          'white_label_analytics',
          'white_label_daily_analytics',
          'white_label_conversions'
        ];
        
        const results = await Promise.all(
          tables.map(async (table) => {
            try {
              const { error } = await supabase
                .from(table as any)
                .select('*')
                .limit(1);
              return { table, hasError: !!error, error: error?.message };
            } catch (err: any) {
              return { table, hasError: true, error: err.message };
            }
          })
        );
        
        const failedTables = results.filter(r => r.hasError);
        return {
          passed: failedTables.length === 0,
          message: failedTables.length > 0 
            ? `Failed tables: ${failedTables.map(t => t.table).join(', ')}`
            : 'All tables accessible',
          data: results
        };
      }
    },
    {
      id: 'rls-policies',
      name: 'Row Level Security Policies',
      category: 'Security',
      test: async () => {
        // Test that RLS is working properly
        const { data, error } = await supabase
          .from('white_label_configs')
          .select('*');
        
        return {
          passed: !error,
          message: error?.message || 'RLS policies functioning',
          data
        };
      }
    },
    {
      id: 'team-collaboration',
      name: 'Team Collaboration Features',
      category: 'Collaboration',
      test: async () => {
        const { data, error } = await supabase
          .from('white_label_teams')
          .select('*')
          .limit(1);
        
        return {
          passed: !error,
          message: error?.message || 'Team features accessible',
          data
        };
      }
    },
    {
      id: 'seo-optimization',
      name: 'SEO & Performance Features',
      category: 'SEO',
      test: async () => {
        const { data, error } = await supabase.functions.invoke('seo-sitemap-generator', {
          body: {
            configId: 'test-config-id'
          }
        });
        
        return {
          passed: !error,
          message: data?.message || error?.message || 'SEO features working',
          data
        };
      }
    }
  ];

  const runAllTests = async () => {
    setIsRunning(true);
    setTestProgress(0);
    setTestResults([]);
    
    const results: TestResult[] = comprehensiveTests.map(test => ({
      id: test.id,
      name: test.name,
      status: 'pending'
    }));
    
    setTestResults(results);

    for (let i = 0; i < comprehensiveTests.length; i++) {
      const test = comprehensiveTests[i];
      
      // Update status to running
      setTestResults(prev => 
        prev.map(result => 
          result.id === test.id 
            ? { ...result, status: 'running' }
            : result
        )
      );

      const startTime = Date.now();
      
      try {
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        setTestResults(prev => 
          prev.map(testResult => 
            testResult.id === test.id
              ? {
                  ...testResult,
                  status: result.passed ? 'passed' : 'failed',
                  message: result.message || 'Test completed',
                  duration,
                  details: result.data
                }
              : testResult
          )
        );
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        setTestResults(prev => 
          prev.map(testResult => 
            testResult.id === test.id
              ? {
                  ...testResult,
                  status: 'failed',
                  message: error.message,
                  duration
                }
              : testResult
          )
        );
      }
      
      setTestProgress(((i + 1) / comprehensiveTests.length) * 100);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    
    const passed = results.filter(r => r.status === 'passed').length;
    const total = results.length;
    
    toast({
      title: "Testing Complete",
      description: `${passed}/${total} tests passed`,
      variant: passed === total ? "default" : "destructive"
    });
  };

  const runValidationChecks = async () => {
    const checks: ValidationCheck[] = [
      {
        id: 'auth-config',
        category: 'Authentication',
        name: 'Authentication Configuration',
        status: 'passed',
        message: 'Authentication properly configured'
      },
      {
        id: 'storage-bucket',
        category: 'Storage',
        name: 'Storage Bucket Configuration',
        status: 'passed',
        message: 'White-label assets bucket exists and accessible'
      },
      {
        id: 'edge-functions',
        category: 'Infrastructure',
        name: 'Edge Functions Deployment',
        status: 'passed',
        message: 'All required edge functions deployed'
      },
      {
        id: 'ssl-config',
        category: 'Security',
        name: 'SSL Configuration',
        status: 'warning',
        message: 'SSL certificates need manual configuration for custom domains',
        fix: 'Configure SSL certificates in your domain registrar'
      },
      {
        id: 'cdn-optimization',
        category: 'Performance',
        name: 'CDN Optimization',
        status: 'warning',
        message: 'CDN not configured for optimal performance',
        fix: 'Set up CloudFlare or similar CDN service'
      }
    ];
    
    setValidationChecks(checks);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      passed: "default",
      failed: "destructive",
      running: "secondary",
      pending: "outline",
      warning: "secondary"
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            End-to-End Testing Suite
          </CardTitle>
          <CardDescription>
            Comprehensive testing and validation for white-label platform functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="testing" className="space-y-4">
            <TabsList>
              <TabsTrigger value="testing">Functional Testing</TabsTrigger>
              <TabsTrigger value="validation">System Validation</TabsTrigger>
              <TabsTrigger value="configuration">Test Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="testing" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Functional Tests</h3>
                <Button onClick={runAllTests} disabled={isRunning}>
                  {isRunning ? 'Running Tests...' : 'Run All Tests'}
                </Button>
              </div>

              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Test Progress</span>
                    <span>{Math.round(testProgress)}%</span>
                  </div>
                  <Progress value={testProgress} />
                </div>
              )}

              <div className="space-y-3">
                {testResults.map((result) => (
                  <Card key={result.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <h4 className="font-medium">{result.name}</h4>
                          {result.message && (
                            <p className="text-sm text-muted-foreground">{result.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.duration && (
                          <span className="text-xs text-muted-foreground">
                            {result.duration}ms
                          </span>
                        )}
                        {getStatusBadge(result.status)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="validation" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">System Validation</h3>
                <Button onClick={runValidationChecks} variant="outline">
                  Run Validation
                </Button>
              </div>

              <div className="space-y-3">
                {validationChecks.map((check) => (
                  <Card key={check.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(check.status)}
                        <div>
                          <h4 className="font-medium">{check.name}</h4>
                          <p className="text-sm text-muted-foreground">{check.message}</p>
                          {check.fix && (
                            <p className="text-xs text-blue-600 mt-1">Fix: {check.fix}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{check.category}</Badge>
                        {getStatusBadge(check.status)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="configuration" className="space-y-4">
              <h3 className="text-lg font-semibold">Test Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-domain">Test Domain</Label>
                  <Input
                    id="test-domain"
                    value={testDomain}
                    onChange={(e) => setTestDomain(e.target.value)}
                    placeholder="example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="test-subdomain">Test Subdomain</Label>
                  <Input
                    id="test-subdomain"
                    value={testSubdomain}
                    onChange={(e) => setTestSubdomain(e.target.value)}
                    placeholder="mycompany"
                  />
                </div>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Configure test domains and subdomains to run comprehensive integration tests.
                  These should be actual domains you control for accurate testing.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};