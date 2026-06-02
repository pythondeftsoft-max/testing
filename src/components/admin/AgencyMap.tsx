import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Users, Search } from 'lucide-react';

export const AgencyMap = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [onboardedFilter, setOnboardedFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ['housing-authorities-map'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('housing_authorities')
          .select('id, name, slug, city, state, country, website, address, zipcode, zip, pha_code, latitude, longitude, is_active, is_onboarded, tenant_count, metadata, registry_status, is_archived, created_at, updated_at')
          .eq('is_active', true)
          .order('state')
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    }
  });

  // Unique states for dropdown
  const states = useMemo(() => {
    const s = new Set(agencies.map((a: any) => a.state).filter(Boolean));
    return Array.from(s).sort() as string[];
  }, [agencies]);

  // Filtered agencies
  const filtered = useMemo(() => {
    let result = agencies;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a: any) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.city || '').toLowerCase().includes(q) ||
        (a.pha_code || '').toLowerCase().includes(q)
      );
    }
    if (stateFilter !== 'all') {
      result = result.filter((a: any) => a.state === stateFilter);
    }
    if (onboardedFilter === 'yes') {
      result = result.filter((a: any) => a.is_onboarded);
    } else if (onboardedFilter === 'no') {
      result = result.filter((a: any) => !a.is_onboarded);
    }
    if (tenantFilter === 'has') {
      result = result.filter((a: any) => (a.tenant_count || 0) > 0);
    } else if (tenantFilter === 'none') {
      result = result.filter((a: any) => !a.tenant_count);
    }
    return result;
  }, [agencies, search, stateFilter, onboardedFilter, tenantFilter]);

  // Group by state
  const byState = filtered.reduce((acc: Record<string, any[]>, agency: any) => {
    const state = agency.state || 'Unknown';
    if (!acc[state]) acc[state] = [];
    acc[state].push(agency);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Agency Coverage Map</h2>
        <p className="text-muted-foreground">View housing authorities by region and coverage area</p>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, city, or PHA code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All States" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={onboardedFilter} onValueChange={setOnboardedFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Onboarded" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="yes">Onboarded</SelectItem>
                <SelectItem value="no">Not Onboarded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tenants" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="has">Has Tenants</SelectItem>
                <SelectItem value="none">No Tenants</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {filtered.length} of {agencies.length} agencies
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Agencies (filtered)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Object.keys(byState).length}</p>
              <p className="text-xs text-muted-foreground">States Covered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filtered.reduce((sum: number, a: any) => sum + (a.tenant_count || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Total Linked Tenants</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* State-based listing */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading agencies...</div>
      ) : Object.keys(byState).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No agencies match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byState).sort(([a], [b]) => a.localeCompare(b)).map(([state, stateAgencies]: [string, any[]]) => (
            <Card key={state}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {state}
                  <Badge variant="secondary" className="ml-2">{stateAgencies.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stateAgencies.map(agency => (
                    <div
                      key={agency.id}
                      onClick={() => navigate(`/admin/agency/${agency.id}`)}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <h4 className="font-medium text-sm text-foreground">{agency.name}</h4>
                      {agency.city && (
                        <p className="text-xs text-muted-foreground mt-1">{agency.city}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {agency.tenant_count || 0} tenants
                        </Badge>
                        {agency.is_onboarded && (
                          <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">Onboarded</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
};

export default AgencyMap;
