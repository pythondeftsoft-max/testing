import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Building2, TrendingUp, DollarSign } from 'lucide-react';

interface Asset {
  id: string;
  asset_name: string;
  asset_type?: string;
  current_value?: number;
  market_value?: number;
  category_name?: string;
  metadata?: {
    symbol?: string;
    asset_type?: string;
  };
}

interface AssetsListProps {
  assets: Asset[];
  isLoading?: boolean;
}

export const AssetsList = ({ assets, isLoading }: AssetsListProps) => {

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Assets Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Assets Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No assets found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Assets Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {assets.slice(0, 5).map((asset) => {
            const assetType = asset.metadata?.asset_type || asset.asset_type || asset.category_name || 'Unknown';
            const marketValue = asset.market_value || asset.current_value || 0;
            
            return (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">
                      {asset.asset_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assetType}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-semibold text-sm text-foreground">
                    <CurrencyDisplay amount={marketValue} />
                  </p>
                </div>
              </div>
            );
          })}
          {assets.length > 5 && (
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                +{assets.length - 5} more assets
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
