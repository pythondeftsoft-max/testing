import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Edit3
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface PropertyFinancialMetricsProps {
  property: any;
  onEdit?: () => void;
  compact?: boolean;
}

export const PropertyFinancialMetrics = ({ 
  property, 
  onEdit, 
  compact = false 
}: PropertyFinancialMetricsProps) => {
  // Calculate financial metrics from property data
  const monthlyRent = property.monthly_rent || 0;
  const monthlyExpenses = (
    (property.insurance_cost || 0) +
    (property.mortgage_cost || 0) +
    (property.management_fee || 0) +
    (property.repair_costs || 0)
  );
  
  const netOperatingIncome = monthlyRent - monthlyExpenses;
  const grossYield = property.purchase_price > 0 
    ? (monthlyRent * 12) / property.purchase_price * 100 
    : 0;

  // Financial health indicators
  const getFinancialHealth = () => {
    if (netOperatingIncome > monthlyRent * 0.3) return { status: 'excellent', color: 'success' };
    if (netOperatingIncome > 0) return { status: 'good', color: 'warning' };
    return { status: 'poor', color: 'destructive' };
  };

  const healthStatus = getFinancialHealth();

  // Check for missing financial data
  const hasCompleteFinancials = monthlyRent > 0 && monthlyExpenses > 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Net Income</span>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${netOperatingIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(netOperatingIncome)}
            </span>
            {netOperatingIncome >= 0 ? 
              <TrendingUp className="w-4 h-4 text-success" /> : 
              <TrendingDown className="w-4 h-4 text-destructive" />
            }
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Financial Health</span>
          <Badge variant={healthStatus.color as any} className="text-xs">
            {hasCompleteFinancials ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                {healthStatus.status}
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Incomplete
              </>
            )}
          </Badge>
        </div>

        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} className="w-full">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Financials
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Financial Metrics
          </CardTitle>
          <Badge variant={healthStatus.color as any}>
            {hasCompleteFinancials ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                {healthStatus.status}
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-1" />
                Incomplete Data
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Monthly Rent</div>
            <div className="font-bold text-lg text-primary">{formatCurrency(monthlyRent)}</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Monthly Expenses</div>
            <div className="font-bold text-lg text-orange-600">{formatCurrency(monthlyExpenses)}</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Net Income</div>
            <div className={`font-bold text-lg flex items-center justify-center gap-1 ${
              netOperatingIncome >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(netOperatingIncome)}
              {netOperatingIncome >= 0 ? 
                <TrendingUp className="w-4 h-4" /> : 
                <TrendingDown className="w-4 h-4" />
              }
            </div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
            <div className={`font-bold text-lg ${
              (property.current_balance_due || 0) > 0 ? 'text-destructive' : 'text-success'
            }`}>
              {formatCurrency(property.current_balance_due || 0)}
            </div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Gross Yield</div>
            <div className="font-bold text-lg text-blue-600">{formatPercentage(grossYield)}</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        {hasCompleteFinancials && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-sm text-muted-foreground">Expense Breakdown</h4>
            <div className="space-y-1 text-sm">
              {property.insurance_cost > 0 && (
                <div className="flex justify-between">
                  <span>Insurance</span>
                  <span>{formatCurrency(property.insurance_cost)}</span>
                </div>
              )}
              {property.mortgage_cost > 0 && (
                <div className="flex justify-between">
                  <span>Mortgage/Interest</span>
                  <span>{formatCurrency(property.mortgage_cost)}</span>
                </div>
              )}
              {property.management_fee > 0 && (
                <div className="flex justify-between">
                  <span>Management Fee</span>
                  <span>{formatCurrency(property.management_fee)}</span>
                </div>
              )}
              {property.repair_costs > 0 && (
                <div className="flex justify-between">
                  <span>Maintenance & Repairs</span>
                  <span>{formatCurrency(property.repair_costs)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
              <Edit3 className="w-4 h-4 mr-2" />
              {hasCompleteFinancials ? 'Update Financials' : 'Add Financial Data'}
            </Button>
          )}
        </div>

        {!hasCompleteFinancials && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-warning">Missing Financial Data</div>
                <div className="text-muted-foreground mt-1">
                  Complete financial information to see accurate trial balance reports and metrics.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};