import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { CardEnhanced } from '@/components/enhanced/CardEnhanced';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Users, Database, Settings, HelpCircle, Download, Upload, Eye } from 'lucide-react';
import { usePortfolioTaxProfile } from '@/hooks/tax/usePortfolioTaxProfile';
import { use1099Candidates } from '@/hooks/tax/use1099Candidates';
import { useIrisBatches, useCreateAndPopulateBatch, useInvokeIris } from '@/hooks/tax/useIrisBatches';
import { TaxProfileForm } from '@/components/tax/TaxProfileForm';
import { IRSEfilePanel } from '@/components/tax/IRSEfilePanel';
import { useAuth } from '@/hooks/useAuth';

export const TaxCenter: React.FC = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const currentYear = new Date().getFullYear();

  if (!portfolioId) {
    return <Navigate to="/portfolios" replace />;
  }

  const { data: taxProfile, isLoading: profileLoading } = usePortfolioTaxProfile(portfolioId);
  const { data: candidates, isLoading: candidatesLoading } = use1099Candidates(portfolioId, currentYear);
  const { data: batches, isLoading: batchesLoading } = useIrisBatches(portfolioId, currentYear);
  const createBatchMutation = useCreateAndPopulateBatch();
  const invokeIrisMutation = useInvokeIris();

  const handleCreateBatch = () => {
    createBatchMutation.mutate({
      portfolioId: portfolioId,
      year: currentYear,
      userId: user?.id || '',
    });
  };

  const handleBatchAction = (batchId: string, action: 'validate' | 'submit' | 'status') => {
    invokeIrisMutation.mutate({ batchId, action });
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-secondary text-secondary-foreground',
    ready: 'bg-primary text-primary-foreground',
    submitting: 'bg-accent text-accent-foreground',
    accepted: 'bg-success text-success-foreground',
    rejected: 'bg-destructive text-destructive-foreground',
  };

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Tax Center</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Tax Center</h1>
          <p className="text-muted-foreground">Manage 1099 forms and IRS e-filing</p>
        </div>
      </div>

      {!taxProfile && (
        <Alert>
          <AlertDescription>
            Complete your tax profile to begin generating 1099 forms and e-filing with the IRS.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tax Profile
          </TabsTrigger>
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            1099 Candidates
            {candidates && candidates.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {candidates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            E-File Batches
            {batches && batches.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {batches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings & Help
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <CardEnhanced>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">Portfolio Tax Profile</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure tax information for this portfolio
                  </p>
                </div>
              </div>
              <TaxProfileForm 
                portfolioId={portfolioId} 
                userId={user?.id || ''}
              />
            </div>
          </CardEnhanced>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-6">
          <CardEnhanced>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">1099 Candidates for {currentYear}</h2>
                    <p className="text-sm text-muted-foreground">
                      Recipients who may require 1099 forms based on payment thresholds
                    </p>
                  </div>
                </div>
                {candidates && candidates.length > 0 && (
                  <Button onClick={handleCreateBatch} disabled={createBatchMutation.isPending}>
                    Create E-File Batch
                  </Button>
                )}
              </div>

              {candidatesLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg" />
                  ))}
                </div>
              ) : candidates && candidates.length > 0 ? (
                <div className="space-y-3">
                  {candidates.map((candidate, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="font-medium">Recipient ID: {candidate.recipient_id}</p>
                          <p className="text-sm text-muted-foreground">
                            Form Type: {candidate.form_type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">
                          ${candidate.total.toLocaleString()}
                        </p>
                        <Badge variant="outline">
                          {candidate.form_type === '1099_nec' ? '1099-NEC' : '1099-MISC'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No 1099 Candidates Found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No recipients met the threshold requirements for 1099 forms in {currentYear}.
                  </p>
                </div>
              )}
            </div>
          </CardEnhanced>
        </TabsContent>

        <TabsContent value="batches" className="space-y-6">
          <CardEnhanced>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Upload className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">IRS E-File Batches</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage and submit 1099 forms to the IRS
                  </p>
                </div>
              </div>

              {batchesLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-lg" />
                  ))}
                </div>
              ) : batches && batches.length > 0 ? (
                <div className="space-y-4">
                  {batches.map((batch) => (
                    <div 
                      key={batch.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Batch {batch.id.slice(0, 8)}</h3>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(batch.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={statusColors[batch.status] || statusColors.draft}>
                          {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tax Year</p>
                          <p className="font-medium">{batch.tax_year}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Accepted</p>
                          <p className="font-medium">{batch.accepted_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Rejected</p>
                          <p className="font-medium">{batch.rejected_count || 0}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleBatchAction(batch.id, 'validate')}
                          disabled={invokeIrisMutation.isPending}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Validate
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleBatchAction(batch.id, 'submit')}
                          disabled={batch.status !== 'ready' || invokeIrisMutation.isPending}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Submit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleBatchAction(batch.id, 'status')}
                          disabled={invokeIrisMutation.isPending}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Status
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No E-File Batches</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Create your first batch from 1099 candidates to begin e-filing with the IRS.
                  </p>
                </div>
              )}
            </div>
          </CardEnhanced>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <IRSEfilePanel 
            portfolioId={portfolioId} 
            userId={user?.id || ''} 
            taxYear={currentYear} 
          />
          
          <CardEnhanced>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <HelpCircle className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">Help & Resources</h2>
                  <p className="text-sm text-muted-foreground">
                    Tax filing requirements and support
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">1099-NEC Requirements</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      File for non-employee compensation ≥ $600
                    </p>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      IRS Instructions
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">1099-MISC Requirements</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      File for miscellaneous income ≥ $600
                    </p>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      IRS Instructions
                    </Button>
                  </div>
                </div>
                
                <Alert>
                  <AlertDescription>
                    <strong>Important:</strong> 1099 forms must be filed by January 31st for the previous tax year. 
                    E-filing is required for 250+ forms.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </CardEnhanced>
        </TabsContent>
      </Tabs>
    </div>
  );
};