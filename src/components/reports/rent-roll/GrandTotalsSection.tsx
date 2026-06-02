import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RentRollSummary } from '@/hooks/useRentRollData';

interface GrandTotalsSectionProps {
  summary: RentRollSummary;
}

export const GrandTotalsSection: React.FC<GrandTotalsSectionProps> = ({ summary }) => {
  const netRent = summary.total_market_rent + summary.total_recurring_charges - summary.total_recurring_credits;
  const totalBalance = summary.total_balance_due + summary.total_deposits + summary.total_prepayments;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grand totals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Occupancy Metrics */}
          <div>
            <h4 className="font-semibold mb-2">Occupancy</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Total units:</span>
                <span className="font-medium">{summary.total_units.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Occupied units:</span>
                <span className="font-medium">{summary.occupied_units.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Vacant units:</span>
                <span className="font-medium">{(summary.total_units - summary.occupied_units).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Occupancy rate:</span>
                <span className="font-medium">{summary.occupancy_rate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div>
            <h4 className="font-semibold mb-2">Financial Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Market rent:</span>
                <span className="font-medium">${summary.total_market_rent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Actual rent:</span>
                <span className="font-medium">${summary.total_actual_rent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Recurring charges:</span>
                <span className="font-medium">${summary.total_recurring_charges.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Recurring credits:</span>
                <span className="font-medium text-destructive">-${summary.total_recurring_credits.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Net rent:</span>
                <span>${netRent.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Balance Summary */}
          <div>
            <h4 className="font-semibold mb-2">Balance Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Balance due:</span>
                <span className={`font-medium ${summary.total_balance_due < 0 ? 'text-green-600' : summary.total_balance_due > 0 ? 'text-destructive' : ''}`}>
                  ${summary.total_balance_due.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Deposits held:</span>
                <span className="font-medium">${summary.total_deposits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Prepayments:</span>
                <span className="font-medium">${summary.total_prepayments.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total balance:</span>
                <span className={totalBalance < 0 ? 'text-green-600' : totalBalance > 0 ? 'text-destructive' : ''}>
                  ${totalBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};