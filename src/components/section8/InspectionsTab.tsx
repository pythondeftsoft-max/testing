import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, MapPin, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InspectionsTabProps {
  inspections: any[];
  getStatusBadge: (status: string) => React.ReactNode;
  properties?: { id: string; address: string; city: string; state: string }[];
  userId?: string;
  onRefresh?: () => void;
}

export const InspectionsTab = ({ inspections, getStatusBadge, properties = [], userId, onRefresh }: InspectionsTabProps) => {
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRequestInspection = async () => {
    if (!selectedProperty || !userId) return;
    setSubmitting(true);
    const { error } = await supabase.from('inspections').insert({
      property_id: selectedProperty,
      status: 'requested',
      created_by: userId,
    } as any);
    setSubmitting(false);
    if (error) { toast.error('Failed to request inspection'); return; }
    toast.success('Inspection request submitted');
    setRequestOpen(false);
    setSelectedProperty('');
    onRefresh?.();
  };

  const getDeficiencyCount = (insp: any) => {
    if (!insp.checklist_data) return 0;
    const data = insp.checklist_data as Record<string, any>;
    return Object.values(data).filter((v: any) => v?.result === 'fail' || v?.status === 'fail').length;
  };

  if (inspections.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Inspections</h3>
          <p className="text-muted-foreground mb-4">No HQS inspections have been scheduled for your properties yet.</p>
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Request Inspection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request HQS Inspection</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Select the property to be inspected:</p>
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.address}, {p.city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleRequestInspection} disabled={!selectedProperty || submitting} className="w-full">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline">{inspections.length} Total</Badge>
          <Badge variant="secondary">{inspections.filter(i => i.status === 'scheduled').length} Scheduled</Badge>
          {inspections.filter(i => i.result === 'fail').length > 0 && (
            <Badge variant="destructive">{inspections.filter(i => i.result === 'fail').length} Failed</Badge>
          )}
        </div>
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <ClipboardCheck className="w-4 h-4 mr-2" /> Request Inspection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request HQS Inspection</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Select the property to be inspected:</p>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.address}, {p.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRequestInspection} disabled={!selectedProperty || submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {inspections.map((insp: any) => {
        const deficiencies = getDeficiencyCount(insp);
        return (
          <Card key={insp.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-medium">
                      {insp.property_address || `Property #${insp.property_id?.slice(0, 8) || '—'}`}
                    </p>
                  </div>
                  {insp.unit_number && (
                    <p className="text-sm text-muted-foreground ml-6">Unit {insp.unit_number}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground ml-6">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {insp.scheduled_date ? new Date(insp.scheduled_date).toLocaleDateString() : 'Date TBD'}
                    </span>
                    {insp.completed_date && (
                      <span>Completed: {new Date(insp.completed_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {getStatusBadge(insp.status)}
                  {insp.result && getStatusBadge(insp.result)}
                  {deficiencies > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" /> {deficiencies} Deficiencies
                    </Badge>
                  )}
                  {insp.result === 'pass' && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="w-3 h-3" /> Passed
                    </span>
                  )}
                </div>
              </div>
              {insp.notes && (
                <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded ml-6">{insp.notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
