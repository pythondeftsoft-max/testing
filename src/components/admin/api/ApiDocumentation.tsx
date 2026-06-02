import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, ChevronDown, ChevronRight, Lock, Eye, Edit, Send, ArrowRight, ArrowLeft, Globe, Server, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  permissions: string[];
  requestBody?: object;
  responseExample?: object;
}

interface EndpointSection {
  title: string;
  icon: React.ReactNode;
  endpoints: Endpoint[];
}

const API_URLS = {
  branded: 'https://api.openkeyhousing.com',
  direct: 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/agent-matchmaker-api'
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  POST: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  PUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  PATCH: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const PERMISSION_ICONS: Record<string, React.ReactNode> = {
  read: <Eye className="w-3 h-3" />,
  assign: <Edit className="w-3 h-3" />,
  push: <Send className="w-3 h-3" />,
  advance: <ArrowRight className="w-3 h-3" />,
  regress: <ArrowLeft className="w-3 h-3" />,
};

const ENDPOINT_SECTIONS: EndpointSection[] = [
  {
    title: 'Pipeline Operations',
    icon: <ArrowRight className="w-4 h-4" />,
    endpoints: [
      {
        method: 'GET',
        path: '/pipeline/stats',
        description: 'Get pipeline statistics and counts by stage',
        permissions: ['read'],
        responseExample: {
          tenants: { unassigned: 5, assigned: 12, lease_signed: 8, housed_paid: 45 },
          properties: { unassigned: 3, available: 15, in_process: 6, filled_awaiting_payment: 2, paid_housed: 38 },
        },
      },
      {
        method: 'GET',
        path: '/pipeline/tenants',
        description: 'Get all tenants in the pipeline with their current stage',
        permissions: ['read'],
        responseExample: [
          { id: 'uuid', name: 'John Doe', stage: 'assigned', assigned_worker: 'uuid', created_at: '2024-01-15' },
        ],
      },
      {
        method: 'GET',
        path: '/pipeline/properties',
        description: 'Get all properties in the pipeline with their current stage',
        permissions: ['read'],
      },
      {
        method: 'POST',
        path: '/pipeline/advance',
        description: 'Advance an entity to the next pipeline stage',
        permissions: ['advance'],
        requestBody: { entity_type: 'tenant', entity_id: 'uuid', worker_id: 'uuid' },
        responseExample: { success: true, entity_type: 'tenant', entity_id: 'uuid', previous_stage: 'assigned', new_stage: 'lease_signed' },
      },
      {
        method: 'POST',
        path: '/pipeline/jump',
        description: 'Jump an entity directly to the final stage (housed/paid)',
        permissions: ['advance'],
        requestBody: { entity_type: 'tenant', entity_id: 'uuid', notes: 'Fast-tracked placement' },
        responseExample: { success: true, entity_type: 'tenant', entity_id: 'uuid', new_stage: 'housed_paid' },
      },
      {
        method: 'POST',
        path: '/pipeline/regress',
        description: 'Move an entity back to the previous pipeline stage',
        permissions: ['regress'],
        requestBody: { entity_type: 'tenant', entity_id: 'uuid', reason: 'Deal fell through' },
        responseExample: { success: true, entity_type: 'tenant', entity_id: 'uuid', previous_stage: 'lease_signed', new_stage: 'assigned', reason: 'Deal fell through' },
      },
    ],
  },
  {
    title: 'Queue Operations',
    icon: <Edit className="w-4 h-4" />,
    endpoints: [
      {
        method: 'GET',
        path: '/queue/tenants',
        description: 'Get unassigned tenants in the queue',
        permissions: ['read'],
      },
      {
        method: 'GET',
        path: '/queue/properties',
        description: 'Get unassigned properties in the queue',
        permissions: ['read'],
      },
      {
        method: 'POST',
        path: '/queue/assign',
        description: 'Assign an entity to a worker',
        permissions: ['assign'],
        requestBody: { entity_type: 'tenant', entity_id: 'uuid', worker_id: 'uuid' },
        responseExample: { success: true, entity_type: 'tenant', entity_id: 'uuid', worker_id: 'uuid', message: 'Entity assigned successfully' },
      },
      {
        method: 'POST',
        path: '/queue/unassign',
        description: 'Remove worker assignment from an entity',
        permissions: ['assign'],
        requestBody: { entity_type: 'property', entity_id: 'uuid', reason: 'Reassignment needed' },
        responseExample: { success: true, entity_type: 'property', entity_id: 'uuid', message: 'Entity unassigned successfully', reason: 'Reassignment needed' },
      },
    ],
  },
  {
    title: 'Territory & Workers',
    icon: <Eye className="w-4 h-4" />,
    endpoints: [
      {
        method: 'GET',
        path: '/territories',
        description: 'List all territories with worker counts',
        permissions: ['read'],
      },
      {
        method: 'GET',
        path: '/territories/:id',
        description: 'Get territory details including assigned workers',
        permissions: ['read'],
      },
      {
        method: 'GET',
        path: '/workers',
        description: 'List all workers with workload statistics',
        permissions: ['read'],
        responseExample: [
          { id: 'uuid', name: 'Jane Smith', active_tenants: 12, active_properties: 8, territory: 'Downtown' },
        ],
      },
    ],
  },
  {
    title: 'Matching & Push Operations',
    icon: <Send className="w-4 h-4" />,
    endpoints: [
      {
        method: 'POST',
        path: '/match',
        description: 'Get scored property recommendations for a tenant',
        permissions: ['read'],
        requestBody: { tenant_id: 'uuid', limit: 10 },
        responseExample: {
          success: true,
          tenant: { id: 'uuid', name: 'John Doe', budget: 2000 },
          matches: [{ unit_id: 'uuid', score: 85, breakdown: { budget: 90, bedrooms: 100, timing: 80, location: 70 } }],
        },
      },
      {
        method: 'POST',
        path: '/push',
        description: 'Push a property recommendation to a tenant',
        permissions: ['push'],
        requestBody: { tenant_id: 'uuid', property_id: 'uuid', unit_id: 'uuid', notes: 'Great match!', send_email: false },
        responseExample: { success: true, push_id: 'uuid', tenant_id: 'uuid', property_id: 'uuid', email_sent: false },
      },
      {
        method: 'PATCH',
        path: '/push/:push_id',
        description: 'Update the status of an existing push',
        permissions: ['push'],
        requestBody: { status: 'cancelled', reason: 'Tenant found housing elsewhere' },
        responseExample: { success: true, push_id: 'uuid', previous_status: 'push_sent', new_status: 'cancelled', reason: 'Tenant found housing elsewhere' },
      },
      {
        method: 'DELETE',
        path: '/push/:push_id',
        description: 'Delete/unsend a push to unlock the property',
        permissions: ['push'],
        responseExample: { success: true, message: 'Push deleted, property unlocked', push_id: 'uuid', tenant_id: 'uuid', property_id: 'uuid' },
      },
      {
        method: 'GET',
        path: '/history',
        description: 'Get match history for a tenant or property',
        permissions: ['read'],
        requestBody: { tenant_id: 'uuid' },
        responseExample: {
          success: true,
          count: 5,
          history: [{ id: 'uuid', tenant: { id: 'uuid', name: 'John' }, property: { id: 'uuid', address: '123 Main St' }, push_type: 'agent_match', created_at: '2024-01-15' }],
        },
      },
    ],
  },
];

const EndpointCard: React.FC<{ endpoint: Endpoint; baseUrl: string }> = ({ endpoint, baseUrl }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyCurl = () => {
    const curl = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"${
      endpoint.requestBody ? ` \\
  -d '${JSON.stringify(endpoint.requestBody)}'` : ''
    }`;
    navigator.clipboard.writeText(curl);
    toast.success('cURL command copied to clipboard');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer rounded-lg border">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Badge variant="secondary" className={METHOD_COLORS[endpoint.method]}>
              {endpoint.method}
            </Badge>
            <code className="text-sm font-mono">{endpoint.path}</code>
          </div>
          <div className="flex items-center gap-2">
            {endpoint.permissions.map((perm) => (
              <Badge key={perm} variant="outline" className="text-xs flex items-center gap-1">
                {PERMISSION_ICONS[perm]}
                {perm}
              </Badge>
            ))}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-8 py-4 space-y-4 border-l-2 border-muted ml-3">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>

          {endpoint.requestBody && (
            <div>
              <label className="text-sm font-medium">Request Body</label>
              <pre className="mt-1 bg-muted p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(endpoint.requestBody, null, 2)}
              </pre>
            </div>
          )}

          {endpoint.responseExample && (
            <div>
              <label className="text-sm font-medium">Response Example</label>
              <pre className="mt-1 bg-muted p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(endpoint.responseExample, null, 2)}
              </pre>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleCopyCurl}>
            <Copy className="w-4 h-4 mr-2" />
            Copy cURL
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ApiDocumentation: React.FC = () => {
  const [useBrandedUrl, setUseBrandedUrl] = useState(false);
  const currentBaseUrl = useBrandedUrl ? API_URLS.branded : API_URLS.direct;
  const discoveryUrl = `${currentBaseUrl}/`;

  const handleCopyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-6">
      {/* URL Configuration Section */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            API Base URL
          </CardTitle>
          <CardDescription>
            Choose between the branded URL or direct Supabase URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="url-toggle"
                checked={useBrandedUrl}
                onCheckedChange={setUseBrandedUrl}
              />
              <Label htmlFor="url-toggle" className="flex items-center gap-2">
                {useBrandedUrl ? (
                  <>
                    <Globe className="w-4 h-4 text-primary" />
                    <span>Branded URL</span>
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span>Direct Supabase URL</span>
                  </>
                )}
              </Label>
            </div>
            {useBrandedUrl && (
              <Badge variant="secondary" className="text-xs">
                Requires DNS setup
              </Badge>
            )}
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                Current Base URL
                {useBrandedUrl && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Setup Required
                  </Badge>
                )}
              </label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-muted p-3 rounded text-sm break-all">
                  {currentBaseUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyUrl(currentBaseUrl, 'Base URL')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
              <label className="text-sm font-medium flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <ExternalLink className="w-4 h-4" />
                Discovery Endpoint (for AI Agents)
              </label>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 mb-2">
                Share this URL with external AI agents - they can query it to discover all available endpoints
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-blue-950 p-2 rounded text-sm break-all border">
                  GET {discoveryUrl}
                </code>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleCopyUrl(discoveryUrl, 'Discovery URL')}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          </div>

          {useBrandedUrl && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>DNS Setup Required:</strong> To use the branded URL, add a CNAME record:
              </p>
              <code className="block mt-2 bg-white dark:bg-amber-950 p-2 rounded text-xs">
                api.openkeyhousing.com → kixsdhnfzjnxikmnbipi.supabase.co
              </code>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Use Cloudflare, Vercel Edge, or Supabase Pro custom domains for SSL/proxy.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Authentication
          </CardTitle>
          <CardDescription>
            All API requests require authentication using an API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">API Key Header</label>
            <code className="block mt-1 bg-muted p-3 rounded text-sm">
              x-api-key: your_api_key_here
            </code>
          </div>
          <div>
            <label className="text-sm font-medium">Example Request</label>
            <pre className="mt-1 bg-muted p-3 rounded text-xs overflow-x-auto">
{`curl -X GET "${currentBaseUrl}/pipeline/stats" \\
  -H "x-api-key: ok_your_api_key_here" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rate Limiting</CardTitle>
          <CardDescription>
            API requests are rate limited per API key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              <Badge variant="outline">Default</Badge>
              60 requests per minute
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline">Configurable</Badge>
              Set custom rate limits per key
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline">Headers</Badge>
              Rate limit info returned in response headers
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Endpoints by Section */}
      {ENDPOINT_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {section.icon}
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {section.endpoints.map((endpoint) => (
              <EndpointCard key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} baseUrl={currentBaseUrl} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
