import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Shield, ListOrdered, Building2, Home, DollarSign, FolderOpen } from 'lucide-react';

export type EntityType = 'tenants' | 'vouchers' | 'waitlist' | 'landlords' | 'placements' | 'hap_history' | 'bulk_documents';

interface EntitySelectorProps {
  onSelect: (type: EntityType) => void;
}

const entities: { type: EntityType; label: string; description: string; icon: React.ElementType }[] = [
  { type: 'tenants', label: 'Tenants', description: 'Name, email, household size, income data', icon: Users },
  { type: 'vouchers', label: 'Vouchers', description: 'Voucher numbers, types, amounts, tenant linkage', icon: Shield },
  { type: 'waitlist', label: 'Waitlist Applicants', description: 'Applicant roster with priority and preferences', icon: ListOrdered },
  { type: 'landlords', label: 'Landlords', description: 'Landlord names, emails, property counts', icon: Building2 },
  { type: 'placements', label: 'Placements', description: 'Lease records linking tenants to units', icon: Home },
  { type: 'hap_history', label: 'HAP Payment History', description: 'Historical HAP payments from your previous system', icon: DollarSign },
  { type: 'bulk_documents', label: 'Bulk Documents', description: 'Drop a folder of PDFs (W-9s, leases, verifications)', icon: FolderOpen },
];

const EntitySelector: React.FC<EntitySelectorProps> = ({ onSelect }) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Select the type of data you're importing:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map(e => (
          <Card
            key={e.type}
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => onSelect(e.type)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <e.icon className="w-4 h-4 text-primary" />
                {e.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">{e.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EntitySelector;
