import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { usePortfolioTaxProfile, usePortfolioTaxProfileMutation } from '@/hooks/tax/usePortfolioTaxProfile';
import { useCreateAndPopulateBatch, useIrisBatches, useInvokeIris } from '@/hooks/tax/useIrisBatches';

interface IRSEfilePanelProps {
  portfolioId: string;
  userId: string;
  taxYear: number;
}

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  validating: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  submitting: 'bg-blue-100 text-blue-800',
  submitted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
};

export const IRSEfilePanel: React.FC<IRSEfilePanelProps> = ({ portfolioId, userId, taxYear }) => {
  const { data: profile } = usePortfolioTaxProfile(portfolioId);
  const saveProfile = usePortfolioTaxProfileMutation();
  const { data: batches, isLoading } = useIrisBatches(portfolioId, taxYear);
  const createBatch = useCreateAndPopulateBatch();
  const invokeIris = useInvokeIris();

  const handleToggle = async () => {
    if (!portfolioId) return;
    await saveProfile.mutateAsync({ portfolio_id: portfolioId, iris_enabled: !profile?.iris_enabled });
  };

  const handleCreate = async () => {
    if (!profile?.iris_enabled) {
      toast.error('Enable IRS E-File first');
      return;
    }
    await createBatch.mutateAsync({ portfolioId, year: taxYear, userId });
  };

  return (
    <CardEnhanced variant="premium">
      <CardEnhancedHeader>
        <CardEnhancedTitle>IRS E-File</CardEnhancedTitle>
        <CardEnhancedDescription>
          Submit 1099 forms electronically per portfolio and tax year
        </CardEnhancedDescription>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
          <div>
            <h3 className="font-medium">Enable IRS E-File</h3>
            <p className="text-sm text-muted-foreground">Control electronic filings for this portfolio</p>
          </div>
          <Button variant={profile?.iris_enabled ? 'default' : 'outline'} size="sm" onClick={handleToggle}>
            {profile?.iris_enabled ? 'Enabled' : 'Enable'}
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg mb-6">
          <div>
            <h3 className="font-medium">Create Batch ({taxYear})</h3>
            <p className="text-sm text-muted-foreground">Collect generated 1099s into a single IRS transmission</p>
          </div>
          <Button size="sm" onClick={handleCreate} disabled={!profile?.iris_enabled || createBatch.isPending}>
            Create Batch
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead>Rejected</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>Loading...</TableCell>
                </TableRow>
              ) : batches && batches.length > 0 ? (
                batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{new Date(b.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[b.status] || 'bg-gray-100 text-gray-800'}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{b.total_forms}</TableCell>
                    <TableCell>{b.accepted_count}</TableCell>
                    <TableCell>{b.rejected_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => invokeIris.mutate({ batchId: b.id, action: 'validate' })} disabled={b.status !== 'draft'}>
                          Dry Run
                        </Button>
                        <Button size="sm" onClick={() => invokeIris.mutate({ batchId: b.id, action: 'submit' })} disabled={b.status !== 'ready'}>
                          Submit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => invokeIris.mutate({ batchId: b.id, action: 'status' })}>
                          Refresh
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No batches yet for {taxYear}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default IRSEfilePanel;
