import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Code, Download, Copy, ExternalLink, Book, Terminal, Zap, Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SDK {
  id: string;
  name: string;
  language: string;
  description: string;
  version: string;
  downloads: number;
  lastUpdated: string;
  documentation: string;
  repository: string;
  examples: CodeExample[];
}

interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
}

const sdks: SDK[] = [
  {
    id: 'javascript-sdk',
    name: 'JavaScript SDK',
    language: 'JavaScript',
    description: 'Full-featured SDK for web applications with TypeScript support',
    version: '2.1.0',
    downloads: 15240,
    lastUpdated: '2024-01-20',
    documentation: '/docs/javascript-sdk',
    repository: 'https://github.com/example/white-label-js-sdk',
    examples: [
      {
        title: 'Initialize Client',
        description: 'Initialize the White Label client with your API key',
        language: 'javascript',
        code: `import { WhiteLabelClient } from '@whitelabel/sdk';

const client = new WhiteLabelClient({
  apiKey: 'your-api-key',
  environment: 'production' // or 'sandbox'
});`
      },
      {
        title: 'Create Configuration',
        description: 'Create a new white-label configuration',
        language: 'javascript',
        code: `const config = await client.configs.create({
  companyName: 'Acme Corp',
  primaryColor: '#007bff',
  customDomain: 'app.acmecorp.com',
  features: ['forms', 'analytics', 'payments']
});

console.log('Config created:', config.id);`
      }
    ]
  },
  {
    id: 'python-sdk',
    name: 'Python SDK',
    language: 'Python',
    description: 'Comprehensive Python SDK for server-side applications',
    version: '1.8.2',
    downloads: 8920,
    lastUpdated: '2024-01-18',
    documentation: '/docs/python-sdk',
    repository: 'https://github.com/example/white-label-python-sdk',
    examples: [
      {
        title: 'Install and Import',
        description: 'Install the SDK and import the client',
        language: 'python',
        code: `# Install via pip
pip install whitelabel-sdk

# Import and initialize
from whitelabel import WhiteLabelClient

client = WhiteLabelClient(
    api_key="your-api-key",
    environment="production"
)`
      },
      {
        title: 'Manage Forms',
        description: 'Create and manage forms programmatically',
        language: 'python',
        code: `# Create a new form
form = client.forms.create(
    config_id="config-123",
    name="Contact Form",
    fields=[
        {"name": "email", "type": "email", "required": True},
        {"name": "message", "type": "textarea", "required": True}
    ]
)

# Get form submissions
submissions = client.forms.get_submissions(form.id)
print(f"Received {len(submissions)} submissions")`
      }
    ]
  },
  {
    id: 'php-sdk',
    name: 'PHP SDK',
    language: 'PHP',
    description: 'Laravel and WordPress compatible PHP SDK',
    version: '1.5.1',
    downloads: 6710,
    lastUpdated: '2024-01-15',
    documentation: '/docs/php-sdk',
    repository: 'https://github.com/example/white-label-php-sdk',
    examples: [
      {
        title: 'Composer Installation',
        description: 'Install the SDK using Composer',
        language: 'php',
        code: `// Install via Composer
composer require whitelabel/sdk

// Initialize the client
<?php
require_once 'vendor/autoload.php';

use WhiteLabel\\Client;

$client = new Client([
    'api_key' => 'your-api-key',
    'environment' => 'production'
]);`
      },
      {
        title: 'Laravel Integration',
        description: 'Use the SDK in Laravel applications',
        language: 'php',
        code: `// In your Laravel controller
<?php

use WhiteLabel\\Client;

class WhiteLabelController extends Controller
{
    public function createConfig(Request $request)
    {
        $client = new Client(['api_key' => config('whitelabel.api_key')]);
        
        $config = $client->configs()->create([
            'company_name' => $request->company_name,
            'primary_color' => $request->primary_color,
            'custom_domain' => $request->custom_domain
        ]);
        
        return response()->json($config);
    }
}`
      }
    ]
  },
  {
    id: 'ruby-sdk',
    name: 'Ruby SDK',
    language: 'Ruby',
    description: 'Ruby SDK with Rails integration support',
    version: '1.3.0',
    downloads: 3450,
    lastUpdated: '2024-01-12',
    documentation: '/docs/ruby-sdk',
    repository: 'https://github.com/example/white-label-ruby-sdk',
    examples: [
      {
        title: 'Gem Installation',
        description: 'Install and configure the Ruby gem',
        language: 'ruby',
        code: `# Add to Gemfile
gem 'whitelabel-sdk'

# Install
bundle install

# Initialize
require 'whitelabel'

client = WhiteLabel::Client.new(
  api_key: 'your-api-key',
  environment: 'production'
)`
      }
    ]
  }
];

