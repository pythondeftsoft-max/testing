import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { useDocumentOcr, type OcrDocType } from '@/hooks/useDocumentOcr';
import { OcrReviewPanel } from './OcrReviewPanel';

interface OcrUploaderProps {
  defaultDocType?: OcrDocType;
  onCommit?: (payload: { docType: OcrDocType; data: any }) => void;
  compact?: boolean;
}

export const OcrUploader: React.FC<OcrUploaderProps> = ({
  defaultDocType = 'paystub',
  onCommit,
  compact = false,
}) => {
  const [docType, setDocType] = useState<OcrDocType>(defaultDocType);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { extracting, paystub, lease, extract, reset } = useDocumentOcr();

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > 15 * 1024 * 1024) return;
    setFile(f);
    reset();
  };

  const handleExtract = async () => {
    if (!file) return;
    await extract(file, docType);
  };

  const clear = () => {
    setFile(null);
    reset();
  };

  const extracted = docType === 'paystub' ? paystub : lease;

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className={compact ? 'p-4 space-y-3' : 'p-6 space-y-4'}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Document type
              </Label>
              <Select value={docType} onValueChange={(v) => { setDocType(v as OcrDocType); reset(); }}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paystub">Pay stub</SelectItem>
                  <SelectItem value="lease">Lease agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground truncate max-w-xs">
                  {file.name}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); clear(); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-foreground">
                  Drop a {docType === 'paystub' ? 'pay stub' : 'lease'} here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG — up to 15 MB</p>
              </div>
            )}
          </div>

          {file && !extracted && (
            <Button onClick={handleExtract} disabled={extracting} className="w-full">
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing document…
                </>
              ) : (
                <>Extract data with AI</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {extracted && (
        <OcrReviewPanel
          docType={docType}
          data={extracted}
          onCommit={(committed) => {
            onCommit?.({ docType, data: committed });
            clear();
          }}
          onDiscard={clear}
        />
      )}
    </div>
  );
};

export default OcrUploader;
