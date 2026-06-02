import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign } from 'lucide-react';

const mockContracts = [
  { vendor: 'Vendor A', service: 'HVAC Maintenance', startDate: '2024-01-01', endDate: '2025-12-31', value: 48000, status: 'active' },
  { vendor: 'Vendor B', service: 'Landscaping', startDate: '2024-03-01', endDate: '2025-02-28', value: 24000, status: 'active' },
  { vendor: 'Vendor C', service: 'Plumbing Services', startDate: '2024-01-01', endDate: '2024-12-31', value: 36000, status: 'expiring' },
  { vendor: 'Vendor D', service: 'Electrical Services', startDate: '2024-06-01', endDate: '2025-05-31', value: 42000, status: 'active' },
];

export const VendorContractManagementPanel: React.FC = () => {
  const totalValue = mockContracts.reduce((sum, c) => sum + c.value, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Contract Management</h3>
        <Badge variant="outline">${(totalValue / 1000).toFixed(0)}K Total</Badge>
      </div>

      <div className="space-y-3">
        {mockContracts.map((contract, index) => (
          <div key={index} className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{contract.vendor}</span>
              </div>
              <Badge variant={contract.status === 'expiring' ? 'destructive' : 'default'}>
                {contract.status}
              </Badge>
            </div>
            
            <p className="text-sm font-medium mb-2">{contract.service}</p>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">${(contract.value / 1000).toFixed(0)}K/year</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
