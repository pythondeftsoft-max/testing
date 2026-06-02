import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Camera, Plus, Trash2, CheckCircle, Upload, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';

const ROOMS = ['Living Room', 'Kitchen', 'Bathroom', 'Bedroom 1', 'Bedroom 2', 'Exterior/Entry'];
const RATINGS = ['good', 'fair', 'poor'] as const;

type ChecklistType = 'move_in' | 'move_out';
type ConditionRating = typeof RATINGS[number];

interface RoomEntry {
  room_name: string;
  condition_rating: ConditionRating;
  notes: string;
  photo_urls: string[];
  uploading: boolean;
}

interface SavedEntry {
  id: string;
  room_name: string;
  condition_rating: string;
  notes: string | null;
  photo_urls: any;
  checklist_type: string;
  created_at: string;
}

const RatingBadge = ({ rating }: { rating: string }) => {
  const cfg = {
    good: 'bg-[hsl(var(--chart-2)/0.1)] text-[hsl(var(--chart-2))]',
    fair: 'bg-orange-500/10 text-orange-600',
    poor: 'bg-destructive/10 text-destructive',
  }[rating] || 'bg-muted text-muted-foreground';
  return <Badge className={cfg}>{rating.charAt(0).toUpperCase() + rating.slice(1)}</Badge>;
};

const TenantConditionChecklist: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [checklistType, setChecklistType] = useState<ChecklistType>('move_in');
  const [rooms, setRooms] = useState<RoomEntry[]>(
    ROOMS.map(name => ({ room_name: name, condition_rating: 'good', notes: '', photo_urls: [], uploading: false }))
  );

  const { data: savedEntries, isLoading } = useQuery({
    queryKey: ['tenant-condition-checklists', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('tenant_condition_checklists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SavedEntry[];
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const rows = rooms.map(r => ({
        user_id: user.id,
        checklist_type: checklistType,
        room_name: r.room_name,
        condition_rating: r.condition_rating,
        notes: r.notes || null,
        photo_urls: r.photo_urls,
      }));
      const { error } = await supabase.from('tenant_condition_checklists').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-condition-checklists'] });
      toast({ title: 'Checklist saved!', description: `Your ${checklistType.replace('_', '-')} checklist has been recorded.` });
      setRooms(ROOMS.map(name => ({ room_name: name, condition_rating: 'good', notes: '', photo_urls: [], uploading: false })));
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save checklist.', variant: 'destructive' });
    },
  });

  const uploadPhoto = async (roomIndex: number, file: File) => {
    if (!user?.id) return;
    setRooms(prev => prev.map((r, i) => i === roomIndex ? { ...r, uploading: true } : r));
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('condition-photos').upload(path, compressed);
      if (error) throw error;
      setRooms(prev => prev.map((r, i) => i === roomIndex ? { ...r, photo_urls: [...r.photo_urls, path], uploading: false } : r));
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
      setRooms(prev => prev.map((r, i) => i === roomIndex ? { ...r, uploading: false } : r));
    }
  };

  const removePhoto = (roomIndex: number, photoIndex: number) => {
    setRooms(prev => prev.map((r, i) =>
      i === roomIndex ? { ...r, photo_urls: r.photo_urls.filter((_, pi) => pi !== photoIndex) } : r
    ));
  };

  const updateRoom = (index: number, field: keyof RoomEntry, value: any) => {
    setRooms(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const moveInEntries = (savedEntries || []).filter(e => e.checklist_type === 'move_in');
  const moveOutEntries = (savedEntries || []).filter(e => e.checklist_type === 'move_out');

  return (
    <div className="space-y-6">
      {/* New Checklist Form */}
      <CardEnhanced>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Unit Condition Checklist
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent className="space-y-6">
          <div className="space-y-2">
            <Label>Checklist Type</Label>
            <Select value={checklistType} onValueChange={(v) => setChecklistType(v as ChecklistType)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="move_in">Move-In</SelectItem>
                <SelectItem value="move_out">Move-Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rooms.map((room, i) => (
            <RoomForm
              key={room.room_name}
              room={room}
              index={i}
              onUpdate={updateRoom}
              onUpload={uploadPhoto}
              onRemovePhoto={removePhoto}
            />
          ))}

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Save Checklist
          </Button>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Saved entries */}
      {(moveInEntries.length > 0 || moveOutEntries.length > 0) && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-sm text-muted-foreground">Saved Checklists</CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent className="space-y-4">
            {moveInEntries.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Move-In</p>
                <SavedRoomList entries={moveInEntries} />
              </div>
            )}
            {moveOutEntries.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Move-Out</p>
                <SavedRoomList entries={moveOutEntries} />
              </div>
            )}
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};

const RoomForm = ({ room, index, onUpdate, onUpload, onRemovePhoto }: {
  room: RoomEntry;
  index: number;
  onUpdate: (i: number, field: keyof RoomEntry, value: any) => void;
  onUpload: (i: number, file: File) => void;
  onRemovePhoto: (i: number, pi: number) => void;
}) => {
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    disabled: room.photo_urls.length >= 4 || room.uploading,
    onDrop: (files) => { if (files[0]) onUpload(index, files[0]); },
  });

  return (
    <div className="p-4 rounded-lg border border-border space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{room.room_name}</p>
        <Select value={room.condition_rating} onValueChange={(v) => onUpdate(index, 'condition_rating', v)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RATINGS.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        placeholder="Notes about condition (optional)"
        value={room.notes}
        onChange={(e) => onUpdate(index, 'notes', e.target.value)}
        className="min-h-[60px]"
      />
      <div className="flex items-center gap-2 flex-wrap">
        {room.photo_urls.map((_, pi) => (
          <div key={pi} className="relative w-16 h-16 rounded-md bg-muted flex items-center justify-center">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <button onClick={() => onRemovePhoto(index, pi)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {room.photo_urls.length < 4 && (
          <div {...getRootProps()} className="w-16 h-16 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <input {...getInputProps()} />
            {room.uploading ? <Clock className="h-4 w-4 animate-spin text-muted-foreground" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
          </div>
        )}
      </div>
    </div>
  );
};

const SavedRoomList = ({ entries }: { entries: SavedEntry[] }) => (
  <div className="space-y-2">
    {entries.map(e => (
      <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{e.room_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <RatingBadge rating={e.condition_rating} />
          {Array.isArray(e.photo_urls) && e.photo_urls.length > 0 && (
            <span className="text-xs text-muted-foreground">{e.photo_urls.length} photo(s)</span>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default TenantConditionChecklist;
