import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle, MapPin, ChevronRight, ClipboardCheck, FileText } from 'lucide-react';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';
import HqsChecklist from './HqsChecklist';
import { generateHqs52Pdf } from '@/utils/generateHqs52Pdf';
import { useHqsChecklist } from '@/hooks/useHqsChecklist';
import { toast } from 'sonner';

interface Inspection {
  id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  property_id: string | null;
  unit_id: string | null;
}

interface InspectorWorkboardProps {
  inspections: Inspection[];
  loading: boolean;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onRefresh: () => void;
}

const statusIcon = (status: string, result: string | null) => {
  if (result === 'pass') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (result === 'fail') return <XCircle className="h-4 w-4 text-destructive" />;
  if (result === 'conditional') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  if (status === 'in_progress') return <Clock className="h-4 w-4 text-blue-500" />;
  return <CalendarDays className="h-4 w-4 text-muted-foreground" />;
};

const InspectorWorkboard: React.FC<InspectorWorkboardProps> = ({ inspections, loading, onUpdate, onRefresh }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checklistInspectionId, setChecklistInspectionId] = useState<string | null>(null);

  const todayInspections = useMemo(() =>
    inspections.filter(i => i.scheduled_date && isToday(parseISO(i.scheduled_date)))
      .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || '')),
    [inspections]
  );

  const weekInspections = useMemo(() =>
    inspections.filter(i => i.scheduled_date && isThisWeek(parseISO(i.scheduled_date)) && !isToday(parseISO(i.scheduled_date)))
      .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || '')),
    [inspections]
  );

  const grouped = useMemo(() => ({
    scheduled: inspections.filter(i => i.status === 'scheduled'),
    in_progress: inspections.filter(i => i.status === 'in_progress'),
    completed: inspections.filter(i => i.status === 'completed'),
  }), [inspections]);

  const passRate = useMemo(() => {
    const completed = inspections.filter(i => i.result);
    if (!completed.length) return null;
    const passed = completed.filter(i => i.result === 'pass').length;
    return Math.round((passed / completed.length) * 100);
  }, [inspections]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const InspectionCard = ({ inspection }: { inspection: Inspection }) => {
    const isExpanded = expandedId === inspection.id;
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setExpandedId(isExpanded ? null : inspection.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusIcon(inspection.status, inspection.result)}
              <div>
                <p className="font-medium text-sm">
                  {inspection.scheduled_date ? format(parseISO(inspection.scheduled_date), 'MMM d, yyyy h:mm a') : 'Unscheduled'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {inspection.property_id ? `Property ${inspection.property_id.slice(0, 8)}...` : 'No property'}
                  {inspection.unit_id && ` • Unit ${inspection.unit_id.slice(0, 8)}...`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                inspection.status === 'completed' ? 'success' :
                inspection.status === 'in_progress' ? 'default' :
                'secondary'
              }>
                {inspection.status.replace('_', ' ')}
              </Badge>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t space-y-3">
              {inspection.notes && (
                <p className="text-sm text-muted-foreground">{inspection.notes}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {inspection.status === 'scheduled' && (
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); onUpdate(inspection.id, { status: 'in_progress' }); }}>
                    Start Inspection
                  </Button>
                )}
                {(inspection.status === 'in_progress' || inspection.status === 'scheduled') && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setChecklistInspectionId(inspection.id); }}>
                    <ClipboardCheck className="h-3 w-3 mr-1" /> HQS Checklist
                  </Button>
                )}
                {inspection.status === 'in_progress' && (
                  <>
                    <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); onUpdate(inspection.id, { status: 'completed', result: 'pass', completed_date: new Date().toISOString() }); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Pass
                    </Button>
                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onUpdate(inspection.id, { status: 'completed', result: 'fail', completed_date: new Date().toISOString() }); }}>
                      <XCircle className="h-3 w-3 mr-1" /> Fail
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onUpdate(inspection.id, { status: 'completed', result: 'conditional', completed_date: new Date().toISOString() }); }}>
                      <AlertTriangle className="h-3 w-3 mr-1" /> Conditional
                    </Button>
                  </>
                )}
                {inspection.status === 'completed' && (
                  <>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setChecklistInspectionId(inspection.id); }}>
                      <ClipboardCheck className="h-3 w-3 mr-1" /> View Checklist
                    </Button>
                    <ExportPdfButton inspectionId={inspection.id} inspection={inspection} />
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{todayInspections.length}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{grouped.scheduled.length}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{grouped.in_progress.length}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{passRate !== null ? `${passRate}%` : '—'}</p>
            <p className="text-xs text-muted-foreground">Pass Rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today ({todayInspections.length})</TabsTrigger>
          <TabsTrigger value="week">This Week ({weekInspections.length})</TabsTrigger>
          <TabsTrigger value="queue">My Queue ({inspections.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {todayInspections.length ? (
            <div className="space-y-3">
              {todayInspections.map(i => <InspectionCard key={i.id} inspection={i} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No inspections scheduled for today.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="week">
          {weekInspections.length ? (
            <div className="space-y-3">
              {weekInspections.map(i => <InspectionCard key={i.id} inspection={i} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No other inspections this week.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue">
          <div className="space-y-6">
            {(['scheduled', 'in_progress', 'completed'] as const).map(status => (
              <div key={status}>
                <h3 className="text-sm font-medium mb-2 capitalize">{status.replace('_', ' ')} ({grouped[status].length})</h3>
                {grouped[status].length ? (
                  <div className="space-y-3">
                    {grouped[status].map(i => <InspectionCard key={i.id} inspection={i} />)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">None</p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* HQS Checklist Dialog */}
      <Dialog open={!!checklistInspectionId} onOpenChange={(open) => { if (!open) setChecklistInspectionId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> HQS Inspection Checklist
            </DialogTitle>
          </DialogHeader>
          {checklistInspectionId && (
            <HqsChecklist inspectionId={checklistInspectionId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Small button that fetches checklist items and generates HQS-52 PDF */
const ExportPdfButton: React.FC<{ inspectionId: string; inspection: { scheduled_date: string | null; property_id: string | null } }> = ({ inspectionId, inspection }) => {
  const { items } = useHqsChecklist(inspectionId);
  const [generating, setGenerating] = useState(false);

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!items.length) {
      toast.info('No checklist data to export. Open the HQS Checklist first.');
      return;
    }
    setGenerating(true);
    try {
      await generateHqs52Pdf(items, {
        inspectionDate: inspection.scheduled_date || new Date().toISOString(),
        propertyId: inspection.property_id || 'N/A',
        inspectionId,
      });
      toast.success('HQS-52 report downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={generating}>
      <FileText className="h-3 w-3 mr-1" /> {generating ? 'Generating…' : 'Export HQS-52'}
    </Button>
  );
};

export default InspectorWorkboard;
