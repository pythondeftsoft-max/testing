import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useCreateEivImport } from '@/hooks/eiv/useEivDiscrepancies';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  onComplete?: () => void;
}

const EivImportWizard: React.FC<Props> = ({ agencyId, onComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [period, setPeriod] = useState('');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [preview, setPreview] = useState<any[]>([]);
  const create = useCreateEivImport(agencyId);

  const parseCSV = async (f: File) => {
    const text = await f.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV is empty');
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    const findIdx = (...names: string[]) => {
      for (const n of names) {
        const i = headers.findIndex(h => h.includes(n));
        if (i >= 0) return i;
      }
      return -1;
    };
    const idxSsn = findIdx('ssn', 'last_four', 'last4');
    const idxFirst = findIdx('first');
    const idxLast = findIdx('last');
    const idxEmployer = findIdx('employer', 'source');
    const idxAmount = findIdx('amount', 'income', 'wages');

    const rows = lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim().replace(/"/g, ''));
      return {
        tenant_ssn_last_four: idxSsn >= 0 ? cells[idxSsn]?.slice(-4) : undefined,
        tenant_first_name: idxFirst >= 0 ? cells[idxFirst] : undefined,
        tenant_last_name: idxLast >= 0 ? cells[idxLast] : undefined,
        reported_employer: idxEmployer >= 0 ? cells[idxEmployer] : undefined,
        reported_amount: idxAmount >= 0 ? Number(cells[idxAmount].replace(/[$,]/g, '')) || 0 : 0,
      };
    });
    setPreview(rows);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    parseCSV(f);
  };

  const handleSubmit = async () => {
    if (!file || preview.length === 0) {
      toast.error('Select a CSV first');
      return;
    }
    await create.mutateAsync({
      file_name: file.name,
      period_label: period || undefined,
      tax_year: taxYear,
      records: preview,
    });
    setFile(null);
    setPreview([]);
    onComplete?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" /> EIV Income Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Period</Label>
            <Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="Q2 2025" />
          </div>
          <div>
            <Label className="text-xs">Tax Year</Label>
            <Input
              type="number"
              value={taxYear}
              onChange={e => setTaxYear(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">EIV CSV File</Label>
          <Input type="file" accept=".csv" onChange={handleFile} />
          <p className="text-xs text-muted-foreground mt-1">
            Expected columns: SSN last 4, First Name, Last Name, Employer, Amount
          </p>
        </div>

        {preview.length > 0 && (
          <div className="border rounded p-3 bg-muted/30 text-xs">
            <p className="font-medium mb-2">{preview.length} records parsed</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {preview.slice(0, 5).map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {r.tenant_first_name} {r.tenant_last_name} (***{r.tenant_ssn_last_four})
                  </span>
                  <span>${r.reported_amount.toLocaleString()}</span>
                </div>
              ))}
              {preview.length > 5 && (
                <p className="text-muted-foreground">+{preview.length - 5} more</p>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!file || preview.length === 0 || create.isPending}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {create.isPending ? 'Importing...' : 'Import EIV Data'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EivImportWizard;
