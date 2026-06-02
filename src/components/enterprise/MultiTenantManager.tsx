import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Users, Settings, Palette, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getMockTenants, 
  createMockTenant, 
  updateMockTenantStatus,
  type Tenant
} from '@/utils/mockEnterpriseData';

const MultiTenantManager = () => {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [newTenantForm, setNewTenantForm] = useState({
    name: '',
    domain: '',
    plan: 'starter' as const,
  });
  const { toast } = useToast();

  // Use mock data temporarily until database tables are created
  const tenants: Tenant[] = getMockTenants();
  const isLoading = false;

  const createTenantMutation = {
    mutate: async (tenantData: typeof newTenantForm) => {
      await createMockTenant(tenantData);
      setNewTenantForm({ name: '', domain: '', plan: 'starter' });
      toast({
        title: "Tenant Created",
        description: "New enterprise tenant has been successfully created",
      });
    }
  };

  const updateTenantStatus = {
    mutate: async ({ tenantId, status }: { tenantId: string; status: string }) => {
      await updateMockTenantStatus({ tenantId, status });
      toast({
        title: "Status Updated",
        description: "Tenant status has been updated successfully",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'starter': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Multi-Tenant Management</h2>
          <p className="text-muted-foreground">Manage enterprise tenants and configurations</p>
        </div>
      </div>

      <Tabs defaultValue="tenants" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="create">Create Tenant</TabsTrigger>
          <TabsTrigger value="branding">White Label</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <div className="grid gap-4">
            {tenants.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    No enterprise tenants created yet. Create your first tenant to get started.
                  </div>
                </CardContent>
              </Card>
            ) : (
              tenants.map((tenant) => (
                <Card key={tenant.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Building className="h-5 w-5 text-gray-500" />
                        <div>
                          <CardTitle className="text-lg">{tenant.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(tenant.status)}>
                          {tenant.status}
                        </Badge>
                        <Badge className={getPlanColor(tenant.plan)}>
                          {tenant.plan}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{tenant.user_count} users</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{tenant.portfolio_count} portfolios</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(tenant.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Select onValueChange={(value) => updateTenantStatus.mutate({ tenantId: tenant.id, status: value })}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="trial">Trial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tenant Name</label>
                <Input
                  value={newTenantForm.name}
                  onChange={(e) => setNewTenantForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tenant name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Domain</label>
                <Input
                  value={newTenantForm.domain}
                  onChange={(e) => setNewTenantForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="tenant.example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Plan</label>
                <Select value={newTenantForm.plan} onValueChange={(value: any) => setNewTenantForm(prev => ({ ...prev, plan: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => createTenantMutation.mutate(newTenantForm)}
                disabled={!newTenantForm.name || !newTenantForm.domain}
              >
                Create Tenant
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>White Label Branding</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure custom branding for enterprise tenants including logos, colors, and company names.
              </p>
              {/* Branding configuration would go here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MultiTenantManager;
