import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Building2, BarChart3 } from 'lucide-react';
import { useClientProperties } from '@/hooks/useClientProperties';
import { ClientPropertiesTable } from './ClientPropertiesTable';
import { AddClientPropertyModal } from './AddClientPropertyModal';
import { AddClientModal } from './AddClientModal';
import { Badge } from '@/components/ui/badge';

interface ClientServicesTabProps {
  adminUserId: string;
  refreshKey?: number;
}

export const ClientServicesTab: React.FC<ClientServicesTabProps> = ({ adminUserId, refreshKey }) => {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [addPropertyModalOpen, setAddPropertyModalOpen] = useState(false);
  const { clients, loading, refetch } = useClientProperties();

  useEffect(() => {
    if (refreshKey && refreshKey > 0) refetch();
  }, [refreshKey]);

  const totalProperties = clients.reduce((sum, client) => sum + client.property_count, 0);
  const totalListings = clients.reduce((sum, client) => sum + client.active_listings, 0);
  const totalApplications = clients.reduce((sum, client) => sum + client.application_count, 0);

  return (
    <>
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Client Portfolio Overview
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddClientModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
            <Button onClick={() => setAddPropertyModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client Property
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{clients.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{totalProperties}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {totalListings}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {totalApplications}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Clients/Properties</CardTitle>
              <CardDescription>
                Manage properties for external clients without OpenKey accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientPropertiesTable clients={clients} loading={loading} refetch={refetch} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card key={client.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{client.client_name}</CardTitle>
                  <CardDescription>
                    {client.client_email || 'No email provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Properties:</span>
                    <span className="font-medium">{client.property_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Listings:</span>
                    <Badge variant="secondary">{client.active_listings}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Applications:</span>
                    <Badge variant="outline">{client.application_count}</Badge>
                  </div>
                  {client.client_phone && (
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{client.client_phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {clients.length === 0 && !loading && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No clients yet. Add your first client property to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AddClientModal
        open={addClientModalOpen}
        onOpenChange={setAddClientModalOpen}
        onSuccess={refetch}
        adminUserId={adminUserId}
      />

      <AddClientPropertyModal
        open={addPropertyModalOpen}
        onOpenChange={setAddPropertyModalOpen}
        onSuccess={refetch}
        adminUserId={adminUserId}
      />
    </>
  );
};
