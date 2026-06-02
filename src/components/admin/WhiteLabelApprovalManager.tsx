import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface WhiteLabelConfig {
  id: string;
  company_name: string;
  custom_domain: string;
  custom_subdomain: string;
  approval_status: string;
  created_at: string;
  user_id: string;
  contact_email: string;
}

export const WhiteLabelApprovalManager = () => {
  const [selectedConfig, setSelectedConfig] = useState<WhiteLabelConfig | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingConfigs, isLoading } = useQuery({
    queryKey: ['pending-white-label-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

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

      // Create approval request record
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
      queryClient.invalidateQueries({ queryKey: ['pending-white-label-configs'] });
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

      // Create approval request record
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
      queryClient.invalidateQueries({ queryKey: ['pending-white-label-configs'] });
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">White-Label Approvals</h2>
        <p className="text-muted-foreground">Review and approve white-label configuration requests</p>
      </div>

      <div className="grid gap-4">
        {pendingConfigs?.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{config.company_name}</CardTitle>
                  <CardDescription>
                    {config.custom_domain && `Domain: ${config.custom_domain}`}
                    {config.custom_subdomain && `Subdomain: ${config.custom_subdomain}`}
                  </CardDescription>
                </div>
                {getStatusBadge(config.approval_status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Contact Email:</span> {config.contact_email}
                  </div>
                  <div>
                    <span className="font-medium">Submitted:</span> {new Date(config.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedConfig(config)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Review White-Label Configuration</DialogTitle>
                      </DialogHeader>
                      
                      {selectedConfig && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="font-medium">Company Name:</label>
                              <p>{selectedConfig.company_name}</p>
                            </div>
                            <div>
                              <label className="font-medium">Contact Email:</label>
                              <p>{selectedConfig.contact_email}</p>
                            </div>
                            {selectedConfig.custom_domain && (
                              <div>
                                <label className="font-medium">Custom Domain:</label>
                                <p>{selectedConfig.custom_domain}</p>
                              </div>
                            )}
                            {selectedConfig.custom_subdomain && (
                              <div>
                                <label className="font-medium">Custom Subdomain:</label>
                                <p>{selectedConfig.custom_subdomain}</p>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="font-medium">Review Notes:</label>
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
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => approveMutation.mutate(selectedConfig.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingConfigs?.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No pending white-label configurations</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};