const webhookExamples = [
  {
    title: 'Form Submission Webhook',
    description: 'Handle form submission events',
    language: 'javascript',
    code: `// Express.js webhook handler
app.post('/webhooks/form-submission', (req, res) => {
  const { event_type, data } = req.body;
  
  if (event_type === 'form.submitted') {
    console.log('New form submission:', data);
    
    // Process the form data
    processFormSubmission(data);
    
    // Send confirmation email
    sendConfirmationEmail(data.email);
  }
  
  res.status(200).send('OK');
});`
  },
  {
    title: 'Webhook Verification',
    description: 'Verify webhook signatures for security',
    language: 'javascript',
    code: `const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in webhook handler
const isValid = verifyWebhookSignature(
  req.body,
  req.headers['x-webhook-signature'],
  process.env.WEBHOOK_SECRET
);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}`
  }
];

export const SDKHub: React.FC = () => {
  const [selectedSDK, setSelectedSDK] = useState<SDK | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Code has been copied to your clipboard."
    });
  };

  const downloadSDK = (sdk: SDK) => {
    toast({
      title: "SDK Download Started",
      description: `${sdk.name} download has been initiated.`
    });
  };

  const filteredSDKs = sdks.filter(sdk =>
    sdk.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sdk.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sdk.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6 text-green-500" />
            SDK Hub
          </h2>
          <p className="text-muted-foreground">
            Official SDKs and developer tools for integrating with the White Label platform
          </p>
        </div>
        <Button variant="outline">
          <Book className="h-4 w-4 mr-2" />
          View Documentation
        </Button>
      </div>

      <Tabs defaultValue="sdks">
        <TabsList>
          <TabsTrigger value="sdks">SDKs</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="graphql">GraphQL</TabsTrigger>
          <TabsTrigger value="testing">Testing Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="sdks" className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search SDKs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSDKs.map(sdk => (
              <Card key={sdk.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{sdk.name}</CardTitle>
                      <CardDescription>{sdk.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{sdk.language}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <span className="ml-2 font-medium">{sdk.version}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Downloads:</span>
                        <span className="ml-2 font-medium">{sdk.downloads.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Last updated: {sdk.lastUpdated}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedSDK(sdk)}>
                            View Examples
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                      
                      <Button size="sm" onClick={() => downloadSDK(sdk)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      
                      <Button variant="outline" size="sm" asChild>
                        <a href={sdk.repository} target="_blank" rel="noopener noreferrer">
                          <Github className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedSDK && (
            <Dialog open={!!selectedSDK} onOpenChange={() => setSelectedSDK(null)}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {selectedSDK.name} Examples
                  </DialogTitle>
                  <DialogDescription>
                    Code examples and integration guides for {selectedSDK.name}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {selectedSDK.examples.map((example, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{example.title}</h4>
                          <p className="text-sm text-muted-foreground">{example.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(example.code)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{example.code}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Integration</CardTitle>
              <CardDescription>
                Receive real-time notifications when events occur in your white-label sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {webhookExamples.map((example, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{example.title}</h4>
                        <p className="text-sm text-muted-foreground">{example.description}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(example.code)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre>{example.code}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graphql" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>GraphQL API</CardTitle>
              <CardDescription>
                Flexible GraphQL API for advanced querying and mutations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <span className="font-medium">Endpoint:</span>
                  <code className="bg-muted px-2 py-1 rounded text-sm">https://api.whitelabel.com/graphql</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard('https://api.whitelabel.com/graphql')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Sample Query</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{`query GetConfigurations($userId: ID!) {
  user(id: $userId) {
    id
    email
    whiteLabelConfigs {
      id
      companyName
      primaryColor
      customDomain
      isActive
      forms {
        id
        name
        submissions {
          id
          data
          createdAt
        }
      }
    }
  }
}`}</pre>
                  </div>
                </div>
                
                <Button>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open GraphQL Playground
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Testing Tool</CardTitle>
                <CardDescription>Test your webhook endpoints with simulated events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input placeholder="Webhook URL" />
                  <Button className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    Send Test Event
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>API Response Inspector</CardTitle>
                <CardDescription>Debug API responses and validate data structures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input placeholder="API Endpoint" />
                  <Button className="w-full">
                    <Terminal className="h-4 w-4 mr-2" />
                    Test Endpoint
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};