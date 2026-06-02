import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import PhotoCapture from './PhotoCapture';

export interface DraftDeficiency {
  client_id: string;
  category: string;
  nspire_code?: string;
  description: string;
  severity: 'life_threatening' | 'severe' | 'moderate' | 'low';
  cure_days: number;
  location?: string;
  photos: { id: string; previewUrl: string }[];
}

interface Props {
  inspectionId: string;
  deficiency: DraftDeficiency;
  onChange: (d: DraftDeficiency) => void;
  onRemove: () => void;
}

const severityOptions: DraftDeficiency['severity'][] = ['life_threatening', 'severe', 'moderate', 'low'];

const NSPIREDeficiencyCard: React.FC<Props> = ({ inspectionId, deficiency, onChange, onRemove }) => {
  const update = (patch: Partial<DraftDeficiency>) => onChange({ ...deficiency, ...patch });

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Label className="text-xs">Category</Label>
            <Input
              value={deficiency.category}
              onChange={(e) => update({ category: e.target.value })}
              placeholder="e.g. Electrical, Plumbing"
            />
          </div>
          <Button size="icon" variant="ghost" onClick={onRemove} className="mt-5">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">NSPIRE Code</Label>
            <Input
              value={deficiency.nspire_code || ''}
              onChange={(e) => update({ nspire_code: e.target.value })}
              placeholder="optional"
            />
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Input
              value={deficiency.location || ''}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="e.g. Kitchen"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            rows={2}
            value={deficiency.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Describe the deficiency"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Severity</Label>
            <Select value={deficiency.severity} onValueChange={(v) => update({ severity: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {severityOptions.map(s => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cure Days</Label>
            <Input
              type="number"
              value={deficiency.cure_days}
              onChange={(e) => update({ cure_days: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Photos</Label>
          <PhotoCapture
            inspectionId={inspectionId}
            deficiencyClientId={deficiency.client_id}
            photos={deficiency.photos}
            onAdd={(p) => update({ photos: [...deficiency.photos, p] })}
            onRemove={(id) => update({ photos: deficiency.photos.filter(x => x.id !== id) })}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default NSPIREDeficiencyCard;
