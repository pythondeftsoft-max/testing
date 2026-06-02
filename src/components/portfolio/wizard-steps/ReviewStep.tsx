import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePortfolioAssetOperations } from '@/hooks/usePortfolioAssets';
import { useMarketDataQuery } from '@/hooks/useMarketDataQuery';
import { WizardData } from '../AddAssetWizard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReviewStepProps {
  wizardData: WizardData;
  portfolioId: string;
  onComplete: () => void;
  onBack: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  wizardData,
  portfolioId,
  onComplete,
  onBack
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGrantingRole, setIsGrantingRole] = useState(false);
  // Use a placeholder portfolio ID for the hook, but override the actual portfolio_id in the create call
  const { createAsset } = usePortfolioAssetOperations(portfolioId === 'everything' ? 'placeholder' : portfolioId);
  const { toast } = useToast();
  
  // Fetch current market data if symbol is selected
  const { data: marketData, isLoading: isLoadingMarketData } = useMarketDataQuery(
    wizardData.selectedSymbol?.symbol,
    wizardData.selectedSymbol?.assetType,
    wizardData.selectedSymbol?.externalId
  );

  const handleSubmit = async () => {
    if (!wizardData.selectedCategory) return;

    setIsSubmitting(true);
    try {
        const assetData = {
          portfolio_id: portfolioId === 'everything' ? null : portfolioId,
          asset_category_id: wizardData.selectedCategory.id,
          asset_name: wizardData.assetName,
          asset_value: wizardData.assetValue,
          acquisition_cost: wizardData.acquisitionCost,
          acquisition_date: wizardData.acquisitionDate,
          annual_income: wizardData.annualIncome,
          annual_expenses: wizardData.annualExpenses,
          metadata: {
            ...wizardData.metadata,
            ...(wizardData.selectedSubcategory && { subcategory: wizardData.selectedSubcategory }),
            ...(wizardData.selectedSymbol && {
              symbol: wizardData.selectedSymbol.symbol,
              asset_type: wizardData.selectedSymbol.assetType,
              external_id: wizardData.selectedSymbol.externalId,
              data_source: wizardData.selectedSymbol.dataSource
            })
          },
          tags: wizardData.tags
        };

      const result = await createAsset.mutateAsync(assetData);
      
      toast({
        title: "Asset Added Successfully",
        description: `${wizardData.assetName} has been added to your portfolio.`,
        action: (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('tab', 'assets');
                params.set('highlightAssetId', result.id);
                window.location.href = `/dashboard?${params.toString()}`;
              }}
            >
              View in Assets
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
              Invite Someone
            </Button>
          </div>
        ),
      });
      
      onComplete();
    } catch (error: any) {
      console.error('Asset creation error:', error);
      
      // Check if it's a permission error
      const isPermissionError = error?.message?.includes('row-level security') || 
                              error?.message?.includes('permission denied') ||
                              error?.code === 'PGRST116'; // PostgREST insufficient privilege
      
      if (isPermissionError) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to add assets to this portfolio. Would you like to grant yourself admin access?",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSelfGrantRole()}
            >
              Grant Admin Access
            </Button>
          )
        });
      } else {
        toast({
          title: "Failed to Add Asset",
          description: error?.message || "There was an error adding your asset. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelfGrantRole = async () => {
    setIsGrantingRole(true);
    try {
      const { data, error } = await supabase.functions.invoke('grant-portfolio-role', {
        body: { portfolioId, role: 'admin_partner' }
      });

      if (error) throw error;

      toast({
        title: "Access Granted",
        description: "You now have admin access to this portfolio. Try adding the asset again.",
        variant: "default",
      });

      // Refresh permissions by invalidating queries
      // The user should now try the asset creation again
      
    } catch (error: any) {
      console.error('Error granting role:', error);
      toast({
        title: "Failed to Grant Access",
        description: error?.message || "Could not grant admin access. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsGrantingRole(false);
    }
  };

  const netAnnualIncome = wizardData.annualIncome - wizardData.annualExpenses;
  const isAlternativeInvestment = wizardData.selectedCategory?.name === 'alternatives';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Asset Details</h3>
        <p className="text-muted-foreground">Please review the asset details before adding to your portfolio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {wizardData.assetName}
            {wizardData.selectedSymbol && (
              <Badge variant="outline">{wizardData.selectedSymbol.symbol}</Badge>
            )}
            {/* Current Market Data - Live Price */}
            {isLoadingMarketData ? (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </Badge>
            ) : marketData ? (
              <Badge variant="secondary" className="gap-1">
                ${marketData.currentPrice?.toFixed(2)}
                {marketData.priceChangePercentage24h !== undefined && (
                  <span className={`${
                    marketData.priceChangePercentage24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {marketData.priceChangePercentage24h >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                  </span>
                )}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Category</span>
              <p className="font-medium">{wizardData.selectedCategory?.display_name}</p>
            </div>
            {wizardData.selectedSubcategory && (
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium">{wizardData.selectedSubcategory}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-muted-foreground">Current Value</span>
              <p className="font-medium">{formatCurrency(wizardData.assetValue)}</p>
            </div>
            {wizardData.acquisitionCost && (
              <div>
                <span className="text-sm text-muted-foreground">Acquisition Cost</span>
                <p className="font-medium">{formatCurrency(wizardData.acquisitionCost)}</p>
              </div>
            )}
            {wizardData.acquisitionDate && (
              <div>
                <span className="text-sm text-muted-foreground">Acquisition Date</span>
                <p className="font-medium">{formatDate(wizardData.acquisitionDate)}</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Financial Performance</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Annual Income</span>
                <p className="font-medium text-green-600">{formatCurrency(wizardData.annualIncome)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Annual Expenses</span>
                <p className="font-medium text-red-600">{formatCurrency(wizardData.annualExpenses)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Net Income</span>
                <p className={`font-medium ${netAnnualIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netAnnualIncome)}
                </p>
              </div>
            </div>
          </div>

          {wizardData.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wizardData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Display category-specific metadata */}
          {Object.keys(wizardData.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Additional Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(wizardData.metadata)
                    .filter(([key]) => !['subcategory', 'symbol', 'exchange', 'asset_type', 'data_source', 'external_id'].includes(key))
                    .map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <p className="font-medium">{String(value)}</p>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {!isAlternativeInvestment && wizardData.acquisitionCost && wizardData.assetValue !== wizardData.acquisitionCost && (
            <>
              <Separator />
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm">
                  <span className="text-muted-foreground">Unrealized Gain/Loss: </span>
                  <span className={`font-medium ${
                    wizardData.assetValue - wizardData.acquisitionCost >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(wizardData.assetValue - wizardData.acquisitionCost)} 
                    ({((wizardData.assetValue - wizardData.acquisitionCost) / wizardData.acquisitionCost * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Asset
        </Button>
      </div>
    </div>
  );
};