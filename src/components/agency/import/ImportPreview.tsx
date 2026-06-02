import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { EntityType } from './EntitySelector';

interface ImportPreviewProps {
  entityType: EntityType;
  rows: Record<string, string>[];
  mappings: Record<string, string>;
  onConfirm: () => void;
  onBack: () => void;
}

const REQUIRED_FIELDS: Record<EntityType, string[]> = {
  tenants: ['email'],
  vouchers: ['voucher_number', 'tenant_email'],
  waitlist: ['email', 'first_name'],
  landlords: ['landlord_name', 'landlord_email'],
  placements: ['tenant_email', 'property_address'],
  hap_history: ['payment_date', 'hap_amount'],
  bulk_documents: [],
};

const ImportPreview: React.FC<ImportPreviewProps> = ({ entityType, rows, mappings, onConfirm, onBack }) => {
  const reverseMappings = useMemo(() => {
    const rm: Record<string, string> = {};
    Object.entries(mappings).forEach(([csv, field]) => { rm[field] = csv; });
    return rm;
  }, [mappings]);

  const mappedFields = Object.values(mappings);
  const required = REQUIRED_FIELDS[entityType];

  const missingRequired = required.filter(f => !mappedFields.includes(f));

  const validationResults = useMemo(() => {
    return rows.map((row, i) => {
      const issues: string[] = [];
      required.forEach(f => {
        const csvCol = reverseMappings[f];
        if (csvCol && !row[csvCol]?.trim()) {
          issues.push(`Missing ${f}`);
        }
      });
      return { row: i, issues };
    });
  }, [rows, reverseMappings, required]);

  const errorCount = validationResults.filter(v => v.issues.length > 0).length;
  const validCount = rows.length - errorCount;

  const previewRows = rows.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={errorCount > 0 ? 'destructive' : 'default'}>
            {validCount} valid
          </Badge>
          {errorCount > 0 && (
            <Badge variant="outline" className="text-destructive">
              {errorCount} with issues
            </Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{rows.length} total rows</span>
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Missing required mappings:</p>
            <p className="text-muted-foreground">{missingRequired.join(', ')}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 text-left w-8">#</th>
              {mappedFields.map(f => (
                <th key={f} className="p-2 text-left font-medium">
                  {f.replace(/_/g, ' ')}
                  {required.includes(f) && <span className="text-destructive ml-1">*</span>}
                </th>
              ))}
              <th className="p-2 text-left w-8">✓</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => {
              const validation = validationResults[i];
              return (
                <tr key={i} className={`border-t ${validation.issues.length > 0 ? 'bg-destructive/5' : ''}`}>
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  {mappedFields.map(f => {
                    const csvCol = reverseMappings[f];
                    return <td key={f} className="p-2">{csvCol ? row[csvCol] || '' : ''}</td>;
                  })}
                  <td className="p-2">
                    {validation.issues.length > 0 ? (
                      <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <p className="text-xs text-muted-foreground text-center">Showing first 10 of {rows.length} rows</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onConfirm} disabled={missingRequired.length > 0}>
          Import {validCount} records
        </Button>
      </div>
    </div>
  );
};

export default ImportPreview;
