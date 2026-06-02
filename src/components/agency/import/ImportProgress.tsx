import React, { useState, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EntityType } from './EntitySelector';

interface ImportProgressProps {
  agencyId: string;
  entityType: EntityType;
  rows: Record<string, string>[];
  mappings: Record<string, string>;
  onComplete: (result: ImportSummary) => void;
}

export interface ImportSummary {
  total: number;
  imported: number;
  matched: number;
  errors: string[];
}

const ImportProgress: React.FC<ImportProgressProps> = ({ agencyId, entityType, rows, mappings, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const started = useRef(false);

  const getField = (row: Record<string, string>, field: string): string => {
    const reverseMappings: Record<string, string> = {};
    Object.entries(mappings).forEach(([csv, f]) => { reverseMappings[f] = csv; });
    const csvCol = reverseMappings[field];
    return csvCol ? (row[csvCol] || '').trim() : '';
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      const res: ImportSummary = { total: rows.length, imported: 0, matched: 0, errors: [] };
      const user = (await supabase.auth.getUser()).data.user;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setCurrent(i + 1);
        setProgress(Math.round(((i + 1) / rows.length) * 100));

        try {
          switch (entityType) {
            case 'tenants': {
              const email = getField(row, 'email');
              const firstName = getField(row, 'first_name');
              const lastName = getField(row, 'last_name');
              const fullName = getField(row, 'full_name');
              const sourceId = getField(row, 'source_external_id') || null;
              const name = fullName || `${firstName} ${lastName}`.trim();
              if (!email && !name) { res.errors.push(`Row ${i + 1}: Missing email/name`); continue; }
              if (sourceId) {
                const { data: existingBySource } = await supabase.from('voucher_applications').select('id').eq('agency_id', agencyId).eq('source_external_id', sourceId).maybeSingle();
                if (existingBySource) { res.matched++; continue; }
              }
              if (email) {
                const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
                if (existing) { res.matched++; continue; }
              }
              const { error } = await supabase.from('voucher_applications').insert({
                agency_id: agencyId,
                first_name: firstName || name.split(' ')[0] || 'Unknown',
                last_name: lastName || name.split(' ').slice(1).join(' ') || '',
                email: email || 'imported@placeholder.com',
                household_size: parseInt(getField(row, 'household_size') || '1') || 1,
                annual_income: parseFloat(getField(row, 'annual_income') || '0') || null,
                status: 'imported',
                source_external_id: sourceId,
                notes: `Imported ${new Date().toLocaleDateString()}`,
              } as any);
              if (error) res.errors.push(`Row ${i + 1}: ${error.message}`); else res.imported++;
              break;
            }
            case 'vouchers': {
              const voucherNum = getField(row, 'voucher_number');
              const tenantEmail = getField(row, 'tenant_email');
              if (!voucherNum) { res.errors.push(`Row ${i + 1}: Missing voucher number`); continue; }
              let tenantId: string | null = null;
              if (tenantEmail) {
                const { data } = await supabase.from('profiles').select('id').eq('email', tenantEmail).maybeSingle();
                tenantId = data?.id || null;
              }
              if (!tenantId) { res.errors.push(`Row ${i + 1}: No user for ${tenantEmail}`); continue; }
              const { error } = await supabase.from('agency_vouchers').insert({
                agency_id: agencyId, tenant_id: tenantId, voucher_number: voucherNum,
                voucher_type: getField(row, 'voucher_type') || 'HCV',
                status: (getField(row, 'status') || 'issued') as any,
                amount: parseFloat(getField(row, 'amount') || '0') || null,
                notes: 'Imported from CSV',
              } as any);
              if (error) res.errors.push(`Row ${i + 1}: ${error.message}`); else res.imported++;
              break;
            }
            case 'waitlist': {
              const email = getField(row, 'email');
              const firstName = getField(row, 'first_name') || getField(row, 'full_name').split(' ')[0] || 'Unknown';
              const lastName = getField(row, 'last_name') || getField(row, 'full_name').split(' ').slice(1).join(' ') || '';
              const { error } = await supabase.from('voucher_applications').insert({
                agency_id: agencyId,
                first_name: firstName, last_name: lastName,
                email: email || 'imported@placeholder.com',
                household_size: parseInt(getField(row, 'household_size') || '1') || 1,
                annual_income: parseFloat(getField(row, 'annual_income') || '0') || null,
                status: 'waitlisted',
                waitlist_position: parseInt(getField(row, 'waitlist_position') || '0') || null,
                priority_level: getField(row, 'priority_level') || null,
                preference_points: parseInt(getField(row, 'preference_points') || '0') || 0,
                notes: `Imported ${new Date().toLocaleDateString()}`,
              } as any);
              if (error) res.errors.push(`Row ${i + 1}: ${error.message}`); else res.imported++;
              break;
            }
            case 'landlords': {
              const name = getField(row, 'landlord_name');
              const email = getField(row, 'landlord_email');
              const sourceId = getField(row, 'source_external_id') || null;
              if (!name || !email) { res.errors.push(`Row ${i + 1}: Missing name/email`); continue; }
              if (sourceId) {
                const { data: bySource } = await supabase.from('agency_landlords').select('id').eq('agency_id', agencyId).eq('source_external_id', sourceId).maybeSingle();
                if (bySource) { res.matched++; continue; }
              }
              const { data: existing } = await supabase.from('agency_landlords').select('id').eq('agency_id', agencyId).eq('landlord_email', email).maybeSingle();
              if (existing) { res.matched++; continue; }
              const { error } = await supabase.from('agency_landlords').insert({
                agency_id: agencyId, landlord_name: name, landlord_email: email,
                properties_count: parseInt(getField(row, 'properties_count') || '0') || 0,
                payment_method: (getField(row, 'payment_method') || 'check') as any,
                source_external_id: sourceId,
                notes: getField(row, 'notes') || 'Imported from CSV',
              } as any);
              if (error) res.errors.push(`Row ${i + 1}: ${error.message}`); else res.imported++;
              break;
            }
            case 'placements': {
              const tenantEmail = getField(row, 'tenant_email');
              const address = getField(row, 'property_address');
              if (!tenantEmail || !address) { res.errors.push(`Row ${i + 1}: Missing tenant email/address`); continue; }
              const { data: tenant } = await supabase.from('profiles').select('id').eq('email', tenantEmail).maybeSingle();
              if (!tenant) { res.errors.push(`Row ${i + 1}: No user for ${tenantEmail}`); continue; }
              const { error } = await supabase.from('tenant_leases').insert({
                tenant_id: tenant.id, agency_id: agencyId,
                property_address: address,
                unit_number: getField(row, 'unit_number') || null,
                lease_start: getField(row, 'lease_start') || new Date().toISOString().split('T')[0],
                lease_end: getField(row, 'lease_end') || null,
                monthly_rent: parseFloat(getField(row, 'monthly_rent') || '0') || null,
                hap_amount: parseFloat(getField(row, 'hap_amount') || '0') || null,
                tenant_portion: parseFloat(getField(row, 'tenant_portion') || '0') || null,
                status: 'active',
              } as any);
              if (error) res.errors.push(`Row ${i + 1}: ${error.message}`); else res.imported++;
              break;
            }
            case 'hap_history': {
              const payDate = getField(row, 'payment_date');
              const hapAmount = parseFloat(getField(row, 'hap_amount') || '0');
              const sourceId = getField(row, 'source_external_id') || null;
              if (!payDate || !hapAmount) { res.errors.push(`Row ${i + 1}: Missing payment_date/hap_amount`); continue; }
              if (sourceId) {
                const { data: bySource } = await supabase.from('agency_hap_payments_legacy' as any).select('id').eq('agency_id', agencyId).eq('source_external_id', sourceId).maybeSingle();
                if (bySource) { res.matched++; continue; }
              }
              const llEmail = getField(row, 'landlord_email');
              let llId: string | null = null;
              if (llEmail) {
                const { data: ll } = await supabase.from('agency_landlords').select('id').eq('agency_id', agencyId).eq('landlord_email', llEmail).maybeSingle();
                llId = ll?.id || null;
              }
              const { error } = await supabase.from('agency_hap_payments_legacy' as any).insert({
                agency_id: agencyId,
                landlord_id: llId,
                landlord_name_text: getField(row, 'landlord_name_text') || null,
                tenant_name_text: getField(row, 'tenant_name_text') || null,
                unit_address: getField(row, 'unit_address') || null,
                contract_number: getField(row, 'contract_number') || null,
                payment_date: payDate,
                gross_rent: parseFloat(getField(row, 'gross_rent') || '0') || null,
                hap_amount: hapAmount,
                tenant_portion: parseFloat(getField(row, 'tenant_portion') || '0') || null,
                payment_method: getField(row, 'payment_method') || null,
                source_reference: getField(row, 'source_reference') || null,
                source_external_id: sourceId,
                notes: getField(row, 'notes') || null,
              } as any);
              if (error) res.errors.push(`Row ${i + 1}: ${error.message}`); else res.imported++;
              break;
            }
            case 'bulk_documents': {
              // handled via dedicated component, not CSV
              break;
            }
          }
        } catch (err: any) {
          res.errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }

      // Log activity
      await supabase.from('agency_activity_log').insert({
        entity_type: 'import', entity_id: crypto.randomUUID(),
        action: `imported_${entityType}`, actor_id: user?.id, agency_id: agencyId,
        metadata: { total: res.total, imported: res.imported, matched: res.matched, errors_count: res.errors.length },
      } as any);

      setResult(res);
      onComplete(res);
      toast.success(`Import complete: ${res.imported} records imported`);
    };

    run();
  }, []);

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{result ? 'Complete' : `Processing row ${current} of ${rows.length}`}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {result && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            {result.errors.length === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
            <span className="font-medium">Import Complete</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{result.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Imported</p>
              <p className="text-lg font-bold text-green-600">{result.imported}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Matched Existing</p>
              <p className="text-lg font-bold text-blue-600">{result.matched}</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium text-destructive">{result.errors.length} errors:</p>
              {result.errors.slice(0, 20).map((err, i) => (
                <p key={i} className="text-xs text-muted-foreground">{err}</p>
              ))}
              {result.errors.length > 20 && <p className="text-xs text-muted-foreground">...and {result.errors.length - 20} more</p>}
            </div>
          )}
        </div>
      )}

      {!result && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Do not close this page while import is running...</span>
        </div>
      )}
    </div>
  );
};

export default ImportProgress;
