import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EntitySelector, { EntityType } from './import/EntitySelector';
import FieldMappingReview from './import/FieldMappingReview';
import ImportPreview from './import/ImportPreview';
import ImportProgress, { ImportSummary } from './import/ImportProgress';
import BulkDocumentDropzone from './import/BulkDocumentDropzone';

interface AgencyDataImportProps {
  agencyId: string;
}

type Step = 'select-entity' | 'upload' | 'field-mapping' | 'preview' | 'importing' | 'complete';

const AgencyDataImport: React.FC<AgencyDataImportProps> = ({ agencyId }) => {
  const [step, setStep] = useState<Step>('select-entity');
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);

  const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };
    const h = lines[0].split(',').map(s => s.trim().replace(/"/g, ''));
    const r = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      h.forEach((header, i) => { row[header] = values[i] || ''; });
      return row;
    });
    return { headers: h, rows: r };
  };

  const handleEntitySelect = (type: EntityType) => {
    setEntityType(type);
    setStep(type === 'bulk_documents' ? 'importing' : 'upload');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const text = await f.text();
    const { headers: h, rows: r } = parseCSV(text);
    setHeaders(h);
    setRows(r);
    setStep('field-mapping');
  };

  const handleMappingConfirm = (m: Record<string, string>) => {
    setMappings(m);
    setStep('preview');
  };

  const reset = () => {
    setStep('select-entity');
    setEntityType(null);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMappings({});
    setImportResult(null);
  };

  const stepLabel = {
    'select-entity': 'Select Data Type',
    'upload': 'Upload CSV',
    'field-mapping': 'Map Fields',
    'preview': 'Review Data',
    'importing': 'Importing...',
    'complete': 'Complete',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" /> Caseload Data Import
        </h2>
        {step !== 'select-entity' && (
          <div className="flex items-center gap-2">
            {entityType && <Badge variant="secondary" className="capitalize">{entityType}</Badge>}
            <Button variant="ghost" size="sm" onClick={reset}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Start Over
            </Button>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {Object.entries(stepLabel).map(([key, label], i) => (
          <React.Fragment key={key}>
            {i > 0 && <span className="mx-1">→</span>}
            <span className={step === key ? 'font-bold text-primary' : ''}>{label}</span>
          </React.Fragment>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{stepLabel[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'select-entity' && <EntitySelector onSelect={handleEntitySelect} />}

          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with your <span className="font-medium capitalize">{entityType}</span> data
              </p>
              <label>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                <Button variant="outline" asChild>
                  <span className="cursor-pointer"><Upload className="w-4 h-4 mr-2" />Select CSV File</span>
                </Button>
              </label>
              <Button variant="ghost" size="sm" onClick={() => setStep('select-entity')}>← Back</Button>
            </div>
          )}

          {step === 'field-mapping' && entityType && (
            <FieldMappingReview
              csvHeaders={headers}
              entityType={entityType}
              onConfirm={handleMappingConfirm}
              onBack={() => setStep('upload')}
            />
          )}

          {step === 'preview' && entityType && (
            <ImportPreview
              entityType={entityType}
              rows={rows}
              mappings={mappings}
              onConfirm={() => setStep('importing')}
              onBack={() => setStep('field-mapping')}
            />
          )}

          {step === 'importing' && entityType === 'bulk_documents' && (
            <BulkDocumentDropzone agencyId={agencyId} />
          )}

          {step === 'importing' && entityType && entityType !== 'bulk_documents' && (
            <ImportProgress
              agencyId={agencyId}
              entityType={entityType}
              rows={rows}
              mappings={mappings}
              onComplete={(r) => { setImportResult(r); setStep('complete'); }}
            />
          )}

          {step === 'complete' && importResult && (
            <div className="text-center py-8 space-y-4">
              <p className="text-lg font-semibold">
                {importResult.imported} records imported successfully
              </p>
              <p className="text-sm text-muted-foreground">
                {importResult.matched > 0 && `${importResult.matched} matched existing records. `}
                {importResult.errors.length > 0 && `${importResult.errors.length} errors encountered.`}
              </p>
              <Button onClick={reset}>Import More Data</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyDataImport;
