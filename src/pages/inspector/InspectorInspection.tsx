import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Save, Loader2, ArrowLeft } from 'lucide-react';
import NSPIREDeficiencyCard, { DraftDeficiency } from '@/components/inspector/NSPIREDeficiencyCard';
import SignaturePad from '@/components/inspector/SignaturePad';
import InspectorLayout from '@/components/inspector/InspectorLayout';
import { queueSync } from '@/lib/inspector/idb';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { useOfflineInspections } from '@/hooks/useOfflineInspections';

const InspectorInspection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { inspections } = useOfflineInspections(user?.id);
  const inspection = inspections.find(i => i.id === id);
  const { drain } = useSyncQueue();

  const [overallResult, setOverallResult] = useState<'pass' | 'fail' | 'inconclusive'>('pass');
  const [notes, setNotes] = useState('');
  const [deficiencies, setDeficiencies] = useState<DraftDeficiency[]>([]);
  const [inspectorSig, setInspectorSig] = useState<string | null>(null);
  const [landlordSig, setLandlordSig] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addDeficiency = () => {
    setDeficiencies(d => [
      ...d,
      {
        client_id: crypto.randomUUID(),
        category: '',
        description: '',
        severity: 'moderate',
        cure_days: 30,
        photos: [],
      },
    ]);
  };

  const submit = async () => {
    if (!inspection || !user) return;
    if (!inspectorSig) { toast.error('Inspector signature required'); return; }
    setSaving(true);
    try {
      await queueSync({
        client_uuid: crypto.randomUUID(),
        inspection_id: inspection.id,
        agency_id: inspection.agency_id,
        device_captured_at: new Date().toISOString(),
        payload: {
          overall_result: overallResult,
          notes,
          inspector_signature: inspectorSig,
          landlord_signature: landlordSig,
          inspector_id: user.id,
          deficiencies: deficiencies.map(d => ({
            client_id: d.client_id,
            category: d.category,
            nspire_code: d.nspire_code,
            description: d.description,
            severity: d.severity,
            cure_days: d.cure_days,
            location: d.location,
          })),
        },
      });
      toast.success('Saved — will sync when online');
      drain();
      navigate('/inspector/today');
    } finally {
      setSaving(false);
    }
  };

  return (
    <InspectorLayout>
      <Helmet><title>Inspection | Inspector</title></Helmet>
      <div className="p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inspector/today')}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>

        <div>
          <h1 className="text-lg font-bold capitalize">
            {inspection?.inspection_type.replace('_', ' ') || 'Inspection'}
          </h1>
          <p className="text-xs text-muted-foreground">ID: {id}</p>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Overall Result</p>
              <div className="grid grid-cols-3 gap-2">
                {(['pass', 'fail', 'inconclusive'] as const).map(r => (
                  <Button
                    key={r}
                    type="button"
                    variant={overallResult === r ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOverallResult(r)}
                    className="capitalize"
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Notes</p>
              <textarea
                className="w-full border rounded-md p-2 text-sm bg-background"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Deficiencies ({deficiencies.length})</h2>
            <Button size="sm" variant="outline" onClick={addDeficiency}>
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </div>
          {deficiencies.map(d => (
            <NSPIREDeficiencyCard
              key={d.client_id}
              inspectionId={inspection?.id || ''}
              deficiency={d}
              onChange={(nd) => setDeficiencies(arr => arr.map(x => x.client_id === d.client_id ? nd : x))}
              onRemove={() => setDeficiencies(arr => arr.filter(x => x.client_id !== d.client_id))}
            />
          ))}
        </div>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <SignaturePad label="Inspector Signature *" value={inspectorSig} onChange={setInspectorSig} />
            <SignaturePad label="Landlord Signature (optional)" value={landlordSig} onChange={setLandlordSig} />
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save & Sync
        </Button>
      </div>
    </InspectorLayout>
  );
};

export default InspectorInspection;
