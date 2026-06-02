import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface WhiteLabelConfig {
  id: string;
  company_name: string;
  custom_domain: string | null;
  custom_subdomain: string | null;
  approval_status: string;
  created_at: string;
  approved_at: string | null;
  user_id: string;
  contact_email: string;
  rejection_reason: string | null;
  approved_by: string | null;
}

export const WhiteLabelApprovalsTable = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedConfig, setSelectedConfig] = useState<WhiteLabelConfig | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['white-label-configs', statusFilter, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('white_label_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter);
      }
      
      if (debouncedSearch) {
        query = query.or(
          `company_name.ilike.%${debouncedSearch}%,custom_domain.ilike.%${debouncedSearch}%,custom_subdomain.ilike.%${debouncedSearch}%`
        );
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WhiteLabelConfig[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('white_label_configs')
        .update({
          approval_status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', configId);

      if (error) throw error;

      await supabase
        .from('white_label_approval_requests')
        .insert({
          white_label_config_id: configId,
          requested_by: selectedConfig?.user_id,
          status: 'approved',
          review_notes: reviewNotes,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
        });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Approved",
        description: "White-label configuration has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['white-label-configs'] });
      queryClient.invalidateQueries({ queryKey: ['white-label-approval-stats'] });
      setIsReviewDialogOpen(false);
      setSelectedConfig(null);
      setReviewNotes('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve configuration: " + error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('white_label_configs')
        .update({
          approval_status: 'rejected',
          rejection_reason: reviewNotes,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', configId);

      if (error) throw error;

      await supabase
        .from('white_label_approval_requests')
        .insert({
          white_label_config_id: configId,
          requested_by: selectedConfig?.user_id,
          status: 'rejected',
          review_notes: reviewNotes,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
        });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Rejected",
        description: "White-label configuration has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['white-label-configs'] });
      queryClient.invalidateQueries({ queryKey: ['white-label-approval-stats'] });
      setIsReviewDialogOpen(false);
      setSelectedConfig(null);
      setReviewNotes('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject configuration: " + error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleReview = (config: WhiteLabelConfig) => {
    setSelectedConfig(config);
    setReviewNotes(config.rejection_reason || '');
    setIsReviewDialogOpen(true);
  };

  const handleQuickApprove = async (config: WhiteLabelConfig) => {
    setSelectedConfig(config);
    setReviewNotes('Quick approval');
    await approveMutation.mutateAsync(config.id);
  };

  const handleQuickReject = async (config: WhiteLabelConfig) => {
    setSelectedConfig(config);
    setReviewNotes('Quick rejection');
    await rejectMutation.mutateAsync(config.id);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by company name or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Domain/Subdomain</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading configurations...
                </TableCell>
              </TableRow>
            ) : configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No white-label configurations found.
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{config.company_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {config.contact_email}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {config.custom_domain && (
                      <div className="text-sm">{config.custom_domain}</div>
                    )}
                    {config.custom_subdomain && (
                      <div className="text-sm">{config.custom_subdomain}</div>
                    )}
                    {!config.custom_domain && !config.custom_subdomain && (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                  
                  <TableCell>{formatDate(config.created_at)}</TableCell>
                  
                  <TableCell>{getStatusBadge(config.approval_status)}</TableCell>
                  
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleReview(config)}>
                          <Eye className="w-4 h-4 mr-2" />
                          {config.approval_status === 'pending' ? 'Review' : 'View Details'}
                        </DropdownMenuItem>
                        
                        {config.approval_status === 'pending' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleQuickApprove(config)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Quick Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickReject(config)}
                              className="text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Quick Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedConfig?.approval_status === 'pending' 
                ? 'Review White-Label Configuration' 
                : 'White-Label Configuration Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedConfig && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-sm">Company Name:</label>
                  <p className="text-sm">{selectedConfig.company_name}</p>
                </div>
                <div>
                  <label className="font-medium text-sm">Contact Email:</label>
                  <p className="text-sm">{selectedConfig.contact_email}</p>
                </div>
                {selectedConfig.custom_domain && (
                  <div>
                    <label className="font-medium text-sm">Custom Domain:</label>
                    <p className="text-sm">{selectedConfig.custom_domain}</p>
                  </div>
                )}
                {selectedConfig.custom_subdomain && (
                  <div>
                    <label className="font-medium text-sm">Custom Subdomain:</label>
                    <p className="text-sm">{selectedConfig.custom_subdomain}</p>
                  </div>
                )}
                <div>
                  <label className="font-medium text-sm">Status:</label>
                  <div className="mt-1">{getStatusBadge(selectedConfig.approval_status)}</div>
                </div>
                <div>
                  <label className="font-medium text-sm">Submitted:</label>
                  <p className="text-sm">{formatDate(selectedConfig.created_at)}</p>
                </div>
                {selectedConfig.approved_at && (
                  <div>
                    <label className="font-medium text-sm">
                      {selectedConfig.approval_status === 'approved' ? 'Approved' : 'Rejected'} Date:
                    </label>
                    <p className="text-sm">{formatDate(selectedConfig.approved_at)}</p>
                  </div>
                )}
              </div>

              {selectedConfig.rejection_reason && selectedConfig.approval_status === 'rejected' && (
                <div>
                  <label className="font-medium text-sm">Rejection Reason:</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                    {selectedConfig.rejection_reason}
                  </p>
                </div>
              )}

              {selectedConfig.approval_status === 'pending' && (
                <>
                  <div>
                    <label className="font-medium text-sm">Review Notes:</label>
                    <Textarea
                      placeholder="Add notes about your decision..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(selectedConfig.id)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate(selectedConfig.id)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};