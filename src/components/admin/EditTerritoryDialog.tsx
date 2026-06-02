import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUpdateTerritory, Territory } from '@/hooks/useTerritories';
import { X } from 'lucide-react';

interface EditTerritoryDialogProps {
  territory: Territory;
  isOpen: boolean;
  onClose: () => void;
}

export const EditTerritoryDialog: React.FC<EditTerritoryDialogProps> = ({ 
  territory, 
  isOpen, 
  onClose 
}) => {
  const { toast } = useToast();
  const updateTerritory = useUpdateTerritory();
  
  const [formData, setFormData] = useState({
    country: territory.country,
    territoryType: territory.territory_type,
    territoryName: territory.territory_name,
    regionCode: territory.region_code || '',
    postalRanges: territory.postal_ranges || '',
    isActive: territory.is_active
  });

  // Update form data when territory prop changes
  useEffect(() => {
    setFormData({
      country: territory.country,
      territoryType: territory.territory_type,
      territoryName: territory.territory_name,
      regionCode: territory.region_code || '',
      postalRanges: territory.postal_ranges || '',
      isActive: territory.is_active
    });
  }, [territory]);

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.country || !formData.territoryType || !formData.territoryName) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields: Country, Territory Type, and Territory Name.",
        variant: "destructive"
      });
      return;
    }

    // Call mutation to update
    updateTerritory.mutate({
      id: territory.id,
      updates: {
        country: formData.country,
        territoryType: formData.territoryType,
        territoryName: formData.territoryName,
        regionCode: formData.regionCode,
        postalRanges: formData.postalRanges,
        isActive: formData.isActive
      }
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Edit Territory</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
            <Select
              value={formData.country}
              onValueChange={(value) => setFormData({ ...formData, country: value })}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Germany">Germany</SelectItem>
                <SelectItem value="France">France</SelectItem>
                <SelectItem value="Spain">Spain</SelectItem>
                <SelectItem value="Mexico">Mexico</SelectItem>
                <SelectItem value="Brazil">Brazil</SelectItem>
                <SelectItem value="South Africa">South Africa</SelectItem>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="China">China</SelectItem>
                <SelectItem value="Japan">Japan</SelectItem>
                <SelectItem value="South Korea">South Korea</SelectItem>
                <SelectItem value="Philippines">Philippines</SelectItem>
                <SelectItem value="Nigeria">Nigeria</SelectItem>
                <SelectItem value="Kenya">Kenya</SelectItem>
                <SelectItem value="Argentina">Argentina</SelectItem>
                <SelectItem value="Colombia">Colombia</SelectItem>
                <SelectItem value="Italy">Italy</SelectItem>
                <SelectItem value="Netherlands">Netherlands</SelectItem>
                <SelectItem value="Sweden">Sweden</SelectItem>
                <SelectItem value="Norway">Norway</SelectItem>
                <SelectItem value="Denmark">Denmark</SelectItem>
                <SelectItem value="Switzerland">Switzerland</SelectItem>
                <SelectItem value="UAE">UAE</SelectItem>
                <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                <SelectItem value="Turkey">Turkey</SelectItem>
                <SelectItem value="Vietnam">Vietnam</SelectItem>
                <SelectItem value="Thailand">Thailand</SelectItem>
                <SelectItem value="Malaysia">Malaysia</SelectItem>
                <SelectItem value="New Zealand">New Zealand</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Territory Type */}
          <div className="space-y-2">
            <Label htmlFor="territoryType">Territory Type <span className="text-destructive">*</span></Label>
            <Select
              value={formData.territoryType}
              onValueChange={(value) => setFormData({ ...formData, territoryType: value })}
            >
              <SelectTrigger id="territoryType">
                <SelectValue placeholder="Select territory type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="State">State</SelectItem>
                <SelectItem value="Province">Province</SelectItem>
                <SelectItem value="Region">Region</SelectItem>
                <SelectItem value="City">City</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Territory Name */}
          <div className="space-y-2">
            <Label htmlFor="territoryName">Territory Name <span className="text-destructive">*</span></Label>
            <Input
              id="territoryName"
              value={formData.territoryName}
              onChange={(e) => setFormData({ ...formData, territoryName: e.target.value })}
              placeholder="e.g., Missouri, Texas, Ontario"
            />
          </div>

          {/* Region Code */}
          <div className="space-y-2">
            <Label htmlFor="regionCode">State / Region Code(s)</Label>
            <Input
              id="regionCode"
              value={formData.regionCode}
              onChange={(e) => setFormData({ ...formData, regionCode: e.target.value })}
              placeholder="e.g., MO, TX, ON"
            />
            <p className="text-sm text-muted-foreground">
              Use 2-3 letter code or leave blank for custom.
            </p>
          </div>

          {/* Postal Ranges */}
          <div className="space-y-2">
            <Label htmlFor="postalRanges">Zip / Postal Ranges</Label>
            <Input
              id="postalRanges"
              value={formData.postalRanges}
              onChange={(e) => setFormData({ ...formData, postalRanges: e.target.value })}
              placeholder="e.g., 63000-63999 or 75001,75002"
            />
            <p className="text-sm text-muted-foreground">
              Use 2-3 letter code or leave blank for custom.
            </p>
          </div>


          {/* Active Status */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">
                Determines if the territory should be used or hidden.
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateTerritory.isPending}
          >
            {updateTerritory.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
