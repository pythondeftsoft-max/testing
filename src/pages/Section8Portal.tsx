import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import { Building2, ClipboardCheck, DollarSign, FileText, User as UserIcon, Settings, Users, LogOut, ArrowLeft, AlertCircle, CheckCircle, Clock, XCircle, FolderOpen, FileSignature, Search, CreditCard } from 'lucide-react';
import { PHARegistrationTab } from '@/components/section8/PHARegistrationTab';
import { InspectionsTab } from '@/components/section8/InspectionsTab';
import { HAPPaymentsTab } from '@/components/section8/HAPPaymentsTab';
import { RFTAInboxTab } from '@/components/section8/RFTAInboxTab';
import LandlordS8DocumentsTab from '@/components/section8/LandlordS8DocumentsTab';
import LandlordStatementsTab from '@/components/section8/LandlordStatementsTab';
import LeaseHub from '@/components/landlord/LeaseHub';
import TenantScreeningHub from '@/components/landlord/TenantScreeningHub';
import RentCollectionHub from '@/components/landlord/RentCollectionHub';
import { useLandlordRegistrations } from '@/hooks/useAgencyLandlords';
import { toast } from 'sonner';
import type { AgencyLandlord } from '@/hooks/useAgencyLandlords';
import { PrivacyQuickLinks } from '@/components/privacy/PrivacyQuickLinks';

