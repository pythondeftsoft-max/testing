import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CommoditiesFormFieldsProps {
  selectedSubcategory: string;
  assetName: string;
  assetValue: number;
  acquisitionCost: number;
  acquisitionDate: string;
  annualIncome: number;
  annualExpenses: number;
  metadata: Record<string, any>;
  tags: string[];
  onFieldChange: (field: string, value: any) => void;
}

const unitOfMeasureOptions = [
  { value: 'ounces', label: 'Ounces' },
  { value: 'barrels', label: 'Barrels' },
  { value: 'bushels', label: 'Bushels' },
  { value: 'tons', label: 'Tons' },
  { value: 'kilograms', label: 'Kilograms' },
  { value: 'pounds', label: 'Pounds' },
  { value: 'other', label: 'Other' }
];

// Precious Metals
const metalTypeOptions = [
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'palladium', label: 'Palladium' },
  { value: 'other', label: 'Other' }
];

const pmFormOptions = [
  { value: 'bars', label: 'Bars' },
  { value: 'coins', label: 'Coins' },
  { value: 'bullion', label: 'Bullion' },
  { value: 'certificates', label: 'Certificates' },
  { value: 'etf_backed', label: 'ETF-backed' }
];

// Energy
const energyTypeOptions = [
  { value: 'crude_oil', label: 'Crude Oil' },
  { value: 'natural_gas', label: 'Natural Gas' },
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'coal', label: 'Coal' },
  { value: 'other', label: 'Other' }
];

const contractTypeOptions = [
  { value: 'physical', label: 'Physical' },
  { value: 'futures', label: 'Futures' },
  { value: 'options', label: 'Options' },
  { value: 'etf_backed', label: 'ETF-backed' }
];

// Agriculture
const agTypeOptions = [
  { value: 'wheat', label: 'Wheat' },
  { value: 'corn', label: 'Corn' },
  { value: 'soybeans', label: 'Soybeans' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'sugar', label: 'Sugar' },
  { value: 'other', label: 'Other' }
];

const commodityFormOptions = [
  { value: 'physical', label: 'Physical' },
  { value: 'futures', label: 'Futures' },
  { value: 'etf_backed', label: 'ETF-backed' }
];

// Industrial Metals
const industrialMetalOptions = [
  { value: 'copper', label: 'Copper' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'zinc', label: 'Zinc' },
  { value: 'nickel', label: 'Nickel' },
  { value: 'other', label: 'Other' }
];

const imFormOptions = [
  { value: 'bars', label: 'Bars' },
  { value: 'sheets', label: 'Sheets' },
  { value: 'ingots', label: 'Ingots' },
  { value: 'coils', label: 'Coils' },
  { value: 'etf_backed', label: 'ETF-backed' }
];

// Soft Commodities
const softCommodityOptions = [
  { value: 'cocoa', label: 'Cocoa' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'sugar', label: 'Sugar' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'timber', label: 'Timber' },
  { value: 'rubber', label: 'Rubber' },
  { value: 'other', label: 'Other' }
];

// Rare Earth Elements
const rareEarthOptions = [
  { value: 'lithium', label: 'Lithium' },
  { value: 'cobalt', label: 'Cobalt' },
  { value: 'neodymium', label: 'Neodymium' },
  { value: 'uranium', label: 'Uranium' },
  { value: 'other', label: 'Other' }
];

const reeFormOptions = [
  { value: 'concentrate', label: 'Concentrate' },
  { value: 'oxide', label: 'Oxide' },
  { value: 'metal', label: 'Metal' },
  { value: 'etf_backed', label: 'ETF-backed' }
];

