import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAvailableWorkers } from '@/hooks/useAvailableWorkers';
import { useCreateTerritory } from '@/hooks/useTerritories';
import { X } from 'lucide-react';

interface AddTerritoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTerritoryDialog: React.FC<AddTerritoryDialogProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { data: workers, isLoading: loadingWorkers } = useAvailableWorkers();
  const createTerritory = useCreateTerritory();
  
  const [formData, setFormData] = useState({
    country: '',
    territoryType: '',
    territoryName: '',
    regionCode: '',
    postalRanges: '',
    defaultWorker: '',
    isActive: true
  });

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

    // Call mutation to save to database
    createTerritory.mutate({
      country: formData.country,
      territoryType: formData.territoryType,
      territoryName: formData.territoryName,
      regionCode: formData.regionCode,
      postalRanges: formData.postalRanges,
      defaultWorker: formData.defaultWorker,
      isActive: formData.isActive
    }, {
      onSuccess: () => {
        // Reset form and close
        setFormData({
          country: '',
          territoryType: '',
          territoryName: '',
          regionCode: '',
          postalRanges: '',
          defaultWorker: '',
          isActive: true
        });
        onClose();
      }
    });
  };

  const handleClose = () => {
    // Reset form on close
    setFormData({
      country: '',
      territoryType: '',
      territoryName: '',
      regionCode: '',
      postalRanges: '',
      defaultWorker: '',
      isActive: true
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Add Territory</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
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

          {/* State / Region Code */}
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

          {/* Zip / Postal Ranges */}
          <div className="space-y-2">
            <Label htmlFor="postalRanges">Zip / Postal Ranges</Label>
            <Input
              id="postalRanges"
              value={formData.postalRanges}
              onChange={(e) => setFormData({ ...formData, postalRanges: e.target.value })}
              placeholder="e.g., 63000-63999 or 75001,75002"
            />
          </div>

          {/* Default Worker */}
          <div className="space-y-2">
            <Label htmlFor="defaultWorker">Default Worker</Label>
            <Select
              value={formData.defaultWorker}
              onValueChange={(value) => setFormData({ ...formData, defaultWorker: value })}
            >
              <SelectTrigger id="defaultWorker">
                <SelectValue placeholder={loadingWorkers ? "Loading workers..." : "Select a user..."} />
              </SelectTrigger>
              <SelectContent>
                {workers?.map((worker) => (
                  <SelectItem key={worker.user_id} value={worker.user_id}>
                    {worker.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Toggle */}
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

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={createTerritory.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={createTerritory.isPending}
          >
            {createTerritory.isPending ? 'Creating...' : 'Create Territory'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
