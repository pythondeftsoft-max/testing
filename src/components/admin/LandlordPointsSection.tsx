
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, RefreshCw, Building2, DollarSign, CreditCard, Wrench, TrendingUp } from 'lucide-react';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface ConfigEditState {
  [key: string]: {
    value: any;
    hasChanges: boolean;
  };
}

interface EarningMethod {
  configKey: string;
  label: string;
  description: string;
  category: 'rent' | 'property';
  isMultiplier?: boolean;
}

const PM_EARNING_METHODS: EarningMethod[] = [
  // Rent Collection Rewards - "Rent Payment Processed" is now displayed separately using earning rate
  { configKey: 'pm_bonus_early_payment_multiplier', label: 'Early Payment Multiplier', description: 'Multiplier applied when tenant pays early', category: 'rent', isMultiplier: true },
  
  // Property Management Rewards  
  { configKey: 'pm_points_lease_signing', label: 'New Lease Signing', description: 'Points earned for signing a new lease with tenant', category: 'property' },
  { configKey: 'pm_points_lease_renewal', label: 'Lease Renewal', description: 'Points earned when tenant renews their lease', category: 'property' },
  { configKey: 'pm_points_maintenance_completion', label: 'Maintenance Completed', description: 'Points for completing maintenance requests', category: 'property' },
  { configKey: 'pm_points_property_inspection', label: 'Property Inspection', description: 'Points for completing property inspections', category: 'property' },
  { configKey: 'pm_bonus_quality_maintenance', label: 'Quality Maintenance Multiplier', description: 'Multiplier for high-quality maintenance completion', category: 'property', isMultiplier: true },
];

export const LandlordPointsSection = () => {
  const { configs, loading, updateConfig, refetch, getConfigValue } = useSystemConfig();
  const [editState, setEditState] = useState<ConfigEditState>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Get the redemption rate (single source of truth - also shown in Redemption Rates tab)
  const redemptionRateConfig = useMemo(() => 
    configs.find(c => c.config_key === 'redemption_rate_landlord'),
    [configs]
  );

  const redemptionRate = useMemo(() => {
    const editData = editState['redemption_rate_landlord'];
    if (editData?.hasChanges) return editData.value;
    return redemptionRateConfig?.config_value || 2500;
  }, [redemptionRateConfig, editState]);

  // Get the earning rate (points per dollar collected)
  const earningRateConfig = useMemo(() => 
    configs.find(c => c.config_key === 'pm_points_per_dollar'),
    [configs]
  );

  const earningRate = useMemo(() => {
    const editData = editState['pm_points_per_dollar'];
    if (editData?.hasChanges) return editData.value;
    return earningRateConfig?.config_value || 2;
  }, [earningRateConfig, editState]);

  // Calculate dollar value from points using redemption rate
  const calculateDollarValue = (points: number) => {
    if (!redemptionRate || redemptionRate === 0) return 0;
    return points / redemptionRate;
  };

  // Calculate effective cashback percentage (points per dollar / redemption rate * 100)
  const cashbackPercentage = useMemo(() => {
    if (!redemptionRate || redemptionRate === 0) return 0;
    return (earningRate / redemptionRate) * 100;
  }, [earningRate, redemptionRate]);

  const handleValueChange = (configKey: string, newValue: any, configType: string) => {
    let processedValue = newValue;
    
    if (configType === 'number') {
      processedValue = newValue === '' ? 0 : Number(newValue);
    } else if (configType === 'boolean') {
      processedValue = newValue;
    }

    setEditState(prev => ({
      ...prev,
      [configKey]: {
        value: processedValue,
        hasChanges: true
      }
    }));
  };

  const handleSave = async (configKey: string) => {
    setSaving(configKey);
    const editData = editState[configKey];
    
    if (editData && editData.hasChanges) {
      const success = await updateConfig(configKey, editData.value);
      if (success) {
        setEditState(prev => ({
          ...prev,
          [configKey]: {
            ...prev[configKey],
            hasChanges: false
          }
        }));
      }
    }
    setSaving(null);
  };

  const getCurrentValue = (configKey: string, fallback: any = 0) => {
    const editData = editState[configKey];
    if (editData?.hasChanges) return editData.value;
    return getConfigValue(configKey, fallback);
  };

  const getConfig = (configKey: string) => {
    return configs.find(c => c.config_key === configKey);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading PM/Landlord points configuration...</span>
      </div>
    );
  }

  // Get system limit configs
  const maxPointsConfig = configs.find(c => c.config_key === 'max_points_per_event');
  const systemEnabledConfig = configs.find(c => c.config_key === 'pm_system_enabled');

  const renderEarningMethodRow = (method: EarningMethod) => {
    const config = getConfig(method.configKey);
    const currentValue = getCurrentValue(method.configKey);
    const hasChanges = editState[method.configKey]?.hasChanges || false;
    const dollarValue = method.isMultiplier ? null : calculateDollarValue(currentValue);

    return (
      <div key={method.configKey} className="flex items-center justify-between py-4 border-b border-border last:border-0">
        <div className="flex-1">
          <Label className="text-sm font-medium">{method.label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Points Input */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={currentValue}
              onChange={(e) => handleValueChange(method.configKey, e.target.value, 'number')}
              className="w-24 text-right"
            />
            <span className="text-sm text-muted-foreground w-12">
              {method.isMultiplier ? 'x' : 'pts'}
            </span>
          </div>

          {/* Dollar Value Badge */}
          {!method.isMultiplier && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 min-w-[80px] justify-center">
              = ${dollarValue?.toFixed(2)}
            </Badge>
          )}

          {/* Save Button */}
          {hasChanges && (
            <Button
              size="sm"
              onClick={() => handleSave(method.configKey)}
              disabled={saving === method.configKey}
            >
              {saving === method.configKey ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const rentMethods = PM_EARNING_METHODS.filter(m => m.category === 'rent');
  const propertyMethods = PM_EARNING_METHODS.filter(m => m.category === 'property');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            PM/Landlord Points Configuration
          </h3>
          <p className="text-muted-foreground">
            Configure how landlords and property managers earn points
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Points Value - Redemption & Earning Rates */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Points Value</CardTitle>
          </div>
          <CardDescription>
            Configure how landlords/PMs earn and redeem points. These values sync with the Redemption Rates tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Redemption Rate */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Redemption Rate
            </Label>
            <p className="text-xs text-muted-foreground mb-3">How many points equal $1 when cashing out</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={getCurrentValue('redemption_rate_landlord')}
                  onChange={(e) => handleValueChange('redemption_rate_landlord', e.target.value, 'number')}
                  className="w-28 text-lg font-semibold text-center"
                />
                <span className="text-muted-foreground">points</span>
              </div>
              
              <div className="text-2xl font-bold text-primary">=</div>
              
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">$1.00</span>
              </div>

              {editState['redemption_rate_landlord']?.hasChanges && (
                <Button
                  size="sm"
                  onClick={() => handleSave('redemption_rate_landlord')}
                  disabled={saving === 'redemption_rate_landlord'}
                >
                  {saving === 'redemption_rate_landlord' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Earning Rate */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Earning Rate
            </Label>
            <p className="text-xs text-muted-foreground mb-3">How many points earned per $1 collected</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">$1.00</span>
                <span className="text-muted-foreground">collected</span>
              </div>
              
              <div className="text-2xl font-bold text-primary">=</div>
              
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={getCurrentValue('pm_points_per_dollar')}
                  onChange={(e) => handleValueChange('pm_points_per_dollar', e.target.value, 'number')}
                  className="w-28 text-lg font-semibold text-center"
                  step={0.1}
                />
                <span className="text-muted-foreground">points</span>
              </div>

              <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {cashbackPercentage.toFixed(2)}% cashback
              </Badge>

              {editState['pm_points_per_dollar']?.hasChanges && (
                <Button
                  size="sm"
                  onClick={() => handleSave('pm_points_per_dollar')}
                  disabled={saving === 'pm_points_per_dollar'}
                >
                  {saving === 'pm_points_per_dollar' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ways to Earn Points */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Ways to Earn Points</h4>

        {/* Rent Collection Rewards */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Rent Collection Rewards</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Rent Payment Processed - Uses Earning Rate */}
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex-1">
                <Label className="text-sm font-medium">Rent Payment Collected</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Points earned based on rent amount collected through OpenKey</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Based on earning rate
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Example: $1,000 collected = {Math.round(1000 * earningRate)} pts (= ${calculateDollarValue(1000 * earningRate).toFixed(2)})
                </div>
              </div>
            </div>
            {rentMethods.map(renderEarningMethodRow)}
          </CardContent>
        </Card>

        {/* Property Management Rewards */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Property Management Rewards</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {propertyMethods.map(renderEarningMethodRow)}
          </CardContent>
        </Card>
      </div>

      {/* System Limits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">System Limits</CardTitle>
          <CardDescription>Global constraints on the PM points system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PM System Enabled */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">PM Points System Enabled</Label>
              <p className="text-xs text-muted-foreground">Turn the PM points system on or off</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={getCurrentValue('pm_system_enabled')}
                onCheckedChange={(checked) => handleValueChange('pm_system_enabled', checked, 'boolean')}
              />
              <Label>{getCurrentValue('pm_system_enabled') ? 'Enabled' : 'Disabled'}</Label>
              {editState['pm_system_enabled']?.hasChanges && (
                <Button
                  size="sm"
                  onClick={() => handleSave('pm_system_enabled')}
                  disabled={saving === 'pm_system_enabled'}
                >
                  {saving === 'pm_system_enabled' ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Max Points Per Event */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Max Points Per Event</Label>
              <p className="text-xs text-muted-foreground">Maximum points a PM can earn per single event (0 = unlimited)</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={getCurrentValue('max_points_per_event')}
                onChange={(e) => handleValueChange('max_points_per_event', e.target.value, 'number')}
                className="w-28 text-right"
              />
              <span className="text-sm text-muted-foreground">pts</span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 min-w-[80px] justify-center">
                = ${calculateDollarValue(getCurrentValue('max_points_per_event')).toFixed(2)}
              </Badge>
              {editState['max_points_per_event']?.hasChanges && (
                <Button
                  size="sm"
                  onClick={() => handleSave('max_points_per_event')}
                  disabled={saving === 'max_points_per_event'}
                >
                  {saving === 'max_points_per_event' ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
