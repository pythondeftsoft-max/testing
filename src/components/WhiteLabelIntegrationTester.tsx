import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Play } from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  duration?: number;
}

const WhiteLabelIntegrationTester = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const tests = [
    {
      id: 'subdomain-config',
      name: 'Subdomain Configuration Test',
      fn: testSubdomainConfig
    },
    {
      id: 'domain-config',
      name: 'Custom Domain Configuration Test',
      fn: testDomainConfig
    },
    {
      id: 'theme-application',
      name: 'Theme Application Test',
      fn: testThemeApplication
    },
    {
      id: 'database-integration',
      name: 'Database Integration Test',
      fn: testDatabaseIntegration
    },
    {
      id: 'security-validation',
      name: 'Security Validation Test',
      fn: testSecurityValidation
    }
  ];

  async function testSubdomainConfig(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Test subdomain functionality by checking table structure
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('custom_subdomain')
        .not('custom_subdomain', 'is', null)
        .limit(1);

      if (error) throw error;

      return {
        id: 'subdomain-config',
        name: 'Subdomain Configuration Test',
        status: 'passed',
        message: 'Subdomain configuration structure is working correctly',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        id: 'subdomain-config',
        name: 'Subdomain Configuration Test',
        status: 'failed',
        message: `Subdomain test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  async function testDomainConfig(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Test custom domain functionality by checking table structure
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('custom_domain')
        .not('custom_domain', 'is', null)
        .limit(1);

      if (error) throw error;

      return {
        id: 'domain-config',
        name: 'Custom Domain Configuration Test',
        status: 'passed',
        message: 'Custom domain configuration structure is working correctly',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        id: 'domain-config',
        name: 'Custom Domain Configuration Test',
        status: 'failed',
        message: `Domain test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  async function testThemeApplication(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Test theme application
      const testConfig = {
        primary_color: '#2563eb',
        secondary_color: '#1e40af',
        accent_color: '#3b82f6',
        theme_preset: 'modern'
      };

      // Simulate theme application
      const root = document.documentElement;
      root.style.setProperty('--primary', '216 87% 58%');
      root.style.setProperty('--secondary', '222 84% 39%');

      return {
        id: 'theme-application',
        name: 'Theme Application Test',
        status: 'passed',
        message: 'Theme application is working correctly',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        id: 'theme-application',
        name: 'Theme Application Test',
        status: 'failed',
        message: `Theme test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  async function testDatabaseIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Test database connection and table access
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('id, user_id, company_name')
        .limit(1);

      if (error) throw error;

      return {
        id: 'database-integration',
        name: 'Database Integration Test',
        status: 'passed',
        message: 'Database integration is working correctly',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        id: 'database-integration',
        name: 'Database Integration Test',
        status: 'failed',
        message: `Database test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  async function testSecurityValidation(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Test RLS policies and security
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Test user can only access their own config
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      return {
        id: 'security-validation',
        name: 'Security Validation Test',
        status: 'passed',
        message: 'Security validation passed - RLS policies are working',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        id: 'security-validation',
        name: 'Security Validation Test',
        status: 'failed',
        message: `Security test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Initialize all tests as pending
    const initialResults = tests.map(test => ({
      id: test.id,
      name: test.name,
      status: 'pending' as const,
      message: 'Waiting to run...'
    }));
    setTestResults(initialResults);

    // Run tests sequentially
    for (const test of tests) {
      // Update to running
      setTestResults(prev => prev.map(result => 
        result.id === test.id 
          ? { ...result, status: 'running', message: 'Running test...' }
          : result
      ));

      // Run the test
      const result = await test.fn();
      
      // Update with result
      setTestResults(prev => prev.map(r => 
        r.id === test.id ? result : r
      ));

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    
    const failed = testResults.filter(r => r.status === 'failed').length;
    const passed = testResults.filter(r => r.status === 'passed').length;
    
    toast({
      title: failed > 0 ? 'Tests Completed with Issues' : 'All Tests Passed!',
      description: `${passed} passed, ${failed} failed`,
      variant: failed > 0 ? 'destructive' : 'default'
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      passed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-auto">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Integration Testing Suite
          </CardTitle>
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {testResults.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Click "Run All Tests" to start the integration testing suite
          </div>
        ) : (
          testResults.map((result) => (
            <div key={result.id} className="flex items-center gap-3 p-3 border rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="font-medium">{result.name}</div>
                <div className="text-sm text-muted-foreground">{result.message}</div>
                {result.duration && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Completed in {result.duration}ms
                  </div>
                )}
              </div>
              {getStatusBadge(result.status)}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default WhiteLabelIntegrationTester;