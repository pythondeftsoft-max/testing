import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UnitLeaseFinancialProps {
  formData: {
    security_deposit: string;
    lease_start_date: string;
    lease_end_date: string;
  };
  updateFormData: (field: string, value: string) => void;
}

export const UnitLeaseFinancial: React.FC<UnitLeaseFinancialProps> = ({
  formData,
  updateFormData,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lease & Financial Details</CardTitle>
          <CardDescription>
            Security deposit and lease term information for the unit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="security_deposit">Security Deposit</Label>
            <Input
              id="security_deposit"
              type="number"
              step="0.01"
              value={formData.security_deposit}
              onChange={(e) => updateFormData('security_deposit', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lease_start_date">Lease Start Date</Label>
              <Input
                id="lease_start_date"
                type="date"
                value={formData.lease_start_date}
                onChange={(e) => updateFormData('lease_start_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lease_end_date">Lease End Date</Label>
              <Input
                id="lease_end_date"
                type="date"
                value={formData.lease_end_date}
                onChange={(e) => updateFormData('lease_end_date', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};