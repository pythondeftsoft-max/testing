import React, { useState } from 'react';
import { Plus, Bell, BellOff, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  useMarketAlerts, 
  useCreateMarketAlert, 
  useUpdateMarketAlert, 
  useDeleteMarketAlert,
  type MarketAlert,
  type CreateMarketAlertData 
} from '@/hooks/useMarketAlerts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface MarketAlertsManagerProps {
  userId?: string;
  prefilledSymbol?: string;
  prefilledAssetType?: MarketAlert['asset_type'];
}

const operatorLabels = {
  price_above: 'Price Above',
  price_below: 'Price Below',
  change_pct_up: '% Change Up',
  change_pct_down: '% Change Down',
};

const operatorDescriptions = {
  price_above: 'Alert when price goes above threshold',
  price_below: 'Alert when price goes below threshold',
  change_pct_up: 'Alert when 24h change exceeds threshold',
  change_pct_down: 'Alert when 24h change drops below threshold',
};

export const MarketAlertsManager: React.FC<MarketAlertsManagerProps> = ({
  userId,
  prefilledSymbol,
  prefilledAssetType,
}) => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<MarketAlert | null>(null);

  // Get current user if userId not provided
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    enabled: !userId,
  });

  const effectiveUserId = userId || currentUser?.id;

  const { data: alerts = [], isLoading } = useMarketAlerts(effectiveUserId);
  const createMutation = useCreateMarketAlert();
  const updateMutation = useUpdateMarketAlert();
  const deleteMutation = useDeleteMarketAlert();

  const [formData, setFormData] = useState<CreateMarketAlertData>({
    symbol: prefilledSymbol || '',
    asset_type: prefilledAssetType || 'stock',
    operator: 'price_above',
    threshold: 0,
    cooldown_minutes: 60,
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      symbol: prefilledSymbol || '',
      asset_type: prefilledAssetType || 'stock',
      operator: 'price_above',
      threshold: 0,
      cooldown_minutes: 60,
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol || formData.threshold <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a valid symbol and threshold',
        variant: 'destructive',
      });
      return;
    }

    if (editingAlert) {
      await updateMutation.mutateAsync({
        id: editingAlert.id,
        updates: formData,
      });
      setEditingAlert(null);
    } else {
      await createMutation.mutateAsync(formData);
    }

    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEdit = (alert: MarketAlert) => {
    setFormData({
      symbol: alert.symbol,
      asset_type: alert.asset_type,
      operator: alert.operator,
      threshold: alert.threshold,
      cooldown_minutes: alert.cooldown_minutes,
      notes: alert.notes || '',
    });
    setEditingAlert(alert);
    setIsCreateDialogOpen(true);
  };

  const handleToggleActive = async (alert: MarketAlert) => {
    await updateMutation.mutateAsync({
      id: alert.id,
      updates: { is_active: !alert.is_active },
    });
  };

  const handleDelete = async (alertId: string) => {
    await deleteMutation.mutateAsync(alertId);
  };

  const formatLastTriggered = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Recently';
  };

  if (!effectiveUserId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Please sign in to manage market alerts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Market Alerts
            </CardTitle>
            <CardDescription>
              Set up alerts for price movements and percentage changes
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAlert ? 'Edit Alert' : 'Create Market Alert'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      placeholder="AAPL, BTC, etc."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset_type">Asset Type</Label>
                    <Select 
                      value={formData.asset_type} 
                      onValueChange={(value: MarketAlert['asset_type']) => 
                        setFormData(prev => ({ ...prev, asset_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="etf">ETF</SelectItem>
                        <SelectItem value="bond">Bond</SelectItem>
                        <SelectItem value="commodity">Commodity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="operator">Condition</Label>
                    <Select 
                      value={formData.operator} 
                      onValueChange={(value: MarketAlert['operator']) => 
                        setFormData(prev => ({ ...prev, operator: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(operatorLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {operatorDescriptions[formData.operator]}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="threshold">
                      Threshold {formData.operator.includes('pct') ? '(%)' : '($)'}
                    </Label>
                    <Input
                      id="threshold"
                      type="number"
                      step="0.01"
                      value={formData.threshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    min="5"
                    value={formData.cooldown_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, cooldown_minutes: parseInt(e.target.value) || 60 }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum time between alerts for the same condition
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingAlert(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingAlert ? 'Update Alert' : 'Create Alert'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No market alerts configured. Create your first alert to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">
                      <div>
                        {alert.symbol}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {alert.asset_type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {operatorLabels[alert.operator]}
                    </TableCell>
                    <TableCell>
                      {alert.operator.includes('pct') ? `${alert.threshold}%` : `$${alert.threshold}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {alert.is_active ? (
                          <Bell className="h-4 w-4 text-green-500" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge variant={alert.is_active ? 'default' : 'secondary'}>
                          {alert.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatLastTriggered(alert.last_triggered_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(alert)}
                          disabled={updateMutation.isPending}
                        >
                          {alert.is_active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(alert)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Alert</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this alert for {alert.symbol}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(alert.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};