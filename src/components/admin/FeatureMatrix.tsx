import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X, DollarSign, Gift } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlanStatus } from '@/hooks/usePlanStatus';

const FeatureMatrix = () => {
  const { data: planStatus } = usePlanStatus();
  // Plan configurations
  const plans = {
    landlord: [
      { id: 'free_landlord', name: 'Free', price: '$0', model: 'Forever free' },
      { id: 'basic', name: 'Basic', price: '$1.16', model: 'per unit/month' },
      { id: 'pro', name: 'Pro', price: '$2.00', model: 'per unit/month' },
      { id: 'analytics_tracking', name: 'Analytics & Tracking', price: '$9.99', model: 'flat rate/month' },
      { id: 'white_label', name: 'White Label', price: '$99', model: 'flat rate/month' },
    ],
    tenant: [
      { id: 'free_tenant', name: 'Free', price: '$0', model: 'Forever free' },
      { id: 'tenant_pro', name: 'Tenant Pro', price: '$9.99', model: 'per month' },
    ],
  };

  // Feature availability matrix
  const features = {
    pricing: {
      label: 'Pricing',
      items: [
        { name: 'Price', landlord: ['$0', '$1.16/unit', '$2.00/unit', '$9.99', '$99'], tenant: ['$0', '$9.99'] },
      ],
    },
    listings: {
      label: 'Listings & Applications',
      items: [
        { name: 'Unlimited Listings', landlord: [true, true, true, true, true], tenant: [false, false] },
        { name: 'View Applications', landlord: [true, true, true, false, true], tenant: [false, false] },
        { name: 'Tenant Profiles', landlord: [true, true, true, false, true], tenant: [false, false] },
        { name: 'Application Credits', landlord: [false, false, false, false, false], tenant: [5, 'Unlimited'] },
      ],
    },
    management: {
      label: 'Property Management (Landlord)',
      items: [
        { name: 'Rent Payment Processing', landlord: ['10 units', true, true, false, true], tenant: [false, false], tooltip: 'Free landlords get 10 free management units' },
        { name: 'Maintenance Management', landlord: ['10 units', true, true, false, true], tenant: [false, false], tooltip: 'Free landlords get 10 free management units' },
        { name: 'Vendor Management', landlord: ['10 units', true, true, false, true], tenant: [false, false], tooltip: 'Free landlords get 10 free management units' },
        { name: 'Lease Management', landlord: ['10 units', true, true, false, true], tenant: [false, false], tooltip: 'Free landlords get 10 free management units' },
      ],
    },
    analytics: {
      label: 'Analytics & Tracking',
      items: [
        { name: 'Basic Analytics', landlord: [false, false, true, true, true], tenant: [false, false] },
        { name: 'Cash Flow Tracking', landlord: [false, false, true, true, true], tenant: [false, false] },
        { name: 'Portfolio Metrics', landlord: [false, false, true, true, true], tenant: [false, false] },
        { name: 'Financial Insights', landlord: [false, false, true, true, true], tenant: [false, false] },
      ],
    },
    tenant: {
      label: 'Tenant Features',
      items: [
        { name: 'Application Tracking', landlord: [false, false, false, false, false], tenant: [true, true] },
        { name: 'Document Upload', landlord: [false, false, false, false, false], tenant: [true, true] },
        { name: 'Communication Tools', landlord: [false, false, false, false, false], tenant: [true, true] },
        { name: 'Profile Showcase', landlord: [false, false, false, false, false], tenant: [true, true] },
      ],
    },
    advanced: {
      label: 'Advanced Features',
      items: [
        { name: 'API Access', landlord: [false, false, true, false, true], tenant: [false, false] },
        { name: 'Custom Branding', landlord: [false, false, false, false, true], tenant: [false, false] },
        { name: 'Priority Support', landlord: [false, false, true, false, true], tenant: [false, true] },
      ],
    },
    addons: {
      label: 'Add-ons (Pay-per-use)',
      items: [
        { name: 'Background Checks', value: '$25 per check', note: 'Available to all landlords' },
      ],
    },
  };

  const renderCell = (value: any, isPricing: boolean = false, tooltip?: string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-600 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
      );
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const content = (
        <span className={isPricing ? 'font-semibold text-primary' : ''}>
          {value}
        </span>
      );
      
      if (tooltip) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted">
                  {content}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      
      return content;
    }
    return null;
  };

  // Check if any plans are deactivated (growth mode)
  const hasDeactivatedPlans = planStatus && Object.entries(planStatus).some(([_, isActive]) => !isActive);
  const deactivatedPlansList = planStatus ? Object.entries(planStatus)
    .filter(([_, isActive]) => !isActive)
    .map(([planId]) => {
      const planNames: Record<string, string> = {
        'pro': 'Pro',
        'analytics_tracking': 'Analytics & Tracking',
        'white_label': 'White Label',
        'basic': 'Basic',
        'tenant_pro': 'Tenant Pro'
      };
      return planNames[planId] || planId;
    }) : [];

  return (
    <div className="space-y-8">
      {hasDeactivatedPlans && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <Gift className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>🎉 Growth Mode Active:</strong> Deactivated plans are granting free feature access to all users.
            {deactivatedPlansList.length > 0 && (
              <span className="block mt-1">
                <strong>FREE features:</strong> {deactivatedPlansList.join(', ')}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {/* Landlord Plans Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">Landlord Plans Comparison</h2>
          <p className="text-muted-foreground">
            Compare features across all landlord subscription tiers
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Landlord Feature Matrix</CardTitle>
            <CardDescription>
              Detailed comparison of features available in each landlord plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px] sticky left-0 bg-background z-10">Feature</TableHead>
                    {plans.landlord.map((plan) => (
                      <TableHead key={plan.id} className="text-center min-w-[140px]">
                        <div className="space-y-1">
                          <div className="font-bold">{plan.name}</div>
                          <div className="text-xs text-muted-foreground">{plan.model}</div>
                          {plan.id === 'pro' && (
                            <Badge variant="default" className="text-xs">Popular</Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(features).map(([key, section]) => {
                    if (key === 'tenant' || key === 'addons') return null;
                    
                    return (
                      <>
                        <TableRow key={`${key}-header`} className="bg-muted/50">
                          <TableCell colSpan={6} className="font-semibold sticky left-0 bg-muted/50 z-10">
                            {section.label}
                          </TableCell>
                        </TableRow>
                        {section.items.map((item, idx) => (
                          <TableRow key={`${key}-${idx}`}>
                            <TableCell className="sticky left-0 bg-background z-10">{item.name}</TableCell>
                            {item.landlord?.map((value, planIdx) => (
                              <TableCell key={planIdx} className="text-center">
                                {renderCell(value, key === 'pricing', item.tooltip)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                  
                  {/* Add-ons Section */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={6} className="font-semibold sticky left-0 bg-muted/50 z-10">
                      {features.addons.label}
                    </TableCell>
                  </TableRow>
                  {features.addons.items.map((item, idx) => (
                    <TableRow key={`addon-${idx}`}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-2">
                              {item.name}
                              <DollarSign className="h-4 w-4 text-yellow-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{item.note}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell colSpan={5} className="text-center">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          {item.value}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Plans Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">Tenant Plans Comparison</h2>
          <p className="text-muted-foreground">
            Compare features across tenant subscription tiers
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Feature Matrix</CardTitle>
            <CardDescription>
              Detailed comparison of features available in each tenant plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Feature</TableHead>
                    {plans.tenant.map((plan) => (
                      <TableHead key={plan.id} className="text-center min-w-[180px]">
                        <div className="space-y-1">
                          <div className="font-bold">{plan.name}</div>
                          <div className="text-xs text-muted-foreground">{plan.model}</div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-semibold">
                      Pricing
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Price</TableCell>
                    {plans.tenant.map((plan) => (
                      <TableCell key={plan.id} className="text-center font-semibold text-primary">
                        {plan.price}
                      </TableCell>
                    ))}
                  </TableRow>

                  {Object.entries(features).map(([key, section]) => {
                    if (key === 'pricing' || key === 'management' || key === 'analytics' || key === 'addons') return null;
                    if (!section.items.some(item => item.tenant)) return null;

                    return (
                      <>
                        <TableRow key={`${key}-header`} className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold">
                            {section.label}
                          </TableCell>
                        </TableRow>
                        {section.items.map((item, idx) => {
                          if (!item.tenant) return null;
                          return (
                            <TableRow key={`${key}-${idx}`}>
                              <TableCell>{item.name}</TableCell>
                              {item.tenant.map((value, planIdx) => (
                                <TableCell key={planIdx} className="text-center">
                                  {renderCell(value)}
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Notes */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>• <strong>🎁 Free landlords get 10 FREE management units</strong> - Try all management features before upgrading!</p>
          <p>• <strong>Applications are always free</strong> - All landlords can view tenant applications regardless of plan</p>
          <p>• <strong>Background checks</strong> - $25 per check, available to all landlords as a pay-per-use service</p>
          <p>• <strong>Per-unit pricing</strong> - Basic and Pro plans charge per property unit managed</p>
          <p>• <strong>Analytics & Tracking</strong> - View-only plan for investors, no management features included</p>
          <p>• <strong>White Label</strong> - Full customization and branding control, includes all features</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureMatrix;
