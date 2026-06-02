import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import type { OcrDocType, PaystubExtraction, LeaseExtraction } from '@/hooks/useDocumentOcr';

interface OcrReviewPanelProps {
  docType: OcrDocType;
  data: PaystubExtraction | LeaseExtraction;
  onCommit: (data: any) => void;
  onDiscard: () => void;
}

const ConfidenceBadge: React.FC<{ level?: 'high' | 'medium' | 'low' }> = ({ level }) => {
  if (!level) return null;
  const variant =
    level === 'high' ? 'default' : level === 'medium' ? 'secondary' : 'destructive';
  return <Badge variant={variant} className="text-[10px] uppercase">{level}</Badge>;
};

export const OcrReviewPanel: React.FC<OcrReviewPanelProps> = ({
  docType,
  data,
  onCommit,
  onDiscard,
}) => {
  const [edited, setEdited] = useState<any>(data);

  useEffect(() => setEdited(data), [data]);

  const update = (key: string, value: any) => {
    setEdited((prev: any) => ({ ...prev, [key]: value }));
  };

  const renderField = (
    key: string,
    label: string,
    type: 'text' | 'number' | 'date' = 'text',
  ) => {
    const conf = data.confidence?.[key as keyof typeof data.confidence];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={key} className="text-xs">
            {label}
          </Label>
          <ConfidenceBadge level={conf as any} />
        </div>
        <Input
          id={key}
          type={type}
          value={edited[key] ?? ''}
          onChange={(e) =>
            update(
              key,
              type === 'number' ? Number(e.target.value) : e.target.value,
            )
          }
        />
      </div>
    );
  };

  return (
    <Card className="border-primary/30 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Review extracted data
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Verify the values before applying. Confidence badges flag fields that may need correction.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.warnings && data.warnings.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
            {data.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {docType === 'paystub' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {renderField('employer_name', 'Employer')}
            {renderField('employee_name', 'Employee')}
            {renderField('gross_pay', 'Gross pay (this period)', 'number')}
            {renderField('net_pay', 'Net pay (this period)', 'number')}
            {renderField('ytd_gross', 'YTD gross', 'number')}
            {renderField('ytd_net', 'YTD net', 'number')}
            {renderField('pay_frequency', 'Pay frequency')}
            {renderField('pay_date', 'Pay date', 'date')}
            <div className="sm:col-span-2 rounded-md border border-primary/40 bg-primary/5 p-3 flex items-center justify-between">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Annualized estimate</Label>
                <p className="text-xl font-semibold text-foreground">
                  ${Number(edited.annual_gross_estimate || 0).toLocaleString()}
                </p>
              </div>
              <Input
                type="number"
                value={edited.annual_gross_estimate ?? 0}
                onChange={(e) => update('annual_gross_estimate', Number(e.target.value))}
                className="w-40"
              />
            </div>
          </div>
        )}

        {docType === 'lease' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {renderField('landlord_name', 'Landlord')}
            {renderField('property_address', 'Property address')}
            {renderField('unit_number', 'Unit')}
            {renderField('city', 'City')}
            {renderField('state', 'State')}
            {renderField('zip', 'ZIP')}
            {renderField('monthly_rent', 'Monthly rent', 'number')}
            {renderField('security_deposit', 'Security deposit', 'number')}
            {renderField('lease_start_date', 'Lease start', 'date')}
            {renderField('lease_end_date', 'Lease end', 'date')}
            {renderField('term_months', 'Term (months)', 'number')}
            {renderField('bedroom_count', 'Bedrooms', 'number')}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onDiscard}>Discard</Button>
          <Button onClick={() => onCommit(edited)}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Apply to form
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OcrReviewPanel;
