import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileUp, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const FIELD_OPTIONS = [
  { value: '_skip', label: '— Skip —' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'notes', label: 'Notes' },
];

export const LeadImportPanel = () => {
  const { toast } = useToast();
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<number, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; inserted: number } | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);

    Papa.parse(file, {
      complete: (result) => {
        const rows = result.data as string[][];
        if (rows.length < 2) {
          toast({ title: 'Empty CSV', description: 'File has no data rows.', variant: 'destructive' });
          return;
        }
        setHeaders(rows[0]);
        setCsvData(rows.slice(1).filter(r => r.some(c => c?.trim())));

        // Auto-map common header names
        const autoMap: Record<number, string> = {};
        rows[0].forEach((h, i) => {
          const lower = h.toLowerCase().trim();
          if (lower.includes('first') && lower.includes('name')) autoMap[i] = 'first_name';
          else if (lower.includes('last') && lower.includes('name')) autoMap[i] = 'last_name';
          else if (lower.includes('email')) autoMap[i] = 'email';
          else if (lower.includes('phone') || lower.includes('mobile')) autoMap[i] = 'phone';
          else if (lower === 'city') autoMap[i] = 'city';
          else if (lower === 'state') autoMap[i] = 'state';
        });
        setFieldMap(autoMap);
      },
      error: () => toast({ title: 'Parse error', description: 'Could not read CSV file.', variant: 'destructive' }),
    });
  }, [toast]);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const records = csvData.map(row => {
        const mapped: Record<string, any> = { source: 'tally', status: 'new' };
        const rawObj: Record<string, string> = {};

        headers.forEach((h, i) => {
          rawObj[h] = row[i] || '';
          const field = fieldMap[i];
          if (field && field !== '_skip') {
            mapped[field] = row[i]?.trim() || null;
          }
        });
        mapped.raw_data = rawObj;
        return mapped;
      });

      // Insert in batches of 50
      let inserted = 0;
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase.from('lead_prospects').insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }

      setImportResult({ total: records.length, inserted });
      toast({ title: 'Import complete!', description: `${inserted} leads imported.` });
      setCsvData([]);
      setHeaders([]);
      setFieldMap({});
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Leads from CSV
          </CardTitle>
          <CardDescription>
            Upload a Tally export or any CSV to import leads into the tracking system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {importResult && (
            <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg text-success">
              <CheckCircle className="h-5 w-5" />
              <span>Successfully imported {importResult.inserted} of {importResult.total} leads.</span>
            </div>
          )}

          {csvData.length === 0 ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors">
              <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload CSV file</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          ) : (
            <>
              {/* Field Mapping */}
              <div>
                <h3 className="text-sm font-medium mb-2">Map CSV Columns → Fields</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {headers.map((h, i) => (
                    <div key={i} className="space-y-1">
                      <span className="text-xs text-muted-foreground truncate block">{h}</span>
                      <Select value={fieldMap[i] || '_skip'} onValueChange={v => setFieldMap(prev => ({ ...prev, [i]: v }))}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Preview ({csvData.length} rows)</h3>
                  <Badge variant="outline">{csvData.length} leads</Badge>
                </div>
                <div className="rounded-md border overflow-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h, i) => (
                          <TableHead key={i} className="text-xs whitespace-nowrap">
                            {h}
                            {fieldMap[i] && fieldMap[i] !== '_skip' && (
                              <span className="block text-primary text-[10px]">→ {fieldMap[i]}</span>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, ri) => (
                        <TableRow key={ri}>
                          {row.map((cell, ci) => (
                            <TableCell key={ci} className="text-xs py-1">{cell || '—'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {csvData.length > 5 && (
                  <span className="text-xs text-muted-foreground mt-1 block">...and {csvData.length - 5} more rows</span>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? 'Importing...' : `Import ${csvData.length} Leads`}
                </Button>
                <Button variant="outline" onClick={() => { setCsvData([]); setHeaders([]); setFieldMap({}); }}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
