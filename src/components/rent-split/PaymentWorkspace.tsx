import { useState } from 'react';
import { PropertySelector } from './PropertySelector';
import { PaymentSummaryCard } from './PaymentSummaryCard';

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

interface PaymentWorkspaceProps {
  properties: Property[];
  loading: boolean;
  onSendPayment: (property: Property, amount?: number, recipientName?: string) => void;
  userId: string;
}

export const PaymentWorkspace = ({
  properties,
  loading,
  onSendPayment,
  userId,
}: PaymentWorkspaceProps) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  if (loading) {
    return (
      <div className="flex h-96">
        <div className="w-80 border-r border-border bg-muted/30 p-4 animate-pulse">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-96 border border-border rounded-lg overflow-hidden bg-card">
      <PropertySelector
        properties={properties}
        selectedProperty={selectedProperty}
        onPropertySelect={setSelectedProperty}
      />
      
      <div className="flex-1 flex flex-col">
        <PaymentSummaryCard
          property={selectedProperty}
          onSendPayment={onSendPayment}
          userId={userId}
        />
      </div>
    </div>
  );
};