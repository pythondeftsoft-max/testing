import { useState } from 'react';
import { MoreHorizontal, Edit2, Trash2, Copy, Tag, Archive, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AssetBulkOperationsProps {
  selectedAssets: string[];
  onClearSelection: () => void;
  onAssetsUpdated: () => void;
}

interface BulkEditData {
  tags?: string[];
  category?: string;
  status?: 'active' | 'inactive';
  annualIncome?: number;
  annualExpenses?: number;
  notes?: string;
}

export const AssetBulkOperations = ({ 
  selectedAssets, 
  onClearSelection,
  onAssetsUpdated 
}: AssetBulkOperationsProps) => {
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({});
  const { toast } = useToast();

  const handleBulkEdit = async () => {
    setIsLoading(true);
    try {
      // Simulate API call for bulk edit
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Assets Updated",
        description: `${selectedAssets.length} assets have been updated successfully`,
      });
      
      onAssetsUpdated();
      onClearSelection();
      setShowBulkEdit(false);
      setBulkEditData({});
    } catch (error) {
      toast({
        title: "Update Failed", 
        description: "Failed to update assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      // Simulate API call for bulk delete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Assets Deleted",
        description: `${selectedAssets.length} assets have been deleted`,
      });
      
      onAssetsUpdated();
      onClearSelection();
      setShowBulkDelete(false);
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      // Simulate export generation
      const csvContent = `Asset Name,Value,Category,Status,Tags
Selected Asset 1,50000,Stocks,Active,"stocks,tech"
Selected Asset 2,500000,Real Estate,Active,"real-estate,rental"
Selected Asset 3,25000,ETF,Active,"etf,diversified"`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selected-assets-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${selectedAssets.length} assets exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export assets. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      // Simulate API call for duplication
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      toast({
        title: "Assets Duplicated",
        description: `${selectedAssets.length} assets have been duplicated`,
      });
      
      onAssetsUpdated();
      onClearSelection();
    } catch (error) {
      toast({
        title: "Duplication Failed",
        description: "Failed to duplicate assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedAssets.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bulk Operations Bar */}
      <Card className="border-openkey-blue/30 bg-openkey-blue/5 backdrop-blur-sm">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-openkey-blue/20 text-openkey-blue">
                {selectedAssets.length} selected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Bulk operations available
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkEdit(true)}
                className="gap-2"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                disabled={isLoading}
                className="gap-2"
              >
                <Copy className="h-3 w-3" />
                Duplicate
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="gap-2"
              >
                <Download className="h-3 w-3" />
                Export
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowBulkDelete(true)}>
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="h-3 w-3 mr-2" />
                    Archive Selected  
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onClearSelection}>
                    Clear Selection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit Assets</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Tags (comma separated)</Label>
              <Input 
                placeholder="e.g., stocks, tech, dividend"
                value={bulkEditData.tags?.join(', ') || ''}
                onChange={(e) => setBulkEditData(prev => ({
                  ...prev,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                }))}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={bulkEditData.status}
                onValueChange={(value: 'active' | 'inactive') => 
                  setBulkEditData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Annual Income</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={bulkEditData.annualIncome || ''}
                  onChange={(e) => setBulkEditData(prev => ({
                    ...prev,
                    annualIncome: parseFloat(e.target.value) || undefined
                  }))}
                />
              </div>
              <div>
                <Label>Annual Expenses</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={bulkEditData.annualExpenses || ''}
                  onChange={(e) => setBulkEditData(prev => ({
                    ...prev,
                    annualExpenses: parseFloat(e.target.value) || undefined
                  }))}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes for selected assets..."
                value={bulkEditData.notes || ''}
                onChange={(e) => setBulkEditData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkEdit(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkEdit}
                disabled={isLoading}
                variant="gradient"
                className="flex-1"
              >
                {isLoading ? 'Updating...' : `Update ${selectedAssets.length} Assets`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Assets</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete {selectedAssets.length} selected assets? 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkDelete(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkDelete}
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                {isLoading ? 'Deleting...' : 'Delete Assets'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};