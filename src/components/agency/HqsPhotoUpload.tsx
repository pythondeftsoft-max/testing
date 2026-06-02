import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  itemId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

const HqsPhotoUpload: React.FC<Props> = ({ itemId, currentUrl, onUploaded }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `hqs-photos/${itemId}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('agency-documents').upload(path, file);
    if (uploadErr) {
      toast.error('Upload failed');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('agency-documents').getPublicUrl(path);
    onUploaded(urlData.publicUrl);
    toast.success('Photo uploaded');
    setUploading(false);
  }, [itemId, onUploaded]);

  if (currentUrl) {
    return (
      <div className="relative group w-16 h-16 rounded border overflow-hidden">
        <img src={currentUrl} alt="Inspection photo" className="w-full h-full object-cover" />
        <button
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          onClick={() => onUploaded('')}
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <label className="cursor-pointer">
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} disabled={uploading} />
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild disabled={uploading}>
        <span>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
          {uploading ? 'Uploading…' : 'Photo'}
        </span>
      </Button>
    </label>
  );
};

export default HqsPhotoUpload;
