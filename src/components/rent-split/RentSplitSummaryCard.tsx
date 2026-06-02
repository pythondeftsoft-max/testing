import { Building2, DollarSign, Edit3, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface Property {
  id: string;
  address: string;
  monthly_rent?: number;
  portfolio_id?: string;
  portfolio_name?: string;
  rent_splits?: Array<{
    total_rent: number;
    pha_portion: number;
    tenant_portion: number;
    voucher_type: string;
  }>;
}

interface RentSplitSummaryCardProps {
  property: Property | null;
  onEditRentSplit: (property: Property) => void;
  onSendPayment: (property: Property) => void;
  onRefresh: () => void;
}

export const RentSplitSummaryCard = ({
  property,
  onEditRentSplit,
  onSendPayment,
  onRefresh,
}: RentSplitSummaryCardProps) => {
  if (!property) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Property</h3>
          <p className="text-muted-foreground">
            Choose a property from the list to view and manage rent splits
          </p>
        </div>
      </div>
    );
  }

  const rentSplit = property.rent_splits?.[0];
  const hasRentSplit = rentSplit && rentSplit.total_rent > 0;

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{property.address}</h3>
          {property.portfolio_name && (
            <Badge variant="secondary" className="mt-2">
              {property.portfolio_name}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditRentSplit(property)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {hasRentSplit ? 'Edit Split' : 'Set Split'}
          </Button>
          {hasRentSplit && (
            <Button
              size="sm"
              onClick={() => onSendPayment(property)}
            >
              <Send className="h-4 w-4 mr-2" />
              Send HAP
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {hasRentSplit ? (
          <>
            {/* Rent Split Overview */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Rent Split Overview</h4>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Rent</p>
                        <p className="text-lg font-semibold">
                          <CurrencyDisplay amount={rentSplit.total_rent} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">HAP Portion</p>
                        <p className="text-lg font-semibold text-blue-700">
                          <CurrencyDisplay amount={rentSplit.pha_portion} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tenant Portion</p>
                        <p className="text-lg font-semibold text-green-700">
                          <CurrencyDisplay amount={rentSplit.tenant_portion} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Voucher Type</span>
                  <Badge variant="outline">{rentSplit.voucher_type || 'Standard'}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">HAP Percentage</span>
                  <span className="text-sm font-medium">
                    {((rentSplit.pha_portion / rentSplit.total_rent) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Tenant Percentage</span>
                  <span className="text-sm font-medium">
                    {((rentSplit.tenant_portion / rentSplit.total_rent) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">No Rent Split Configured</h4>
              <p className="text-muted-foreground mb-4">
                Set up payment allocation to manage HAP and tenant portions
              </p>
              <Button onClick={() => onEditRentSplit(property)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Configure Split
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};