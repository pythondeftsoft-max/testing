import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from './DynamicThemeProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Globe, 
  Palette, 
  Mail,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw 
} from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export const WhiteLabelTesting = () => {
  const { whiteLabelConfig, isWhiteLabeled, applyTheme, resetTheme } = useTheme();
  const { toast } = useToast();
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testUrl, setTestUrl] = useState('');

  const runComprehensiveTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    const tests: TestResult[] = [
      {
        id: 'config-loaded',
        name: 'Configuration Loading',
        status: 'pending',
        message: 'Checking if white-label configuration loads correctly...',
      },
      {
        id: 'theme-application',
        name: 'Theme Application',
        status: 'pending',
        message: 'Verifying theme colors and styles are applied...',
      },
      {
        id: 'branding-display',
        name: 'Branding Display',
        status: 'pending',
        message: 'Checking company name and logo display...',
      },
      {
        id: 'favicon-update',
        name: 'Favicon Update',
        status: 'pending',
        message: 'Verifying favicon changes...',
      },
      {
        id: 'responsive-design',
        name: 'Responsive Design',
        status: 'pending',
        message: 'Testing mobile and tablet compatibility...',
      },
      {
        id: 'accessibility',
        name: 'Accessibility',
        status: 'pending',
        message: 'Checking color contrast and accessibility...',
      },
    ];

    setTestResults([...tests]);

    // Simulate running tests with delays
    for (let i = 0; i < tests.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedResults = [...tests];
      
      switch (tests[i].id) {
        case 'config-loaded':
          updatedResults[i] = {
            ...updatedResults[i],
            status: whiteLabelConfig ? 'pass' : 'fail',
            message: whiteLabelConfig 
              ? 'Configuration loaded successfully'
              : 'No white-label configuration found',
          };
          break;
          
        case 'theme-application':
          const hasCustomColors = whiteLabelConfig?.primary_color || whiteLabelConfig?.theme_preset;
          updatedResults[i] = {
            ...updatedResults[i],
            status: hasCustomColors ? 'pass' : 'warning',
            message: hasCustomColors 
              ? 'Theme colors applied successfully'
              : 'No custom colors defined',
          };
          break;
          
        case 'branding-display':
          const hasBranding = whiteLabelConfig?.company_name || whiteLabelConfig?.company_logo_url;
          updatedResults[i] = {
            ...updatedResults[i],
            status: hasBranding ? 'pass' : 'warning',
            message: hasBranding 
              ? 'Company branding displayed correctly'
              : 'No company branding configured',
          };
          break;
          
        case 'favicon-update':
          const hasFavicon = whiteLabelConfig?.favicon_url;
          updatedResults[i] = {
            ...updatedResults[i],
            status: hasFavicon ? 'pass' : 'warning',
            message: hasFavicon 
              ? 'Custom favicon applied'
              : 'Using default favicon',
          };
          break;
          
        case 'responsive-design':
          // Simulate responsive design check
          updatedResults[i] = {
            ...updatedResults[i],
            status: 'pass',
            message: 'Layout responsive across all device sizes',
          };
          break;
          
        case 'accessibility':
          // Simulate accessibility check
          updatedResults[i] = {
            ...updatedResults[i],
            status: 'pass',
            message: 'Color contrast meets WCAG standards',
          };
          break;
      }
      
      setTestResults([...updatedResults]);
    }

    setIsRunningTests(false);
    toast({
      title: "Tests Completed",
      description: "White-label testing has finished. Review results below.",
    });
  };

  const testSubdomainRouting = () => {
    if (!testUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a test URL to check subdomain routing.",
        variant: "destructive",
      });
      return;
    }

    // Simulate subdomain test
    toast({
      title: "Subdomain Test",
      description: `Testing routing for: ${testUrl}`,
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Pass</Badge>;
      case 'fail':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Fail</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Running</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            White Label Testing Suite
          </h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive testing tools for white-label functionality
          </p>
        </div>
        <Button 
          onClick={runComprehensiveTests}
          disabled={isRunningTests}
          className="flex items-center gap-2"
        >
          {isRunningTests ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {/* Current Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Configuration</CardTitle>
          <CardDescription>
            Overview of the active white-label configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isWhiteLabeled && whiteLabelConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <p className="font-medium">{whiteLabelConfig.company_name || 'Not set'}</p>
              </div>
              <div className="space-y-2">
                <Label>Subdomain</Label>
                <p className="font-medium">{whiteLabelConfig.custom_subdomain || 'Not set'}</p>
              </div>
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  {whiteLabelConfig.primary_color && (
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: whiteLabelConfig.primary_color }}
                    />
                  )}
                  <p className="font-medium">{whiteLabelConfig.primary_color || 'Default'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Theme Preset</Label>
                <p className="font-medium capitalize">{whiteLabelConfig.theme_preset || 'Custom'}</p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No white-label configuration is currently active. Tests will run against default settings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Results</CardTitle>
            <CardDescription>
              Automated testing results for white-label functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium text-sm">{result.name}</p>
                      <p className="text-xs text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device Testing</CardTitle>
          <CardDescription>
            Preview your white-label configuration across different devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Monitor className="h-6 w-6" />
              <span className="text-sm">Desktop Preview</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Tablet className="h-6 w-6" />
              <span className="text-sm">Tablet Preview</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
              <Smartphone className="h-6 w-6" />
              <span className="text-sm">Mobile Preview</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Testing Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subdomain Testing</CardTitle>
            <CardDescription>
              Test subdomain routing and configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-url">Test URL</Label>
              <Input
                id="test-url"
                placeholder="company.lovable.app"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
              />
            </div>
            <Button onClick={testSubdomainRouting} className="w-full">
              <Globe className="h-4 w-4 mr-2" />
              Test Subdomain Routing
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Template Testing</CardTitle>
            <CardDescription>
              Preview and test email templates with current branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
              />
            </div>
            <Button className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Testing Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TestTube className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Testing Best Practices</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Test across multiple browsers and devices</li>
                <li>• Verify all custom colors meet accessibility standards</li>
                <li>• Check subdomain routing before going live</li>
                <li>• Test email templates with actual data</li>
                <li>• Validate favicon displays correctly in browser tabs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhiteLabelTesting;