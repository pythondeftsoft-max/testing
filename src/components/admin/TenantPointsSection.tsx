
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, RefreshCw, Award, DollarSign, CreditCard, FileText, Users, TrendingUp } from 'lucide-react';
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
  category: 'rent' | 'lease' | 'referral';
  isMultiplier?: boolean;
  isEarningRate?: boolean;
}

const EARNING_METHODS: EarningMethod[] = [
  // Rent Payment Rewards - "On-Time Rent Payment" is now displayed separately using earning rate
  { configKey: 'early_payment_bonus', label: 'Early Payment Bonus', description: 'Additional points for paying rent before the due date', category: 'rent' },
  { configKey: 'section_8_points_multiplier', label: 'Section 8 Multiplier', description: 'Multiplier applied to base points for Section 8 tenants', category: 'rent', isMultiplier: true },
  
  // Lease & Housing Rewards
  { configKey: 'points_per_lease_renewal', label: 'Lease Renewal', description: 'Points earned when renewing a lease', category: 'lease' },
  { configKey: 'maintenance_cooperation_bonus', label: 'Maintenance Cooperation', description: 'Points for cooperating with scheduled maintenance', category: 'lease' },
  
  // Referral Rewards
  { configKey: 'points_per_referral', label: 'Successful Referral', description: 'Points earned when the referred tenant is housed and placement fee is received from the landlord', category: 'referral' },
  { configKey: 'referral_5x_bonus', label: '5 Referrals Milestone', description: 'Bonus points when 5 referred tenants are housed with placement fees received', category: 'referral' },
];

