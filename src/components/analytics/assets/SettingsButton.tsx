import { Settings, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CurrencySelector } from '@/components/ui/currency-selector';

interface SettingsButtonProps {
  currency: string;
  onCurrencyChange: (currency: any) => void;
  visibleColumns: string[];
  availableColumns: Array<{ id: string; label: string; required?: boolean }>;
  onColumnToggle: (columnId: string, visible: boolean) => void;
}

export const SettingsButton = ({
  currency,
  onCurrencyChange,
  visibleColumns,
  availableColumns,
  onColumnToggle
}: SettingsButtonProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full gap-2 justify-start">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-3 text-sm">Settings</h4>
          </div>

          {/* Currency Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Currency</label>
            <CurrencySelector
              value={currency as any}
              onValueChange={onCurrencyChange}
              showIcon={true}
              className="w-full"
            />
          </div>

          {/* Column Visibility */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Columns</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                  <Columns className="h-4 w-4" />
                  Configure
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
  );
};
