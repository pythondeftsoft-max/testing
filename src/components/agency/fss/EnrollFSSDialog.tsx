import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { ITSPGoal } from '@/hooks/useFSSParticipants';
import { format, addYears } from 'date-fns';

const GOAL_CATEGORIES = [
  'Education', 'Employment', 'Financial Literacy', 'Credit Repair',
  'Homeownership', 'Health/Wellness', 'Childcare', 'Transportation', 'Other',
];

interface EnrollFSSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: { id: string; name: string }[];
  onEnroll: (data: any) => Promise<boolean>;
}

const EnrollFSSDialog: React.FC<EnrollFSSDialogProps> = ({ open, onOpenChange, tenants, onEnroll }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const fiveYears = format(addYears(new Date(), 5), 'yyyy-MM-dd');

  const [tenantId, setTenantId] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(today);
  const [contractEnd, setContractEnd] = useState(fiveYears);
  const [baselineRent, setBaselineRent] = useState('0');
  const [baselineIncome, setBaselineIncome] = useState('0');
  const [notes, setNotes] = useState('');
  const [goals, setGoals] = useState<ITSPGoal[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addGoal = () => {
    setGoals(prev => [...prev, {
      id: crypto.randomUUID(),
      category: 'Education',
      description: '',
      target_date: fiveYears,
      status: 'not_started',
    }]);
  };

  const removeGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));

  const updateGoal = (id: string, field: string, value: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleSubmit = async () => {
    if (!tenantId) return;
    setSubmitting(true);
    const ok = await onEnroll({
      tenant_id: tenantId,
      enrollment_date: enrollmentDate,
      contract_end_date: contractEnd,
      baseline_rent: Number(baselineRent),
      baseline_earned_income: Number(baselineIncome),
      itsp_goals: goals,
      notes,
    });
    setSubmitting(false);
    if (ok) {
      onOpenChange(false);
      setTenantId('');
      setGoals([]);
      setNotes('');
      setBaselineRent('0');
      setBaselineIncome('0');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enroll Tenant in FSS Program</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tenant</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Select tenant..." /></SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Enrollment Date</Label>
              <Input type="date" value={enrollmentDate} onChange={e => setEnrollmentDate(e.target.value)} />
            </div>
            <div>
              <Label>Contract End Date</Label>
              <Input type="date" value={contractEnd} onChange={e => setContractEnd(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Baseline Rent ($)</Label>
              <Input type="number" value={baselineRent} onChange={e => setBaselineRent(e.target.value)} />
            </div>
            <div>
              <Label>Baseline Earned Income ($)</Label>
              <Input type="number" value={baselineIncome} onChange={e => setBaselineIncome(e.target.value)} />
            </div>
          </div>

          {/* ITSP Goals */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">ITSP Goals</Label>
              <Button type="button" variant="outline" size="sm" onClick={addGoal}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Goal
              </Button>
            </div>
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">No goals added yet. Click "Add Goal" to create ITSP objectives.</p>
            )}
            {goals.map(goal => (
              <div key={goal.id} className="border rounded-md p-3 mb-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Select value={goal.category} onValueChange={v => updateGoal(goal.id, 'category', v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Goal description..."
                    value={goal.description}
                    onChange={e => updateGoal(goal.id, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeGoal(goal.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Target:</Label>
                  <Input type="date" value={goal.target_date} onChange={e => updateGoal(goal.id, 'target_date', e.target.value)} className="w-40" />
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional enrollment notes..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!tenantId || submitting}>
            {submitting ? 'Enrolling...' : 'Enroll in FSS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollFSSDialog;