export const TenantPointsSection = () => {
  const { configs, loading, updateConfig, refetch, getConfigValue } = useSystemConfig();
  const [editState, setEditState] = useState<ConfigEditState>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Get the redemption rate (single source of truth - also shown in Redemption Rates tab)
  const redemptionRateConfig = useMemo(() => 
    configs.find(c => c.config_key === 'redemption_rate_tenant'),
    [configs]
  );

  const redemptionRate = useMemo(() => {
    const editData = editState['redemption_rate_tenant'];
    if (editData?.hasChanges) return editData.value;
    return redemptionRateConfig?.config_value || 250;
  }, [redemptionRateConfig, editState]);

  // Get the earning rate (points per dollar spent)
  const earningRateConfig = useMemo(() => 
    configs.find(c => c.config_key === 'tenant_points_per_dollar'),
    [configs]
  );

  const earningRate = useMemo(() => {
    const editData = editState['tenant_points_per_dollar'];
    if (editData?.hasChanges) return editData.value;
    return earningRateConfig?.config_value || 1;
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
        <span className="ml-2">Loading tenant points configuration...</span>
      </div>
    );
  }

  // Get system limit configs
  const maxPointsConfig = configs.find(c => c.config_key === 'max_points_per_month');
  const systemEnabledConfig = configs.find(c => c.config_key === 'points_system_enabled');

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

  const rentMethods = EARNING_METHODS.filter(m => m.category === 'rent');
  const leaseMethods = EARNING_METHODS.filter(m => m.category === 'lease');
  const referralMethods = EARNING_METHODS.filter(m => m.category === 'referral');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5" />
            Tenant Points Configuration
          </h3>
          <p className="text-muted-foreground">
            Configure how tenants earn and use points in the system
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
            Configure how tenants earn and redeem points. These values sync with the Redemption Rates tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Redemption Rate */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Award className="h-4 w-4" />
              Redemption Rate
            </Label>
            <p className="text-xs text-muted-foreground mb-3">How many points equal $1 when cashing out</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={getCurrentValue('redemption_rate_tenant')}
                  onChange={(e) => handleValueChange('redemption_rate_tenant', e.target.value, 'number')}
                  className="w-28 text-lg font-semibold text-center"
                />
                <span className="text-muted-foreground">points</span>
              </div>
              
              <div className="text-2xl font-bold text-primary">=</div>
              
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">$1.00</span>
              </div>

              {editState['redemption_rate_tenant']?.hasChanges && (
                <Button
                  size="sm"
                  onClick={() => handleSave('redemption_rate_tenant')}
                  disabled={saving === 'redemption_rate_tenant'}
                >
                  {saving === 'redemption_rate_tenant' ? (
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
            <p className="text-xs text-muted-foreground mb-3">How many points earned per $1 spent</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">$1.00</span>
                <span className="text-muted-foreground">spent</span>
              </div>
              
              <div className="text-2xl font-bold text-primary">=</div>
              
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={getCurrentValue('tenant_points_per_dollar')}
                  onChange={(e) => handleValueChange('tenant_points_per_dollar', e.target.value, 'number')}
                  className="w-28 text-lg font-semibold text-center"
                  step={0.1}
                />
                <span className="text-muted-foreground">points</span>
              </div>

              <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {cashbackPercentage.toFixed(2)}% cashback
              </Badge>

              {editState['tenant_points_per_dollar']?.hasChanges && (
                <Button
                  size="sm"
                  onClick={() => handleSave('tenant_points_per_dollar')}
                  disabled={saving === 'tenant_points_per_dollar'}
                >
                  {saving === 'tenant_points_per_dollar' ? (
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

        {/* Rent Payment Rewards */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Rent Payment Rewards</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* On-Time Rent Payment - Uses Earning Rate */}
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex-1">
                <Label className="text-sm font-medium">On-Time Rent Payment</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Points earned based on rent amount paid through OpenKey</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Based on earning rate
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Example: $30 rent = {Math.round(30 * earningRate)} pts (= ${calculateDollarValue(30 * earningRate).toFixed(2)})
                </div>
              </div>
            </div>
            {rentMethods.map(renderEarningMethodRow)}
          </CardContent>
        </Card>

        {/* Lease & Housing Rewards */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Lease & Housing Rewards</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {leaseMethods.map(renderEarningMethodRow)}
          </CardContent>
        </Card>

        {/* Referral Rewards */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Referral Rewards</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {referralMethods.map(renderEarningMethodRow)}
          </CardContent>
        </Card>
      </div>

      {/* System Limits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">System Limits</CardTitle>
          <CardDescription>Global constraints on the points system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Points System Enabled */}
          {systemEnabledConfig && (
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium">Points System Enabled</Label>
                <p className="text-xs text-muted-foreground">Turn the entire points system on or off</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={getCurrentValue('points_system_enabled')}
                  onCheckedChange={(checked) => handleValueChange('points_system_enabled', checked, 'boolean')}
                />
                <Label>{getCurrentValue('points_system_enabled') ? 'Enabled' : 'Disabled'}</Label>
                {editState['points_system_enabled']?.hasChanges && (
                  <Button
                    size="sm"
                    onClick={() => handleSave('points_system_enabled')}
                    disabled={saving === 'points_system_enabled'}
                  >
                    {saving === 'points_system_enabled' ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Max Points Per Month */}
          {maxPointsConfig && (
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm font-medium">Max Points Per Month</Label>
                <p className="text-xs text-muted-foreground">Maximum points a tenant can earn in a month (0 = unlimited)</p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={getCurrentValue('max_points_per_month')}
                  onChange={(e) => handleValueChange('max_points_per_month', e.target.value, 'number')}
                  className="w-28 text-right"
                />
                <span className="text-sm text-muted-foreground">pts</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 min-w-[80px] justify-center">
                  = ${calculateDollarValue(getCurrentValue('max_points_per_month')).toFixed(2)}
                </Badge>
                {editState['max_points_per_month']?.hasChanges && (
                  <Button
                    size="sm"
                    onClick={() => handleSave('max_points_per_month')}
                    disabled={saving === 'max_points_per_month'}
                  >
                    {saving === 'max_points_per_month' ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
