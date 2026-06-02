import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { retryStorageOperation } from '@/lib/storageUtils';
import { previewCache } from '@/lib/previewCache';

interface DocumentViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    name: string;
    url: string;
    mime_type?: string;
  } | null;
  bucketName: string;
}

export const DocumentViewerDialog = ({
  isOpen,
  onClose,
  document,
  bucketName,
}: DocumentViewerDialogProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && document) {
      loadDocument();
    } else {
      // Reset state and cleanup blob URL when dialog closes
      if (signedUrl) {
        URL.revokeObjectURL(signedUrl);
      }
      setSignedUrl(null);
      setError(null);
    }
  }, [isOpen, document]);

  const loadDocument = async () => {
    if (!document) return;

    // Check cache first for instant load
    const cacheKey = `${bucketName}/${document.url}`;
    const cachedUrl = previewCache.get(cacheKey);
    
    if (cachedUrl) {
      console.log('✅ Instant preview from cache:', document.name);
      setSignedUrl(cachedUrl);
      setLoading(false);
      toast({
        title: "Preview ready",
        description: "Loaded from cache (instant)"
      });
      return; // INSTANT!
    }

    // Not cached, need to download (slow first time)
    setLoading(true);
    setError(null);

    // Show feedback for first-time download
    toast({
      title: "Opening preview...",
      description: "First time may take 15-30 seconds"
    });

    // Try download with retry logic
    const result = await retryStorageOperation(
      async () => {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .download(document.url);
        if (error) throw error;
        return data;
      },
      'Document preview',
      2 // 2 retries
    );

    if (result.error) {
      console.error('Error loading document:', result.error);
      setError('Failed to load document');
      setLoading(false);
      
      // Show specific error with helpful message
      const isTimeout = result.error.message?.includes('timeout') || result.error.message?.includes('timed out');
      toast({
        title: "Preview failed",
        description: isTimeout 
          ? "Preview is taking too long. Try downloading instead or wait a moment and retry."
          : "Failed to load document. Please try downloading instead.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create blob and cache it for instant future loads
      const blob = new Blob([result.data], { type: document.mime_type || 'application/octet-stream' });
      const url = previewCache.set(cacheKey, blob);
      setSignedUrl(url);
      setLoading(false);

      console.log('💾 Cached for instant preview next time:', document.name, previewCache.getStats());

      toast({
        title: "Preview ready",
        description: "Loaded and cached for instant access"
      });
    } catch (err) {
      console.error('Error creating blob:', err);
      setError('Failed to load document');
      setLoading(false);
      toast({
        title: "Preview failed",
        description: "Failed to process document",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    // Show immediate feedback
    toast({
      title: "Preparing download...",
      description: `Downloading ${document.name}`
    });

    // Try download with retry logic
    const result = await retryStorageOperation(
      async () => {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .download(document.url);
        if (error) throw error;
        return data;
      },
      'Document download',
      2 // 2 retries
    );

    if (result.error) {
      console.error('Error downloading document:', result.error);
      
      const isTimeout = result.error.message?.includes('timeout') || result.error.message?.includes('timed out');
      toast({
        title: "Download failed",
        description: isTimeout
          ? "Download timed out. Please try again in a moment."
          : "Failed to download document. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = new Blob([result.data], { type: document.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download complete",
        description: `${document.name} has been downloaded`
      });
    } catch (err) {
      console.error('Error triggering download:', err);
      toast({
        title: "Download failed",
        description: "Failed to save document",
        variant: "destructive",
      });
    }
  };

  const isPDF = document?.mime_type?.includes('pdf');
  const isImage = document?.mime_type?.startsWith('image/');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate pr-4">{document?.name}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm">Loading document...</span>
                <span className="text-xs text-muted-foreground">This may take up to 30 seconds</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Instead
              </Button>
            </div>
          )}

          {!loading && !error && signedUrl && (
            <>
              {isPDF && (
                <iframe
                  src={signedUrl}
                  className="w-full h-full border-0 rounded"
                  title={document?.name}
                />
              )}

              {isImage && (
                <div className="flex items-center justify-center h-full bg-muted/50 rounded">
                  <img
                    src={signedUrl}
                    alt={document?.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {!isPDF && !isImage && (
                <iframe
                  src={signedUrl}
                  className="w-full h-full border-0 rounded"
                  title={document?.name}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
