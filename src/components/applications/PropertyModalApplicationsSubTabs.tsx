import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  Clock, 
  X, 
  MessageCircle, 
  FileText, 
  Calendar,
  ExternalLink,
  Search,
  Eye,
  Shield,
  XCircle,
  RefreshCw,
  Square,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ApplicationDetailsModal from './ApplicationDetailsModal';
import BackgroundCheckForm from '@/components/BackgroundCheckForm';
import BackgroundCheckResults from '@/components/BackgroundCheckResults';
import { useToast } from "@/hooks/use-toast";

interface PropertyModalApplicationsSubTabsProps {
  propertyId: string;
  unitId?: string;
  propertyAddress: string;
  aggregateAllUnits?: boolean;
}

const PropertyModalApplicationsSubTabs = ({ 
  propertyId, 
  unitId, 
  propertyAddress,
  aggregateAllUnits = false
}: PropertyModalApplicationsSubTabsProps) => {
  const [activeView, setActiveView] = useState<'applications' | 'current-tenants'>('applications');
  const [applications, setApplications] = useState([]);
  const [currentTenants, setCurrentTenants] = useState([]);
  const [backgroundChecks, setBackgroundChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedResults, setSelectedResults] = useState<any>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rerunCheckId, setRerunCheckId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [propertyId, unitId, aggregateAllUnits]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchApplications(),
        fetchCurrentTenants(),
        fetchBackgroundChecks()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    let query = supabase
      .from('marketplace_applications')
      .select(`
        *,
        properties!marketplace_applications_property_id_fkey (
          id,
          address,
          monthly_rent,
          bedrooms,
          bathrooms
        ),
        profiles!marketplace_applications_user_id_fkey (
          id,
          first_name,
          last_name,
          phone
        ),
        property_units!marketplace_applications_unit_id_fkey (
          id,
          unit_number,
          unit_name
        )
      `)
      .eq('property_id', propertyId);

    // Only filter by unit if we're not aggregating and have a specific unit
    if (unitId && !aggregateAllUnits) {
      query = query.eq('unit_id', unitId);
    }

    const { data, error } = await query
      .order('priority_payment_made', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch tenant profiles separately
    const applicationsWithProfiles = await Promise.all(
      (data || []).map(async (app) => {
        const { data: tenantProfile, error: profileError } = await supabase
          .from('tenant_profiles')
          .select('*')
          .eq('user_id', app.user_id)
          .single();

        return {
          ...app,
          tenant_profiles: profileError ? null : tenantProfile
        };
      })
    );

    setApplications(applicationsWithProfiles);
  };

  const fetchCurrentTenants = async () => {
    let query = supabase
      .from('marketplace_applications')
      .select(`
        *,
        properties!marketplace_applications_property_id_fkey (
          id,
          address,
          monthly_rent
        ),
        profiles!marketplace_applications_user_id_fkey (
          id,
          first_name,
          last_name,
          phone
        ),
        property_units!marketplace_applications_unit_id_fkey (
          id,
          unit_number,
          unit_name
        )
      `)
      .eq('property_id', propertyId)
      .in('lifecycle_stage', ['lease_signing', 'current_tenant']);

    // Only filter by unit if we're not aggregating and have a specific unit
    if (unitId && !aggregateAllUnits) {
      query = query.eq('unit_id', unitId);
    }

    const { data, error } = await query;

    if (error) throw error;
    setCurrentTenants(data || []);
  };

  const fetchBackgroundChecks = async () => {
    let query = supabase
      .from('background_checks')
      .select(`
        *,
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('property_id', propertyId);

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;
    setBackgroundChecks(data || []);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string, priorityPayment: boolean = false, rerunCount?: number) => {
    // Handle background check status badges
    if (typeof priorityPayment === 'number' || rerunCount !== undefined) {
      const statusConfig = {
        pending: { 
          variant: 'warning' as const, 
          label: 'Pending', 
          icon: Clock,
          className: 'bg-primary text-white animate-pulse'
        },
        processing: { 
          variant: 'default' as const, 
          label: 'Processing', 
          icon: RefreshCw,
          className: 'bg-primary text-white animate-pulse'
        },
        completed: { 
          variant: 'success' as const, 
          label: 'Completed', 
          icon: CheckCircle,
          className: 'bg-success text-success-foreground'
        },
        failed: { 
          variant: 'destructive' as const, 
          label: 'Failed', 
          icon: XCircle,
          className: ''
        },
        cancelled: { 
          variant: 'secondary' as const, 
          label: 'Cancelled', 
          icon: Square,
          className: ''
        },
        in_progress: { 
          variant: 'default' as const, 
          label: 'In Progress', 
          icon: RefreshCw,
          className: 'bg-primary text-white animate-pulse'
        }
      };

      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
      const IconComponent = config.icon;
      
      return (
        <div className="flex items-center gap-1">
          <Badge 
            variant={config.variant} 
            className={cn("text-xs shadow-sm flex items-center gap-1", config.className)}
          >
            <IconComponent className="h-3 w-3" />
            {config.label}
          </Badge>
          {rerunCount && rerunCount > 0 && (
            <Badge variant="outline" className="text-xs">
              #{rerunCount}
            </Badge>
          )}
        </div>
      );
    }

    // Handle application status badges with priority payment
    if (priorityPayment) {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-openkey-gold text-white">
            <Crown className="h-3 w-3 mr-1" />
            Priority
          </Badge>
          <Badge variant={status === 'pending' ? 'secondary' : status === 'approved' ? 'default' : 'destructive'}>
            {status}
          </Badge>
        </div>
      );
    }

    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_applications')
        .update({ lifecycle_stage: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: `Application ${newStatus} successfully.`,
      });
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    }
  };

  const handleDenyApplication = async (applicationId: string) => {
    try {
      const { data, error } = await supabase.rpc('landlord_deny_application', {
        p_application_id: applicationId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to deny application');
      }

      await fetchData();
      toast({
        title: "Success",
        description: "Application denied successfully.",
      });
    } catch (error) {
      console.error('Error denying application:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deny application.",
        variant: "destructive",
      });
    }
  };

  const openBackgroundCheckForm = (tenantId: string, tenantName: string, existingCheck?: any) => {
    // Find the tenant data from applications or current tenants
    const applicantData = applications.find(app => app.user_id === tenantId);
    const tenantData = currentTenants.find(tenant => tenant.user_id === tenantId);
    
    const sourceData = applicantData || tenantData;
    
    if (!sourceData) {
      toast({
        title: "Error",
        description: "Tenant data not found",
        variant: "destructive",
      });
      return;
    }

    // Create tenant object for form
    const tenant = {
      id: tenantId,
      first_name: sourceData.profiles?.first_name || '',
      last_name: sourceData.profiles?.last_name || '',
      phone: sourceData.profiles?.phone || '',
      email: sourceData.profiles?.email || '',
      property: {
        id: propertyId,
        address: propertyAddress,
        city: '',
        state: '',
        zip_code: ''
      },
      tenant_profile: applicantData?.tenant_profiles || undefined
    };

    setCurrentTenant(tenant);
    if (existingCheck) {
      setRerunCheckId(existingCheck.id);
    }
    setFormOpen(true);
  };

  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleFormSubmit = async (formData: any) => {
    if (!currentTenant?.id) {
      toast({
        title: "Error",
        description: "Invalid tenant selection.",
        variant: "destructive",
      });
      return;
    }

    setCheckLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to run background checks",
          variant: "destructive",
        });
        return;
      }

      // Validate property_id - use null if empty or invalid
      const validPropertyId = propertyId && 
                            propertyId.trim() !== '' && 
                            isValidUUID(propertyId) 
                            ? propertyId 
                            : null;

      const { data, error } = await supabase
        .from('background_checks')
        .insert({
          tenant_id: currentTenant.id,
          property_id: validPropertyId,
          initiated_by: user.id,
          check_status: 'pending',
          check_type: 'comprehensive',
          cost: 0.00,
          notes: `Background check for ${formData.firstName} ${formData.lastName}`,
          form_data: {
            personalInfo: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              dateOfBirth: formData.dateOfBirth,
              lastFourSSN: formData.lastFourSSN,
              phone: formData.phone,
              email: formData.email
            },
            address: {
              street: formData.currentAddress,
              city: formData.city,
              state: formData.state,
              zipCode: formData.zipCode
            },
            employment: {
              employer: formData.currentEmployer || '',
              position: formData.employmentStatus || '',
              monthlyIncome: parseFloat(formData.monthlyIncome) || 0
            }
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Start the background check processing
      const { error: functionError } = await supabase.functions.invoke('background-check-processor', {
        body: {
          checkId: data.id,
          personalInfo: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            lastFourSSN: formData.lastFourSSN,
            phone: formData.phone,
            email: formData.email
          },
          address: {
            street: formData.currentAddress,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode
          },
          employment: {
            employer: formData.currentEmployer || '',
            position: formData.employmentStatus || '',
            monthlyIncome: parseFloat(formData.monthlyIncome) || 0
          }
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
      }

      toast({
        title: "Background Check Initiated",
        description: `Comprehensive background check started for ${formData.firstName} ${formData.lastName}. Processing will complete shortly.`,
      });

      // Close form and refresh data
      setFormOpen(false);
      setCurrentTenant(null);
      setRerunCheckId(null);
      await fetchData();
    } catch (error) {
      console.error('Error initiating background check:', error);
      toast({
        title: "Error",
        description: "Failed to initiate background check. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckLoading(false);
    }
  };

  const handleCancelCheck = async (checkId: string, reason?: string) => {
    setActionLoading(`cancel-${checkId}`);
    try {
      const { error } = await supabase.functions.invoke('cancel-background-check', {
        body: { checkId, cancellationReason: reason || 'Cancelled by user' }
      });

      if (error) throw error;

      toast({
        title: "Background Check Cancelled",
        description: "The background check has been cancelled successfully.",
      });
      await fetchData();
    } catch (error) {
      console.error('Error cancelling background check:', error);
      toast({
        title: "Error",
        description: "Failed to cancel background check",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewResults = (check: any) => {
    // Check if the background check was cancelled
    if (check.check_status === 'cancelled') {
      toast({
        title: "Background Check Cancelled",
        description: "This background check was cancelled and has no results. Please run the check again to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (check.results_json && Object.keys(check.results_json).length > 0) {
      // Transform nested form_data to flattened structure
      let transformedFormData = null;
      if (check.form_data) {
        transformedFormData = {
          firstName: check.form_data.personalInfo?.firstName,
          lastName: check.form_data.personalInfo?.lastName,
          dateOfBirth: check.form_data.personalInfo?.dateOfBirth,
          lastFourSSN: check.form_data.personalInfo?.lastFourSSN,
          phone: check.form_data.personalInfo?.phone,
          email: check.form_data.personalInfo?.email,
          street: check.form_data.address?.street,
          city: check.form_data.address?.city,
          state: check.form_data.address?.state,
          zipCode: check.form_data.address?.zipCode,
          employer: check.form_data.employment?.employer,
          position: check.form_data.employment?.position,
          monthlyIncome: check.form_data.employment?.monthlyIncome?.toString(),
        };
      }
      
      setSelectedResults({
        ...check.results_json,
        checkDate: check.completed_at || check.initiated_at,
        tenantName: check.profiles ? `${check.profiles.first_name} ${check.profiles.last_name}` : 'Unknown Tenant',
        formData: transformedFormData
      });
      setIsResultsOpen(true);
    } else {
      toast({
        title: "No Results Available",
        description: "This background check has no results available. Please run the check again.",
        variant: "destructive",
      });
    }
  };

  const renderApplicationsView = () => {
    if (applications.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No applications for this {unitId && !aggregateAllUnits ? 'unit' : 'property'}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {applications.map((application) => (
          <div key={application.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">
                  {application.profiles?.first_name} {application.profiles?.last_name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Applied: {formatDate(application.created_at)}
                </p>
                {aggregateAllUnits && application.property_units && (
                  <p className="text-xs text-muted-foreground">
                    Unit: {application.property_units.unit_number || application.property_units.unit_name || 'N/A'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(application.lifecycle_stage, application.priority_payment_made)}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedApplication(application)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              
              {application.lifecycle_stage === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => updateApplicationStatus(application.id, 'approved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDenyApplication(application.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCurrentTenantsView = () => {
    if (currentTenants.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No current tenants for this {unitId && !aggregateAllUnits ? 'unit' : 'property'}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {currentTenants.map((tenant) => (
          <div key={tenant.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">
                  {tenant.profiles?.first_name} {tenant.profiles?.last_name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Lease started: {formatDate(tenant.created_at)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Rent: ${tenant.properties?.monthly_rent}/month
                </p>
                {aggregateAllUnits && tenant.property_units && (
                  <p className="text-xs text-muted-foreground">
                    Unit: {tenant.property_units.unit_number || tenant.property_units.unit_name || 'N/A'}
                  </p>
                )}
              </div>
              <Badge variant="default">Current Tenant</Badge>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                View Lease
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBackgroundCheckView = () => {
    // Get all eligible tenants (combine applications and current tenants, remove duplicates)
    const getEligibleTenants = () => {
      const tenantMap = new Map();
      
      // Add applicants
      applications.forEach(app => {
        if (app.profiles && app.user_id) {
          tenantMap.set(app.user_id, {
            id: app.user_id,
            name: `${app.profiles.first_name} ${app.profiles.last_name}`,
            status: app.lifecycle_stage,
            type: 'applicant',
            unitInfo: aggregateAllUnits && app.property_units ? 
              `Unit: ${app.property_units.unit_number || app.property_units.unit_name || 'N/A'}` : null,
            applicationId: app.id
          });
        }
      });
      
      // Add current tenants
      currentTenants.forEach(tenant => {
        if (tenant.profiles && tenant.user_id) {
          tenantMap.set(tenant.user_id, {
            id: tenant.user_id,
            name: `${tenant.profiles.first_name} ${tenant.profiles.last_name}`,
            status: 'approved',
            type: 'current_tenant',
            unitInfo: aggregateAllUnits && tenant.property_units ? 
              `Unit: ${tenant.property_units.unit_number || tenant.property_units.unit_name || 'N/A'}` : null,
            applicationId: tenant.id
          });
        }
      });
      
      return Array.from(tenantMap.values());
    };

    const eligibleTenants = getEligibleTenants();

    // Check if tenant already has a background check
    const hasBackgroundCheck = (tenantId: string) => {
      return backgroundChecks.find(check => check.tenant_id === tenantId);
    };

    // Filter tenants based on search query
    const filteredTenants = eligibleTenants.filter(tenant => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return tenant.name.toLowerCase().includes(query) ||
             (tenant.unitInfo && tenant.unitInfo.toLowerCase().includes(query));
    });

    // Filter by status
    const getFilteredByStatus = () => {
      if (statusFilter === "all") return filteredTenants;
      
      return filteredTenants.filter(tenant => {
        const check = hasBackgroundCheck(tenant.id);
        
        switch (statusFilter) {
          case "completed":
            return check?.check_status === 'completed';
          case "pending":
            return check && ['pending', 'processing', 'in_progress'].includes(check.check_status);
          case "cancelled":
            return check && ['cancelled', 'failed'].includes(check.check_status);
          case "needs_run":
            return !check;
          default:
            return true;
        }
      });
    };

    return (
      <div className="space-y-6">
        {/* Search and Filter Section */}
        <div className="space-y-4 border rounded-lg p-4 bg-card">
          <h4 className="font-medium flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search & Filter
          </h4>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tenants by name or unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All", count: eligibleTenants.length },
                { key: "completed", label: "Completed", count: eligibleTenants.filter(t => hasBackgroundCheck(t.id)?.check_status === 'completed').length },
                { key: "pending", label: "Pending/Processing", count: eligibleTenants.filter(t => ['pending', 'processing', 'in_progress'].includes(hasBackgroundCheck(t.id)?.check_status || '')).length },
                { key: "cancelled", label: "Cancelled/Failed", count: eligibleTenants.filter(t => ['cancelled', 'failed'].includes(hasBackgroundCheck(t.id)?.check_status || '')).length },
                { key: "needs_run", label: "Needs Check", count: eligibleTenants.filter(t => !hasBackgroundCheck(t.id)).length }
              ].map(filter => (
                <Button
                  key={filter.key}
                  variant={statusFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.key)}
                  className="text-xs"
                >
                  {filter.label} ({filter.count})
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Filtered Tenants Section */}
        {getFilteredByStatus().length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">
              {statusFilter === 'all' ? 'All Tenants' : 
               statusFilter === 'needs_run' ? 'Tenants Needing Background Checks' :
               statusFilter === 'completed' ? 'Completed Background Checks' :
               statusFilter === 'pending' ? 'Pending Background Checks' :
               'Cancelled/Failed Background Checks'}
            </h4>
            <div className="space-y-3">
              {getFilteredByStatus().map((tenant) => {
                const existingCheck = hasBackgroundCheck(tenant.id);
                
                return (
                  <div key={tenant.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h5 className="font-medium">{tenant.name}</h5>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={tenant.status === 'approved' ? 'default' : 'secondary'}>
                            {tenant.type === 'current_tenant' ? 'Current Tenant' : tenant.status}
                          </Badge>
                          {existingCheck && getStatusBadge(existingCheck.check_status, false, existingCheck.rerun_count)}
                        </div>
                        {tenant.unitInfo && (
                          <p className="text-xs text-muted-foreground">{tenant.unitInfo}</p>
                        )}
                        {existingCheck && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Last check: {formatDate(existingCheck.created_at)}</p>
                            {existingCheck.cost > 0 && <p>Cost: ${existingCheck.cost}</p>}
                            {existingCheck.expires_at && (
                              <p>Expires: {formatDate(existingCheck.expires_at)}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {existingCheck ? (
                          <div className="flex flex-col gap-2">
                            {existingCheck.check_status === 'completed' && existingCheck.results_json && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewResults(existingCheck)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Results
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openBackgroundCheckForm(tenant.id, tenant.name, existingCheck)}
                                  disabled={actionLoading === `rerun-${existingCheck.id}`}
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {actionLoading === `rerun-${existingCheck.id}` ? 'Running...' : 'Re-run Check'}
                                </Button>
                              </div>
                            )}
                            {['pending', 'processing', 'in_progress'].includes(existingCheck.check_status) && (
                              <div className="flex gap-2">
                                <div className="text-xs text-muted-foreground pt-2">
                                  Processing...
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelCheck(existingCheck.id)}
                                  disabled={actionLoading === `cancel-${existingCheck.id}`}
                                  className="border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {actionLoading === `cancel-${existingCheck.id}` ? 'Cancelling...' : 'Cancel'}
                                </Button>
                              </div>
                            )}
                            {['failed', 'cancelled'].includes(existingCheck.check_status) && (
                              <div className="flex gap-2">
                                {existingCheck.results_json && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewResults(existingCheck)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openBackgroundCheckForm(tenant.id, tenant.name, existingCheck)}
                                  disabled={actionLoading === `rerun-${existingCheck.id}`}
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {actionLoading === `rerun-${existingCheck.id}` ? 'Running...' : 'Run Again'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => openBackgroundCheckForm(tenant.id, tenant.name)}
                            disabled={checkLoading}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Run Background Check
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {getFilteredByStatus().length === 0 && eligibleTenants.length > 0 && (
          <div className="border rounded-lg p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Matching Tenants</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No tenants match your search for "${searchQuery}"`
                : `No tenants found for the "${statusFilter}" filter.`
              }
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <div className="flex gap-2 justify-center">
                {searchQuery && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                )}
                {statusFilter !== 'all' && (
                  <Button 
                    variant="outline" 
                    onClick={() => setStatusFilter('all')}
                  >
                    Show All
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* No Tenants Message */}
        {eligibleTenants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No tenants available for background checks</p>
            <p className="text-sm">
              Tenants will appear here once there are applications or current tenants for this {unitId && !aggregateAllUnits ? 'unit' : 'property'}
            </p>
          </div>
        )}

        {/* Complete Background Check History */}
        {backgroundChecks.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">All Background Check History</h4>
            <div className="space-y-3">
              {backgroundChecks
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((check) => (
                  <div key={check.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {check.profiles?.first_name} {check.profiles?.last_name}
                          </span>
                          {getStatusBadge(check.check_status, false, check.rerun_count)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(check.created_at)} • Type: {check.check_type}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {check.cost > 0 && <p>Cost: ${check.cost}</p>}
                          {check.expires_at && <p>Expires: {formatDate(check.expires_at)}</p>}
                          {check.notes && <p>Notes: {check.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {check.check_status === 'completed' && check.results_json && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResults(check)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Results
                          </Button>
                        )}
                        {['pending', 'processing', 'in_progress'].includes(check.check_status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelCheck(check.id)}
                            disabled={actionLoading === `cancel-${check.id}`}
                            className="border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            {actionLoading === `cancel-${check.id}` ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
          <TabsList className={cn(
            "grid w-full grid-cols-2",
            "bg-card",
            "rounded-lg p-1 h-11"
          )}>
            <TabsTrigger 
              value="applications"
              className={cn(
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=active]:shadow-sm transition-all duration-200",
                "hover:bg-primary/8 font-medium"
              )}
            >
              Applications
            </TabsTrigger>
            <TabsTrigger 
              value="current-tenants"
              className={cn(
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=active]:shadow-sm transition-all duration-200",
                "hover:bg-primary/8 font-medium"
              )}
            >
              Current Tenants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            {renderApplicationsView()}
          </TabsContent>

          <TabsContent value="current-tenants">
            {renderCurrentTenantsView()}
          </TabsContent>
        </Tabs>
      </div>

      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <ApplicationDetailsModal application={selectedApplication} />
        </Dialog>
      )}

      {currentTenant && (
        <BackgroundCheckForm
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setCurrentTenant(null);
            setRerunCheckId(null);
          }}
          onSubmit={handleFormSubmit}
          tenant={currentTenant}
          isLoading={checkLoading}
          initialFormData={rerunCheckId ? backgroundChecks.find(check => check.id === rerunCheckId)?.form_data : undefined}
        />
      )}

      {/* Background Check Results Modal */}
      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">
              Background Check Results
              {selectedResults?.tenantName && ` - ${selectedResults.tenantName}`}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 pb-6">
            {selectedResults && (
              <BackgroundCheckResults 
                results={selectedResults}
                checkDate={selectedResults.checkDate}
                tenantName={selectedResults.tenantName}
                formData={selectedResults.formData}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PropertyModalApplicationsSubTabs;