import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Trash2, Edit, TrendingUp, TrendingDown } from 'lucide-react';
import { useMarketAlerts, useCreateMarketAlert, useUpdateMarketAlert, useDeleteMarketAlert } from '@/hooks/useMarketAlerts';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AlertsDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlertsDialog = ({ userId, isOpen, onOpenChange }: AlertsDialogProps) => {
  const { toast } = useToast();
  const { data: alerts, isLoading } = useMarketAlerts(userId);
  const createAlert = useCreateMarketAlert();
  const updateAlert = useUpdateMarketAlert();
  const deleteAlert = useDeleteMarketAlert();
  const { unreadCount } = useNotificationCount();

  const [newAlert, setNewAlert] = useState({
    symbol: '',
    operator: 'price_above' as 'price_above' | 'price_below' | 'change_pct_up' | 'change_pct_down',
    threshold: '',
  });

  const handleCreateAlert = async () => {
    if (!newAlert.symbol || !newAlert.threshold) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    createAlert.mutate({
      symbol: newAlert.symbol.toUpperCase(),
      asset_type: 'stock',
      operator: newAlert.operator,
      threshold: parseFloat(newAlert.threshold),
    });

    setNewAlert({ symbol: '', operator: 'price_above', threshold: '' });
  };

  const handleToggleAlert = (alertId: string, currentStatus: boolean) => {
    updateAlert.mutate({
      id: alertId,
      updates: { is_active: !currentStatus },
    });
  };

  const handleDeleteAlert = (alertId: string) => {
    deleteAlert.mutate(alertId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Market Alerts
            {unreadCount > 0 && (
              <span className="bg-destructive text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Alerts ({alerts?.length || 0})</TabsTrigger>
            <TabsTrigger value="create">Create Alert</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading alerts...</div>
            ) : !alerts || alerts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create an alert to get notified when your assets hit key price points
                  </p>
                  <Button
                    onClick={() => document.querySelector('[value="create"]')?.dispatchEvent(new MouseEvent('click'))}
                    variant="blue"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Alert
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-lg">{alert.symbol}</span>
                            {alert.operator === 'price_above' || alert.operator === 'change_pct_up' ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Alert when {alert.operator === 'price_above' ? `price rises above $${alert.threshold.toLocaleString()}` : 
                                      alert.operator === 'price_below' ? `price falls below $${alert.threshold.toLocaleString()}` :
                                      alert.operator === 'change_pct_up' ? `price increases by ${alert.threshold}%` : 
                                      `price decreases by ${alert.threshold}%`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={alert.is_active}
                            onCheckedChange={() => handleToggleAlert(alert.id, alert.is_active)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Asset Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g., BTC, AAPL, ETH"
                    value={newAlert.symbol}
                    onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operator">Condition</Label>
                  <Select value={newAlert.operator} onValueChange={(value: any) => setNewAlert({ ...newAlert, operator: value })}>
                    <SelectTrigger id="operator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_above">Price rises above</SelectItem>
                      <SelectItem value="price_below">Price falls below</SelectItem>
                      <SelectItem value="change_pct_up">Price increases by %</SelectItem>
                      <SelectItem value="change_pct_down">Price decreases by %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold">
                    {newAlert.operator.includes('pct') ? 'Percentage Change' : 'Price Threshold'}
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    placeholder={newAlert.operator.includes('pct') ? 'e.g., 5' : 'e.g., 50000'}
                    value={newAlert.threshold}
                    onChange={(e) => setNewAlert({ ...newAlert, threshold: e.target.value })}
                  />
                </div>

                <Button
                  onClick={handleCreateAlert}
                  className="w-full"
                  variant="blue"
                  disabled={createAlert.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createAlert.isPending ? 'Creating...' : 'Create Alert'}
                </Button>
              </CardContent>
            </Card>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">How alerts work</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Get notified when your assets reach key price levels</li>
                <li>• Alerts check prices every 15 minutes</li>
                <li>• You'll receive an in-app notification when triggered</li>
                <li>• Alerts can be toggled on/off at any time</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
