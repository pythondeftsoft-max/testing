import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, Clock, FileText, UserCheck, ShieldCheck, Award, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import AIDocumentParser from './AIDocumentParser';

const WORKFLOW_STEPS = [
  { key: 'initiated', label: '120-Day Notice', icon: Clock, description: 'Recertification initiated' },
  { key: 'notice_sent', label: 'Notice Sent', icon: FileText, description: '120-day notice mailed to tenant' },
  { key: 'docs_requested', label: 'Docs Requested', icon: FileText, description: '90-day document request' },
  { key: 'under_review', label: 'Caseworker Review', icon: UserCheck, description: 'Income & eligibility review' },
  { key: 'supervisor_review', label: 'Supervisor Approval', icon: ShieldCheck, description: 'Supervisor sign-off required' },
  { key: 'completed', label: 'Completed', icon: Check, description: 'Recertification approved' },
  { key: 'voucher_reissued', label: 'Voucher Reissued', icon: Award, description: 'New voucher terms issued' },
];

interface WorkflowHistoryEntry {
  step: string;
  timestamp: string;
  actor?: string;
  note?: string;
}

interface Props {
  recertId: string;
  currentStep: string;
  workflowHistory: WorkflowHistoryEntry[];
  canManage: boolean;
  isSupervisor: boolean;
  onAdvance: (recertId: string, nextStep: string, note: string) => Promise<void>;
  onClose: () => void;
}

const RecertificationWorkflowPanel: React.FC<Props> = ({
  recertId, currentStep, workflowHistory, canManage, isSupervisor, onAdvance, onClose
}) => {
  const [note, setNote] = useState('');
  const [advancing, setAdvancing] = useState(false);

  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.key === currentStep);
  const nextStep = currentIndex < WORKFLOW_STEPS.length - 1 ? WORKFLOW_STEPS[currentIndex + 1] : null;

  const canAdvance = () => {
    if (!canManage || !nextStep) return false;
    if (nextStep.key === 'completed' && !isSupervisor) return false;
    return true;
  };

  const handleAdvance = async () => {
    if (!nextStep) return;
    setAdvancing(true);
    await onAdvance(recertId, nextStep.key, note);
    setNote('');
    setAdvancing(false);
  };

  const getStepStatus = (index: number) => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recertification Workflow</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Timeline */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {WORKFLOW_STEPS.map((step, index) => {
            const status = getStepStatus(index);
            const Icon = step.icon;
            return (
              <div key={step.key} className="contents">
                <div className="flex flex-col items-center min-w-[80px]">
                  <div className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors',
                    status === 'completed' ? 'bg-primary border-primary text-primary-foreground' :
                    status === 'current' ? 'border-primary text-primary bg-primary/10' :
                    'border-muted-foreground/20 text-muted-foreground'
                  )}>
                    {status === 'completed' ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={cn(
                    'mt-1.5 text-[10px] font-medium text-center leading-tight max-w-[72px]',
                    status === 'current' ? 'text-primary' :
                    status === 'completed' ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-1 min-w-[16px]',
                    index < currentIndex ? 'bg-primary' : 'bg-muted-foreground/20'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Current Step Info */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default">{WORKFLOW_STEPS[currentIndex]?.label || currentStep}</Badge>
            {nextStep && canAdvance() && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {nextStep && canAdvance() && (
              <Badge variant="secondary">{nextStep.label}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{WORKFLOW_STEPS[currentIndex]?.description}</p>

          {nextStep?.key === 'completed' && !isSupervisor && (
            <p className="text-xs text-destructive mt-2">⚠ Supervisor approval required to complete this step</p>
          )}
        </div>

        {/* AI Document Parser — visible during docs_requested and under_review steps */}
        {(currentStep === 'docs_requested' || currentStep === 'under_review') && canManage && (
          <AIDocumentParser recertId={recertId} />
        )}

        {/* Advance Controls */}
        {canAdvance() && nextStep && (
          <div className="space-y-3">
            <Textarea
              placeholder="Add a note for this step transition (optional)..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
            />
            <Button onClick={handleAdvance} disabled={advancing} className="w-full">
              {advancing ? 'Advancing...' : `Advance to: ${nextStep.label}`}
            </Button>
          </div>
        )}

        {/* Workflow History Log */}
        {workflowHistory.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">WORKFLOW HISTORY</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...workflowHistory].reverse().map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-xs border-l-2 border-muted pl-3 py-1">
                  <div className="flex-1">
                    <span className="font-medium capitalize">{entry.step.replace(/_/g, ' ')}</span>
                    {entry.note && <p className="text-muted-foreground mt-0.5">{entry.note}</p>}
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecertificationWorkflowPanel;
