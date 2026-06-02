import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  Code,
  Database,
  Globe,
  Users,
  Settings
} from 'lucide-react';

const ProductionDocumentation = () => {
  const documentationSections = [
    {
      id: 'deployment',
      title: 'Deployment Guide',
      icon: <Globe className="h-5 w-5" />,
      content: {
        overview: 'Complete deployment checklist for production environments',
        steps: [
          'Configure environment variables for production',
          'Set up SSL certificates for custom domains',
          'Configure CDN for static assets',
          'Set up monitoring and alerting systems',
          'Configure backup and disaster recovery',
          'Test all white-label configurations',
          'Verify all edge functions are operational',
          'Run comprehensive security audits'
        ]
      }
    },
    {
      id: 'security',
      title: 'Security Best Practices',
      icon: <Shield className="h-5 w-5" />,
      content: {
        overview: 'Essential security configurations and monitoring',
        steps: [
          'Enable Row Level Security (RLS) on all tables',
          'Configure proper CORS headers for all domains',
          'Set up rate limiting for API endpoints',
          'Implement proper input validation and sanitization',
          'Configure secure session management',
          'Set up security audit logging',
          'Regular security scans and penetration testing',
          'Monitor for suspicious activity patterns'
        ]
      }
    },
    {
      id: 'performance',
      title: 'Performance Optimization',
      icon: <Zap className="h-5 w-5" />,
      content: {
        overview: 'Database and application performance tuning',
        steps: [
          'Add database indexes for frequently queried columns',
          'Implement proper caching strategies',
          'Optimize edge function performance',
          'Configure CDN for static assets',
          'Implement lazy loading for large components',
          'Optimize database queries and connections',
          'Monitor and alert on performance metrics',
          'Regular performance testing and optimization'
        ]
      }
    },
    {
      id: 'monitoring',
      title: 'Monitoring & Alerting',
      icon: <AlertTriangle className="h-5 w-5" />,
      content: {
        overview: 'Production monitoring and incident response',
        steps: [
          'Set up system health monitoring dashboards',
          'Configure alerts for critical system failures',
          'Monitor database performance metrics',
          'Track edge function execution times',
          'Monitor user activity and engagement',
          'Set up error tracking and reporting',
          'Configure automated backup verification',
          'Implement incident response procedures'
        ]
      }
    }
  ];

  const apiEndpoints = [
    {
      method: 'POST',
      endpoint: '/functions/v1/team-member-invitation',
      description: 'Send team member invitations',
      authentication: 'Required',
      rateLimit: '10 requests/minute'
    },
    {
      method: 'GET',
      endpoint: '/functions/v1/seo-sitemap-generator',
      description: 'Generate XML sitemaps',
      authentication: 'Optional',
      rateLimit: '5 requests/minute'
    },
    {
      method: 'POST',
      endpoint: '/functions/v1/custom-css-validator',
      description: 'Validate custom CSS/JS',
      authentication: 'Required',
      rateLimit: '20 requests/minute'
    },
    {
      method: 'POST',
      endpoint: '/functions/v1/webhook-handler',
      description: 'Process integration webhooks',
      authentication: 'API Key',
      rateLimit: '100 requests/minute'
    },
    {
      method: 'POST',
      endpoint: '/functions/v1/form-submission-processor',
      description: 'Process form submissions',
      authentication: 'Optional',
      rateLimit: '50 requests/minute'
    }
  ];

  const troubleshootingGuide = [
    {
      issue: 'White Label Site Not Loading',
      causes: ['DNS configuration', 'SSL certificate issues', 'Database connectivity'],
      solutions: [
        'Verify DNS records point to correct endpoints',
        'Check SSL certificate validity and configuration',
        'Test database connectivity and permissions',
        'Verify edge function deployment status'
      ]
    },
    {
      issue: 'Team Member Invitations Failing',
      causes: ['Email configuration', 'Permission issues', 'Rate limiting'],
      solutions: [
        'Check email service configuration',
        'Verify sender has appropriate permissions',
        'Check rate limiting thresholds',
        'Validate email addresses and team settings'
      ]
    },
    {
      issue: 'Performance Issues',
      causes: ['Database queries', 'Missing indexes', 'Edge function timeouts'],
      solutions: [
        'Analyze slow query logs',
        'Add missing database indexes',
        'Optimize edge function code',
        'Implement caching where appropriate'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Production Documentation</h1>
        <Badge variant="outline" className="ml-auto">v1.0.0</Badge>
      </div>

      <Tabs defaultValue="deployment" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
          <TabsTrigger value="api">API Reference</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="deployment">
          <div className="grid gap-6">
            {documentationSections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </CardTitle>
                  <p className="text-muted-foreground">{section.content.overview}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.content.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Endpoints
              </CardTitle>
              <p className="text-muted-foreground">
                Complete reference for all production API endpoints
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiEndpoints.map((endpoint, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'}>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{endpoint.endpoint}</code>
                      </div>
                      <Badge variant="outline">{endpoint.rateLimit}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{endpoint.description}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span>Authentication: <strong>{endpoint.authentication}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Troubleshooting Guide
              </CardTitle>
              <p className="text-muted-foreground">
                Common issues and their solutions
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {troubleshootingGuide.map((guide, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{guide.issue}</h4>
                    
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-muted-foreground mb-1">Common Causes:</h5>
                      <ul className="text-sm space-y-1">
                        {guide.causes.map((cause, causeIndex) => (
                          <li key={causeIndex} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-1">Solutions:</h5>
                      <ul className="text-sm space-y-1">
                        {guide.solutions.map((solution, solutionIndex) => (
                          <li key={solutionIndex} className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                            {solution}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance & Security
              </CardTitle>
              <p className="text-muted-foreground">
                Security compliance and data protection guidelines
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">GDPR Compliance</h4>
                    <ul className="text-sm space-y-1">
                      <li>✅ Data minimization principles</li>
                      <li>✅ User consent management</li>
                      <li>✅ Right to be forgotten</li>
                      <li>✅ Data portability</li>
                      <li>✅ Privacy by design</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">SOC 2 Type II</h4>
                    <ul className="text-sm space-y-1">
                      <li>✅ Security controls</li>
                      <li>✅ Availability monitoring</li>
                      <li>✅ Processing integrity</li>
                      <li>✅ Confidentiality measures</li>
                      <li>✅ Privacy protections</li>
                    </ul>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Security Measures</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium mb-1">Encryption</h5>
                      <ul className="space-y-1">
                        <li>• Data at rest (AES-256)</li>
                        <li>• Data in transit (TLS 1.3)</li>
                        <li>• End-to-end encryption</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">Access Control</h5>
                      <ul className="space-y-1">
                        <li>• Multi-factor authentication</li>
                        <li>• Role-based permissions</li>
                        <li>• Principle of least privilege</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">Monitoring</h5>
                      <ul className="space-y-1">
                        <li>• Real-time threat detection</li>
                        <li>• Audit logging</li>
                        <li>• Incident response</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionDocumentation;