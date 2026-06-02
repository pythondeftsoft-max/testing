import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, TrendingDown, FileText } from 'lucide-react';

const mockClaims = [
  { type: 'Property Damage', count: 5, amount: 45000, status: 'resolved', trend: 'down' },
  { type: 'Liability', count: 3, amount: 32000, status: 'pending', trend: 'stable' },
  { type: 'Weather Related', count: 4, amount: 28000, status: 'resolved', trend: 'down' },
  { type: 'Vandalism', count: 2, amount: 15000, status: 'in-review', trend: 'up' },
  { type: 'Equipment Failure', count: 1, amount: 5000, status: 'resolved', trend: 'down' },
];

export const InsuranceClaimsPanel: React.FC = () => {
  const totalClaims = mockClaims.reduce((sum, c) => sum + c.count, 0);
  const totalAmount = mockClaims.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Insurance Claims Analysis</h3>
        <Badge variant="outline">{totalClaims} Total Claims</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Claims</span>
          </div>
          <p className="text-2xl font-bold">{totalClaims}</p>
        </Card>
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Amount</span>
          </div>
          <p className="text-2xl font-bold">${(totalAmount / 1000).toFixed(0)}K</p>
        </Card>
      </div>

      <div className="space-y-3">
        {mockClaims.map((claim, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{claim.type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{claim.count} claims</span>
                <span>•</span>
                <span>${(claim.amount / 1000).toFixed(0)}K</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={claim.status === 'resolved' ? 'default' : 'secondary'}>
                {claim.status}
              </Badge>
              {claim.trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
              {claim.trend === 'up' && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