const Section8Portal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolio, setSelectedPortfolio] = useState(searchParams.get('portfolioId') || 'everything');
  const [activeTab, setActiveTab] = useState('registration');

  // Data states
  const [inspections, setInspections] = useState<any[]>([]);
  const [hapPayments, setHapPayments] = useState<any[]>([]);
  const [rftaPackets, setRftaPackets] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUser(user);
      setLoading(false);
    };
    fetchUser();
  }, [navigate]);

  // Use the new hook for registrations with PHA info + units
  const { registrations, refetch: fetchRegistrations } = useLandlordRegistrations(user?.id, user?.email);

  // Fetch properties once for joins and inspection requests
  const fetchProperties = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase.from('properties').select('id, address, city, state').eq('owner_id', user.id);
    setProperties(data || []);
    return data || [];
  }, [user]);

  // Helper: build lookup maps for property & unit
  const buildLookups = useCallback(async (propIds: string[], unitIds: string[]) => {
    const propMap: Record<string, any> = {};
    const unitMap: Record<string, any> = {};

    if (propIds.length > 0) {
      const { data: propData } = await supabase.from('properties').select('id, address, city, state').in('id', propIds);
      propData?.forEach(p => { propMap[p.id] = p; });
    }
    if (unitIds.length > 0) {
      const { data: unitData } = await supabase.from('property_units').select('id, unit_number, monthly_rent').in('id', unitIds);
      unitData?.forEach(u => { unitMap[u.id] = u; });
    }
    return { propMap, unitMap };
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const props = await fetchProperties();
      if (!props.length) return;
      const { data } = await supabase
        .from('inspections')
        .select('*')
        .in('property_id', props.map(p => p.id))
        .order('scheduled_date', { ascending: false });

      // Enrich with property address
      const propMap: Record<string, any> = {};
      props.forEach(p => { propMap[p.id] = p; });

      const enriched = (data || []).map(insp => {
        const prop = propMap[insp.property_id];
        return {
          ...insp,
          property_address: prop ? `${prop.address}, ${prop.city}` : null,
        };
      });

      // Enrich with unit numbers if unit_id exists
      const unitIds = (data || []).filter(d => d.unit_id).map(d => d.unit_id);
      if (unitIds.length > 0) {
        const { data: units } = await supabase.from('property_units').select('id, unit_number').in('id', unitIds);
        const unitMap: Record<string, string> = {};
        units?.forEach(u => { unitMap[u.id] = u.unit_number; });
        enriched.forEach(insp => {
          if (insp.unit_id && unitMap[insp.unit_id]) {
            (insp as any).unit_number = unitMap[insp.unit_id];
          }
        });
      }

      setInspections(enriched);
    };
    fetch();
  }, [user, fetchProperties]);

  useEffect(() => {
    if (!user) return;
    const fetchHAP = async () => {
      const { data } = await supabase
        .from('hap_batch_items')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (!data?.length) { setHapPayments([]); return; }

      const unitIds = data.filter(d => d.unit_id).map(d => d.unit_id);
      const { propMap, unitMap } = await buildLookups([], unitIds);

      // Get property_id from units for address lookup
      const unitPropIds = new Set<string>();
      if (unitIds.length > 0) {
        const { data: unitRows } = await supabase.from('property_units').select('id, unit_number, property_id').in('id', unitIds);
        unitRows?.forEach(u => {
          unitMap[u.id] = u;
          if (u.property_id) unitPropIds.add(u.property_id);
        });
        if (unitPropIds.size > 0) {
          const { data: propRows } = await supabase.from('properties').select('id, address, city, state').in('id', Array.from(unitPropIds));
          propRows?.forEach(p => { propMap[p.id] = p; });
        }
      }

      const enriched = data.map(item => {
        const unit = unitMap[item.unit_id];
        const prop = unit?.property_id ? propMap[unit.property_id] : null;
        return {
          ...item,
          property_address: prop ? `${prop.address}, ${prop.city}` : null,
          unit_number: unit?.unit_number || null,
        };
      });

      setHapPayments(enriched);
    };
    fetchHAP();
  }, [user, buildLookups]);

  useEffect(() => {
    if (!user) return;
    const fetchRFTA = async () => {
      const { data } = await supabase
        .from('rfta_packets')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (!data?.length) { setRftaPackets([]); return; }

      // Enrich with property/unit info
      const propIds = data.filter(d => d.property_id).map(d => d.property_id);
      const unitIds = data.filter(d => d.unit_id).map(d => d.unit_id);
      const { propMap, unitMap } = await buildLookups(propIds, unitIds);

      const enriched = data.map(packet => {
        const prop = propMap[packet.property_id];
        const unit = unitMap[packet.unit_id];
        return {
          ...packet,
          property_address: prop ? `${prop.address}, ${prop.city}` : null,
          unit_number: unit?.unit_number || null,
        };
      });

      setRftaPackets(enriched);
    };
    fetchRFTA();
  }, [user, buildLookups]);

  const handleRftaRespond = async (packetId: string, action: 'accepted' | 'declined') => {
    const { error } = await supabase.from('rfta_packets').update({
      status: action === 'accepted' ? 'approved' : 'denied',
      reviewed_at: new Date().toISOString(),
    } as any).eq('id', packetId);
    if (error) { toast.error('Failed to respond'); return; }
    toast.success(`RFTA ${action}`);
    // Refresh
    setRftaPackets(prev => prev.map(p => p.id === packetId ? { ...p, status: action === 'accepted' ? 'approved' : 'denied', reviewed_at: new Date().toISOString() } : p));
  };

  const refreshInspections = async () => {
    if (!user) return;
    const props = properties.length ? properties : await fetchProperties();
    if (!props.length) return;
    const { data } = await supabase.from('inspections').select('*').in('property_id', props.map((p: any) => p.id)).order('scheduled_date', { ascending: false });
    const propMap: Record<string, any> = {};
    props.forEach((p: any) => { propMap[p.id] = p; });
    setInspections((data || []).map(insp => ({
      ...insp,
      property_address: propMap[insp.property_id] ? `${propMap[insp.property_id].address}, ${propMap[insp.property_id].city}` : null,
    })));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      completed: { variant: 'default', icon: CheckCircle },
      approved: { variant: 'default', icon: CheckCircle },
      active: { variant: 'default', icon: CheckCircle },
      pass: { variant: 'default', icon: CheckCircle },
      scheduled: { variant: 'secondary', icon: Clock },
      pending: { variant: 'secondary', icon: Clock },
      pending_review: { variant: 'secondary', icon: Clock },
      under_review: { variant: 'secondary', icon: Clock },
      requested: { variant: 'secondary', icon: Clock },
      draft: { variant: 'outline', icon: FileText },
      failed: { variant: 'destructive', icon: XCircle },
      fail: { variant: 'destructive', icon: XCircle },
      denied: { variant: 'destructive', icon: XCircle },
    };
    const config = map[status] || { variant: 'outline' as const, icon: AlertCircle };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 relative">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/')} className="text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-opacity cursor-pointer">
                OpenKey
              </button>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                {user && (
                  <PortfolioSelectorDropdown
                    selectedPortfolio={selectedPortfolio}
                    onPortfolioChange={(id) => {
                      setSelectedPortfolio(id);
                      navigate(`/dashboard?portfolioId=${id}`);
                    }}
                    userId={user.id}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="border-openkey-blue/20 text-openkey-blue rounded-lg bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200">
                    <UserIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 w-48 bg-card border border-border shadow-lg">
                  <DropdownMenuItem onClick={() => navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Profile' } })} className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue">
                    <UserIcon className="w-4 h-4 mr-2" /> View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/payment-settings')} className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue">
                    <Settings className="w-4 h-4 mr-2" /> Payment Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/user-roles?portfolioId=${selectedPortfolio}`)} className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue">
                    <Users className="w-4 h-4 mr-2" /> User/Roles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/section-8')} className="cursor-pointer bg-openkey-blue/5 text-openkey-blue font-medium">
                    <Building2 className="w-4 h-4 mr-2" /> Section 8
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="icon" onClick={handleSignOut} className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Section 8 Portal</h1>
          <p className="text-muted-foreground mt-1">Manage your Housing Choice Voucher program participation</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex overflow-x-auto">
            <TabsTrigger value="registration" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">PHA Registration</span>
              <span className="sm:hidden">PHA</span>
            </TabsTrigger>
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Inspections</span>
              <span className="sm:hidden">HQS</span>
              {inspections.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{inspections.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="hap" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">HAP Payments</span>
              <span className="sm:hidden">HAP</span>
              {hapPayments.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{hapPayments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rfta" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">RFTA Inbox</span>
              <span className="sm:hidden">RFTA</span>
              {rftaPackets.filter(p => p.status === 'submitted' || p.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{rftaPackets.filter(p => p.status === 'submitted' || p.status === 'pending').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="statements" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Statements</span>
              <span className="sm:hidden">Stmt</span>
            </TabsTrigger>
            <TabsTrigger value="leases" className="flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              <span className="hidden sm:inline">Leases</span>
              <span className="sm:hidden">Lease</span>
            </TabsTrigger>
            <TabsTrigger value="screening" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Screening</span>
              <span className="sm:hidden">Screen</span>
            </TabsTrigger>
            <TabsTrigger value="rent-collection" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Rent Collection</span>
              <span className="sm:hidden">Rent</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registration">
            <PHARegistrationTab
              registrations={registrations}
              user={user}
              onEnrollmentComplete={fetchRegistrations}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          <TabsContent value="inspections">
            <InspectionsTab
              inspections={inspections}
              getStatusBadge={getStatusBadge}
              properties={properties}
              userId={user?.id}
              onRefresh={refreshInspections}
            />
          </TabsContent>

          <TabsContent value="hap">
            <HAPPaymentsTab hapPayments={hapPayments} getStatusBadge={getStatusBadge} />
          </TabsContent>

          <TabsContent value="rfta">
            <RFTAInboxTab
              rftaPackets={rftaPackets}
              getStatusBadge={getStatusBadge}
              onRespond={handleRftaRespond}
            />
          </TabsContent>

          <TabsContent value="documents">
            {user && <LandlordS8DocumentsTab userId={user.id} />}
          </TabsContent>

          <TabsContent value="statements">
            {user && <LandlordStatementsTab userId={user.id} />}
          </TabsContent>

          <TabsContent value="leases">
            {user && <LeaseHub landlordId={user.id} />}
          </TabsContent>

          <TabsContent value="screening">
            {user && <TenantScreeningHub landlordId={user.id} />}
          </TabsContent>

          <TabsContent value="rent-collection">
            {user && <RentCollectionHub landlordId={user.id} />}
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <PrivacyQuickLinks showVawa={false} />
        </div>
      </div>
    </div>
  );
};

export default Section8Portal;
