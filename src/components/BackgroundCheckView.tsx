import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Search, User, MapPin, Calendar, Phone, Shield, FileCheck, Eye, Clock, RefreshCw, CheckCircle, XCircle, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import BackgroundCheckForm from './BackgroundCheckForm';
import BackgroundCheckResults from './BackgroundCheckResults';

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  user_type: string;
  property?: {
    id: string;
    address: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  application?: {
    id: string;
    status: string;
    created_at: string;
  };
  tenant_profile?: {
    monthly_income?: string | number;
    employment_status?: string;
    city?: string;
    zip_code?: string;
  };
}

interface BackgroundCheck {
  id: string;
  tenant_id: string;
  check_status: string;
  check_type: string;
  results_json: any;
  initiated_at: string;
  completed_at: string;
  cost: number;
  cancelled_at?: string;
  cancelled_by?: string;
  rerun_count?: number;
  parent_check_id?: string;
  cancellation_reason?: string;
  form_data?: any;
}

interface BackgroundCheckViewProps {
  userId: string;
  portfolioId?: string;
}

const BackgroundCheckView = ({ userId, portfolioId }: BackgroundCheckViewProps) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [backgroundChecks, setBackgroundChecks] = useState<BackgroundCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [selectedResults, setSelectedResults] = useState<any>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rerunCheckId, setRerunCheckId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchTenants();
    fetchBackgroundChecks();
  }, [userId, portfolioId]);

  useEffect(() => {
    // Filter tenants based on search query
    if (!searchQuery.trim()) {
      setFilteredTenants(tenants);
    } else {
      const filtered = tenants.filter(tenant => {
        const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
        const phone = tenant.phone?.toLowerCase() || '';
        const address = tenant.property?.address?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        
        return fullName.includes(query) || 
               phone.includes(query) || 
               address.includes(query);
      });
      setFilteredTenants(filtered);
    }
  }, [searchQuery, tenants]);

  const fetchTenants = async () => {
    try {
      // Fetch tenants from property applications with basic data first
      let query = supabase
        .from('property_applications')
        .select(`
          *,
          properties!property_applications_property_id_fkey (
            id,
            address,
            owner_id,
            portfolio_id
          ),
          profiles!property_applications_tenant_id_fkey (
            id,
            first_name,
            last_name,
            phone,
            email,
            user_type
          )
        `)
        .eq('properties.owner_id', userId)
        .in('status', ['approved', 'pending', 'denied']);

      // Apply portfolio filter
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match Tenant interface and fetch additional data
      const tenantData = await Promise.all((data || []).map(async (app) => {
        const tenantId = app.profiles?.id;
        if (!tenantId) return null;

        // Fetch tenant profile data separately
        const { data: tenantProfile } = await supabase
          .from('tenant_profiles')
          .select('monthly_income, employment_status, city, zip_code')
          .eq('user_id', tenantId)
          .single();

        return {
          id: tenantId,
          first_name: app.profiles?.first_name || '',
          last_name: app.profiles?.last_name || '',
          phone: app.profiles?.phone || '',
          email: app.profiles?.email || '',
          user_type: app.profiles?.user_type || 'tenant',
          property: app.properties?.id ? {
            id: app.properties.id,
            address: app.properties?.address || '',
            city: '', // Will be populated from tenant profile if available
            state: '',
            zip_code: ''
          } : undefined,
          application: {
            id: app.id,
            status: app.status,
            created_at: app.created_at
          },
          tenant_profile: tenantProfile ? {
            monthly_income: tenantProfile.monthly_income,
            employment_status: tenantProfile.employment_status,
            city: tenantProfile.city,
            zip_code: tenantProfile.zip_code
          } : undefined
        };
      }));

      // Filter out null entries and remove duplicates by tenant id
      const validTenantData = tenantData.filter((tenant) => tenant !== null) as Tenant[];
      
      // Remove duplicates - keep the most recent application per tenant
      const uniqueTenants = validTenantData.reduce((acc, tenant) => {
        const existingIndex = acc.findIndex(t => t.id === tenant.id);
        if (existingIndex === -1) {
          acc.push(tenant);
        } else {
          // Keep the tenant with the most recent application
          const existing = acc[existingIndex];
          if (tenant.application && existing.application) {
            if (new Date(tenant.application.created_at) > new Date(existing.application.created_at)) {
              acc[existingIndex] = tenant;
            }
          }
        }
        return acc;
      }, [] as Tenant[]);

      setTenants(uniqueTenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenant data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBackgroundChecks = async () => {
    try {
      const { data, error } = await supabase
        .from('background_checks')
        .select('*')
        .eq('initiated_by', userId)
        .order('initiated_at', { ascending: false });

      if (error) throw error;
      setBackgroundChecks(data || []);
    } catch (error) {
      console.error('Error fetching background checks:', error);
    }
  };

  const openBackgroundCheckForm = (tenant: Tenant) => {
    setCurrentTenant(tenant);
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
      // Validate property_id - use null if empty or invalid
      const propertyId = currentTenant.property?.id && 
                        currentTenant.property.id.trim() !== '' && 
                        isValidUUID(currentTenant.property.id) 
                        ? currentTenant.property.id 
                        : null;

      const { data, error } = await supabase
        .from('background_checks')
        .insert({
          tenant_id: currentTenant.id,
          property_id: propertyId,
          initiated_by: userId,
          check_status: 'pending',
          check_type: 'comprehensive',
          cost: 25.00, // $25 per background check
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
      await fetchBackgroundChecks();
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
      await fetchBackgroundChecks();
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

  const handleRerunCheck = async (checkId: string, sections?: string[]) => {
    // Find the background check to get the associated tenant and form data
    const backgroundCheck = backgroundChecks.find(check => check.id === checkId);
    if (!backgroundCheck) {
      toast({
        title: "Error",
        description: "Could not find background check details.",
        variant: "destructive",
      });
      return;
    }

    // Find the tenant for this check
    const tenant = tenants.find(t => t.id === backgroundCheck.tenant_id);
    if (!tenant) {
      toast({
        title: "Error",
        description: "Could not find tenant information for this check.",
        variant: "destructive",
      });
      return;
    }

    // Open the background check form with pre-populated data from the previous check
    setCurrentTenant(tenant);
    setRerunCheckId(checkId);
    setFormOpen(true);
    
    toast({
      title: "Form Opened",
      description: "Please review and update the information before rerunning the background check.",
    });
  };

  // Handle viewing background check results
  const handleViewResults = (check: BackgroundCheck) => {
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
      const tenant = tenants.find(t => t.id === check.tenant_id);
      
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
        tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown Tenant',
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

  const getCheckStatusForTenant = (tenantId: string) => {
    // Return the most recent background check for this tenant
    return backgroundChecks
      .filter(check => check.tenant_id === tenantId)
      .sort((a, b) => new Date(b.initiated_at).getTime() - new Date(a.initiated_at).getTime())[0];
  };

  const getStatusBadge = (status: string, rerunCount?: number) => {
    const statusConfig = {
      pending: { 
        variant: 'warning' as const, 
        label: 'Pending', 
        icon: Clock,
        className: 'bg-openkey-blue text-white animate-pulse'
      },
      processing: { 
        variant: 'default' as const, 
        label: 'Processing', 
        icon: RefreshCw,
        className: 'bg-openkey-blue text-white animate-pulse'
      },
      completed: { 
        variant: 'success' as const, 
        label: 'Completed', 
        icon: CheckCircle,
        className: ''
      },
      failed: { 
        variant: 'destructive' as const, 
        label: 'Failed', 
        icon: XCircle,
        className: ''
      },
      cancelled: { 
        variant: 'danger' as const, 
        label: 'Cancelled', 
        icon: Square,
        className: ''
      },
      in_progress: { 
        variant: 'default' as const, 
        label: 'In Progress', 
        icon: RefreshCw,
        className: 'bg-openkey-blue text-white animate-pulse'
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
        {rerunCount > 0 && (
          <Badge variant="outline" className="text-xs border-openkey-gold/50 text-openkey-gold">
            #{rerunCount}
          </Badge>
        )}
      </div>
    );
  };

  const getFilteredTenants = () => {
    if (statusFilter === "all") return filteredTenants;
    
    return filteredTenants.filter(tenant => {
      const check = getCheckStatusForTenant(tenant.id);
      
      switch (statusFilter) {
        case "completed":
          return check?.check_status === 'completed';
        case "pending":
          return check && ['pending', 'processing', 'in_progress'].includes(check.check_status);
        case "cancelled":
          return check && ['cancelled', 'failed'].includes(check.check_status);
        default:
          return true;
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading tenant data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <CardEnhanced variant="elevated" className="text-center bg-gradient-blue-gold" animate>
        <CardEnhancedHeader className="pb-6">
          <CardEnhancedTitle className="text-4xl font-bold mb-3 text-white">
            Background Check Center
          </CardEnhancedTitle>
          <p className="text-lg text-white/90">
            Search for tenants and initiate comprehensive background checks
          </p>
        </CardEnhancedHeader>
      </CardEnhanced>

      {/* Search and Filter Section */}
      <CardEnhanced variant="elevated" className="border border-openkey-blue/20 card-hover-gold" animate>
        <CardEnhancedHeader className="pb-4">
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <Search className="h-5 w-5 text-openkey-blue" />
            Search Tenants
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-openkey-blue h-4 w-4" />
              <Input
                placeholder="Search tenants by name, phone, or property address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-focus pl-10 bg-background focus:ring-openkey-blue focus:border-openkey-blue"
              />
            </div>
            
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All", count: filteredTenants.length },
                { key: "completed", label: "Completed", count: filteredTenants.filter(t => getCheckStatusForTenant(t.id)?.check_status === 'completed').length },
                { key: "pending", label: "Pending/Processing", count: filteredTenants.filter(t => ['pending', 'processing'].includes(getCheckStatusForTenant(t.id)?.check_status || '')).length },
                { key: "cancelled", label: "Cancelled/Failed", count: filteredTenants.filter(t => ['cancelled', 'failed'].includes(getCheckStatusForTenant(t.id)?.check_status || '')).length }
              ].map((filter) => (
                <Button
                  key={filter.key}
                  size="sm"
                  variant={statusFilter === filter.key ? "blue" : "outline"}
                  className={cn(
                    "border-openkey-blue/20 text-xs",
                    statusFilter === filter.key 
                      ? "bg-openkey-blue text-white" 
                      : "text-openkey-blue hover:bg-openkey-blue hover:text-white"
                  )}
                  onClick={() => setStatusFilter(filter.key)}
                >
                  {filter.label} 
                  <Badge variant="secondary" className="ml-1 text-xs bg-openkey-gold/20 text-openkey-gold border-0">
                    {filter.count}
                  </Badge>
                </Button>
              ))}
            </div>
            
            <div className="text-sm text-muted-foreground">
              Found {getFilteredTenants().length} tenant{getFilteredTenants().length !== 1 ? 's' : ''} 
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Tenant Selection Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {getFilteredTenants().map((tenant) => {
          const existingCheck = getCheckStatusForTenant(tenant.id);
          
          return (
            <CardEnhanced 
              key={tenant.id}
              variant="elevated"
              className={cn(
                "cursor-pointer transition-all duration-300 card-hover-gold",
                existingCheck?.check_status === 'completed' && "border-openkey-gold/40 bg-gradient-to-br from-background to-openkey-gold/5",
                ['pending', 'processing'].includes(existingCheck?.check_status || '') && "border-openkey-blue/30 bg-gradient-to-br from-background to-openkey-blue/5",
                ['cancelled', 'failed'].includes(existingCheck?.check_status || '') && "border-muted/50 bg-gradient-to-br from-background to-muted/5",
                !existingCheck && "border-openkey-gold/20 bg-gradient-to-br from-background to-openkey-gold/10",
                selectedTenant?.id === tenant.id && "ring-2 ring-openkey-blue shadow-md"
              )}
              animate
              onClick={() => setSelectedTenant(tenant)}
            >
              <CardEnhancedContent className="p-4">
                <div className="space-y-3">
                  {/* Tenant Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className={cn("h-4 w-4", 
                        existingCheck?.check_status === 'completed' ? "text-openkey-gold" : "text-muted-foreground"
                      )} />
                      <div>
                        <h3 className={cn("font-medium text-sm text-foreground", 
                          existingCheck?.check_status === 'completed' && "text-openkey-blue"
                        )}>
                          {tenant.first_name} {tenant.last_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{tenant.user_type}</p>
                      </div>
                    </div>
                    {existingCheck && getStatusBadge(existingCheck.check_status, existingCheck.rerun_count)}
                  </div>

                  {/* Contact Info */}
                  {tenant.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {tenant.phone}
                    </div>
                  )}

                  {/* Property Info */}
                  {tenant.property?.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {tenant.property.address}
                    </div>
                  )}

                  {/* Application Info */}
                  {tenant.application && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Applied {formatDate(tenant.application.created_at)}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2 border-t">
                    {existingCheck ? (
                      <div className="flex flex-col gap-2">
                        {existingCheck.check_status === 'completed' && existingCheck.results_json && (
                          <div className="flex gap-2">
                            <Button
                               size="sm"
                               variant="blue"
                               className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewResults(existingCheck);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Results
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRerunCheck(existingCheck.id);
                              }}
                              disabled={actionLoading === `rerun-${existingCheck.id}`}
                            >
                              <FileCheck className="h-3 w-3 mr-1" />
                              {actionLoading === `rerun-${existingCheck.id}` ? 'Running...' : 'Run Again'}
                            </Button>
                          </div>
                        )}
                        {['pending', 'processing'].includes(existingCheck.check_status) && (
                          <div className="flex gap-2">
                            <div className="text-xs text-muted-foreground flex-1 text-center pt-2">
                              Processing...
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelCheck(existingCheck.id);
                              }}
                              disabled={actionLoading === `cancel-${existingCheck.id}`}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              {actionLoading === `cancel-${existingCheck.id}` ? 'Cancelling...' : 'Cancel'}
                            </Button>
                          </div>
                        )}
                        {['failed', 'cancelled'].includes(existingCheck.check_status) && (
                          <div className="flex gap-2">
                            {existingCheck.results_json && (
                               <Button
                                 size="sm"
                                 variant="outline"
                                 className="flex-1 border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleViewResults(existingCheck);
                                 }}
                               >
                                 <Eye className="h-3 w-3 mr-1" />
                                 View Details
                               </Button>
                            )}
                             <Button
                               size="sm"
                               variant="outline"
                               className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleRerunCheck(existingCheck.id);
                               }}
                               disabled={actionLoading === `rerun-${existingCheck.id}`}
                            >
                              <FileCheck className="h-3 w-3 mr-1" />
                              {actionLoading === `rerun-${existingCheck.id}` ? 'Running...' : 'Run Again'}
                            </Button>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground text-center">
                          {formatDate(existingCheck.initiated_at)}
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="blue"
                        className="w-full"
                        disabled={checkLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          openBackgroundCheckForm(tenant);
                        }}
                      >
                        <FileCheck className="h-3 w-3 mr-1" />
                        Run Background Check
                      </Button>
                    )}
                  </div>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          );
        })}
      </div>

      {/* No Results */}
      {getFilteredTenants().length === 0 && (
        <CardEnhanced variant="outlined">
          <CardEnhancedContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Tenants Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No tenants match your search for "${searchQuery}"`
                : "No tenant applications found for background checking."
              }
            </p>
            {searchQuery && (
            <Button 
              variant="outline" 
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white" 
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
            )}
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Results Section - Placeholder for future development */}
      {selectedTenant && (
        <CardEnhanced variant="outlined">
          <CardEnhancedHeader>
            <CardEnhancedTitle>
              Background Check Results - {selectedTenant.first_name} {selectedTenant.last_name}
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4" />
              <p>Background check results will appear here once the API integration is complete.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Background Check Form */}
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
    </div>
  );
};

export default BackgroundCheckView;