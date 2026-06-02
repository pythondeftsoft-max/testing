import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Star, Download, Settings, Zap, Shield, Globe, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  downloads: number;
  price: string;
  icon: React.ReactNode;
  features: string[];
  developer: string;
  verified: boolean;
}

const integrations: Integration[] = [
  {
    id: 'stripe-payments',
    name: 'Stripe Payments',
    description: 'Accept payments securely with Stripe integration',
    category: 'payments',
    rating: 4.9,
    downloads: 12500,
    price: 'Free',
    icon: <Zap className="h-6 w-6" />,
    features: ['Credit card processing', 'Subscription billing', 'International payments'],
    developer: 'Stripe Inc.',
    verified: true
  },
  {
    id: 'mailchimp-marketing',
    name: 'Mailchimp Marketing',
    description: 'Email marketing and automation platform',
    category: 'marketing',
    rating: 4.7,
    downloads: 8900,
    price: '$19/mo',
    icon: <Users className="h-6 w-6" />,
    features: ['Email campaigns', 'Automation', 'Analytics'],
    developer: 'Mailchimp',
    verified: true
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track website performance and user behavior',
    category: 'analytics',
    rating: 4.8,
    downloads: 15600,
    price: 'Free',
    icon: <Globe className="h-6 w-6" />,
    features: ['Real-time tracking', 'Custom reports', 'Goal tracking'],
    developer: 'Google',
    verified: true
  },
  {
    id: 'auth0-security',
    name: 'Auth0 Security',
    description: 'Advanced authentication and security features',
    category: 'security',
    rating: 4.6,
    downloads: 6700,
    price: '$25/mo',
    icon: <Shield className="h-6 w-6" />,
    features: ['SSO', 'Multi-factor auth', 'User management'],
    developer: 'Auth0',
    verified: true
  }
];

export const APIMarketplace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();

  const categories = [
    { id: 'all', label: 'All Integrations' },
    { id: 'payments', label: 'Payments' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'security', label: 'Security' }
  ];

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = (integration: Integration) => {
    toast({
      title: "Integration Installed",
      description: `${integration.name} has been added to your white-label configuration.`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Marketplace</h2>
          <p className="text-muted-foreground">Discover and install integrations for your white-label sites</p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Manage Installed
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map(integration => (
              <Card key={integration.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {integration.icon}
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {integration.verified && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                          <span className="text-sm text-muted-foreground">{integration.developer}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {integration.description}
                  </CardDescription>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{integration.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({integration.downloads.toLocaleString()} downloads)
                      </span>
                    </div>
                    <Badge variant="outline">{integration.price}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedIntegration(integration)}>
                          View Details
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                    <Button size="sm" onClick={() => handleInstall(integration)}>
                      <Download className="h-4 w-4 mr-2" />
                      Install
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedIntegration && (
        <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedIntegration.icon}
                {selectedIntegration.name}
              </DialogTitle>
              <DialogDescription>
                {selectedIntegration.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <ul className="space-y-1">
                  {selectedIntegration.features.map((feature, index) => (
                    <li key={index} className="text-sm text-muted-foreground">• {feature}</li>
                  ))}
                </ul>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Price</div>
                  <div className="font-semibold">{selectedIntegration.price}</div>
                </div>
                <Button onClick={() => handleInstall(selectedIntegration)}>
                  <Download className="h-4 w-4 mr-2" />
                  Install Integration
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};