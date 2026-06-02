import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Info, CreditCard, Building2, FileCheck, AlertTriangle } from 'lucide-react';
import { usePlatformConfig, useUpdatePlatformConfig } from '@/hooks/usePlatformConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const PlatformFeeSettings = () => {
  const { data: config, isLoading } = usePlatformConfig();
  const updateConfig = useUpdatePlatformConfig();

  // Card fees
  const [cardStripeFee, setCardStripeFee] = useState('2.9');
  const [cardPlatformFee, setCardPlatformFee] = useState('0.5');
  const [cardTenantPercent, setCardTenantPercent] = useState('0');
  const [cardLandlordPercent, setCardLandlordPercent] = useState('100');

  // ACH fees
  const [achStripeFee, setAchStripeFee] = useState('0.8');
  const [achPlatformFee, setAchPlatformFee] = useState('0.5');
  const [achTenantPercent, setAchTenantPercent] = useState('0');
  const [achLandlordPercent, setAchLandlordPercent] = useState('100');

  // Checkbook fees
  const [checkbookStripeFee, setCheckbookStripeFee] = useState('0');
  const [checkbookPlatformFee, setCheckbookPlatformFee] = useState('0');
  const [checkbookTenantPercent, setCheckbookTenantPercent] = useState('0');
  const [checkbookLandlordPercent, setCheckbookLandlordPercent] = useState('100');

  useEffect(() => {
    if (config?.config_value) {
      const feeConfig = config.config_value as any;
      
      // Card
      if (feeConfig.card) {
        setCardStripeFee((feeConfig.card.stripe_processing_fee * 100).toFixed(2));
        setCardPlatformFee((feeConfig.card.platform_revenue_fee * 100).toFixed(2));
        setCardTenantPercent(feeConfig.card.tenant_pays_percent?.toString() || '0');
        setCardLandlordPercent(feeConfig.card.landlord_pays_percent?.toString() || '100');
      }
      
      // ACH
      const achConfig = feeConfig.ach || feeConfig.us_bank_account;
      if (achConfig) {
        setAchStripeFee((achConfig.stripe_processing_fee * 100).toFixed(2));
        setAchPlatformFee((achConfig.platform_revenue_fee * 100).toFixed(2));
        setAchTenantPercent(achConfig.tenant_pays_percent?.toString() || '0');
        setAchLandlordPercent(achConfig.landlord_pays_percent?.toString() || '100');
      }
      
      // Checkbook
      if (feeConfig.checkbook) {
        setCheckbookStripeFee((feeConfig.checkbook.stripe_processing_fee * 100).toFixed(2));
        setCheckbookPlatformFee((feeConfig.checkbook.platform_revenue_fee * 100).toFixed(2));
        setCheckbookTenantPercent(feeConfig.checkbook.tenant_pays_percent?.toString() || '0');
        setCheckbookLandlordPercent(feeConfig.checkbook.landlord_pays_percent?.toString() || '100');
      }
    }
  }, [config]);

  const validateSplit = (tenant: string, landlord: string) => {
    const total = parseFloat(tenant || '0') + parseFloat(landlord || '0');
    return Math.abs(total - 100) < 0.01; // Allow for floating point imprecision
  };

  const handleSave = () => {
    // Validate splits
    if (!validateSplit(cardTenantPercent, cardLandlordPercent)) {
      alert('Card payment split must add up to 100%');
      return;
    }
    if (!validateSplit(achTenantPercent, achLandlordPercent)) {
      alert('ACH payment split must add up to 100%');
      return;
    }
    if (!validateSplit(checkbookTenantPercent, checkbookLandlordPercent)) {
      alert('Checkbook payment split must add up to 100%');
      return;
    }

    updateConfig.mutate({
      card: {
        stripe_processing_fee: parseFloat(cardStripeFee) / 100,
        platform_revenue_fee: parseFloat(cardPlatformFee) / 100,
        tenant_pays_percent: parseFloat(cardTenantPercent),
        landlord_pays_percent: parseFloat(cardLandlordPercent),
      },
      ach: {
        stripe_processing_fee: parseFloat(achStripeFee) / 100,
        platform_revenue_fee: parseFloat(achPlatformFee) / 100,
        tenant_pays_percent: parseFloat(achTenantPercent),
        landlord_pays_percent: parseFloat(achLandlordPercent),
      },
      us_bank_account: {
        stripe_processing_fee: parseFloat(achStripeFee) / 100,
        platform_revenue_fee: parseFloat(achPlatformFee) / 100,
        tenant_pays_percent: parseFloat(achTenantPercent),
        landlord_pays_percent: parseFloat(achLandlordPercent),
      },
      checkbook: {
        stripe_processing_fee: parseFloat(checkbookStripeFee) / 100,
        platform_revenue_fee: parseFloat(checkbookPlatformFee) / 100,
        tenant_pays_percent: parseFloat(checkbookTenantPercent),
        landlord_pays_percent: parseFloat(checkbookLandlordPercent),
      },
    } as any);
  };

  const FeeCard = ({ 
    title, 
    icon: Icon, 
    stripeFee, 
    setStripeFee, 
    platformFee, 
    setPlatformFee,
    tenantPercent,
    setTenantPercent,
    landlordPercent,
    setLandlordPercent,
    description,
    fixedFee = 0,
    feeCapLabel = null 
  }: any) => {
    const rent = 1000;
    // Calculate Stripe fee with percentage + fixed fee
    let stripeFeeAmount = (rent * (parseFloat(stripeFee) / 100)) + fixedFee;
    
    // Apply fee cap if specified (e.g., ACH $5 cap)
    if (feeCapLabel && stripeFeeAmount > 5) {
      stripeFeeAmount = 5;
    }
    
    const platformRevenue = rent * (parseFloat(platformFee) / 100);
    const tenantPlatformFee = platformRevenue * (parseFloat(tenantPercent) / 100);
    const landlordPlatformFee = platformRevenue * (parseFloat(landlordPercent) / 100);
    
    const tenantPays = rent + stripeFeeAmount + tenantPlatformFee;
    const landlordReceives = rent - landlordPlatformFee;
    const platformProfit = tenantPlatformFee + landlordPlatformFee;

    const splitValid = validateSplit(tenantPercent, landlordPercent);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stripe Processing Fee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              Stripe Processing Fee (%)
              <Badge variant="secondary" className="text-xs">Fixed by Stripe</Badge>
            </Label>
            <Input 
              type="number" 
              step="0.01" 
              value={stripeFee} 
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              🔒 {description} - Set by Stripe and cannot be modified
              {feeCapLabel && <span className="block mt-1">{feeCapLabel}</span>}
            </p>
          </div>

          <Separator />

          {/* Platform Revenue Fee */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Platform Revenue Fee (%) - Your Profit</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={platformFee} 
                onChange={(e) => setPlatformFee(e.target.value)} 
                disabled={isLoading || updateConfig.isPending}
              />
            </div>

            {/* Split Configuration */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Split this fee between:</p>
              
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Tenant Pays (% of platform fee)</Label>
                  <Input 
                    type="number" 
                    step="1" 
                    min="0"
                    max="100"
                    value={tenantPercent} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value || '0');
                      setTenantPercent(e.target.value);
                      setLandlordPercent((100 - val).toString());
                    }}
                    disabled={isLoading || updateConfig.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Landlord Pays (% of platform fee)</Label>
                  <Input 
                    type="number" 
                    step="1" 
                    min="0"
                    max="100"
                    value={landlordPercent} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value || '0');
                      setLandlordPercent(e.target.value);
                      setTenantPercent((100 - val).toString());
                    }}
                    disabled={isLoading || updateConfig.isPending}
                  />
                </div>
              </div>

              {!splitValid && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Split must add up to 100%</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <Separator />

          {/* Example Breakdown */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Example on $1,000 rent:</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                <p className="text-xs text-muted-foreground">Tenant Pays</p>
                <p className="text-lg font-bold">${tenantPays.toFixed(2)}</p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>+ Rent: ${rent.toFixed(2)}</div>
                  <div>+ Stripe: ${stripeFeeAmount.toFixed(2)}</div>
                  <div>+ Platform: ${tenantPlatformFee.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="p-3 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                <p className="text-xs text-muted-foreground">Landlord Gets</p>
                <p className="text-lg font-bold">${landlordReceives.toFixed(2)}</p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>Rent: ${rent.toFixed(2)}</div>
                  <div>- Platform: ${landlordPlatformFee.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="p-3 border rounded-lg bg-primary/10">
                <p className="text-xs text-muted-foreground">Platform Profit</p>
                <p className="text-lg font-bold text-primary">${platformProfit.toFixed(2)}</p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>Tenant: ${tenantPlatformFee.toFixed(2)}</div>
                  <div>Landlord: ${landlordPlatformFee.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <div className="p-2 bg-muted/30 rounded text-xs text-muted-foreground">
              <strong>Stripe Gets:</strong> ${stripeFeeAmount.toFixed(2)} (processing cost)
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure fees per payment method. Stripe fees go to Stripe, while platform fees are split between tenant and landlord as configured.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="card">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="card">
            <CreditCard className="h-4 w-4 mr-2" />
            Card
          </TabsTrigger>
          <TabsTrigger value="ach">
            <Building2 className="h-4 w-4 mr-2" />
            ACH
          </TabsTrigger>
          <TabsTrigger value="checkbook">
            <FileCheck className="h-4 w-4 mr-2" />
            Checkbook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="mt-6">
          <FeeCard 
            title="Card Payments" 
            icon={CreditCard}
            stripeFee={cardStripeFee}
            setStripeFee={setCardStripeFee}
            platformFee={cardPlatformFee}
            setPlatformFee={setCardPlatformFee}
            tenantPercent={cardTenantPercent}
            setTenantPercent={setCardTenantPercent}
            landlordPercent={cardLandlordPercent}
            setLandlordPercent={setCardLandlordPercent}
            description="Stripe charges 2.9% + $0.30 per transaction"
            fixedFee={0.30}
          />
        </TabsContent>

        <TabsContent value="ach" className="mt-6">
          <FeeCard 
            title="ACH Payments" 
            icon={Building2}
            stripeFee={achStripeFee}
            setStripeFee={setAchStripeFee}
            platformFee={achPlatformFee}
            setPlatformFee={setAchPlatformFee}
            tenantPercent={achTenantPercent}
            setTenantPercent={setAchTenantPercent}
            landlordPercent={achLandlordPercent}
            setLandlordPercent={setAchLandlordPercent}
            description="Stripe charges 0.8% per transaction"
            fixedFee={0}
            feeCapLabel="⚡ Capped at $5.00 maximum per transaction"
          />
        </TabsContent>

        <TabsContent value="checkbook" className="mt-6">
          <FeeCard 
            title="Checkbook (Future)" 
            icon={FileCheck}
            stripeFee={checkbookStripeFee}
            setStripeFee={setCheckbookStripeFee}
            platformFee={checkbookPlatformFee}
            setPlatformFee={setCheckbookPlatformFee}
            tenantPercent={checkbookTenantPercent}
            setTenantPercent={setCheckbookTenantPercent}
            landlordPercent={checkbookLandlordPercent}
            setLandlordPercent={setCheckbookLandlordPercent}
            description="Not yet active"
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isLoading || updateConfig.isPending}
          size="lg"
        >
          {updateConfig.isPending ? 'Saving...' : 'Save All Fee Rates'}
        </Button>
      </div>
    </div>
  );
};
