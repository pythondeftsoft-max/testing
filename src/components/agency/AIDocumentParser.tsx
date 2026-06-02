import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileText, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedField {
  field: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ParseResult {
  document_type_detected: string;
  fields: ExtractedField[];
  warnings: string[];
  file_name: string;
}

interface Props {
  recertId: string;
  onFieldsConfirmed?: (fields: ExtractedField[]) => void;
}

const DOCUMENT_TYPES = [
  { value: 'pay_stub', label: 'Pay Stub' },
  { value: 'lease', label: 'Lease Agreement' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'general', label: 'Other / General' },
];

const confidenceColor: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const AIDocumentParser: React.FC<Props> = ({ recertId, onFieldsConfirmed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('pay_stub');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [editedFields, setEditedFields] = useState<ExtractedField[]>([]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setEditedFields([]);
    }
  }, []);

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        setParsing(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-document-ai`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to parse document');
        setParsing(false);
        return;
      }

      setResult(json.data);
      setEditedFields(json.data.fields.map((f: ExtractedField) => ({ ...f })));
      toast.success('Document parsed successfully');
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Failed to parse document');
    } finally {
      setParsing(false);
    }
  };

  const updateFieldValue = (index: number, newValue: string) => {
    setEditedFields(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: newValue };
      return updated;
    });
  };

  const handleConfirm = () => {
    onFieldsConfirmed?.(editedFields);
    toast.success('Extracted data confirmed and saved to recertification');
    setResult(null);
    setEditedFields([]);
    setFile(null);
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Document Parser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        {!result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="flex-1"
              />
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            <Button
              onClick={handleParse}
              disabled={!file || parsing}
              className="w-full"
              size="sm"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting data...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Parse Document
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Detected: </span>
                <Badge variant="secondary">{result.document_type_detected}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setResult(null); setEditedFields([]); }}>
                Parse Another
              </Button>
            </div>

            {result.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-md p-3 space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Editable Fields */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {editedFields.map((field, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-36 truncate capitalize text-muted-foreground">
                    {field.field.replace(/_/g, ' ')}
                  </span>
                  <Input
                    value={field.value}
                    onChange={e => updateFieldValue(i, e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  <Badge className={`text-[10px] shrink-0 ${confidenceColor[field.confidence]}`}>
                    {field.confidence}
                  </Badge>
                </div>
              ))}
            </div>

            <Button onClick={handleConfirm} className="w-full" size="sm">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm & Save to Recertification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIDocumentParser;
