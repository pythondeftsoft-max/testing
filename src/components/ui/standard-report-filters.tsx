import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AsOfDatePicker } from '@/components/ui/as-of-date-picker';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { SimpleDropdownSelect } from '@/components/ui/simple-dropdown-select';
import { Play } from 'lucide-react';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits } from '@/hooks/useAllPropertiesWithUnits';
import { useAllVendors } from '@/hooks/useAllVendors';

export interface StandardReportFilters {
  portfolioId: string;
  propertyIds: string[];
  unitIds: string[];
  assignedToIds?: string[];
  categories?: string[];
  statuses?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  asOfDate?: Date;
}

interface StandardPortfolioSelectorProps {
  value: string;
  onChange: (value: string) => void;
  userId: string;
  disabled?: boolean;
  className?: string;
}

export const StandardPortfolioSelector: React.FC<StandardPortfolioSelectorProps> = ({
  value,
  onChange,
  userId,
  disabled,
  className
}) => {
  const { portfolios, loading } = useUserPortfolios(userId);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">Portfolio</label>
      <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "Loading portfolios..." : "Select portfolio..."} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="everything">Everything</SelectItem>
          {portfolios.map((portfolio) => (
            <SelectItem key={portfolio.id} value={portfolio.id}>
              {portfolio.client_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface StandardPropertySelectorProps {
  selectedPropertyIds: string[];
  selectedUnitIds: string[];
  onSelectionChange: (propertyIds: string[], unitIds: string[]) => void;
  userId: string;
  portfolioId: string;
  disabled?: boolean;
  className?: string;
}

export const StandardPropertySelector: React.FC<StandardPropertySelectorProps> = ({
  selectedPropertyIds,
  selectedUnitIds,
  onSelectionChange,
  userId,
  portfolioId,
  disabled,
  className
}) => {
  const { data: properties = [], isLoading } = useAllPropertiesWithUnits(userId, portfolioId);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">Properties & Units</label>
      <HierarchicalPropertySelector
        properties={properties}
        selectedPropertyIds={selectedPropertyIds}
        selectedUnitIds={selectedUnitIds}
        onSelectionChange={onSelectionChange}
        disabled={disabled || isLoading}
      />
    </div>
  );
};

interface StandardDateFilterProps {
  mode: 'range' | 'asOf';
  dateFrom?: Date;
  dateTo?: Date;
  asOfDate?: Date;
  onRangeChange?: (dateFrom: Date, dateTo: Date) => void;
  onAsOfChange?: (date: Date) => void;
  className?: string;
}

export const StandardDateFilter: React.FC<StandardDateFilterProps> = ({
  mode,
  dateFrom,
  dateTo,
  asOfDate,
  onRangeChange,
  onAsOfChange,
  className
}) => {
  if (mode === 'range') {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-sm font-medium">Date Range</label>
        <DateRangePicker
          value={{ from: dateFrom, to: dateTo }}
          onChange={(dateRange) => {
            if (onRangeChange && dateRange.from && dateRange.to) {
              onRangeChange(dateRange.from, dateRange.to);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">As of Date</label>
      <AsOfDatePicker
        value={asOfDate || new Date()}
        onChange={(date) => onAsOfChange?.(date)}
      />
    </div>
  );
};

interface StandardVendorSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const StandardVendorSelector: React.FC<StandardVendorSelectorProps> = ({
  selected,
  onChange,
  disabled,
  placeholder = "Select vendors...",
  className
}) => {
  const { vendors, loading } = useAllVendors();

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">Assigned To</label>
      <SimpleDropdownSelect
        options={vendors.map(vendor => ({ value: vendor.name, label: vendor.name }))}
        selected={selected}
        onChange={onChange}
        placeholder={loading ? "Loading vendors..." : placeholder}
        allLabel="All Vendors"
        showSearch={false}
      />
    </div>
  );
};

interface StandardCategorySelectorProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const StandardCategorySelector: React.FC<StandardCategorySelectorProps> = ({
  options,
  selected,
  onChange,
  disabled,
  placeholder = "Select categories...",
  className
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">Category</label>
      <SimpleDropdownSelect
        options={options}
        selected={selected}
        onChange={onChange}
        placeholder={placeholder}
        allLabel="All Categories"
        showSearch={false}
      />
    </div>
  );
};

interface StandardStatusSelectorProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const StandardStatusSelector: React.FC<StandardStatusSelectorProps> = ({
  options,
  selected,
  onChange,
  disabled,
  placeholder = "Select statuses...",
  className
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">Status</label>
      <SimpleDropdownSelect
        options={options}
        selected={selected}
        onChange={onChange}
        placeholder={placeholder}
        allLabel="All Statuses"
        showSearch={false}
      />
    </div>
  );
};

interface PortfolioReportFiltersProps {
  title: string;
  description?: string;
  filters: StandardReportFilters;
  onFiltersChange: (filters: Partial<StandardReportFilters>) => void;
  onRunReport: () => void;
  userId: string;
  isRunning?: boolean;
  hasValidFilters?: () => boolean;
  validationMessage?: string;
  children?: React.ReactNode;
  dateMode?: 'range' | 'asOf';
  showVendorFilter?: boolean;
  showCategoryFilter?: boolean;
  showStatusFilter?: boolean;
  categoryOptions?: { value: string; label: string }[];
  statusOptions?: { value: string; label: string }[];
  hideDateRange?: boolean;
}

export const PortfolioReportFilters: React.FC<PortfolioReportFiltersProps> = ({
  title,
  description,
  filters,
  onFiltersChange,
  onRunReport,
  userId,
  isRunning = false,
  hasValidFilters,
  validationMessage = "Please select filters to run the report.",
  children,
  dateMode = 'range',
  showVendorFilter = false,
  showCategoryFilter = false,
  showStatusFilter = false,
  categoryOptions = [],
  statusOptions = [],
  hideDateRange = false
}) => {
  const handleRunReportClick = () => {
    onRunReport();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* First Row - Portfolio + Properties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StandardPortfolioSelector
            value={filters.portfolioId}
            onChange={(portfolioId) => onFiltersChange({ portfolioId })}
            userId={userId}
          />
          
          <StandardPropertySelector
            selectedPropertyIds={filters.propertyIds}
            selectedUnitIds={filters.unitIds}
            onSelectionChange={(propertyIds, unitIds) => onFiltersChange({ propertyIds, unitIds })}
            userId={userId}
            portfolioId={filters.portfolioId}
          />
        </div>

        {/* Second Row - Vendor + Category (if enabled) */}
        {(showVendorFilter || showCategoryFilter) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showVendorFilter && (
              <StandardVendorSelector
                selected={filters.assignedToIds || []}
                onChange={(assignedToIds) => onFiltersChange({ assignedToIds })}
              />
            )}
            
            {showCategoryFilter && (
              <StandardCategorySelector
                options={categoryOptions}
                selected={filters.categories || []}
                onChange={(categories) => onFiltersChange({ categories })}
              />
            )}
            
            {!showVendorFilter && showCategoryFilter && <div />}
            {showVendorFilter && !showCategoryFilter && <div />}
          </div>
        )}

        {/* Third Row - Status + Date (conditionally) */}
        {(showStatusFilter || !hideDateRange) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showStatusFilter && (
              <StandardStatusSelector
                options={statusOptions}
                selected={filters.statuses || []}
                onChange={(statuses) => onFiltersChange({ statuses })}
              />
            )}
            
            {!hideDateRange && (
              <StandardDateFilter
                mode={dateMode}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                asOfDate={filters.asOfDate}
                onRangeChange={(dateFrom, dateTo) => onFiltersChange({ dateFrom, dateTo })}
                onAsOfChange={(asOfDate) => onFiltersChange({ asOfDate })}
              />
            )}
            
            {(!showStatusFilter && !hideDateRange) || (showStatusFilter && hideDateRange) ? <div /> : null}
          </div>
        )}

        {/* Custom Filters */}
        {children}

        {/* Run Report Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleRunReportClick}
            disabled={isRunning}
            className="min-w-[140px]"
          >
            {isRunning ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Running...
              </div>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Report
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};