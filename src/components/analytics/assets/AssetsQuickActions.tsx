import { useState } from 'react';
import { Plus, Download, RefreshCw, Bell, Eye, Filter, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AddAssetWizard } from '@/components/portfolio/AddAssetWizard';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { cn } from '@/lib/utils';

interface AssetsQuickActionsProps {
  currency: string;
  onCurrencyChange: (currency: any) => void;
  onRefreshQuotes: () => void;
  onExport: () => void;
  onShowAlerts: () => void;
  isMarketLoading: boolean;
  isExporting: boolean;
  alertsCount: number;
  visibleColumns: string[];
  availableColumns: Array<{ id: string; label: string; required?: boolean }>;
  onColumnToggle: (columnId: string, visible: boolean) => void;
  onAssetAdded: () => void;
  filteredAssetsCount: number;
}

export const AssetsQuickActions = ({
  currency,
  onCurrencyChange,
  onRefreshQuotes,
  onExport,
  onShowAlerts,
  isMarketLoading,
  isExporting,
  alertsCount,
  visibleColumns,
  availableColumns,
  onColumnToggle,
  onAssetAdded,
  filteredAssetsCount
}: AssetsQuickActionsProps) => {
  const [showAddAssetWizard, setShowAddAssetWizard] = useState(false);

  return (
    <div className="w-60 space-y-3">
      {/* Primary Actions Card - Compact */}
      <Card className="border-openkey-blue/20 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-openkey-blue flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add Asset - Most Prominent but compact */}
          <AddAssetWizard
            portfolioId="everything"
            onAssetAdded={onAssetAdded}
            trigger={
              <Button 
                variant="gradient" 
                size="sm" 
                className="w-full gap-2 h-9 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                Add Asset
              </Button>
            }
            isOpen={showAddAssetWizard}
            onOpenChange={setShowAddAssetWizard}
          />

          {/* Secondary Actions - More compact */}
          <div className="space-y-2">
            <Button 
              onClick={onRefreshQuotes}
              disabled={isMarketLoading}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-8 border-openkey-blue/30 hover:bg-openkey-blue/5"
            >
              <RefreshCw className={cn("h-3 w-3", isMarketLoading && "animate-spin")} />
              Refresh Quotes
            </Button>
            
            <Button 
              onClick={onShowAlerts}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-8 border-openkey-gold/30 hover:bg-openkey-gold/5"
            >
              <Bell className="h-3 w-3" />
              Alerts
              {alertsCount > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs h-4 bg-openkey-gold/20 text-openkey-gold">
                  {alertsCount}
                </Badge>
              )}
            </Button>

            <Button 
              onClick={onExport}
              disabled={isExporting || filteredAssetsCount === 0}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-8 border-openkey-blue/30 hover:bg-openkey-blue/5"
            >
              <Download className="h-3 w-3" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card - Compact */}
      <Card className="border-openkey-blue/20 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-openkey-blue flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Currency Selector - Compact */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Currency</label>
            <CurrencySelector
              value={currency as any}
              onValueChange={onCurrencyChange}
              showIcon={true}
              className="w-full h-8 text-sm"
            />
          </div>

          {/* Column Visibility - Compact */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Columns</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2 justify-start h-8 text-sm">
                  <Columns className="h-3 w-3" />
                  Configure
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {availableColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={visibleColumns.includes(column.id)}
                    onCheckedChange={(checked) => onColumnToggle(column.id, checked)}
                    disabled={column.required}
                    className="text-sm"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card - Compact */}
      <Card className="border-openkey-gold/20 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardContent className="pt-3 pb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-openkey-gold mb-1">
              {filteredAssetsCount}
            </div>
            <div className="text-xs text-muted-foreground">
              Assets Visible
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};