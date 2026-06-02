import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Link, DollarSign, Users, Mail } from 'lucide-react';
import { AssetValuationHistory } from './AssetValuationHistory';
import { AssetRelationshipDialog } from './AssetRelationshipDialog';
import { AssetValuationDialog } from './AssetValuationDialog';
import AssetDocumentManager from './AssetDocumentManager';
import { AssetInviteForm } from '@/components/AssetInviteForm';
import { AssetInvitationsList } from '@/components/AssetInvitationsList';
import { AssetReminderPreferencesCard } from '@/components/AssetReminderPreferencesCard';
import { useAssetRelationships, usePortfolioAssets } from '@/hooks/usePortfolioAssets';
import { useAssetBehavior } from '@/hooks/useAssetBehavior';
import type { PortfolioAsset } from '@/types/portfolio-assets';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AssetDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: PortfolioAsset;
  portfolioId: string;
  defaultTab?: string;
}

export const AssetDetailsDialog: React.FC<AssetDetailsDialogProps> = ({
  isOpen,
  onClose,
  asset,
  portfolioId,
  defaultTab = "overview",
}) => {
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [showValuationDialog, setShowValuationDialog] = useState(false);

  const { data: relationships = [] } = useAssetRelationships(asset.id);
  const { data: allAssets = [] } = usePortfolioAssets(portfolioId);
  const { shouldShowReminderOptions, suggestedReminderFrequency } = useAssetBehavior(asset);

  const getRelatedAsset = (relationshipAssetId: string) => {
    return allAssets.find(a => a.id === relationshipAssetId);
  };

  const netIncome = asset.annual_income - asset.annual_expenses;
  const roi = asset.asset_value ? ((netIncome / asset.asset_value) * 100) : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">{asset.asset_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">
                    {asset.asset_category?.display_name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Current Value: {formatCurrency(asset.current_value || asset.asset_value)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowValuationDialog(true)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Record Valuation
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowRelationshipDialog(true)}
                >
                  <Link className="h-4 w-4 mr-2" />
                  Link Asset
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-portfolio-invite', { 
                      detail: { portfolioId } 
                    }));
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Invite to Portfolio
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className={`grid w-full ${shouldShowReminderOptions ? 'grid-cols-7' : 'grid-cols-6'}`}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="valuations">Valuations</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              {shouldShowReminderOptions && (
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Asset Value</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(asset.current_value || asset.asset_value)}
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Annual Income</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(asset.annual_income)}
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Annual Expenses</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(asset.annual_expenses)}
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Net Income</div>
                  <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netIncome)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Asset Details</h4>
                  <div className="space-y-2 text-sm">
                    {asset.asset_description && (
                      <div>
                        <span className="text-muted-foreground">Description:</span>
                        <div>{asset.asset_description}</div>
                      </div>
                    )}
                    {asset.acquisition_date && (
                      <div>
                        <span className="text-muted-foreground">Acquired:</span>
                        <div>{formatDate(new Date(asset.acquisition_date))}</div>
                      </div>
                    )}
                    {asset.acquisition_cost && (
                      <div>
                        <span className="text-muted-foreground">Acquisition Cost:</span>
                        <div>{formatCurrency(asset.acquisition_cost)}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">ROI:</span>
                      <div className={roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {roi.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {asset.tags && asset.tags.length > 0 && (
                  <div className="bg-card border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {asset.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <AssetDocumentManager 
                portfolioId={portfolioId}
                assetId={asset.id}
                showAssetFilter={false}
              />
            </TabsContent>

            <TabsContent value="valuations">
              <AssetValuationHistory 
                asset={asset} 
                onRecordValuation={() => setShowValuationDialog(true)}
              />
            </TabsContent>

            <TabsContent value="relationships" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Asset Relationships</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowRelationshipDialog(true)}
                >
                  <Link className="h-4 w-4 mr-2" />
                  Add Relationship
                </Button>
              </div>

              {relationships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div>No relationships configured yet.</div>
                  <div className="text-sm">Link this asset to other assets to track dependencies and hierarchies.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {relationships.map((relationship) => {
                    const isParent = relationship.parent_asset_id === asset.id;
                    const relatedAssetId = isParent ? relationship.child_asset_id : relationship.parent_asset_id;
                    const relatedAsset = getRelatedAsset(relatedAssetId);
                    
                    if (!relatedAsset) return null;

                    return (
                      <div key={relationship.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{relatedAsset.asset_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {isParent ? 'Child Asset' : 'Parent Asset'} • {relationship.relationship_type.replace('_', ' ')}
                            </div>
                            {relationship.relationship_data?.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {relationship.relationship_data.description}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary">
                            {relatedAsset.asset_category?.display_name}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invitations" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Asset Invitations</h3>
                <AssetInviteForm 
                  assetId={asset.id} 
                  assetName={asset.asset_name}
                  assetCategory={asset.metadata?.asset_category || ''}
                  commercialSubtype={asset.metadata?.commercial_subtype}
                />
              </div>
              <AssetInvitationsList assetId={asset.id} />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">ROI</div>
                  <div className={`text-2xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roi.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Net Income</div>
                  <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netIncome)}
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Appreciation</div>
                  <div className={`text-2xl font-bold ${(asset.current_value || asset.asset_value) >= (asset.acquisition_cost || asset.asset_value) ? 'text-green-600' : 'text-red-600'}`}>
                    {asset.acquisition_cost 
                      ? `${(((asset.current_value || asset.asset_value) - asset.acquisition_cost) / asset.acquisition_cost * 100).toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </div>
              </div>
              <AssetValuationHistory 
                asset={asset}
                onRecordValuation={() => setShowValuationDialog(true)}
              />
            </TabsContent>

            {shouldShowReminderOptions && (
              <TabsContent value="reminders" className="space-y-4">
                <AssetReminderPreferencesCard
                  assetId={asset.id}
                  assetName={asset.asset_name}
                  suggestedFrequency={suggestedReminderFrequency}
                />
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      <AssetRelationshipDialog
        isOpen={showRelationshipDialog}
        onClose={() => setShowRelationshipDialog(false)}
        portfolioId={portfolioId}
        parentAsset={asset}
      />

      <AssetValuationDialog
        isOpen={showValuationDialog}
        onClose={() => setShowValuationDialog(false)}
        asset={asset}
        portfolioId={portfolioId}
      />
    </>
  );
};