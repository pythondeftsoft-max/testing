import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AlternativeInvestmentsFormFieldsProps {
  selectedSubcategory?: string;
  metadata: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
}

export const AlternativeInvestmentsFormFields: React.FC<AlternativeInvestmentsFormFieldsProps> = ({
  selectedSubcategory,
  metadata,
  onFieldChange
}) => {
  const currentYear = new Date().getFullYear();

  // Shared fields (always visible)
  const renderSharedFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="space-y-2">
        <Label htmlFor="insurance_value">Insurance Value</Label>
        <Input
          id="insurance_value"
          type="number"
          step="0.01"
          min="0"
          value={metadata.insurance_value || ''}
          onChange={(e) => onFieldChange('metadata.insurance_value', e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="storage_location">Storage Location</Label>
        <Input
          id="storage_location"
          type="text"
          value={metadata.storage_location || ''}
          onChange={(e) => onFieldChange('metadata.storage_location', e.target.value)}
          placeholder="Enter storage location"
        />
      </div>
    </div>
  );

  // Type-specific field renderers
  const renderArtFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="artist_creator">
          Artist / Creator <span className="text-destructive">*</span>
        </Label>
        <Input
          id="artist_creator"
          type="text"
          value={metadata.artist_creator || ''}
          onChange={(e) => onFieldChange('metadata.artist_creator', e.target.value)}
          placeholder="Enter artist name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="year_created">
          Year Created <span className="text-destructive">*</span>
        </Label>
        <Input
          id="year_created"
          type="number"
          min="1000"
          max={currentYear}
          value={metadata.year_created || ''}
          onChange={(e) => onFieldChange('metadata.year_created', e.target.value)}
          placeholder={currentYear.toString()}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="medium">
          Medium <span className="text-destructive">*</span>
        </Label>
        <Input
          id="medium"
          type="text"
          value={metadata.medium || ''}
          onChange={(e) => onFieldChange('metadata.medium', e.target.value)}
          placeholder="e.g., Oil on canvas"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dimensions">Dimensions</Label>
        <Input
          id="dimensions"
          type="text"
          value={metadata.dimensions || ''}
          onChange={(e) => onFieldChange('metadata.dimensions', e.target.value)}
          placeholder='e.g., 24" x 36"'
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition">Condition</Label>
        <Select 
          value={metadata.condition || ''} 
          onValueChange={(value) => onFieldChange('metadata.condition', value)}
        >
          <SelectTrigger id="condition">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Excellent">Excellent</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Fair">Fair</SelectItem>
            <SelectItem value="Poor">Poor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appraised_by">Appraised By</Label>
        <Input
          id="appraised_by"
          type="text"
          value={metadata.appraised_by || ''}
          onChange={(e) => onFieldChange('metadata.appraised_by', e.target.value)}
          placeholder="Appraiser name"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="authentication_details">Authentication Details</Label>
        <Textarea
          id="authentication_details"
          value={metadata.authentication_details || ''}
          onChange={(e) => onFieldChange('metadata.authentication_details', e.target.value)}
          placeholder="Enter authentication details, provenance, etc."
          rows={3}
        />
      </div>
    </div>
  );

  const renderWineFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="vintage_year">
          Vintage Year <span className="text-destructive">*</span>
        </Label>
        <Input
          id="vintage_year"
          type="number"
          min="1800"
          max={currentYear}
          value={metadata.vintage_year || ''}
          onChange={(e) => onFieldChange('metadata.vintage_year', e.target.value)}
          placeholder={currentYear.toString()}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="producer_vineyard">
          Producer / Vineyard <span className="text-destructive">*</span>
        </Label>
        <Input
          id="producer_vineyard"
          type="text"
          value={metadata.producer_vineyard || ''}
          onChange={(e) => onFieldChange('metadata.producer_vineyard', e.target.value)}
          placeholder="Enter producer name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bottle_count">
          Bottle Count <span className="text-destructive">*</span>
        </Label>
        <Input
          id="bottle_count"
          type="number"
          min="1"
          step="1"
          value={metadata.bottle_count || ''}
          onChange={(e) => onFieldChange('metadata.bottle_count', e.target.value)}
          placeholder="Number of bottles"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="region">Region</Label>
        <Input
          id="region"
          type="text"
          value={metadata.region || ''}
          onChange={(e) => onFieldChange('metadata.region', e.target.value)}
          placeholder="e.g., Bordeaux, Napa Valley"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="storage_method">Storage Method</Label>
        <Select 
          value={metadata.storage_method || ''} 
          onValueChange={(value) => onFieldChange('metadata.storage_method', value)}
        >
          <SelectTrigger id="storage_method">
            <SelectValue placeholder="Select storage method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Cellar">Cellar</SelectItem>
            <SelectItem value="Temp-Controlled">Temp-Controlled</SelectItem>
            <SelectItem value="Pro Storage">Pro Storage</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition">Condition</Label>
        <Select 
          value={metadata.condition || ''} 
          onValueChange={(value) => onFieldChange('metadata.condition', value)}
        >
          <SelectTrigger id="condition">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pristine">Pristine</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Damaged Label">Damaged Label</SelectItem>
            <SelectItem value="Compromised">Compromised</SelectItem>
            <SelectItem value="Corked">Corked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="authentication_details">Authentication Details</Label>
        <Textarea
          id="authentication_details"
          value={metadata.authentication_details || ''}
          onChange={(e) => onFieldChange('metadata.authentication_details', e.target.value)}
          placeholder="Enter authentication details, provenance, etc."
          rows={3}
        />
      </div>
    </div>
  );

  const renderWatchesFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="brand">
          Brand <span className="text-destructive">*</span>
        </Label>
        <Input
          id="brand"
          type="text"
          value={metadata.brand || ''}
          onChange={(e) => onFieldChange('metadata.brand', e.target.value)}
          placeholder="e.g., Rolex, Patek Philippe"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">
          Model <span className="text-destructive">*</span>
        </Label>
        <Input
          id="model"
          type="text"
          value={metadata.model || ''}
          onChange={(e) => onFieldChange('metadata.model', e.target.value)}
          placeholder="Enter model name/number"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="serial_number">Serial Number</Label>
        <Input
          id="serial_number"
          type="text"
          value={metadata.serial_number || ''}
          onChange={(e) => onFieldChange('metadata.serial_number', e.target.value)}
          placeholder="Enter serial number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="material">Material</Label>
        <Input
          id="material"
          type="text"
          value={metadata.material || ''}
          onChange={(e) => onFieldChange('metadata.material', e.target.value)}
          placeholder="e.g., Gold, Platinum, Stainless Steel"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="carat_weight">Carat / Weight</Label>
        <Input
          id="carat_weight"
          type="text"
          value={metadata.carat_weight || ''}
          onChange={(e) => onFieldChange('metadata.carat_weight', e.target.value)}
          placeholder="e.g., 18k, 2.5 carats"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="certificate_provider">Certificate Provider</Label>
        <Input
          id="certificate_provider"
          type="text"
          value={metadata.certificate_provider || ''}
          onChange={(e) => onFieldChange('metadata.certificate_provider', e.target.value)}
          placeholder="e.g., GIA"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition">Condition</Label>
        <Select 
          value={metadata.condition || ''} 
          onValueChange={(value) => onFieldChange('metadata.condition', value)}
        >
          <SelectTrigger id="condition">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Excellent">Excellent</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Fair">Fair</SelectItem>
            <SelectItem value="Poor">Poor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderSportsMemorabilia = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="player_event">
          Player / Event <span className="text-destructive">*</span>
        </Label>
        <Input
          id="player_event"
          type="text"
          value={metadata.player_event || ''}
          onChange={(e) => onFieldChange('metadata.player_event', e.target.value)}
          placeholder="e.g., Michael Jordan, Super Bowl LV"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="year">Year</Label>
        <Input
          id="year"
          type="number"
          min="1800"
          max={currentYear}
          value={metadata.year || ''}
          onChange={(e) => onFieldChange('metadata.year', e.target.value)}
          placeholder={currentYear.toString()}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="item_type">Item Type</Label>
        <Input
          id="item_type"
          type="text"
          value={metadata.item_type || ''}
          onChange={(e) => onFieldChange('metadata.item_type', e.target.value)}
          placeholder="e.g., Jersey, Bat, Card"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signed" className="flex items-center gap-2">
          Signed
        </Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="signed"
            checked={metadata.signed === true || metadata.signed === 'true'}
            onCheckedChange={(checked) => onFieldChange('metadata.signed', checked)}
          />
          <Label htmlFor="signed" className="text-sm font-normal cursor-pointer">
            {metadata.signed ? 'Yes' : 'No'}
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="authentication_provider">Authentication Provider</Label>
        <Input
          id="authentication_provider"
          type="text"
          value={metadata.authentication_provider || ''}
          onChange={(e) => onFieldChange('metadata.authentication_provider', e.target.value)}
          placeholder="e.g., PSA, JSA, Beckett"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition">Condition</Label>
        <Select 
          value={metadata.condition || ''} 
          onValueChange={(value) => onFieldChange('metadata.condition', value)}
        >
          <SelectTrigger id="condition">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Excellent">Excellent</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Fair">Fair</SelectItem>
            <SelectItem value="Poor">Poor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderAntiquesFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="origin_country">
          Origin / Country <span className="text-destructive">*</span>
        </Label>
        <Input
          id="origin_country"
          type="text"
          value={metadata.origin_country || ''}
          onChange={(e) => onFieldChange('metadata.origin_country', e.target.value)}
          placeholder="e.g., France, China"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="period_era">
          Period / Era <span className="text-destructive">*</span>
        </Label>
        <Input
          id="period_era"
          type="text"
          value={metadata.period_era || ''}
          onChange={(e) => onFieldChange('metadata.period_era', e.target.value)}
          placeholder="e.g., Victorian, Ming Dynasty"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="material">Material</Label>
        <Input
          id="material"
          type="text"
          value={metadata.material || ''}
          onChange={(e) => onFieldChange('metadata.material', e.target.value)}
          placeholder="e.g., Mahogany, Porcelain"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition">Condition</Label>
        <Select 
          value={metadata.condition || ''} 
          onValueChange={(value) => onFieldChange('metadata.condition', value)}
        >
          <SelectTrigger id="condition">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Excellent">Excellent</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Fair">Fair</SelectItem>
            <SelectItem value="Poor">Poor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appraised_by">Appraised By</Label>
        <Input
          id="appraised_by"
          type="text"
          value={metadata.appraised_by || ''}
          onChange={(e) => onFieldChange('metadata.appraised_by', e.target.value)}
          placeholder="Appraiser name"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="historical_notes">Historical Notes</Label>
        <Textarea
          id="historical_notes"
          value={metadata.historical_notes || ''}
          onChange={(e) => onFieldChange('metadata.historical_notes', e.target.value)}
          placeholder="Enter historical context, provenance, etc."
          rows={3}
        />
      </div>
    </div>
  );

  const renderMemorabilia = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="type_of_item">
          Type of Item <span className="text-destructive">*</span>
        </Label>
        <Input
          id="type_of_item"
          type="text"
          value={metadata.type_of_item || ''}
          onChange={(e) => onFieldChange('metadata.type_of_item', e.target.value)}
          placeholder="e.g., Concert Poster, Movie Prop"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_occasion">Event / Occasion</Label>
        <Input
          id="event_occasion"
          type="text"
          value={metadata.event_occasion || ''}
          onChange={(e) => onFieldChange('metadata.event_occasion', e.target.value)}
          placeholder="e.g., Woodstock 1969"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signed_by">Signed By</Label>
        <Input
          id="signed_by"
          type="text"
          value={metadata.signed_by || ''}
          onChange={(e) => onFieldChange('metadata.signed_by', e.target.value)}
          placeholder="Name of person who signed"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authentication_provider">Authentication Provider</Label>
        <Input
          id="authentication_provider"
          type="text"
          value={metadata.authentication_provider || ''}
          onChange={(e) => onFieldChange('metadata.authentication_provider', e.target.value)}
          placeholder="e.g., PSA, JSA"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition">Condition</Label>
        <Select 
          value={metadata.condition || ''} 
          onValueChange={(value) => onFieldChange('metadata.condition', value)}
        >
          <SelectTrigger id="condition">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Excellent">Excellent</SelectItem>
            <SelectItem value="Good">Good</SelectItem>
            <SelectItem value="Fair">Fair</SelectItem>
            <SelectItem value="Poor">Poor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderIPFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="ip_type">
          IP Type <span className="text-destructive">*</span>
        </Label>
        <Select 
          value={metadata.ip_type || ''} 
          onValueChange={(value) => onFieldChange('metadata.ip_type', value)}
        >
          <SelectTrigger id="ip_type">
            <SelectValue placeholder="Select IP type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Patent">Patent</SelectItem>
            <SelectItem value="Trademark">Trademark</SelectItem>
            <SelectItem value="Copyright">Copyright</SelectItem>
            <SelectItem value="Trade Secret">Trade Secret</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="registration_number">
          Registration / Application No. <span className="text-destructive">*</span>
        </Label>
        <Input
          id="registration_number"
          type="text"
          value={metadata.registration_number || ''}
          onChange={(e) => onFieldChange('metadata.registration_number', e.target.value)}
          placeholder="Enter registration number"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiration_date">Expiration / Renewal Date</Label>
        <Input
          id="expiration_date"
          type="date"
          value={metadata.expiration_date || ''}
          onChange={(e) => onFieldChange('metadata.expiration_date', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownership_percentage">Ownership %</Label>
        <Input
          id="ownership_percentage"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={metadata.ownership_percentage || ''}
          onChange={(e) => onFieldChange('metadata.ownership_percentage', e.target.value)}
          placeholder="0-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="annual_royalties">Annual Royalties</Label>
        <Input
          id="annual_royalties"
          type="number"
          step="0.01"
          min="0"
          value={metadata.annual_royalties || ''}
          onChange={(e) => onFieldChange('metadata.annual_royalties', e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="licensee">Licensee</Label>
        <Input
          id="licensee"
          type="text"
          value={metadata.licensee || ''}
          onChange={(e) => onFieldChange('metadata.licensee', e.target.value)}
          placeholder="Licensee company/individual"
        />
      </div>
    </div>
  );

  // Main render logic
  const renderTypeSpecificFields = () => {
    if (!selectedSubcategory) return null;

    const fieldMap: Record<string, () => JSX.Element> = {
      art: renderArtFields,
      wine: renderWineFields,
      watches: renderWatchesFields,
      sports_memorabilia: renderSportsMemorabilia,
      antiques: renderAntiquesFields,
      memorabilia: renderMemorabilia,
      intellectual_property: renderIPFields,
    };

    const renderFunc = fieldMap[selectedSubcategory];
    if (!renderFunc) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type-Specific Details</CardTitle>
        </CardHeader>
        <CardContent>
          {renderFunc()}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {renderSharedFields()}
      {renderTypeSpecificFields()}
    </>
  );
};
