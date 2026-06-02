import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Home, CreditCard, CheckCircle2, Landmark } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentKPICardsProps {
  totalCollected: number;
  unitsPaid: number;
  totalUnits: number;
  viaOpenKey: number;
  hapPortion: number;
  tenantPortion: number;
  totalExpected: number;
  expectedHap: number;
  expectedStripeTenant: number;
  expectedExternalTenant: number;
  propertiesAccountedFor: number;
  totalProperties: number;
  amountAccountedFor: number;
  loading?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const PaymentKPICards = ({
  totalCollected,
  unitsPaid,
  totalUnits,
  viaOpenKey,
  hapPortion,
  tenantPortion,
  totalExpected,
  expectedStripeTenant,
  propertiesAccountedFor,
  totalProperties,
  amountAccountedFor,
  loading,
}: PaymentKPICardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className={i === 2 ? 'lg:col-span-2' : ''}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const standardCards = [
    {
      title: 'Total Collected',
      value: formatCurrency(totalCollected),
      subtitle: `of ${formatCurrency(totalExpected)} expected`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Units Paid',
      value: `${unitsPaid}/${totalUnits}`,
      subtitle: `occupied units`,
      icon: Home,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  const trailingCards = [
    {
      title: 'Via OpenKey',
      value: `${formatCurrency(expectedStripeTenant)} / ${formatCurrency(totalExpected)}`,
      subtitle: `Collected: ${formatCurrency(viaOpenKey)}`,
      icon: CreditCard,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Accounted For',
      value: `${propertiesAccountedFor}/${totalProperties} units`,
      subtitle: `${formatCurrency(amountAccountedFor)} / ${formatCurrency(totalExpected)}`,
      icon: CheckCircle2,
      color: propertiesAccountedFor > 0 ? 'text-emerald-500' : 'text-muted-foreground',
      bgColor: propertiesAccountedFor > 0 ? 'bg-emerald-500/10' : 'bg-muted/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* First 2 standard cards */}
      {standardCards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
            </div>
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}

      {/* Plaid Tagged - Combined HAP & Tenant Widget (spans 2 columns) */}
      <Card className="overflow-hidden lg:col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-violet-500/10">
              <Landmark className="h-4 w-4 text-violet-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Plaid Tagged</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* HAP Section */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">HAP Portion</p>
              <p className="text-lg font-bold text-violet-500">
                {formatCurrency(hapPortion)} / {formatCurrency(totalExpected)}
              </p>
              <p className="text-xs text-muted-foreground">Tracked: {formatCurrency(hapPortion)}</p>
            </div>
            
            {/* Tenant Section */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tenant Portion</p>
              <p className="text-lg font-bold text-cyan-500">
                {formatCurrency(tenantPortion)} / {formatCurrency(totalExpected)}
              </p>
              <p className="text-xs text-muted-foreground">Tracked: {formatCurrency(tenantPortion)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trailing cards */}
      {trailingCards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
            </div>
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
