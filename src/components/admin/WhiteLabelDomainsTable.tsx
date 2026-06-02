import { useState } from 'react';
import { useWhiteLabelDomains, useWhiteLabelDomainStats, type DomainInfo } from '@/hooks/useWhiteLabelDomains';
import { DomainDetailsModal } from './modals/DomainDetailsModal';
import { DomainAnalyticsModal } from './modals/DomainAnalyticsModal';
import { calculateUptime, formatLastChecked, getDomainDisplay } from '@/utils/domainHelpers';
import { formatMonthlyCost, getTierDisplayName, getTierColor } from '@/utils/whiteLabelPricing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { Globe, Search, MoreHorizontal, CheckCircle, XCircle, Clock, Activity, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { buildSubdomainUrl } from '@/utils/baseDomain';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const WhiteLabelDomainsTable = () => {
  const { data: domains, isLoading } = useWhiteLabelDomains();
  const stats = useWhiteLabelDomainStats(domains);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<DomainInfo | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getPreviewUrl = (domain: DomainInfo): string => {
    if (domain.domain_type === 'domain') {
      return `https://${domain.domain_value}`;
    } else {
      return buildSubdomainUrl(domain.domain_value);
    }
  };

  const handlePreviewSite = (domain: DomainInfo) => {
    const url = getPreviewUrl(domain);
    
    if (domain.domain_verification_status !== 'verified') {
      toast({
        title: 'Domain Not Verified',
        description: 'This domain is not yet verified and may not be accessible.',
        variant: 'default',
      });
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleViewDetails = (domain: DomainInfo) => {
    setSelectedDomain(domain);
    setShowDetailsModal(true);
  };

  const handleViewAnalytics = (domain: DomainInfo) => {
    setSelectedDomain(domain);
    setShowAnalyticsModal(true);
  };

  const verifyDomainMutation = useMutation({
    mutationFn: async (domain: DomainInfo) => {
      const { data: verification } = await supabase
        .from('domain_verifications')
        .select('verification_token, id')
        .eq('white_label_config_id', domain.id)
        .single();

      if (!verification) throw new Error('No verification record found');

      const response = await supabase.functions.invoke('reverify-domain', {
        body: {
          domain: domain.domain_value,
          verification_token: verification.verification_token,
          verification_id: verification.id,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['white-label-domains'] });
      
      if (data?.verified) {
        toast({
          title: '✓ Domain Verified',
          description: data.message || 'Domain has been successfully verified!',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: data?.message || 'Domain verification failed. Please check your DNS settings.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredDomains = domains?.filter(domain => {
    const matchesSearch = 
      searchQuery === '' ||
      domain.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      domain.domain_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      domain.owner_email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'verified' && domain.domain_verification_status === 'verified') ||
      (statusFilter === 'unverified' && domain.domain_verification_status === 'pending') ||
      (statusFilter === 'failed' && domain.domain_verification_status === 'failed');

    const matchesApproval =
      approvalFilter === 'all' ||
      domain.approval_status === approvalFilter;

    return matchesSearch && matchesStatus && matchesApproval;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Not Verified</Badge>;
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.total_domains}</div>
                <p className="text-xs text-muted-foreground">All configured domains</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Domains</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.verified_domains}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total_domains > 0 
                    ? `${Math.round((stats.verified_domains / stats.total_domains) * 100)}% verified`
                    : 'No domains yet'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traffic</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.total_traffic.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Page views (30 days)</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <MetricSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.active_now}</div>
                <p className="text-xs text-muted-foreground">Active in last 24h</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, domain, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Verification Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Approval Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approvals</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company/Owner</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Traffic (30d)</TableHead>
                  <TableHead>Monthly Cost</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading domains...
                    </TableCell>
                  </TableRow>
                ) : filteredDomains && filteredDomains.length > 0 ? (
                  filteredDomains.map((domain) => {
                    const { value, type } = getDomainDisplay({
                      custom_domain: domain.domain_type === 'domain' ? domain.domain_value : null,
                      custom_subdomain: domain.domain_type === 'subdomain' ? domain.domain_value : null,
                    });
                    const uptime = calculateUptime(domain.verified_at || domain.approved_at);

                    return (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{domain.company_name}</div>
                            <div className="text-sm text-muted-foreground">{domain.owner_email || 'No email'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{value}</span>
                            <Badge variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getApprovalBadge(domain.approval_status)}
                            {getStatusBadge(domain.domain_verification_status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={uptime.badge === 'success' ? 'default' : uptime.badge === 'warning' ? 'secondary' : 'outline'}>
                            {uptime.formatted}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{domain.page_views_30d.toLocaleString()} views</div>
                            <div className="text-sm text-muted-foreground">{domain.unique_visitors_30d} visitors</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className={`text-sm font-semibold ${getTierColor(domain.subscription_tier)}`}>
                              {formatMonthlyCost(domain.monthly_cost, domain.billing_cycle)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getTierDisplayName(domain.subscription_tier)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatLastChecked(domain.last_checked_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handlePreviewSite(domain)}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Preview Site
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => verifyDomainMutation.mutate(domain)}
                                disabled={verifyDomainMutation.isPending}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify Domain
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewAnalytics(domain)}>
                                <Activity className="mr-2 h-4 w-4" />
                                View Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDetails(domain)}>
                                <Globe className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Globe className="h-12 w-12 mb-2 opacity-20" />
                        <p>No domains found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedDomain && (
        <>
          <DomainDetailsModal
            domain={selectedDomain}
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
          />
          <DomainAnalyticsModal
            domain={selectedDomain}
            isOpen={showAnalyticsModal}
            onClose={() => setShowAnalyticsModal(false)}
          />
        </>
      )}
    </div>
  );
};
