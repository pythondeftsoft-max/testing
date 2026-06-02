import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProofUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const ProofUploader = ({ file, onFileChange }: ProofUploaderProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) onFileChange(acceptedFiles[0]);
  }, [onFileChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  });

  if (file) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border border-border bg-muted/50">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-sm truncate flex-1">{file.name}</span>
        <button type="button" onClick={() => onFileChange(null)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Drop a receipt here, or click to browse
      </p>
      <p className="text-xs text-muted-foreground mt-1">PDF, JPEG, PNG — max 10MB</p>
    </div>
  );
};

export default ProofUploader;
