import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRewardsCatalog, type Reward } from '@/hooks/useRewardsCatalog';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Plus, Pencil, Trash2, Search, RefreshCw, Gift, Image as ImageIcon, Star, Info, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const RewardCatalogManager = () => {
  const {
    rewards,
    isLoading,
    refetch,
    createReward,
    updateReward,
    deleteReward,
    isCreating,
    isUpdating,
    isDeleting,
  } = useRewardsCatalog();

  const { getConfigValue } = useSystemConfig();
  
  // Get system redemption rates
  const tenantRedemptionRate = getConfigValue('tenant_redemption_rate', 200);
  const landlordRedemptionRate = getConfigValue('landlord_redemption_rate', 100);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [deletingRewardId, setDeletingRewardId] = useState<string | null>(null);
  const [previewAmount, setPreviewAmount] = useState(25);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'gift_card',
    cost: '',
    description: '',
    image_url: '',
    terms_conditions: '',
    stock_quantity: '',
    status: 'active',
    is_flexible_amount: true,
    min_amount: '10',
    max_amount: '500',
    conversion_rate: String(tenantRedemptionRate),
    brand_category: 'Amazon',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'gift_card',
      cost: '',
      description: '',
      image_url: '',
      terms_conditions: '',
      stock_quantity: '',
      status: 'active',
      is_flexible_amount: true,
      min_amount: '10',
      max_amount: '500',
      conversion_rate: String(tenantRedemptionRate),
      brand_category: 'Amazon',
    });
    setEditingReward(null);
    setPreviewAmount(25);
  };

  // Check if conversion rate matches system rates
  const isCustomRate = () => {
    const rate = parseFloat(formData.conversion_rate);
    return formData.is_flexible_amount && 
           rate !== tenantRedemptionRate && 
           rate !== landlordRedemptionRate;
  };

  const handleOpenDialog = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        name: reward.name,
        type: reward.type,
        cost: reward.cost.toString(),
        description: reward.description || '',
        image_url: reward.image_url || '',
        terms_conditions: reward.terms_conditions || '',
        stock_quantity: reward.stock_quantity?.toString() || '',
        status: reward.status,
        is_flexible_amount: reward.is_flexible_amount || false,
        min_amount: reward.min_amount?.toString() || '10',
        max_amount: reward.max_amount?.toString() || '500',
        conversion_rate: reward.conversion_rate?.toString() || '100',
        brand_category: reward.brand_category || 'Amazon',
      });
      setPreviewAmount(reward.min_amount || 25);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rewardData = {
      name: formData.name,
      type: formData.type,
      cost: formData.is_flexible_amount ? 0 : parseInt(formData.cost),
      description: formData.description || null,
      image_url: formData.image_url || null,
      terms_conditions: formData.terms_conditions || null,
      stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
      status: formData.status,
      is_flexible_amount: formData.is_flexible_amount,
      min_amount: formData.is_flexible_amount ? parseFloat(formData.min_amount) : null,
      max_amount: formData.is_flexible_amount ? parseFloat(formData.max_amount) : null,
      conversion_rate: formData.is_flexible_amount ? parseFloat(formData.conversion_rate) : null,
      brand_category: formData.is_flexible_amount ? formData.brand_category : null,
    };

    try {
      if (editingReward) {
        await updateReward({ id: editingReward.id, updates: rewardData });
      } else {
        await createReward(rewardData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving reward:', error);
    }
  };

  const handleDelete = async () => {
    if (!deletingRewardId) return;

    try {
      await deleteReward(deletingRewardId);
      setIsDeleteDialogOpen(false);
      setDeletingRewardId(null);
    } catch (error) {
      console.error('Error deleting reward:', error);
    }
  };

  const filteredRewards = rewards.filter((reward) =>
    reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reward.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculatePreviewPoints = () => {
    if (!formData.is_flexible_amount) return parseInt(formData.cost) || 0;
    return Math.round(previewAmount * parseFloat(formData.conversion_rate || '100'));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reward Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Reward Catalog
              </CardTitle>
              <CardDescription>
                Manage available rewards that users can redeem with their points
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => handleOpenDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Reward
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rewards by name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Rewards Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reward Type</TableHead>
                  <TableHead>Cost/Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRewards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No rewards found. Add your first reward to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        {reward.image_url ? (
                          <img
                            src={reward.image_url}
                            alt={reward.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{reward.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{reward.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={reward.is_flexible_amount ? "default" : "secondary"}>
                          {reward.is_flexible_amount ? "Flexible" : "Fixed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reward.is_flexible_amount ? (
                          <div className="text-sm">
                            <div>${reward.min_amount} - ${reward.max_amount}</div>
                            <div className="text-xs text-muted-foreground">
                              {reward.conversion_rate} pts/$1
                            </div>
                          </div>
                        ) : (
                          <div>{reward.cost.toLocaleString()} pts</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={reward.status === 'active' ? 'default' : 'secondary'}>
                          {reward.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(reward)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingRewardId(reward.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReward ? 'Edit Reward' : 'Add New Reward'}
            </DialogTitle>
            <DialogDescription>
              {editingReward
                ? 'Update the reward details below'
                : 'Create a new reward that users can redeem with points'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Form Fields */}
              <div className="space-y-4">
                {/* Reward Type Selection */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-base font-semibold">Reward Type</Label>
                  <RadioGroup
                    value={formData.is_flexible_amount ? 'flexible' : 'fixed'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, is_flexible_amount: value === 'flexible' })
                    }
                  >
                    <div className="flex items-start space-x-3 p-3 border rounded-md bg-background hover:bg-accent/50 cursor-pointer">
                      <RadioGroupItem value="flexible" id="flexible" />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="flexible" className="cursor-pointer font-medium">
                          Flexible Amount (Recommended)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Users select dollar amount ($10-$500). Best for gift cards.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 border rounded-md bg-background hover:bg-accent/50 cursor-pointer">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="fixed" className="cursor-pointer font-medium">
                          Fixed Cost
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          One specific point cost. Good for physical items.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Basic Information */}
                <div className="space-y-2">
                  <Label htmlFor="name">Reward Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.is_flexible_amount ? "e.g., Amazon Gift Card" : "e.g., $25 Amazon Gift Card"}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Category *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gift_card">Gift Card</SelectItem>
                        <SelectItem value="merchandise">Merchandise</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Flexible Amount Fields */}
                {formData.is_flexible_amount ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand/Category *</Label>
                      <Input
                        id="brand"
                        value={formData.brand_category}
                        onChange={(e) => setFormData({ ...formData, brand_category: e.target.value })}
                        placeholder="e.g., Amazon, Starbucks, Target"
                        required
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="min_amount">Min Amount ($) *</Label>
                        <Input
                          id="min_amount"
                          type="number"
                          min="1"
                          step="0.01"
                          value={formData.min_amount}
                          onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                          placeholder="10"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max_amount">Max Amount ($) *</Label>
                        <Input
                          id="max_amount"
                          type="number"
                          min="1"
                          step="0.01"
                          value={formData.max_amount}
                          onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                          placeholder="500"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="conversion_rate">
                          Conversion Rate *
                          <span className="ml-1 text-xs text-muted-foreground">(points per $1)</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="conversion_rate"
                            type="number"
                            min="1"
                            step="1"
                            value={formData.conversion_rate}
                            onChange={(e) => setFormData({ ...formData, conversion_rate: e.target.value })}
                            placeholder="100"
                            required
                            className="flex-1"
                          />
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant={parseFloat(formData.conversion_rate) === tenantRedemptionRate ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFormData({ ...formData, conversion_rate: String(tenantRedemptionRate) })}
                              className="whitespace-nowrap text-xs px-2"
                            >
                              Tenant ({tenantRedemptionRate})
                            </Button>
                            <Button
                              type="button"
                              variant={parseFloat(formData.conversion_rate) === landlordRedemptionRate ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFormData({ ...formData, conversion_rate: String(landlordRedemptionRate) })}
                              className="whitespace-nowrap text-xs px-2"
                            >
                              PM ({landlordRedemptionRate})
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          System rates: Tenant = {tenantRedemptionRate} pts/$1 | PM/Landlord = {landlordRedemptionRate} pts/$1
                        </p>
                      </div>
                    </div>

                    {/* Custom Rate Warning */}
                    {isCustomRate() && (
                      <Alert variant="default" className="border-amber-500 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-xs text-amber-900">
                          <strong>Custom rate:</strong> This differs from your system rates (Tenant: {tenantRedemptionRate}, PM: {landlordRedemptionRate}). 
                          Users will redeem at {formData.conversion_rate} points per $1.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900">
                          <p className="font-medium mb-1">Conversion Rate Example:</p>
                          <p>At {formData.conversion_rate || 100} pts/$1, a $25 gift card costs {Math.round((parseFloat(formData.conversion_rate) || 100) * 25).toLocaleString()} points</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost (Points) *</Label>
                    <Input
                      id="cost"
                      type="number"
                      min="1"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="e.g., 2500"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the reward..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                    placeholder="Any terms, expiration dates, or restrictions..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Right Column - Live Preview */}
              <div className="space-y-4">
                <div className="sticky top-4">
                  <div className="rounded-lg border-2 border-dashed border-primary/30 bg-accent/50 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Gift className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">User Preview</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      This is how users will see this reward
                    </p>

                    {/* Preview Card */}
                    <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
                      {formData.image_url && (
                        <div className="h-32 overflow-hidden bg-muted">
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="p-4 space-y-3">
                        <div className="min-h-[60px]">
                          <h4 className="font-semibold text-base leading-tight">
                            {formData.name || 'Reward Name'}
                          </h4>
                          {formData.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {formData.description}
                            </p>
                          )}
                        </div>

                        {formData.is_flexible_amount ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Amount:</span>
                              <span className="text-xs text-muted-foreground">
                                ${formData.min_amount || 0} - ${formData.max_amount || 0}
                              </span>
                            </div>

                            {/* Amount buttons */}
                            <div className="grid grid-cols-4 gap-2">
                              {[10, 25, 50, 100]
                                .filter(
                                  (amt) =>
                                    amt >= parseFloat(formData.min_amount || '0') &&
                                    amt <= parseFloat(formData.max_amount || '999999')
                                )
                                .map((amount) => (
                                  <Button
                                    key={amount}
                                    type="button"
                                    variant={previewAmount === amount ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setPreviewAmount(amount)}
                                    className="text-xs h-8"
                                  >
                                    ${amount}
                                  </Button>
                                ))}
                            </div>

                            {/* Custom amount */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm">$</span>
                              <Input
                                type="number"
                                min={formData.min_amount}
                                max={formData.max_amount}
                                value={previewAmount}
                                onChange={(e) =>
                                  setPreviewAmount(parseFloat(e.target.value) || 0)
                                }
                                className="h-8 text-sm"
                              />
                            </div>

                            {/* Points display */}
                            <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                              <span className="text-sm text-muted-foreground">Points needed:</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-primary" />
                                <span className="font-semibold">
                                  {calculatePreviewPoints().toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Points needed:</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-primary" />
                              <span className="font-semibold">
                                {(parseInt(formData.cost) || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        <Button className="w-full" disabled>
                          <Gift className="h-4 w-4 mr-2" />
                          {formData.is_flexible_amount
                            ? `Redeem $${previewAmount.toFixed(2)} Gift Card`
                            : 'Redeem Reward'}
                        </Button>
                      </div>
                    </div>

                    {/* Tips */}
                    <div className="mt-4 p-3 bg-background rounded-md border text-xs space-y-2">
                      <p className="font-medium">💡 Tips:</p>
                      <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                        <li>Add an image URL for better engagement</li>
                        <li>Keep names short and clear</li>
                        {formData.is_flexible_amount && (
                          <li>Standard conversion: 100 points = $1</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? 'Saving...' : editingReward ? 'Update Reward' : 'Create Reward'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reward?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the reward from the catalog.
              If there are active redemptions for this reward, you may want to set it to inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRewardId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};