export const CommoditiesFormFields: React.FC<CommoditiesFormFieldsProps> = ({
  selectedSubcategory,
  assetName,
  assetValue,
  acquisitionCost,
  acquisitionDate,
  metadata,
  tags,
  onFieldChange
}) => {
  const renderTypeSpecificFields = () => {
    if (!selectedSubcategory) {
      return (
        <p className="text-sm text-muted-foreground">
          Please select an asset type to see type-specific fields.
        </p>
      );
    }

    switch (selectedSubcategory) {
      case 'precious_metals':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pm_metal_type">
                  Metal Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={metadata.pm_metal_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.pm_metal_type', value)}
                >
                  <SelectTrigger id="pm_metal_type" className="bg-background">
                    <SelectValue placeholder="Select metal type *" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {metalTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pm_form">Form</Label>
                <Select
                  value={metadata.pm_form || ''}
                  onValueChange={(value) => onFieldChange('metadata.pm_form', value)}
                >
                  <SelectTrigger id="pm_form" className="bg-background">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {pmFormOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pm_purity">Purity / Fineness</Label>
              <Input
                id="pm_purity"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={metadata.pm_purity || ''}
                onChange={(e) => onFieldChange('metadata.pm_purity', e.target.value)}
                placeholder="e.g., 0.9999"
              />
              <p className="text-xs text-muted-foreground">
                Enter the purity level (e.g., 0.9999 for 24k gold)
              </p>
            </div>
          </div>
        );

      case 'energy':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="energy_commodity_type">
                  Commodity Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={metadata.energy_commodity_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.energy_commodity_type', value)}
                >
                  <SelectTrigger id="energy_commodity_type" className="bg-background">
                    <SelectValue placeholder="Select commodity type *" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {energyTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="energy_contract_type">Contract Type</Label>
                <Select
                  value={metadata.energy_contract_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.energy_contract_type', value)}
                >
                  <SelectTrigger id="energy_contract_type" className="bg-background">
                    <SelectValue placeholder="Select contract type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {contractTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="energy_contract_expiration">Contract Expiration</Label>
              <Input
                id="energy_contract_expiration"
                type="date"
                value={metadata.energy_contract_expiration || ''}
                onChange={(e) => onFieldChange('metadata.energy_contract_expiration', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if not applicable (e.g., physical holdings)
              </p>
            </div>
          </div>
        );

      case 'agriculture':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ag_commodity_type">
                  Commodity Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={metadata.ag_commodity_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.ag_commodity_type', value)}
                >
                  <SelectTrigger id="ag_commodity_type" className="bg-background">
                    <SelectValue placeholder="Select commodity type *" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {agTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ag_form">Form</Label>
                <Select
                  value={metadata.ag_form || ''}
                  onValueChange={(value) => onFieldChange('metadata.ag_form', value)}
                >
                  <SelectTrigger id="ag_form" className="bg-background">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {commodityFormOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ag_harvest_year">Harvest / Production Year</Label>
                <Input
                  id="ag_harvest_year"
                  type="number"
                  step="1"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={metadata.ag_harvest_year || ''}
                  onChange={(e) => onFieldChange('metadata.ag_harvest_year', e.target.value)}
                  placeholder={`e.g., ${new Date().getFullYear()}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ag_quality_grade">Quality Grade / Classification</Label>
                <Input
                  id="ag_quality_grade"
                  type="text"
                  value={metadata.ag_quality_grade || ''}
                  onChange={(e) => onFieldChange('metadata.ag_quality_grade', e.target.value)}
                  placeholder="e.g., Grade A, Premium"
                />
              </div>
            </div>
          </div>
        );

      case 'industrial_metals':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="im_metal_type">
                  Metal Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={metadata.im_metal_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.im_metal_type', value)}
                >
                  <SelectTrigger id="im_metal_type" className="bg-background">
                    <SelectValue placeholder="Select metal type *" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {industrialMetalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="im_form">Form</Label>
                <Select
                  value={metadata.im_form || ''}
                  onValueChange={(value) => onFieldChange('metadata.im_form', value)}
                >
                  <SelectTrigger id="im_form" className="bg-background">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {imFormOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="im_purity_grade">Purity / Grade</Label>
              <Input
                id="im_purity_grade"
                type="text"
                value={metadata.im_purity_grade || ''}
                onChange={(e) => onFieldChange('metadata.im_purity_grade', e.target.value)}
                placeholder="e.g., 99.9%, C11000"
              />
            </div>
          </div>
        );

      case 'soft_commodities':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="soft_commodity_type">
                  Commodity Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={metadata.soft_commodity_type || ''}
                  onValueChange={(value) => onFieldChange('metadata.soft_commodity_type', value)}
                >
                  <SelectTrigger id="soft_commodity_type" className="bg-background">
                    <SelectValue placeholder="Select commodity type *" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {softCommodityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="soft_form">Form</Label>
                <Select
                  value={metadata.soft_form || ''}
                  onValueChange={(value) => onFieldChange('metadata.soft_form', value)}
                >
                  <SelectTrigger id="soft_form" className="bg-background">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {commodityFormOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="soft_harvest_year">Harvest Year</Label>
                <Input
                  id="soft_harvest_year"
                  type="number"
                  step="1"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={metadata.soft_harvest_year || ''}
                  onChange={(e) => onFieldChange('metadata.soft_harvest_year', e.target.value)}
                  placeholder={`e.g., ${new Date().getFullYear()}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="soft_quality_grade">Quality Grade</Label>
                <Input
                  id="soft_quality_grade"
                  type="text"
                  value={metadata.soft_quality_grade || ''}
                  onChange={(e) => onFieldChange('metadata.soft_quality_grade', e.target.value)}
                  placeholder="e.g., Premium, Grade 1"
                />
              </div>
            </div>
          </div>
        );

      case 'rare_earth_elements':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ree_element_material">
                  Element / Material <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={metadata.ree_element_material || ''}
                  onValueChange={(value) => onFieldChange('metadata.ree_element_material', value)}
                >
                  <SelectTrigger id="ree_element_material" className="bg-background">
                    <SelectValue placeholder="Select element *" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {rareEarthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ree_form">Form</Label>
                <Select
                  value={metadata.ree_form || ''}
                  onValueChange={(value) => onFieldChange('metadata.ree_form', value)}
                >
                  <SelectTrigger id="ree_form" className="bg-background">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {reeFormOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ree_purity_grade">Purity / Grade</Label>
              <Input
                id="ree_purity_grade"
                type="text"
                value={metadata.ree_purity_grade || ''}
                onChange={(e) => onFieldChange('metadata.ree_purity_grade', e.target.value)}
                placeholder="e.g., 99.5%, Battery Grade"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Asset Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Asset Details</CardTitle>
            <Badge variant="outline">Commodities</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Asset Name + Current Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assetName">
                Asset Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assetName"
                type="text"
                value={assetName}
                onChange={(e) => onFieldChange('assetName', e.target.value)}
                placeholder="e.g., Gold Bullion, WTI Crude Oil, Soybean Futures"
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
                value={assetValue}
                onChange={(e) => onFieldChange('assetValue', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Row 2: Quantity + Unit of Measure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                min="0"
                value={metadata.quantity || ''}
                onChange={(e) => onFieldChange('metadata.quantity', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_of_measure">
                Unit of Measure <span className="text-destructive">*</span>
              </Label>
              <Select
                value={metadata.unit_of_measure || ''}
                onValueChange={(value) => onFieldChange('metadata.unit_of_measure', value)}
              >
                <SelectTrigger id="unit_of_measure" className="bg-background">
                  <SelectValue placeholder="Select unit *" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {unitOfMeasureOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Purchase Price + Purchase Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acquisitionCost">
                Purchase Price
              </Label>
              <Input
                id="acquisitionCost"
                type="number"
                step="0.01"
                min="0"
                value={acquisitionCost || ''}
                onChange={(e) => onFieldChange('acquisitionCost', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisitionDate">
                Purchase Date
              </Label>
              <Input
                id="acquisitionDate"
                type="date"
                value={acquisitionDate || ''}
                onChange={(e) => onFieldChange('acquisitionDate', e.target.value)}
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes / Description
            </Label>
            <Textarea
              id="notes"
              value={metadata.notes || ''}
              onChange={(e) => onFieldChange('metadata.notes', e.target.value)}
              placeholder="Add any additional notes or description about this commodity..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Type-Specific Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type-Specific Details</CardTitle>
        </CardHeader>
        <CardContent>
          {renderTypeSpecificFields()}
        </CardContent>
      </Card>

      {/* Documents & Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Documents Upload */}
          <div className="space-y-2">
            <Label htmlFor="documents">
              Documents (upload)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload proofs, invoices, or other supporting documents
            </p>
            <Input
              id="documents"
              type="file"
              multiple
              onChange={(e) => {
                // Handle file upload logic here
                console.log('Files selected:', e.target.files);
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Document upload functionality coming soon
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              value={tags.join(', ')}
              onChange={(e) => onFieldChange('tags', e.target.value)}
              placeholder="e.g., investment, hedge, long-term"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};
