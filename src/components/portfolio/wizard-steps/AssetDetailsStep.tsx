import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WizardData } from '../AddAssetWizard';
import { formatCurrency } from '@/lib/utils';
import { useAssetBehavior } from '@/hooks/useAssetBehavior';
import { REMINDER_FREQUENCIES } from '@/constants/assetBehavior';
import { BondFormFields } from './BondFormFields';
import { AlternativeInvestmentsFormFields } from './AlternativeInvestmentsFormFields';
import { CashEquivalentsFormFields } from './CashEquivalentsFormFields';
import { CommoditiesFormFields } from './CommoditiesFormFields';
import { PrivateEquityBusinessFormFields } from './PrivateEquityBusinessFormFields';
import { VehicleFormFields } from './VehicleFormFields';
import { InlineSymbolSearch } from './InlineSymbolSearch';
import { Ship, Plane, Building, Store, Warehouse, Car, Truck, Home, Building2, HelpCircle } from 'lucide-react';

interface AssetDetailsStepProps {
  wizardData: WizardData;
  onDataChange: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Helper function to get subcategory icon
const getSubcategoryIcon = (subcategory: string) => {
  const iconMap: Record<string, any> = {
    'boat': Ship,
    'yacht': Ship,
    'aircraft': Plane,
    'commercial': Building,
    'retail': Store,
    'industrial': Warehouse,
    'car': Car,
    'motorcycle': Car,
    'truck': Truck,
    'rv': Truck,
    'residential': Home,
    'land': Building2,
  };
  return iconMap[subcategory] || HelpCircle;
};

export const AssetDetailsStep: React.FC<AssetDetailsStepProps> = ({
  wizardData,
  onDataChange,
  onNext,
  onBack
}) => {
  const handleFieldChange = (field: string, value: any) => {
    if (['assetValue', 'acquisitionCost', 'annualIncome', 'annualExpenses'].includes(field)) {
      onDataChange({ [field]: parseFloat(value) || 0 });
    } else if (field === 'tags') {
      const tags = value.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      onDataChange({ tags });
    } else if (field.startsWith('metadata.')) {
      const metadataField = field.replace('metadata.', '');
      onDataChange({
        metadata: {
          ...wizardData.metadata,
          [metadataField]: value
        }
      });
    } else {
      onDataChange({ [field]: value });
    }
  };

  const renderSchemaField = (fieldName: string, fieldConfig: any) => {
    const isRequired = fieldConfig.required;
    const value = wizardData.metadata[fieldName] || '';
    
    return (
      <div key={fieldName} className="space-y-2">
        <Label htmlFor={fieldName}>
          {fieldConfig.description || fieldName}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {fieldConfig.type === 'number' ? (
          <Input
            id={fieldName}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(`metadata.${fieldName}`, e.target.value)}
            placeholder={fieldConfig.description}
            required={isRequired}
          />
        ) : fieldConfig.type === 'date' ? (
          <Input
            id={fieldName}
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(`metadata.${fieldName}`, e.target.value)}
            required={isRequired}
          />
        ) : fieldConfig.type === 'boolean' ? (
          <div className="flex items-center space-x-2">
            <input
              id={fieldName}
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleFieldChange(`metadata.${fieldName}`, e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor={fieldName} className="text-sm font-normal">
              {fieldConfig.description}
            </Label>
          </div>
        ) : fieldName === 'coupon_rate' || fieldName === 'yield_to_maturity' || fieldName === 'interest_rate' ? (
          <div className="relative">
            <Input
              id={fieldName}
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={value}
              onChange={(e) => handleFieldChange(`metadata.${fieldName}`, e.target.value)}
              placeholder={fieldConfig.description}
              required={isRequired}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        ) : (
          <Input
            id={fieldName}
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(`metadata.${fieldName}`, e.target.value)}
            placeholder={fieldConfig.description}
            required={isRequired}
          />
        )}
      </div>
    );
  };

  // Check if this is a bond category
  const isBondCategory = wizardData.selectedCategory?.name === 'bonds';
  
  // Check if this is cryptocurrency category
  const isCryptoCategory = wizardData.selectedCategory?.name === 'crypto';
  
  // Check if this is stocks category
  const isStocksCategory = wizardData.selectedCategory?.name === 'stocks';
  
  // Check if this is private equity & business category
  const isPrivateEquityCategory = wizardData.selectedCategory?.name === 'private_equity';
  
  // Check if this is alternative investments category
  const isAlternativesCategory = wizardData.selectedCategory?.name === 'alternatives';
  
  // Check if this is cash & equivalents category
  const isCashEquivalentsCategory = wizardData.selectedCategory?.name === 'cash';
  
  // Check if this is commodities category
  const isCommoditiesCategory = wizardData.selectedCategory?.name === 'commodities';
  
  // Check if this is vehicle category
  const isVehicleCategory = wizardData.selectedCategory?.name === 'vehicle';

  const metadataSchema = wizardData.selectedCategory?.metadata_schema || {};
  const canProceed = wizardData.assetName.trim() && 
    // Require subcategory if the category has subcategories (except crypto/stocks which handle it differently)
    (!wizardData.selectedCategory?.subcategories || 
     wizardData.selectedCategory.subcategories.length === 0 ||
     isCryptoCategory ||  // Crypto uses symbol search, not subcategories
     isStocksCategory ||  // Stocks use symbol search, not subcategories
     wizardData.selectedSubcategory) &&  // REQUIRE for all other categories with subcategories
    // Category-specific validation
    ((wizardData.selectedCategory?.name === 'crypto' || wizardData.selectedCategory?.name === 'stocks')
      ? (wizardData.assetValue > 0 && parseFloat(wizardData.metadata.quantity || '0') > 0)
      : wizardData.selectedCategory?.name === 'private_equity'
      ? (wizardData.assetValue > 0 && 
         parseFloat(wizardData.metadata.ownership_percentage || '0') > 0 &&
         wizardData.acquisitionCost > 0 &&
         wizardData.acquisitionDate)
      : wizardData.assetValue > 0
    );

  // Get asset behavior to determine if reminders should be shown
  const mockAsset = {
    asset_category: wizardData.selectedCategory?.name,
    commercial_subtype: wizardData.selectedSubcategory as any
  };
  const { shouldShowReminderOptions, suggestedReminderFrequency } = useAssetBehavior(mockAsset);


  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Asset Details</h3>
        
        {/* Asset Category and Type Selection */}
        {wizardData.selectedCategory && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Category:</span>
              <Badge variant="outline">{wizardData.selectedCategory.display_name}</Badge>
            </div>
            
            {/* Inline Symbol Search - Show for crypto and stocks */}
            {(wizardData.selectedCategory.name === 'crypto' || 
              wizardData.selectedCategory.name === 'stocks') && (
              <div className="space-y-2">
                <Label className="text-sm">Search Symbol</Label>
                <InlineSymbolSearch
                  wizardData={wizardData}
                  onDataChange={onDataChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Render crypto-specific form if crypto category selected */}
      {isCryptoCategory ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assetName">
                  Cryptocurrency Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assetName"
                  value={wizardData.assetName}
                  onChange={(e) => handleFieldChange('assetName', e.target.value)}
                  placeholder="e.g., Bitcoin"
                  required
                  disabled={!!wizardData.selectedSymbol}
                />
                {wizardData.selectedSymbol && (
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from selected symbol
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity/Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={wizardData.metadata.quantity || ''}
                  onChange={(e) => {
                    const quantity = parseFloat(e.target.value) || 0;
                    const acquisitionPrice = parseFloat(wizardData.metadata.acquisition_price || '0');
                    const currentPrice = wizardData.selectedSymbol?.currentPrice || acquisitionPrice;
                    
                    handleFieldChange('metadata.quantity', e.target.value);
                    // Auto-calculate current value
                    if (quantity && currentPrice) {
                      handleFieldChange('assetValue', quantity * currentPrice);
                    }
                  }}
                  placeholder="0.00000000"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  How many units/coins you own
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="acquisitionPrice">
                  Acquisition Price (per unit)
                </Label>
                <Input
                  id="acquisitionPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.metadata.acquisition_price || ''}
                  onChange={(e) => {
                    const acquisitionPrice = parseFloat(e.target.value) || 0;
                    const quantity = parseFloat(wizardData.metadata.quantity || '0');
                    
                    handleFieldChange('metadata.acquisition_price', e.target.value);
                    // Calculate acquisition cost
                    if (quantity && acquisitionPrice) {
                      handleFieldChange('acquisitionCost', quantity * acquisitionPrice);
                    }
                  }}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Price per unit when you bought it
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">
                  Acquisition Date
                </Label>
                <Input
                  id="acquisitionDate"
                  type="date"
                  value={wizardData.acquisitionDate || ''}
                  onChange={(e) => handleFieldChange('acquisitionDate', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  When you purchased this cryptocurrency
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetValue">
                  Current Value (auto-calculated)
                </Label>
                <Input
                  id="assetValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.assetValue}
                  onChange={(e) => handleFieldChange('assetValue', e.target.value)}
                  placeholder="0.00"
                  disabled={!!(wizardData.metadata.quantity && wizardData.selectedSymbol?.currentPrice)}
                />
                <p className="text-xs text-muted-foreground">
                  {wizardData.metadata.quantity && wizardData.selectedSymbol?.currentPrice
                    ? `${wizardData.metadata.quantity} × $${wizardData.selectedSymbol.currentPrice.toLocaleString()}`
                    : 'Select symbol and enter quantity for auto-calculation'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="acquisitionCost">
                  Total Acquisition Cost (auto-calculated)
                </Label>
                <Input
                  id="acquisitionCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.acquisitionCost || ''}
                  readOnly
                  placeholder="0.00"
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {wizardData.metadata.quantity && wizardData.metadata.acquisition_price
                    ? `${wizardData.metadata.quantity} × $${parseFloat(wizardData.metadata.acquisition_price).toLocaleString()}`
                    : 'Enter quantity and acquisition price'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">
                  Tags (comma-separated)
                </Label>
                <Input
                  id="tags"
                  value={wizardData.tags.join(', ')}
                  onChange={(e) => handleFieldChange('tags', e.target.value)}
                  placeholder="bitcoin, long-term, crypto"
                />
              </div>
            </div>
          </div>

          {/* Current market data from selected symbol */}
          {wizardData.selectedSymbol?.currentPrice && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Current Market Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Price</p>
                    <p className="font-semibold">${wizardData.selectedSymbol.currentPrice.toLocaleString()}</p>
                  </div>
                  {wizardData.selectedSymbol.priceChangePercentage24h !== undefined && (
                    <div>
                      <p className="text-muted-foreground">24h Change</p>
                      <p className={`font-semibold ${wizardData.selectedSymbol.priceChangePercentage24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {wizardData.selectedSymbol.priceChangePercentage24h >= 0 ? '+' : ''}{wizardData.selectedSymbol.priceChangePercentage24h.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {wizardData.metadata.acquisition_price && wizardData.selectedSymbol.currentPrice && (
                    <div>
                      <p className="text-muted-foreground">Gain/Loss</p>
                      <p className={`font-semibold ${wizardData.selectedSymbol.currentPrice >= parseFloat(wizardData.metadata.acquisition_price) ? 'text-green-600' : 'text-red-600'}`}>
                        {((wizardData.selectedSymbol.currentPrice - parseFloat(wizardData.metadata.acquisition_price)) / parseFloat(wizardData.metadata.acquisition_price) * 100).toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : isStocksCategory ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Stock Name */}
              <div className="space-y-2">
                <Label htmlFor="assetName">
                  Stock Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assetName"
                  value={wizardData.assetName}
                  onChange={(e) => handleFieldChange('assetName', e.target.value)}
                  placeholder="e.g., Tesla, Inc."
                  required
                  disabled={!!wizardData.selectedSymbol}
                />
                {wizardData.selectedSymbol && (
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from selected symbol
                  </p>
                )}
              </div>

              {/* Quantity/Amount (Number of shares) */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity/Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={wizardData.metadata.quantity || ''}
                  onChange={(e) => {
                    const quantity = parseFloat(e.target.value) || 0;
                    const acquisitionPrice = parseFloat(wizardData.metadata.acquisition_price || '0');
                    const currentPrice = wizardData.selectedSymbol?.currentPrice || acquisitionPrice;
                    
                    handleFieldChange('metadata.quantity', e.target.value);
                    // Auto-calculate current value
                    if (quantity && currentPrice) {
                      handleFieldChange('assetValue', quantity * currentPrice);
                    }
                  }}
                  placeholder="0.0000"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Number of shares you own
                </p>
              </div>

              {/* Acquisition Price (per share) */}
              <div className="space-y-2">
                <Label htmlFor="acquisitionPrice">
                  Acquisition Price (per share)
                </Label>
                <Input
                  id="acquisitionPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.metadata.acquisition_price || ''}
                  onChange={(e) => {
                    const acquisitionPrice = parseFloat(e.target.value) || 0;
                    const quantity = parseFloat(wizardData.metadata.quantity || '0');
                    
                    handleFieldChange('metadata.acquisition_price', e.target.value);
                    // Calculate total acquisition cost
                    if (quantity && acquisitionPrice) {
                      handleFieldChange('acquisitionCost', quantity * acquisitionPrice);
                    }
                  }}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Price per share when you bought it
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Acquisition Date */}
              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">
                  Acquisition Date
                </Label>
                <Input
                  id="acquisitionDate"
                  type="date"
                  value={wizardData.acquisitionDate || ''}
                  onChange={(e) => handleFieldChange('acquisitionDate', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  When you purchased this stock
                </p>
              </div>

              {/* Current Value (auto-calculated) */}
              <div className="space-y-2">
                <Label htmlFor="assetValue">
                  Current Value (auto-calculated)
                </Label>
                <Input
                  id="assetValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.assetValue}
                  onChange={(e) => handleFieldChange('assetValue', e.target.value)}
                  placeholder="0.00"
                  disabled={!!(wizardData.metadata.quantity && wizardData.selectedSymbol?.currentPrice)}
                />
                <p className="text-xs text-muted-foreground">
                  {wizardData.metadata.quantity && wizardData.selectedSymbol?.currentPrice
                    ? `${wizardData.metadata.quantity} × $${wizardData.selectedSymbol.currentPrice.toLocaleString()}`
                    : 'Select symbol and enter quantity for auto-calculation'}
                </p>
              </div>

              {/* Total Acquisition Cost (auto-calculated) */}
              <div className="space-y-2">
                <Label htmlFor="acquisitionCost">
                  Total Acquisition Cost (auto-calculated)
                </Label>
                <Input
                  id="acquisitionCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.acquisitionCost || ''}
                  readOnly
                  placeholder="0.00"
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {wizardData.metadata.quantity && wizardData.metadata.acquisition_price
                    ? `${wizardData.metadata.quantity} × $${parseFloat(wizardData.metadata.acquisition_price).toLocaleString()}`
                    : 'Enter quantity and acquisition price'}
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">
                  Tags (comma-separated)
                </Label>
                <Input
                  id="tags"
                  value={wizardData.tags.join(', ')}
                  onChange={(e) => handleFieldChange('tags', e.target.value)}
                  placeholder="tech, growth, dividend"
                />
              </div>
            </div>
          </div>

          {/* Current market data from selected symbol */}
          {wizardData.selectedSymbol?.currentPrice && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Current Market Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Price</p>
                    <p className="font-semibold">${wizardData.selectedSymbol.currentPrice.toLocaleString()}</p>
                  </div>
                  {wizardData.selectedSymbol.priceChangePercentage24h !== undefined && (
                    <div>
                      <p className="text-muted-foreground">24h Change</p>
                      <p className={`font-semibold ${wizardData.selectedSymbol.priceChangePercentage24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {wizardData.selectedSymbol.priceChangePercentage24h >= 0 ? '+' : ''}{wizardData.selectedSymbol.priceChangePercentage24h.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {wizardData.metadata.acquisition_price && wizardData.selectedSymbol.currentPrice && (
                    <div>
                      <p className="text-muted-foreground">Gain/Loss</p>
                      <p className={`font-semibold ${wizardData.selectedSymbol.currentPrice >= parseFloat(wizardData.metadata.acquisition_price) ? 'text-green-600' : 'text-red-600'}`}>
                        {((wizardData.selectedSymbol.currentPrice - parseFloat(wizardData.metadata.acquisition_price)) / parseFloat(wizardData.metadata.acquisition_price) * 100).toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : isPrivateEquityCategory ? (
        <PrivateEquityBusinessFormFields 
          wizardData={wizardData}
          onFieldChange={handleFieldChange}
        />
      ) : isBondCategory ? (
        <>
          {/* Bond Type Selector */}
          {wizardData.selectedCategory?.subcategories && 
           wizardData.selectedCategory.subcategories.length > 0 && (
            <div className="mb-6 space-y-2">
              <Label htmlFor="bondType">
                Bond Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.selectedSubcategory || ''}
                onValueChange={(value) => handleFieldChange('selectedSubcategory', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select bond type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(wizardData.selectedCategory.subcategories as Array<{ value: string; label: string; description?: string }>).map((sub) => (
                    <SelectItem key={sub.value} value={sub.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.label}</span>
                        {sub.description && (
                          <span className="text-xs text-muted-foreground">{sub.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <BondFormFields
            key={wizardData.selectedSubcategory}
            selectedSubcategory={wizardData.selectedSubcategory}
            assetName={wizardData.assetName}
            assetValue={wizardData.assetValue}
            acquisitionCost={wizardData.acquisitionCost || 0}
            acquisitionDate={wizardData.acquisitionDate || ''}
            annualIncome={wizardData.annualIncome}
            metadata={wizardData.metadata}
            tags={wizardData.tags}
            onFieldChange={handleFieldChange}
          />
        </>
      ) : isCashEquivalentsCategory ? (
        <>
          {/* Cash Equivalent Type Selector */}
          {wizardData.selectedCategory?.subcategories && 
           wizardData.selectedCategory.subcategories.length > 0 && (
            <div className="mb-6 space-y-2">
              <Label htmlFor="cashType">
                Cash Equivalent Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.selectedSubcategory || ''}
                onValueChange={(value) => handleFieldChange('selectedSubcategory', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(wizardData.selectedCategory.subcategories as Array<{ value: string; label: string; description?: string }>).map((sub) => (
                    <SelectItem key={sub.value} value={sub.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.label}</span>
                        {sub.description && (
                          <span className="text-xs text-muted-foreground">{sub.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <CashEquivalentsFormFields
            key={wizardData.selectedSubcategory}
            selectedSubcategory={wizardData.selectedSubcategory}
            assetName={wizardData.assetName}
            assetValue={wizardData.assetValue}
            acquisitionCost={wizardData.acquisitionCost || 0}
            acquisitionDate={wizardData.acquisitionDate || ''}
            annualIncome={wizardData.annualIncome}
            annualExpenses={wizardData.annualExpenses}
            metadata={wizardData.metadata}
            tags={wizardData.tags}
            onFieldChange={handleFieldChange}
          />
        </>
      ) : isCommoditiesCategory ? (
        <>
          {/* Commodity Type Selector */}
          {wizardData.selectedCategory?.subcategories && 
           wizardData.selectedCategory.subcategories.length > 0 && (
            <div className="mb-6 space-y-2">
              <Label htmlFor="commodityType">
                Commodity Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.selectedSubcategory || ''}
                onValueChange={(value) => handleFieldChange('selectedSubcategory', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select commodity type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(wizardData.selectedCategory.subcategories as Array<{ value: string; label: string; description?: string }>).map((sub) => (
                    <SelectItem key={sub.value} value={sub.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.label}</span>
                        {sub.description && (
                          <span className="text-xs text-muted-foreground">{sub.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <CommoditiesFormFields
            key={wizardData.selectedSubcategory}
            selectedSubcategory={wizardData.selectedSubcategory}
            assetName={wizardData.assetName}
            assetValue={wizardData.assetValue}
            acquisitionCost={wizardData.acquisitionCost || 0}
            acquisitionDate={wizardData.acquisitionDate || ''}
            annualIncome={wizardData.annualIncome}
            annualExpenses={wizardData.annualExpenses}
            metadata={wizardData.metadata}
            tags={wizardData.tags}
            onFieldChange={handleFieldChange}
          />
        </>
      ) : isAlternativesCategory ? (
        <>
          {/* Alternative Investment Type Selector */}
          {wizardData.selectedCategory?.subcategories && 
           wizardData.selectedCategory.subcategories.length > 0 && (
            <div className="mb-6 space-y-2">
              <Label htmlFor="alternativeType">
                Asset Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.selectedSubcategory || ''}
                onValueChange={(value) => handleFieldChange('selectedSubcategory', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(wizardData.selectedCategory.subcategories as Array<{ value: string; label: string; description?: string }>).map((sub) => (
                    <SelectItem key={sub.value} value={sub.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.label}</span>
                        {sub.description && (
                          <span className="text-xs text-muted-foreground">{sub.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select the type of alternative investment (Art, Wine, Watches, etc.)
              </p>
            </div>
          )}
          
          {/* Alternative Investments Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assetName">
                  Asset Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assetName"
                  value={wizardData.assetName}
                  onChange={(e) => handleFieldChange('assetName', e.target.value)}
                  placeholder="Enter asset name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetValue">
                  Current Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assetValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.assetValue}
                  onChange={(e) => handleFieldChange('assetValue', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="acquisitionCost">
                  Acquisition Cost
                </Label>
                <Input
                  id="acquisitionCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.acquisitionCost || ''}
                  onChange={(e) => handleFieldChange('acquisitionCost', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">
                  Acquisition Date
                </Label>
                <Input
                  id="acquisitionDate"
                  type="date"
                  value={wizardData.acquisitionDate || ''}
                  onChange={(e) => handleFieldChange('acquisitionDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Alternative Investments Type-Specific Fields */}
          <AlternativeInvestmentsFormFields
            selectedSubcategory={wizardData.selectedSubcategory}
            metadata={wizardData.metadata}
            onFieldChange={handleFieldChange}
          />

          {/* Tags and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags (comma-separated)
              </Label>
              <Input
                id="tags"
                value={wizardData.tags.join(', ')}
                onChange={(e) => handleFieldChange('tags', e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          {/* Notes/Description for alternatives */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes & Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={wizardData.metadata.notes || ''}
                onChange={(e) => handleFieldChange('metadata.notes', e.target.value)}
                placeholder="Add any additional notes or description about this asset..."
                rows={4}
              />
            </CardContent>
          </Card>
        </>
      ) : isVehicleCategory ? (
        <>
          {/* Subcategory Selector for vehicles */}
          {wizardData.selectedCategory?.subcategories && 
           wizardData.selectedCategory.subcategories.length > 0 && (
            <div className="mb-6 space-y-2">
              <Label htmlFor="subcategory">
                Vehicle Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.selectedSubcategory || ''}
                onValueChange={(value) => handleFieldChange('selectedSubcategory', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(wizardData.selectedCategory.subcategories as Array<{ value: string; label: string; description?: string }>).map((sub) => {
                    const SubIcon = getSubcategoryIcon(sub.value);
                    return (
                      <SelectItem key={sub.value} value={sub.value}>
                        <div className="flex items-center gap-2">
                          <SubIcon className="h-4 w-4 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium">{sub.label}</span>
                            {sub.description && (
                              <span className="text-xs text-muted-foreground">{sub.description}</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the type of vehicle or equipment
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assetName">
                  Asset Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assetName"
                  value={wizardData.assetName}
                  onChange={(e) => handleFieldChange('assetName', e.target.value)}
                  placeholder="Enter vehicle/equipment name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetValue">
                  Current Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assetValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.assetValue}
                  onChange={(e) => handleFieldChange('assetValue', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="acquisitionCost">
                  Acquisition Cost
                </Label>
                <Input
                  id="acquisitionCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wizardData.acquisitionCost || ''}
                  onChange={(e) => handleFieldChange('acquisitionCost', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">
                  Acquisition Date
                </Label>
                <Input
                  id="acquisitionDate"
                  type="date"
                  value={wizardData.acquisitionDate || ''}
                  onChange={(e) => handleFieldChange('acquisitionDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Vehicle-specific fields */}
          <VehicleFormFields
            wizardData={wizardData}
            onDataChange={onDataChange}
          />

          {/* Tags for vehicles */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              value={wizardData.tags.join(', ')}
              onChange={(e) => handleFieldChange('tags', e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </>
      ) : (
        <>
          {/* Subcategory Selector for categories with subcategories */}
          {wizardData.selectedCategory?.subcategories && 
           wizardData.selectedCategory.subcategories.length > 0 && (
            <div className="mb-6 space-y-2">
              <Label htmlFor="subcategory">
                Asset Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={wizardData.selectedSubcategory || ''}
                onValueChange={(value) => handleFieldChange('selectedSubcategory', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(wizardData.selectedCategory.subcategories as Array<{ value: string; label: string; description?: string }>).map((sub) => {
                    const SubIcon = getSubcategoryIcon(sub.value);
                    return (
                      <SelectItem key={sub.value} value={sub.value}>
                        <div className="flex items-center gap-2">
                          <SubIcon className="h-4 w-4 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium">{sub.label}</span>
                            {sub.description && (
                              <span className="text-xs text-muted-foreground">{sub.description}</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the specific type of {wizardData.selectedCategory.display_name.toLowerCase()}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assetName">
              Asset Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="assetName"
              value={wizardData.assetName}
              onChange={(e) => handleFieldChange('assetName', e.target.value)}
              placeholder="Enter asset name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetValue">
              Current Value <span className="text-destructive">*</span>
            </Label>
            <Input
              id="assetValue"
              type="number"
              step="0.01"
              min="0"
              value={wizardData.assetValue}
              onChange={(e) => handleFieldChange('assetValue', e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">
              Acquisition Cost
            </Label>
            <Input
              id="acquisitionCost"
              type="number"
              step="0.01"
              min="0"
              value={wizardData.acquisitionCost || ''}
              onChange={(e) => handleFieldChange('acquisitionCost', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acquisitionDate">
              Acquisition Date
            </Label>
            <Input
              id="acquisitionDate"
              type="date"
              value={wizardData.acquisitionDate || ''}
              onChange={(e) => handleFieldChange('acquisitionDate', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="annualIncome">
              Annual Income
            </Label>
            <Input
              id="annualIncome"
              type="number"
              step="0.01"
              min="0"
              value={wizardData.annualIncome}
              onChange={(e) => handleFieldChange('annualIncome', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualExpenses">
              Annual Expenses
            </Label>
            <Input
              id="annualExpenses"
              type="number"
              step="0.01"
              min="0"
              value={wizardData.annualExpenses}
              onChange={(e) => handleFieldChange('annualExpenses', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              value={wizardData.tags.join(', ')}
              onChange={(e) => handleFieldChange('tags', e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
      </div>

          {/* Category-specific fields */}
          {Object.keys(metadataSchema).length > 0 && !isBondCategory && !isAlternativesCategory && !isCashEquivalentsCategory && !isCommoditiesCategory && !isVehicleCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {wizardData.selectedCategory?.display_name} Specific Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(metadataSchema).map(([fieldName, fieldConfig]: [string, any]) =>
                renderSchemaField(fieldName, fieldConfig)
              )}
            </div>
          </CardContent>
        </Card>
          )}
        </>
      )}

      {/* Cash Flow Reminders - Hidden for alternatives */}
      {shouldShowReminderOptions && !isAlternativesCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cash Flow Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableReminders">Remind me to update cash flow</Label>
                <p className="text-sm text-muted-foreground">
                  Get periodic reminders to refresh income and expense data for accurate tracking
                </p>
              </div>
              <Switch
                id="enableReminders"
                checked={wizardData.enableCashFlowReminders || false}
                onCheckedChange={(checked) => {
                  const updates: Partial<WizardData> = { enableCashFlowReminders: checked };
                  if (checked && !wizardData.cashFlowReminderFrequency) {
                    updates.cashFlowReminderFrequency = suggestedReminderFrequency;
                  }
                  onDataChange(updates);
                }}
              />
            </div>
            
            {wizardData.enableCashFlowReminders && (
              <div className="space-y-2">
                <Label htmlFor="reminderFrequency">Reminder Frequency</Label>
                <Select
                  value={wizardData.cashFlowReminderFrequency || suggestedReminderFrequency}
                  onValueChange={(value) => onDataChange({ 
                    cashFlowReminderFrequency: value as 'quarterly' | 'semi-annual' | 'annual' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </div>
  );
};