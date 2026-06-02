import { Plus, RefreshCw, Bell, Download, Settings, ChevronDown, ChevronUp, Columns, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { CurrencySelector } from '@/components/ui/currency-selector';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface AssetsQuickActionsSidebarProps {
  layout?: 'vertical' | 'horizontal';
  viewMode?: 'widgets' | 'holdings';
  onAddAsset?: () => void;
  onAddWidget?: () => void;
  onRefreshQuotes?: () => void;
  onViewAlerts?: () => void;
  onExportData?: () => void;
  isRefreshing?: boolean;
  currency?: string;
  onCurrencyChange?: (currency: any) => void;
  visibleColumns?: string[];
  availableColumns?: Array<{ id: string; label: string; required?: boolean }>;
  onColumnToggle?: (columnId: string, visible: boolean) => void;
}

export const AssetsQuickActionsSidebar = ({
  layout = 'vertical',
  viewMode = 'holdings',
  onAddAsset,
  onAddWidget,
  onRefreshQuotes,
  onViewAlerts,
  onExportData,
  isRefreshing = false,
  currency,
  onCurrencyChange,
  visibleColumns,
  availableColumns,
  onColumnToggle
}: AssetsQuickActionsSidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Horizontal layout for header
  if (layout === 'horizontal') {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={onAddAsset}
          variant="blue"
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>

        {viewMode === 'widgets' && onAddWidget && (
          <Button
            onClick={onAddWidget}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Add Widget
          </Button>
        )}

        <Button
          onClick={onRefreshQuotes}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        {viewMode === 'holdings' && (
          <>
            <Button
              onClick={onViewAlerts}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Alerts
            </Button>

            <Button
              onClick={onExportData}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </>
        )}

        {currency && onCurrencyChange && visibleColumns && availableColumns && onColumnToggle && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-popover z-50" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <CurrencySelector
                    value={currency as any}
                    onValueChange={onCurrencyChange}
                    showIcon={true}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Columns</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                        <Columns className="h-4 w-4" />
                        Configure
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                      {availableColumns.map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={visibleColumns.includes(column.id)}
                          onCheckedChange={(checked) => onColumnToggle(column.id, checked)}
                          disabled={column.required}
                        >
                          {column.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  // Vertical layout for sidebar (existing behavior)
  return (
    <Card className="bg-card border-border sticky top-4">
      <CardContent className="p-6">
        <div className="space-y-2">
          <Button
            onClick={() => {
              if (isExpanded) {
                onAddAsset?.();
              } else {
                setIsExpanded(true);
              }
            }}
            variant="blue"
            className="w-full justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Asset
            {!isExpanded && <ChevronDown className="h-4 w-4 ml-auto" />}
          </Button>

          {isExpanded && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <Button
                onClick={() => setIsExpanded(false)}
                variant="ghost"
                size="sm"
                className="w-full justify-center gap-2"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                onClick={onRefreshQuotes}
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Quotes
              </Button>

              <Button
                onClick={onViewAlerts}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Bell className="h-4 w-4" />
                Alerts
              </Button>

              <Button
                onClick={onExportData}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>

              {currency && onCurrencyChange && visibleColumns && availableColumns && onColumnToggle && (
                <>
                  <div className="pt-2 border-t border-border mt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-popover z-50" align="end">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Currency</label>
                            <CurrencySelector
                              value={currency as any}
                              onValueChange={onCurrencyChange}
                              showIcon={true}
                              className="w-full"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Columns</label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                                  <Columns className="h-4 w-4" />
                                  Configure
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                                {availableColumns.map((column) => (
                                  <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={visibleColumns.includes(column.id)}
                                    onCheckedChange={(checked) => onColumnToggle(column.id, checked)}
                                    disabled={column.required}
                                  >
                                    {column.label}
                                  </DropdownMenuCheckboxItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
