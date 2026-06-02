import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import InspectionDeficiencyTracker from './InspectionDeficiencyTracker';
import NspireDeficiencyTracker from './inspections/NspireDeficiencyTracker';

interface InspectionDetailProps {
  inspectionId: string;
  onBack: () => void;
  canManage: boolean;
}

const HQS_ITEMS = [
  { key: 'living_room', label: 'Living Room — adequate space, windows, electrical' },
  { key: 'kitchen', label: 'Kitchen — stove, refrigerator, sink, cabinets' },
  { key: 'bathroom', label: 'Bathroom — toilet, tub/shower, sink, ventilation' },
  { key: 'bedroom', label: 'Bedroom(s) — adequate space, window, closet' },
  { key: 'doors_locks', label: 'Doors & Locks — all entry doors lockable' },
  { key: 'windows', label: 'Windows — operable, no broken glass, lockable' },
  { key: 'ceiling_walls', label: 'Ceiling & Walls — no cracks, peeling paint, mold' },
  { key: 'floors', label: 'Floors — safe, no trip hazards' },
  { key: 'plumbing', label: 'Plumbing — no leaks, hot water available' },
  { key: 'electrical', label: 'Electrical — outlets work, no exposed wiring' },
  { key: 'heating', label: 'Heating — adequate, functional system' },
  { key: 'smoke_detectors', label: 'Smoke Detectors — present and functional' },
  { key: 'co_detectors', label: 'CO Detectors — present where required' },
  { key: 'exterior', label: 'Exterior — foundation, roof, siding in good condition' },
  { key: 'handrails', label: 'Handrails & Stairs — secure, in good repair' },
  { key: 'pest_free', label: 'Pest Free — no evidence of infestation' },
];

const InspectionDetail: React.FC<InspectionDetailProps> = ({ inspectionId, onBack, canManage }) => {
  const [inspection, setInspection] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInspection();
    loadPhotos();
  }, [inspectionId]);

  const loadInspection = async () => {
    const { data } = await supabase.from('inspections').select('*').eq('id', inspectionId).single();
    if (data) {
      setInspection(data);
      setChecklist((data.checklist_data as Record<string, boolean>) || {});
      setNotes((data as any).notes || '');
    }
    setLoading(false);
  };

  const loadPhotos = async () => {
    const { data } = await supabase.from('inspection_photos').select('*').eq('inspection_id', inspectionId).order('created_at', { ascending: false });
    setPhotos(data || []);
  };

  const saveChecklist = async () => {
    setSaving(true);
    const { error } = await supabase.from('inspections').update({ checklist_data: checklist, notes } as any).eq('id', inspectionId);
    if (error) toast.error('Failed to save');
    else toast.success('Checklist saved');
    setSaving(false);
  };

  const handleResult = async (result: string) => {
    const updates: Record<string, unknown> = {
      status: 'completed',
      result,
      completed_date: new Date().toISOString(),
      checklist_data: checklist,
      notes,
    };
    const { error } = await supabase.from('inspections').update(updates as any).eq('id', inspectionId);
    if (error) toast.error('Failed to update');
    else {
      toast.success(`Inspection marked as ${result}`);
      loadInspection();
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleReason) {
      toast.error('Date and reason are required');
      return;
    }
    const { error } = await supabase.from('inspections').update({
      scheduled_date: rescheduleDate,
      status: 'scheduled',
      reschedule_reason: rescheduleReason,
    } as any).eq('id', inspectionId);
    if (error) toast.error('Failed to reschedule');
    else {
      toast.success('Inspection rescheduled');
      setRescheduleDate('');
      setRescheduleReason('');
      loadInspection();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const path = `${inspectionId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(path, file);
      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      await supabase.from('inspection_photos').insert({
        inspection_id: inspectionId,
        file_path: path,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id || null,
      } as any);
    }

    toast.success('Photos uploaded');
    setUploading(false);
    loadPhotos();
    e.target.value = '';
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!inspection) {
    return <div className="text-center py-8 text-muted-foreground">Inspection not found.</div>;
  }

  const isActive = inspection.status === 'scheduled' || inspection.status === 'in_progress';

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Inspections
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Inspection {inspection.id.slice(0, 8)}...</CardTitle>
            <div className="flex gap-2">
              <Badge variant={inspection.status === 'completed' ? 'default' : 'warning'}>{inspection.status}</Badge>
              {inspection.result && <Badge variant={inspection.result === 'pass' ? 'success' : 'destructive'}>{inspection.result}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>Scheduled: {inspection.scheduled_date ? new Date(inspection.scheduled_date).toLocaleDateString() : '—'}</p>
          {inspection.completed_date && <p>Completed: {new Date(inspection.completed_date).toLocaleDateString()}</p>}
        </CardContent>
      </Card>

      {/* HQS Checklist */}
      <Card>
        <CardHeader><CardTitle className="text-base">HQS Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {HQS_ITEMS.map(item => (
            <div key={item.key} className="flex items-start gap-3">
              <Checkbox
                id={item.key}
                checked={!!checklist[item.key]}
                onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, [item.key]: !!checked }))}
                disabled={!canManage || !isActive}
              />
              <label htmlFor={item.key} className="text-sm leading-tight cursor-pointer">{item.label}</label>
            </div>
          ))}
          <div className="pt-2">
            <Label>Inspector Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={!canManage || !isActive} rows={3} />
          </div>
          {canManage && isActive && (
            <Button variant="outline" size="sm" onClick={saveChecklist} disabled={saving}>
              {saving ? 'Saving...' : 'Save Checklist'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Deficiency Tracking */}
      <InspectionDeficiencyTracker inspectionId={inspectionId} canManage={canManage} />

      {/* NSPIRE Deficiencies — severity + cure-deadline + HAP abatement */}
      {inspection.agency_id && (
        <NspireDeficiencyTracker inspectionId={inspectionId} agencyId={inspection.agency_id} canManage={canManage} />
      )}

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" /> Photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canManage && isActive && (
            <div className="mb-4">
              <Label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent text-sm">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploading...' : 'Upload Photos'}
              </Label>
              <input id="photo-upload" type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </div>
          )}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {photos.map(photo => {
                const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(photo.file_path);
                return (
                  <div key={photo.id} className="aspect-square rounded-md overflow-hidden bg-muted">
                    <img src={urlData.publicUrl} alt={photo.caption || 'Inspection photo'} className="w-full h-full object-cover" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canManage && isActive && (
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {inspection.status === 'scheduled' && (
                <Button variant="outline" onClick={() => supabase.from('inspections').update({ status: 'in_progress' } as any).eq('id', inspectionId).then(() => loadInspection())}>
                  Start Inspection
                </Button>
              )}
              {inspection.status === 'in_progress' && (
                <>
                  <Button onClick={() => handleResult('pass')} className="gap-1"><CheckCircle className="h-4 w-4" /> Pass</Button>
                  <Button variant="destructive" onClick={() => handleResult('fail')} className="gap-1"><XCircle className="h-4 w-4" /> Fail</Button>
                  <Button variant="secondary" onClick={() => handleResult('conditional')}>Conditional</Button>
                </>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <h4 className="text-sm font-medium">Reschedule</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div><Label>New Date</Label><Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} /></div>
                <div><Label>Reason</Label><Input value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)} placeholder="Reason for rescheduling" /></div>
              </div>
              <Button variant="outline" size="sm" onClick={handleReschedule}>Reschedule</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InspectionDetail;
