import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building2, Plus, Users, MapPin, Mail, Phone, Globe, Search, Eye, UserX, UserCheck, FileText, ClipboardCheck, Ticket, Download, Loader2, ChevronLeft, ChevronRight, Hash, Calendar, Inbox, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cleanupAuthState, storeImpersonationData } from '@/utils/impersonationUtils';
import { AgencyDashboardContent } from '@/pages/AgencyDashboard';
import { StateCoverageSection, AgencyCoverageSection, AgencyHealthSection, PipelineSection, ActivitySection } from '@/components/admin/AgencyPlatformAnalytics';
import { AgencyCRMPanel } from '@/components/admin/AgencyCRMPanel';
import { AgencyUsageAnalytics } from '@/components/admin/AgencyUsageAnalytics';
import AgencyEmailDomainManager from '@/components/admin/AgencyEmailDomainManager';
import InviteAgencyStaffDialog from '@/components/admin/agency-management/InviteAgencyStaffDialog';
import OffboardAgencyDialog from '@/components/admin/agency-management/OffboardAgencyDialog';


export const AgencyManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [showOffboardDialog, setShowOffboardDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allStaffSearch, setAllStaffSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [tenantSearch, setTenantSearch] = useState('');
  const [previewAgencyId, setPreviewAgencyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Form state for new agency
  const [newAgency, setNewAgency] = useState({
    name: '', city: '', state: '', country: 'US', phone: '', email: '', website: '', address: ''
  });

  // Form state for invite
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' as string });

  // Fetch all housing authorities
  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ['housing-authorities'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('housing_authorities')
          .select('id, name, slug, city, state, country, website, address, zipcode, zip, pha_code, latitude, longitude, is_active, is_onboarded, onboarding_completed, onboarding_step, tenant_count, metadata, registry_status, is_archived, hap_block_unready_landlords, public_waitlist_open, direct_apply_open, status, offboarded_at, created_at, updated_at')
          .order('name')
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return allData;
    }
  });

  // Platform-wide aggregate stats
  const { data: platformStats } = useQuery({
    queryKey: ['platform-agency-stats'],
    queryFn: async () => {
      const [linkedRes, staffRes, voucherRes, agenciesWithTenantsRes, appsRes, rftaRes, inspRes, portRes] = await Promise.all([
        supabase.from('tenant_profiles').select('id', { count: 'exact', head: true }).not('agency_id', 'is', null),
        supabase.from('agency_staff').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('agency_vouchers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        Promise.resolve().then(async () => {
          try {
            return await supabase.rpc('get_agencies_with_tenants_count' as any);
          } catch {
            return { data: null };
          }
        }),
        supabase.from('voucher_applications').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('rfta_packets').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'under_review', 'draft']),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.from('porting_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
      ]);
      
      let agenciesWithTenants = 0;
      if (agenciesWithTenantsRes?.data) {
        agenciesWithTenants = agenciesWithTenantsRes.data as number;
      } else {
        const { data: distinctData } = await supabase
          .from('tenant_profiles')
          .select('agency_id')
          .not('agency_id', 'is', null)
          .limit(1000);
        if (distinctData) {
          const unique = new Set(distinctData.map((d: any) => d.agency_id));
          agenciesWithTenants = unique.size;
        }
      }

      return {
        linkedTenants: linkedRes.count ?? 0,
        activeStaff: staffRes.count ?? 0,
        activeVouchers: voucherRes.count ?? 0,
        agenciesWithTenants,
        pendingApps: appsRes.count ?? 0,
        activeRfta: rftaRes.count ?? 0,
        scheduledInspections: inspRes.count ?? 0,
        portingRequests: portRes.count ?? 0,
      };
    }
  });

  // Contract renewal alerts
  const { data: renewalAlerts = [] } = useQuery({
    queryKey: ['contract-renewal-alerts'],
    queryFn: async () => {
      const ninetyDaysOut = new Date();
      ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
      const { data, error } = await supabase
        .from('agency_contracts')
        .select('id, agency_id, contract_end, status, monthly_rate, housing_authorities:agency_id(name)')
        .eq('status', 'active')
        .not('contract_end', 'is', null)
        .lte('contract_end', ninetyDaysOut.toISOString())
        .order('contract_end');
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  // Fetch staff for selected agency
  const { data: staffList = [] } = useQuery({
    queryKey: ['agency-staff', selectedAgencyId],
    queryFn: async () => {
      if (!selectedAgencyId) return [];
      const { data, error } = await supabase
        .from('agency_staff')
        .select('*, profiles:user_id(first_name, last_name, email, last_sign_in_at)')
        .eq('agency_id', selectedAgencyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAgencyId
  });

  // Fetch ALL staff across all agencies
  const { data: allStaff = [] } = useQuery({
    queryKey: ['all-agency-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_staff')
        .select('*, profiles:user_id(first_name, last_name, email, last_sign_in_at), housing_authorities:agency_id(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch agency stats for selected agency
  const { data: agencyStats } = useQuery({
    queryKey: ['agency-stats', selectedAgencyId],
    queryFn: async () => {
      if (!selectedAgencyId) return null;
      const [tenantsRes, rftaRes, inspRes, voucherRes] = await Promise.all([
        supabase.from('tenant_profiles').select('id', { count: 'exact', head: true }).eq('agency_id', selectedAgencyId),
        supabase.from('rfta_packets').select('id', { count: 'exact', head: true }).eq('agency_id', selectedAgencyId).in('status', ['submitted', 'under_review']),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('agency_id', selectedAgencyId).eq('status', 'scheduled'),
        supabase.from('agency_vouchers').select('id', { count: 'exact', head: true }).eq('agency_id', selectedAgencyId).eq('status', 'active'),
      ]);
      return {
        tenants: tenantsRes.count ?? 0,
        rfta: rftaRes.count ?? 0,
        inspections: inspRes.count ?? 0,
        vouchers: voucherRes.count ?? 0,
      };
    },
    enabled: !!selectedAgencyId
  });

  // Fetch linked tenants for selected agency
  const { data: agencyTenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['agency-tenants', selectedAgencyId],
    queryFn: async () => {
      if (!selectedAgencyId) return [];
      const { data, error } = await supabase
        .from('tenant_profiles')
        .select('id, user_id, voucher_status, city, state, created_at, profiles:user_id(full_name, email)')
        .eq('agency_id', selectedAgencyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedAgencyId
  });

  // Create agency mutation
  const createAgency = useMutation({
    mutationFn: async () => {
      const slug = newAgency.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { error } = await supabase.from('housing_authorities').insert({
        ...newAgency,
        slug,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Agency created successfully');
      queryClient.invalidateQueries({ queryKey: ['housing-authorities'] });
      setShowCreateDialog(false);
      setNewAgency({ name: '', city: '', state: '', country: 'US', phone: '', email: '', website: '', address: '' });
    },
    onError: (err: any) => toast.error('Failed to create agency', { description: err.message })
  });

  // Invite staff mutation
  const inviteStaff = useMutation({
    mutationFn: async () => {
      if (!selectedAgencyId || !user) throw new Error('Missing context');
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          action: 'create_user',
          email: inviteForm.email,
          password: crypto.randomUUID().slice(0, 16) + 'Aa1!',
          user_type: 'agency',
          send_invite: true,
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const newUserId = data?.user?.id;
      if (!newUserId) throw new Error('User creation did not return an ID');
      const { error: staffError } = await supabase.from('agency_staff').insert({
        user_id: newUserId,
        agency_id: selectedAgencyId,
        role: inviteForm.role as any,
        invited_by: user.id,
        is_active: true,
      });
      if (staffError) throw staffError;
    },
    onSuccess: () => {
      toast.success('Staff invited successfully');
      queryClient.invalidateQueries({ queryKey: ['agency-staff', selectedAgencyId] });
      queryClient.invalidateQueries({ queryKey: ['all-agency-staff'] });
      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'viewer' });
    },
    onError: (err: any) => toast.error('Failed to invite staff', { description: err.message })
  });

  // Toggle staff active status
  const toggleStaffActive = useMutation({
    mutationFn: async ({ staffId, currentActive }: { staffId: string; currentActive: boolean }) => {
      const { error } = await supabase
        .from('agency_staff')
        .update({ is_active: !currentActive })
        .eq('id', staffId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Staff status updated');
      queryClient.invalidateQueries({ queryKey: ['agency-staff', selectedAgencyId] });
      queryClient.invalidateQueries({ queryKey: ['all-agency-staff'] });
    },
    onError: (err: any) => toast.error('Failed to update staff', { description: err.message })
  });

  // Impersonate staff member
  const handleImpersonate = async (staff: any) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast.error('No active admin session');
        return;
      }

      const profileData = staff.profiles;
      const targetEmail = profileData?.email;
      if (!targetEmail) {
        toast.error('Staff member has no email');
        return;
      }

      toast.loading('Starting impersonation...', { id: 'impersonate' });

      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { target_user_id: staff.user_id }
      });

      if (error || !data?.success) {
        toast.error('Impersonation failed', { id: 'impersonate', description: error?.message || data?.error });
        return;
      }

      const hashedToken = data.hashed_token;
      if (!hashedToken) {
        toast.error('No token returned', { id: 'impersonate' });
        return;
      }

      storeImpersonationData(sessionData.session, {
        id: staff.user_id,
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || '',
        email: targetEmail,
        user_type: 'agency',
      });

      cleanupAuthState();

      const { error: otpError } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: hashedToken,
        type: 'email',
      });

      if (otpError) {
        toast.error('OTP verification failed', { id: 'impersonate', description: otpError.message });
        return;
      }

      toast.success('Impersonating staff member', { id: 'impersonate' });
      window.location.href = '/agency';
    } catch (err: any) {
      toast.error('Impersonation error', { description: err.message });
    }
  };

  const filteredAgencies = agencies.filter(a =>
    !searchQuery ||
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.pha_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset page when search or items per page changes
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAgencies.length / itemsPerPage));
  const paginatedAgencies = filteredAgencies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const PaginationBar = () => (
    <div className="flex items-center justify-between py-2">
      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
      </Button>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages} ({filteredAgencies.length} agencies)</span>
        <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
          <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
        Next <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );

  const filteredAllStaff = allStaff.filter((s: any) => {
    if (!allStaffSearch) return true;
    const q = allStaffSearch.toLowerCase();
    const name = `${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.toLowerCase();
    const email = (s.profiles?.email || '').toLowerCase();
    const agency = ((s.housing_authorities as any)?.name || '').toLowerCase();
    return name.includes(q) || email.includes(q) || agency.includes(q);
  });

  const selectedAgency = agencies.find(a => a.id === selectedAgencyId);

  const staffName = (staff: any) =>
    staff.profiles?.first_name
      ? `${staff.profiles.first_name} ${staff.profiles.last_name || ''}`
      : staff.profiles?.email || 'Unknown';

  const filteredTenants = agencyTenants.filter((t: any) => {
    if (!tenantSearch) return true;
    const q = tenantSearch.toLowerCase();
    const name = (t.profiles?.full_name || '').toLowerCase();
    const email = (t.profiles?.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const statusBadgeVariant = (status: string | null): "default" | "secondary" => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  // Preview mode: render the full agency dashboard
  if (previewAgencyId) {
    const previewAgency = agencies.find(a => a.id === previewAgencyId);
    if (previewAgency) {
      return (
        <div className="space-y-4">
          <div className="px-6 pt-6">
            <Button variant="outline" size="sm" onClick={() => setPreviewAgencyId(null)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Admin
            </Button>
          </div>
          <AgencyDashboardContent
            agency={{ id: previewAgency.id, name: previewAgency.name, city: previewAgency.city, state: previewAgency.state }}
            role="agency_admin"
            roleName="Admin Preview"
            staffId="admin-preview"
            agencyId={previewAgency.id}

            onLogout={() => setPreviewAgencyId(null)}
          />
        </div>
      );
    }
  }

  const StatCard = ({ icon: Icon, value, label, accent = false }: { icon: any; value: any; label: string; accent?: boolean }) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-accent' : 'bg-primary/10'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-accent-foreground' : 'text-primary'}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agency Portal Management</h2>
          <p className="text-muted-foreground">Manage housing authorities, staff, and agency operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={isImporting}
            onClick={async () => {
              setIsImporting(true);
              try {
                const { data, error } = await supabase.functions.invoke('import-housing-authorities');
                if (error) throw error;
                if (!data?.success) throw new Error(data?.error || 'Import failed');
                const { total_fetched, imported, skipped, errors } = data.data;
                if (total_fetched === 0) {
                  toast.warning('HUD returned 0 agencies', { description: 'The HUD API may be temporarily unavailable. Try again later.' });
                } else if (imported === 0 && skipped > 0) {
                  toast.error(`All ${skipped} agencies failed to import`, { description: errors?.[0] || 'Database insert errors — check logs.' });
                } else if (skipped > 0) {
                  toast.warning(`Imported ${imported}, but ${skipped} skipped`, { description: errors?.[0] || 'Some batches had errors.' });
                } else {
                  toast.success(`Imported ${imported} housing authorities from HUD`);
                }
                queryClient.invalidateQueries({ queryKey: ['housing-authorities'] });
                queryClient.invalidateQueries({ queryKey: ['housing-authorities-map'] });
              } catch (err: any) {
                toast.error('HUD import failed', { description: err.message });
              } finally {
                setIsImporting(false);
              }
            }}
          >
            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isImporting ? 'Importing...' : 'Import from HUD'}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Agency</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Housing Authority</DialogTitle>
                <DialogDescription>Register a new housing authority on the platform</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Agency Name *</Label>
                  <Input value={newAgency.name} onChange={e => setNewAgency({ ...newAgency, name: e.target.value })} placeholder="Housing Authority of..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={newAgency.city} onChange={e => setNewAgency({ ...newAgency, city: e.target.value })} placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={newAgency.state} onChange={e => setNewAgency({ ...newAgency, state: e.target.value })} placeholder="State" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={newAgency.phone} onChange={e => setNewAgency({ ...newAgency, phone: e.target.value })} placeholder="(555) 555-5555" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={newAgency.email} onChange={e => setNewAgency({ ...newAgency, email: e.target.value })} placeholder="contact@agency.gov" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={newAgency.website} onChange={e => setNewAgency({ ...newAgency, website: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={newAgency.address} onChange={e => setNewAgency({ ...newAgency, address: e.target.value })} placeholder="123 Main St" />
                </div>
                <Button onClick={() => createAgency.mutate()} disabled={!newAgency.name || createAgency.isPending} className="w-full">
                  {createAgency.isPending ? 'Creating...' : 'Create Agency'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="pipeline">Agency Ops</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="authorities">Authorities</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} value={platformStats?.linkedTenants} label="Linked Tenants" />
              <StatCard icon={Building2} value={platformStats?.agenciesWithTenants} label="Active Agencies" />
              <StatCard icon={UserCheck} value={platformStats?.activeStaff} label="Active Staff" />
              <StatCard icon={Ticket} value={platformStats?.activeVouchers} label="Active Vouchers" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Inbox} value={platformStats?.pendingApps} label="Pending Applications" accent />
              <StatCard icon={FileText} value={platformStats?.activeRfta} label="Active RFTAs" accent />
              <StatCard icon={ClipboardCheck} value={platformStats?.scheduledInspections} label="Scheduled Inspections" accent />
              <StatCard icon={ArrowLeftRight} value={platformStats?.portingRequests} label="Porting Requests" accent />
            </div>
            <AgencyHealthSection />

            {/* Contract Renewal Alerts */}
            {renewalAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <div>
                      <CardTitle className="text-base">Contract Renewals Due</CardTitle>
                      <CardDescription>{renewalAlerts.length} contract{renewalAlerts.length > 1 ? 's' : ''} expiring within 90 days</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {renewalAlerts.map((c: any) => {
                      const daysLeft = Math.ceil((new Date(c.contract_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysLeft <= 30;
                      return (
                        <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border ${isUrgent ? 'border-destructive/40 bg-destructive/5' : 'border-border'}`}>
                          <div>
                            <p className="text-sm font-medium text-foreground">{(c.housing_authorities as any)?.name || 'Unknown Agency'}</p>
                            <p className="text-xs text-muted-foreground">
                              Expires {new Date(c.contract_end).toLocaleDateString()} • ${c.monthly_rate}/mo
                            </p>
                          </div>
                          <Badge variant={isUrgent ? 'destructive' : 'warning'} className="text-xs">
                            {daysLeft <= 0 ? 'Expired' : `${daysLeft} days left`}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage">
          <div className="space-y-4">
            <StateCoverageSection />
            <AgencyCoverageSection />
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline">
          <PipelineSection />
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">All Agency Staff</CardTitle>
                  <CardDescription>{allStaff.length} staff across {agencies.length} agencies</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <Input
                  placeholder="Search staff by name, email, or agency..."
                  value={allStaffSearch}
                  onChange={e => setAllStaffSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Agency</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sign-in</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllStaff.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{staffName(s)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.profiles?.email || '—'}</TableCell>
                        <TableCell className="text-sm">{(s.housing_authorities as any)?.name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{s.role?.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">
                            {s.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {s.profiles?.last_sign_in_at ? new Date(s.profiles.last_sign_in_at).toLocaleDateString() : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAllStaff.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-4">No staff found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Authorities Tab */}
        <TabsContent value="authorities">
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agencies by name, city, state, or PHA code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agencies List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="font-semibold text-foreground">Housing Authorities ({filteredAgencies.length})</h3>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredAgencies.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No agencies found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <PaginationBar />
                    {paginatedAgencies.map(agency => (
                      <Card
                        key={agency.id}
                        className={`cursor-pointer transition-colors hover:bg-accent/50 ${selectedAgencyId === agency.id ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => { setSelectedAgencyId(agency.id); setTenantSearch(''); }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-foreground text-sm">{agency.name}</h4>
                              {(agency.city || agency.state) && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {[agency.city, agency.state].filter(Boolean).join(', ')}
                                </p>
                              )}
                              {agency.pha_code && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Hash className="w-3 h-3" />
                                  {agency.pha_code}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={agency.is_active ? 'default' : 'secondary'} className="text-xs">
                                {agency.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {(agency as any).is_onboarded && (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                  Onboarded
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <PaginationBar />
                  </>
                )}
              </div>

              {/* Agency Detail */}
              <div className="lg:col-span-2">
                {selectedAgency ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{selectedAgency.name}</CardTitle>
                            <CardDescription>
                              {[selectedAgency.city, selectedAgency.state].filter(Boolean).join(', ') || 'No location set'}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="blue" onClick={() => setPreviewAgencyId(selectedAgency.id)}>
                              <Eye className="w-4 h-4 mr-2" />Preview Agency Portal
                            </Button>
                            <InviteAgencyStaffDialog
                              agencyId={selectedAgency.id}
                              agencyName={selectedAgency.name}
                              existingStaff={staffList as any}
                            />
                            {(selectedAgency as any).status === 'offboarded' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowReactivateDialog(true)}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />Reactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setShowOffboardDialog(true)}
                              >
                                <UserX className="w-4 h-4 mr-2" />Offboard
                              </Button>
                            )}
                            <OffboardAgencyDialog
                              agencyId={selectedAgency.id}
                              agencyName={selectedAgency.name}
                              open={showOffboardDialog}
                              onOpenChange={setShowOffboardDialog}
                            />
                            <OffboardAgencyDialog
                              agencyId={selectedAgency.id}
                              agencyName={selectedAgency.name}
                              open={showReactivateDialog}
                              onOpenChange={setShowReactivateDialog}
                              reactivate
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          {selectedAgency.pha_code && (
                            <div className="flex items-center gap-2 text-muted-foreground"><Hash className="w-4 h-4 shrink-0" /><span>PHA: {selectedAgency.pha_code}</span></div>
                          )}
                          {selectedAgency.email && (
                            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 shrink-0" /><span className="truncate">{selectedAgency.email}</span></div>
                          )}
                          {selectedAgency.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /><span>{selectedAgency.phone}</span></div>
                          )}
                          {selectedAgency.website && (
                            <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-4 h-4 shrink-0" /><span className="truncate">{selectedAgency.website}</span></div>
                          )}
                          {selectedAgency.address && (
                            <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4 shrink-0" /><span className="truncate">{selectedAgency.address}</span></div>
                          )}
                          {selectedAgency.created_at && (
                            <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4 shrink-0" /><span>Added {new Date(selectedAgency.created_at).toLocaleDateString()}</span></div>
                          )}
                        </div>

                        {selectedAgency.latitude && selectedAgency.longitude && (
                          <p className="text-xs text-muted-foreground">📍 {Number(selectedAgency.latitude).toFixed(4)}, {Number(selectedAgency.longitude).toFixed(4)}</p>
                        )}

                        {agencyStats && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg border bg-background p-3 text-center">
                              <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
                              <p className="text-lg font-bold text-foreground">{agencyStats.tenants}</p>
                              <p className="text-xs text-muted-foreground">Tenants</p>
                            </div>
                            <div className="rounded-lg border bg-background p-3 text-center">
                              <FileText className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                              <p className="text-lg font-bold text-foreground">{agencyStats.rfta}</p>
                              <p className="text-xs text-muted-foreground">Pending RFTA</p>
                            </div>
                            <div className="rounded-lg border bg-background p-3 text-center">
                              <ClipboardCheck className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                              <p className="text-lg font-bold text-foreground">{agencyStats.inspections}</p>
                              <p className="text-xs text-muted-foreground">Inspections</p>
                            </div>
                            <div className="rounded-lg border bg-background p-3 text-center">
                              <Ticket className="w-4 h-4 mx-auto mb-1 text-green-500" />
                              <p className="text-lg font-bold text-foreground">{agencyStats.vouchers}</p>
                              <p className="text-xs text-muted-foreground">Active Vouchers</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Staff Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Staff Members ({staffList.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {staffList.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No staff members yet. Invite someone to get started.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Sign-in</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {staffList.map((staff: any) => (
                                <TableRow key={staff.id}>
                                  <TableCell className="font-medium">{staffName(staff)}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{staff.profiles?.email || '—'}</TableCell>
                                  <TableCell><Badge variant="outline" className="capitalize">{staff.role?.replace('_', ' ')}</Badge></TableCell>
                                  <TableCell><Badge variant={staff.is_active ? 'default' : 'secondary'}>{staff.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{staff.profiles?.last_sign_in_at ? new Date(staff.profiles.last_sign_in_at).toLocaleDateString() : 'Never'}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button size="sm" variant="ghost" onClick={() => handleImpersonate(staff)} title="View as this staff member"><Eye className="w-4 h-4" /></Button>
                                      <Button size="sm" variant="ghost" onClick={() => toggleStaffActive.mutate({ staffId: staff.id, currentActive: staff.is_active })} title={staff.is_active ? 'Deactivate' : 'Reactivate'}>
                                        {staff.is_active ? <UserX className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>

                    {/* Linked Tenants */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-4 h-4" />Linked Tenants ({agencyTenants.length})
                          </CardTitle>
                          <div className="relative w-56">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search tenants..." value={tenantSearch} onChange={e => setTenantSearch(e.target.value)} className="pl-8 h-9" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {tenantsLoading ? (
                          <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                        ) : filteredTenants.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {agencyTenants.length === 0 ? 'No tenants linked to this agency yet.' : 'No tenants match your search.'}
                          </p>
                        ) : (
                          <div className="max-h-72 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>City</TableHead>
                                  <TableHead>Voucher</TableHead>
                                  <TableHead>Joined</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredTenants.map((t: any) => (
                                  <TableRow key={t.id}>
                                    <TableCell className="font-medium text-sm">{t.profiles?.full_name || '—'}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">{t.profiles?.email || '—'}</TableCell>
                                    <TableCell className="text-sm">{[t.city, t.state].filter(Boolean).join(', ') || '—'}</TableCell>
                                    <TableCell><Badge variant={statusBadgeVariant(t.voucher_status)} className="text-xs">{t.voucher_status || 'Unknown'}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Email Domain Manager */}
                    <AgencyEmailDomainManager agencyId={selectedAgency.id} agencyName={selectedAgency.name} isAdmin={true} />

                    {/* CRM Panel */}
                    <AgencyCRMPanel agencyId={selectedAgency.id} agencyName={selectedAgency.name} />

                    {/* Usage Analytics */}
                    <AgencyUsageAnalytics agencyId={selectedAgency.id} agencyName={selectedAgency.name} />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="font-semibold text-foreground mb-2">Select an Agency</h3>
                      <p className="text-sm">Choose a housing authority from the list to view details, staff, and linked tenants</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivitySection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgencyManagement;
