import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X } from 'lucide-react';
import { compressImage } from '@/lib/inspector/imageCompression';
import { addPendingPhoto, PendingPhoto } from '@/lib/inspector/idb';
import { toast } from 'sonner';

interface Props {
  inspectionId: string;
  deficiencyClientId: string;
  photos: { id: string; previewUrl: string }[];
  onAdd: (photo: { id: string; previewUrl: string }) => void;
  onRemove: (id: string) => void;
}

const PhotoCapture: React.FC<Props> = ({ inspectionId, deficiencyClientId, photos, onAdd, onRemove }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        const id = crypto.randomUUID();
        const photo: PendingPhoto = {
          id,
          inspection_id: inspectionId,
          deficiency_client_id: deficiencyClientId,
          blob: compressed,
          filename: `${id}.jpg`,
          mime_type: 'image/jpeg',
          created_at: Date.now(),
          uploaded: false,
        };
        await addPendingPhoto(photo);
        const previewUrl = URL.createObjectURL(compressed);
        onAdd({ id, previewUrl });
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to capture photo');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map(p => (
          <div key={p.id} className="relative w-20 h-20 rounded-md overflow-hidden border">
            <img src={p.previewUrl} alt="Deficiency" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
              aria-label="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-20 h-20 flex flex-col gap-1"
          onClick={() => ref.current?.click()}
          disabled={busy}
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          <span className="text-[10px]">Add Photo</span>
        </Button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};

export default PhotoCapture;
