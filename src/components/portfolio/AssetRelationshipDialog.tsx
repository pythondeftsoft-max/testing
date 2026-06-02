import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePortfolioAssets, usePortfolioAssetOperations } from '@/hooks/usePortfolioAssets';
import type { PortfolioAsset } from '@/types/portfolio-assets';

interface AssetRelationshipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  parentAsset?: PortfolioAsset;
}

const relationshipTypes = [
  { value: 'parent_child', label: 'Parent-Child' },
  { value: 'dependency', label: 'Dependency' },
  { value: 'complement', label: 'Complement' },
  { value: 'shared_resource', label: 'Shared Resource' },
];

export const AssetRelationshipDialog: React.FC<AssetRelationshipDialogProps> = ({
  isOpen,
  onClose,
  portfolioId,
  parentAsset,
}) => {
  const [selectedChildAsset, setSelectedChildAsset] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<string>('parent_child');
  const [description, setDescription] = useState<string>('');

  const { data: assets } = usePortfolioAssets(portfolioId);
  const { createRelationship } = usePortfolioAssetOperations(portfolioId);

  const availableAssets = assets?.filter(asset => 
    asset.id !== parentAsset?.id
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentAsset || !selectedChildAsset) return;

    await createRelationship.mutateAsync({
      parent_asset_id: parentAsset.id,
      child_asset_id: selectedChildAsset,
      relationship_type: relationshipType,
      relationship_data: {
        description,
        created_at: new Date().toISOString(),
      },
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedChildAsset('');
    setRelationshipType('parent_child');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Asset Relationship</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Parent Asset</Label>
            <div className="p-2 bg-muted rounded text-sm">
              {parentAsset?.asset_name}
            </div>
          </div>

          <div>
            <Label htmlFor="child-asset">Child Asset</Label>
            <Select value={selectedChildAsset} onValueChange={setSelectedChildAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Select child asset" />
              </SelectTrigger>
              <SelectContent>
                {availableAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_name} ({asset.asset_category?.display_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="relationship-type">Relationship Type</Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {relationshipTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this relationship..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!selectedChildAsset || createRelationship.isPending}
            >
              {createRelationship.isPending ? 'Creating...' : 'Create Relationship'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};