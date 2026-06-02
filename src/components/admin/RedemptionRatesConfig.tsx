import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { DollarSign, Users, AlertTriangle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const RedemptionRatesConfig = () => {
  const { configs, updateConfig, loading } = useSystemConfig();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const landlordRate = configs.find(c => c.config_key === 'redemption_rate_landlord')?.config_value || '100';
  const tenantRate = configs.find(c => c.config_key === 'redemption_rate_tenant')?.config_value || '200';
  const landlordMin = configs.find(c => c.config_key === 'redemption_min_points_landlord')?.config_value || '500';
  const tenantMin = configs.find(c => c.config_key === 'redemption_min_points_tenant')?.config_value || '1000';

  const [localLandlordRate, setLocalLandlordRate] = useState(landlordRate);
  const [localTenantRate, setLocalTenantRate] = useState(tenantRate);
  const [localLandlordMin, setLocalLandlordMin] = useState(landlordMin);
  const [localTenantMin, setLocalTenantMin] = useState(tenantMin);

  const hasChanges = 
    localLandlordRate !== landlordRate ||
    localTenantRate !== tenantRate ||
    localLandlordMin !== landlordMin ||
    localTenantMin !== tenantMin;

  

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateConfig('redemption_rate_landlord', parseInt(localLandlordRate)),
        updateConfig('redemption_rate_tenant', parseInt(localTenantRate)),
        updateConfig('redemption_min_points_landlord', parseInt(localLandlordMin)),
        updateConfig('redemption_min_points_tenant', parseInt(localTenantMin)),
      ]);

      toast({
        title: 'Success',
        description: 'Redemption rates updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update redemption rates',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateExample = (points: number, rate: number) => {
    return (points / rate).toFixed(2);
  };

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Redemption Rates Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Control how many points are needed per $1 in rewards for each user type
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>


      <div className="grid gap-6 md:grid-cols-2">
        {/* Landlord/PM Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Landlord/PM Redemption
            </CardTitle>
            <CardDescription>
              Better rates for landlords who generate revenue via rent collection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="landlord-rate">Points per $1</Label>
              <Input
                id="landlord-rate"
                type="number"
                min="10"
                max="1000"
                value={localLandlordRate}
                onChange={(e) => setLocalLandlordRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lower = better deal (e.g., 100 points = $1.00)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="landlord-min">Minimum Conversion Points</Label>
              <Input
                id="landlord-min"
                type="number"
                min="100"
                value={localLandlordMin}
                onChange={(e) => setLocalLandlordMin(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum points required to convert
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Example Conversions:</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>500 points =</span>
                  <span className="font-semibold">${calculateExample(500, parseInt(localLandlordRate))}</span>
                </div>
                <div className="flex justify-between">
                  <span>1,000 points =</span>
                  <span className="font-semibold">${calculateExample(1000, parseInt(localLandlordRate))}</span>
                </div>
                <div className="flex justify-between">
                  <span>5,000 points =</span>
                  <span className="font-semibold">${calculateExample(5000, parseInt(localLandlordRate))}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Tenant Redemption
            </CardTitle>
            <CardDescription>
              Higher requirements to protect margins on tenant rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-rate">Points per $1</Label>
              <Input
                id="tenant-rate"
                type="number"
                min="10"
                max="1000"
                value={localTenantRate}
                onChange={(e) => setLocalTenantRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Set independently based on your business model
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-min">Minimum Conversion Points</Label>
              <Input
                id="tenant-min"
                type="number"
                min="100"
                value={localTenantMin}
                onChange={(e) => setLocalTenantMin(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum points required to convert
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Example Conversions:</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>1,000 points =</span>
                  <span className="font-semibold">${calculateExample(1000, parseInt(localTenantRate))}</span>
                </div>
                <div className="flex justify-between">
                  <span>2,000 points =</span>
                  <span className="font-semibold">${calculateExample(2000, parseInt(localTenantRate))}</span>
                </div>
                <div className="flex justify-between">
                  <span>5,000 points =</span>
                  <span className="font-semibold">${calculateExample(5000, parseInt(localTenantRate))}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertDescription>
          💡 <strong>Tip:</strong> Lower numbers mean better redemption rates (e.g., 100 pts/$1 is better than 200 pts/$1). 
          These are independent settings - configure each based on your business model.
        </AlertDescription>
      </Alert>
    </div>
  );
};
