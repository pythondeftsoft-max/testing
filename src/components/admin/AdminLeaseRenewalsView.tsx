import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Check, X, Clock, Search, FileText, AlertCircle, TrendingUp, Users, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LeaseRenewalContract } from '@/components/LeaseRenewalContract';
import { Label } from '@/components/ui/label';

interface LeaseRenewal {
  id: string;
  property_id: string;
  tenant_id: string;
  current_lease_end: string;
  proposed_lease_end: string | null;
  new_rent_amount: number | null;
  renewal_status: string;
  renewal_type?: string;
  notice_sent_date: string | null;
  response_due_date: string | null;
  tenant_response_date: string | null;
  notes: string | null;
  created_at: string;
  properties: {
    address: string;
    monthly_rent: number;
    owner_id: string;
    portfolio_id: string | null;
  };
  landlord: {
    first_name: string;
    last_name: string;
    email: string;
  };
  tenant: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const AdminLeaseRenewalsView: React.FC = () => {
  const [renewals, setRenewals] = useState<LeaseRenewal[]>([]);
  const [filteredRenewals, setFilteredRenewals] = useState<LeaseRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRenewal, setSelectedRenewal] = useState<LeaseRenewal | null>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRenewals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [renewals, searchTerm, statusFilter]);

  const fetchRenewals = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_renewals')
        .select(`
          *,
          properties!inner(
            address,
            monthly_rent,
            owner_id,
            portfolio_id,
            landlord:profiles!properties_owner_id_fkey(
              first_name,
              last_name,
              email
            )
          ),
          tenant:profiles!lease_renewals_tenant_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedData = (data || []).map((renewal: any) => ({
        ...renewal,
        landlord: renewal.properties?.landlord || {
          first_name: '',
          last_name: '',
          email: '',
        },
        tenant: {
          first_name: renewal.tenant?.first_name || '',
          last_name: renewal.tenant?.last_name || '',
          email: renewal.tenant?.email || '',
        }
      }));

      setRenewals(transformedData);
    } catch (error) {
      console.error('Error fetching renewals:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load lease renewals",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewContract = (renewal: LeaseRenewal) => {
    setSelectedRenewal(renewal);
    setShowContractDialog(true);
  };

  const applyFilters = () => {
    let filtered = [...renewals];

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'sent') {
        filtered = filtered.filter(r => 
          r.renewal_status === 'sent' || 
          r.renewal_status === 'approved'
        );
      } else if (statusFilter === 'declined') {
        filtered = filtered.filter(r => 
          r.renewal_status === 'declined' || 
          r.renewal_status === 'rejected'
        );
      } else if (statusFilter === 'accepted') {
        filtered = filtered.filter(r => 
          r.renewal_status === 'accepted' ||
          r.renewal_status === 'completed' ||
          r.renewal_status === 'landlord_signed' ||
          r.renewal_status === 'tenant_signed'
        );
      } else {
        filtered = filtered.filter(r => r.renewal_status === statusFilter);
      }
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.properties.address.toLowerCase().includes(term) ||
        `${r.landlord.first_name} ${r.landlord.last_name}`.toLowerCase().includes(term) ||
        `${r.tenant.first_name} ${r.tenant.last_name}`.toLowerCase().includes(term)
      );
    }

    setFilteredRenewals(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'sent':
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><FileText className="w-3 h-3 mr-1" />Awaiting Response</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><Check className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'declined':
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><X className="w-3 h-3 mr-1" />Declined</Badge>;
      case 'landlord_signed':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Landlord Signed</Badge>;
      case 'tenant_signed':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Tenant Signed</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300"><Check className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate metrics
  const metrics = {
    total: renewals.length,
    pending: renewals.filter(r => 
      r.renewal_status === 'sent' || 
      r.renewal_status === 'approved'
    ).length,
    accepted: renewals.filter(r => 
      r.renewal_status === 'accepted' ||
      r.renewal_status === 'completed' ||
      r.renewal_status === 'landlord_signed' ||
      r.renewal_status === 'tenant_signed'
    ).length,
    declined: renewals.filter(r => 
      r.renewal_status === 'declined' || 
      r.renewal_status === 'rejected'
    ).length,
    tenantRequested: renewals.filter(r => 
      r.renewal_type === 'tenant_requested'
    ).length,
    acceptanceRate: (() => {
      const responded = renewals.filter(r => 
        ['accepted', 'completed', 'declined', 'rejected', 'landlord_signed', 'tenant_signed'].includes(r.renewal_status)
      ).length;
      const accepted = renewals.filter(r => 
        r.renewal_status === 'accepted' || 
        r.renewal_status === 'completed' ||
        r.renewal_status === 'landlord_signed' ||
        r.renewal_status === 'tenant_signed'
      ).length;
      return responded > 0 ? ((accepted / responded) * 100).toFixed(1) : '0.0';
    })()
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lease renewals...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Renewals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Responses</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.declined}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant Requested</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tenantRequested}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Lease Renewals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by property, landlord, or tenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Draft (Not Sent)</SelectItem>
                <SelectItem value="sent">Sent (Awaiting Response)</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Current End</TableHead>
                  <TableHead>New Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated By</TableHead>
                  <TableHead>Response Due</TableHead>
                  <TableHead>Decline Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRenewals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No lease renewals found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRenewals.map((renewal) => (
                    <TableRow key={renewal.id}>
                      <TableCell className="font-medium">
                        {renewal.properties.address}
                      </TableCell>
                      <TableCell>
                        {renewal.landlord.first_name} {renewal.landlord.last_name}
                      </TableCell>
                      <TableCell>
                        {renewal.tenant.first_name} {renewal.tenant.last_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(renewal.current_lease_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {renewal.new_rent_amount ? `$${renewal.new_rent_amount.toLocaleString()}/mo` : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(renewal.renewal_status)}
                      </TableCell>
                      <TableCell>
                        {renewal.renewal_type === 'tenant_requested' ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                            <Users className="w-3 h-3 mr-1" />
                            Tenant
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">
                            Landlord
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {renewal.response_due_date ? (
                          <span className={
                            new Date(renewal.response_due_date) < new Date() && 
                            !['accepted', 'declined', 'rejected', 'completed'].includes(renewal.renewal_status)
                              ? 'text-red-600 font-medium'
                              : ''
                          }>
                            {format(new Date(renewal.response_due_date), 'MMM d, yyyy')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {(renewal.renewal_status === 'declined' || renewal.renewal_status === 'rejected') && renewal.notes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-start gap-2 max-w-xs cursor-help">
                                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-muted-foreground line-clamp-2">
                                  {renewal.notes}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-md">
                              <p className="text-sm">{renewal.notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewContract(renewal)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Contract View Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lease Renewal Contract Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedRenewal && (
            <div className="space-y-4">
              {/* Renewal Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Renewal Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Property</Label>
                    <p className="font-medium">{selectedRenewal.properties.address}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedRenewal.renewal_status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Landlord</Label>
                    <p className="font-medium">
                      {selectedRenewal.landlord.first_name} {selectedRenewal.landlord.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedRenewal.landlord.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tenant</Label>
                    <p className="font-medium">
                      {selectedRenewal.tenant.first_name} {selectedRenewal.tenant.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedRenewal.tenant.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Lease End</Label>
                    <p className="font-medium">
                      {format(new Date(selectedRenewal.current_lease_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">New Rent</Label>
                    <p className="font-medium">
                      {selectedRenewal.new_rent_amount 
                        ? `$${selectedRenewal.new_rent_amount.toLocaleString()}/mo` 
                        : 'Not specified'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Component */}
              <LeaseRenewalContract
                renewalId={selectedRenewal.id}
                userType="landlord"
                propertyAddress={selectedRenewal.properties.address}
                currentRent={selectedRenewal.properties.monthly_rent}
                newRent={selectedRenewal.new_rent_amount || undefined}
                currentLeaseEnd={selectedRenewal.current_lease_end}
                newLeaseEnd={selectedRenewal.proposed_lease_end || undefined}
                landlordName={`${selectedRenewal.landlord.first_name} ${selectedRenewal.landlord.last_name}`}
                tenantName={`${selectedRenewal.tenant.first_name} ${selectedRenewal.tenant.last_name}`}
                onContractUpdate={() => {
                  fetchRenewals();
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};
