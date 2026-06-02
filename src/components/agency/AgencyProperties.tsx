import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Building, Home, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/shared/EmptyState';

interface AgencyPropertiesProps {
  agencyId: string;
}

interface PropertyRecord {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  status: string;
  unit_count: number;
  default_tenant_type: string | null;
}

const AgencyProperties: React.FC<AgencyPropertiesProps> = ({ agencyId }) => {
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProperties();
  }, [agencyId]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      // Get tenant user_ids for this agency
      const { data: tenants } = await supabase
        .from('tenant_profiles')
        .select('user_id')
        .eq('agency_id', agencyId);

      if (!tenants?.length) { setProperties([]); return; }

      const tenantIds = tenants.map(t => t.user_id);

      // Get properties linked via RFTA packets (property_id)
      const { data: rftaProps } = await supabase
        .from('rfta_packets')
        .select('property_id')
        .eq('agency_id', agencyId)
        .not('property_id', 'is', null);

      const propertyIds = [...new Set((rftaProps || []).map(r => r.property_id).filter(Boolean))];

      if (!propertyIds.length) {
        // Try to get properties where units have these tenants
        const { data: units } = await supabase
          .from('property_units')
          .select('property_id')
          .in('tenant_id', tenantIds);

        if (units?.length) {
          propertyIds.push(...new Set(units.map(u => u.property_id)));
        }
      }

      if (!propertyIds.length) { setProperties([]); return; }

      const { data: props } = await supabase
        .from('properties')
        .select('id, address, city, state, status, unit_count, default_tenant_type')
        .in('id', propertyIds as string[])
        .order('address');

      setProperties((props as unknown as PropertyRecord[]) || []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = properties.filter(p => {
    const q = search.toLowerCase();
    return p.address.toLowerCase().includes(q) || (p.city || '').toLowerCase().includes(q);
  });

  const statusColor = (s: string) => {
    switch (s) {
      case 'occupied': return 'default';
      case 'available': return 'success';
      case 'maintenance': return 'warning';
      default: return 'secondary';
    }
  };

  const occupied = properties.filter(p => p.status === 'occupied').length;
  const available = properties.filter(p => p.status === 'available').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-muted-foreground">Linked to agency</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupied}</div>
            <p className="text-xs text-muted-foreground">Currently housed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{available}</div>
            <p className="text-xs text-muted-foreground">Looking for tenants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voucher Units</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {properties.filter(p => p.default_tenant_type === 'voucher').length}
            </div>
            <p className="text-xs text-muted-foreground">Voucher-accepting</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" /> Properties ({filtered.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search properties..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.address}</TableCell>
                      <TableCell>{p.city ? `${p.city}, ${p.state}` : '—'}</TableCell>
                      <TableCell>{p.unit_count || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(p.status) as any}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{(p.default_tenant_type || 'not specified').replace('_', ' ')}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          bare
                          icon={Building}
                          title="No properties yet"
                          description="Properties appear here when tenants submit RFTAs or are placed in units. You can also import properties from Caseload → Import."
                          primaryAction={{ label: 'Open import wizard', href: '/agency?tab=import' }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyProperties;
