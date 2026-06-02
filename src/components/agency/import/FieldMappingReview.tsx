import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EntityType } from './EntitySelector';

interface FieldMapping {
  csvHeader: string;
  mappedField: string;
  confidence: number;
}

interface FieldMappingReviewProps {
  csvHeaders: string[];
  entityType: EntityType;
  onConfirm: (mappings: Record<string, string>) => void;
  onBack: () => void;
}

const ENTITY_FIELDS: Record<EntityType, { value: string; label: string }[]> = {
  tenants: [
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'full_name', label: 'Full Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'household_size', label: 'Household Size' },
    { value: 'annual_income', label: 'Annual Income' },
    { value: 'date_of_birth', label: 'Date of Birth' },
    { value: 'ssn_last4', label: 'SSN Last 4' },
    { value: 'notes', label: 'Notes' },
  ],
  vouchers: [
    { value: 'voucher_number', label: 'Voucher Number' },
    { value: 'tenant_email', label: 'Tenant Email' },
    { value: 'voucher_type', label: 'Voucher Type' },
    { value: 'amount', label: 'Amount' },
    { value: 'status', label: 'Status' },
    { value: 'issued_at', label: 'Issue Date' },
    { value: 'expires_at', label: 'Expiration Date' },
    { value: 'notes', label: 'Notes' },
  ],
  waitlist: [
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'full_name', label: 'Full Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'household_size', label: 'Household Size' },
    { value: 'annual_income', label: 'Annual Income' },
    { value: 'waitlist_position', label: 'Waitlist Position' },
    { value: 'priority_level', label: 'Priority Level' },
    { value: 'preference_points', label: 'Preference Points' },
    { value: 'application_date', label: 'Application Date' },
    { value: 'notes', label: 'Notes' },
  ],
  landlords: [
    { value: 'landlord_name', label: 'Landlord Name' },
    { value: 'landlord_email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'properties_count', label: 'Properties Count' },
    { value: 'payment_method', label: 'Payment Method' },
    { value: 'notes', label: 'Notes' },
  ],
  placements: [
    { value: 'tenant_email', label: 'Tenant Email' },
    { value: 'property_address', label: 'Property Address' },
    { value: 'unit_number', label: 'Unit Number' },
    { value: 'lease_start', label: 'Lease Start' },
    { value: 'lease_end', label: 'Lease End' },
    { value: 'monthly_rent', label: 'Monthly Rent' },
    { value: 'hap_amount', label: 'HAP Amount' },
    { value: 'tenant_portion', label: 'Tenant Portion' },
    { value: 'notes', label: 'Notes' },
  ],
  hap_history: [
    { value: 'payment_date', label: 'Payment Date' },
    { value: 'hap_amount', label: 'HAP Amount' },
    { value: 'tenant_portion', label: 'Tenant Portion' },
    { value: 'gross_rent', label: 'Gross Rent' },
    { value: 'landlord_email', label: 'Landlord Email' },
    { value: 'landlord_name_text', label: 'Landlord Name' },
    { value: 'tenant_name_text', label: 'Tenant Name' },
    { value: 'unit_address', label: 'Unit Address' },
    { value: 'contract_number', label: 'Contract Number' },
    { value: 'payment_method', label: 'Payment Method' },
    { value: 'source_reference', label: 'Source Reference / Check #' },
    { value: 'source_external_id', label: 'External ID (for dedupe)' },
    { value: 'notes', label: 'Notes' },
  ],
  bulk_documents: [],
};

const FieldMappingReview: React.FC<FieldMappingReviewProps> = ({ csvHeaders, entityType, onConfirm, onBack }) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [aiUsed, setAiUsed] = useState(false);

  const standardFields = ENTITY_FIELDS[entityType];

  useEffect(() => {
    const fetchAiMappings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-field-mapping', {
          body: { csvHeaders, entityType },
        });
        if (!error && data?.mappings?.length) {
          const mapped: Record<string, string> = {};
          data.mappings.forEach((m: FieldMapping) => {
            if (standardFields.some(f => f.value === m.mappedField) && m.confidence >= 0.7) {
              mapped[m.csvHeader] = m.mappedField;
            }
          });
          setMappings(mapped);
          setAiUsed(true);
        }
      } catch {
        // fallback to manual
      }
      setLoading(false);
    };
    fetchAiMappings();
  }, [csvHeaders, entityType]);

  const handleChange = (csvHeader: string, value: string) => {
    setMappings(prev => {
      const next = { ...prev };
      if (value === '_skip') {
        delete next[csvHeader];
      } else {
        next[csvHeader] = value;
      }
      return next;
    });
  };

  const mappedCount = Object.keys(mappings).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI is analyzing your columns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {aiUsed ? <Brain className="w-4 h-4 text-primary" /> : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm">
            {aiUsed ? `AI mapped ${mappedCount} of ${csvHeaders.length} columns` : 'Map your columns manually'}
          </span>
        </div>
        <Badge variant="secondary">{mappedCount} mapped</Badge>
      </div>

      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 text-left font-medium">CSV Column</th>
              <th className="p-2 text-left font-medium">Maps To</th>
              <th className="p-2 text-left font-medium w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {csvHeaders.map(header => (
              <tr key={header} className="border-t">
                <td className="p-2 font-mono text-xs">{header}</td>
                <td className="p-2">
                  <Select value={mappings[header] || '_skip'} onValueChange={v => handleChange(header, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Skip this column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">— Skip —</SelectItem>
                      {standardFields.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  {mappings[header] ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Skipped</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={() => onConfirm(mappings)} disabled={mappedCount === 0}>
          Continue with {mappedCount} fields
        </Button>
      </div>
    </div>
  );
};

export default FieldMappingReview;
