import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Circle, Clock, Plus, DollarSign, Target } from 'lucide-react';
import { FSSParticipant, FSSEscrowEntry, ITSPGoal } from '@/hooks/useFSSParticipants';
import { format, differenceInMonths, parseISO } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  terminated: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

const GOAL_ICONS: Record<string, React.ReactNode> = {
  not_started: <Circle className="w-4 h-4 text-muted-foreground" />,
  in_progress: <Clock className="w-4 h-4 text-yellow-600" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
};

interface FSSParticipantDetailProps {
  participant: FSSParticipant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<FSSParticipant>) => Promise<boolean>;
  fetchEscrow: (participantId: string) => Promise<FSSEscrowEntry[]>;
  addEscrowEntry: (entry: any) => Promise<boolean>;
}

const FSSParticipantDetail: React.FC<FSSParticipantDetailProps> = ({
  participant, open, onOpenChange, onUpdate, fetchEscrow, addEscrowEntry,
}) => {
  const [escrow, setEscrow] = useState<FSSEscrowEntry[]>([]);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [goals, setGoals] = useState<ITSPGoal[]>([]);
  const [showAddEscrow, setShowAddEscrow] = useState(false);
  const [newEscrow, setNewEscrow] = useState({ month: '', earned_income: '', escrow_credit: '', type: 'monthly_credit', notes: '' });

  useEffect(() => {
    if (participant) {
      setGoals(participant.itsp_goals || []);
      setEscrowLoading(true);
      fetchEscrow(participant.id).then(data => {
        setEscrow(data);
        setEscrowLoading(false);
      });
    }
  }, [participant]);

  if (!participant) return null;

  const contractMonths = participant.contract_end_date
    ? differenceInMonths(parseISO(participant.contract_end_date), parseISO(participant.enrollment_date))
    : 60;
  const elapsedMonths = differenceInMonths(new Date(), parseISO(participant.enrollment_date));
  const progressPct = Math.min(100, Math.round((elapsedMonths / contractMonths) * 100));
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalEscrow = escrow.length > 0 ? escrow[0].running_balance : 0;

  const handleGoalStatusChange = async (goalId: string, newStatus: string) => {
    const updated = goals.map(g => g.id === goalId ? { ...g, status: newStatus as ITSPGoal['status'] } : g);
    setGoals(updated);
    await onUpdate(participant.id, { itsp_goals: updated });
  };

  const handleStatusChange = async (newStatus: string) => {
    await onUpdate(participant.id, { status: newStatus });
  };

  const handleAddEscrow = async () => {
    const lastBalance = escrow.length > 0 ? escrow[0].running_balance : 0;
    const credit = Number(newEscrow.escrow_credit) || 0;
    const isDebit = ['interim_disbursement', 'final_disbursement', 'forfeiture'].includes(newEscrow.type);
    const runningBalance = isDebit ? lastBalance - credit : lastBalance + credit;

    const ok = await addEscrowEntry({
      participant_id: participant.id,
      month: newEscrow.month,
      earned_income: Number(newEscrow.earned_income) || 0,
      calculated_rent_increase: 0,
      escrow_credit: credit,
      running_balance: runningBalance,
      type: newEscrow.type,
      notes: newEscrow.notes,
    });
    if (ok) {
      setShowAddEscrow(false);
      setNewEscrow({ month: '', earned_income: '', escrow_credit: '', type: 'monthly_credit', notes: '' });
      const updated = await fetchEscrow(participant.id);
      setEscrow(updated);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {participant.tenant_name}
            <Badge className={STATUS_COLORS[participant.status]}>{participant.status}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Contract Progress</p>
                <p className="text-xl font-bold">{progressPct}%</p>
                <p className="text-xs text-muted-foreground">{elapsedMonths}/{contractMonths} mo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Goals Completed</p>
                <p className="text-xl font-bold">{completedGoals}/{goals.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Escrow Balance</p>
                <p className="text-xl font-bold text-green-600">${totalEscrow.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Status change */}
          <div className="flex items-center gap-2">
            <Label className="text-sm">Status:</Label>
            <Select value={participant.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['enrolled', 'active', 'completed', 'terminated', 'expired'].map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="goals" className="mt-4">
            <TabsList>
              <TabsTrigger value="goals"><Target className="w-3.5 h-3.5 mr-1" /> ITSP Goals</TabsTrigger>
              <TabsTrigger value="escrow"><DollarSign className="w-3.5 h-3.5 mr-1" /> Escrow</TabsTrigger>
            </TabsList>

            <TabsContent value="goals" className="space-y-2 mt-3">
              {goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ITSP goals defined.</p>
              ) : (
                goals.map(goal => (
                  <div key={goal.id} className="flex items-center gap-3 border rounded-md p-3">
                    {GOAL_ICONS[goal.status]}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{goal.category}</p>
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                      <p className="text-xs text-muted-foreground">Target: {goal.target_date}</p>
                    </div>
                    <Select value={goal.status} onValueChange={v => handleGoalStatusChange(goal.id, v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="escrow" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddEscrow(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
                </Button>
              </div>

              {showAddEscrow && (
                <Card className="mb-3">
                  <CardContent className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Month</Label>
                        <Input type="date" value={newEscrow.month} onChange={e => setNewEscrow(p => ({ ...p, month: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={newEscrow.type} onValueChange={v => setNewEscrow(p => ({ ...p, type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly_credit">Monthly Credit</SelectItem>
                            <SelectItem value="interim_disbursement">Interim Disbursement</SelectItem>
                            <SelectItem value="final_disbursement">Final Disbursement</SelectItem>
                            <SelectItem value="forfeiture">Forfeiture</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Earned Income ($)</Label>
                        <Input type="number" value={newEscrow.earned_income} onChange={e => setNewEscrow(p => ({ ...p, earned_income: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Escrow Credit ($)</Label>
                        <Input type="number" value={newEscrow.escrow_credit} onChange={e => setNewEscrow(p => ({ ...p, escrow_credit: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Input value={newEscrow.notes} onChange={e => setNewEscrow(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowAddEscrow(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleAddEscrow} disabled={!newEscrow.month}>Save</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {escrowLoading ? (
                <p className="text-sm text-muted-foreground">Loading escrow...</p>
              ) : escrow.length === 0 ? (
                <p className="text-sm text-muted-foreground">No escrow entries yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escrow.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{format(parseISO(e.month), 'MMM yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {e.type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">${e.escrow_credit.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm font-medium">${e.running_balance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>

          {/* Contract Info */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Enrolled: {format(parseISO(participant.enrollment_date), 'MMM d, yyyy')}</p>
              {participant.contract_end_date && (
                <p>Contract End: {format(parseISO(participant.contract_end_date), 'MMM d, yyyy')}</p>
              )}
              <p>Baseline Rent: ${participant.baseline_rent.toLocaleString()}</p>
              <p>Baseline Earned Income: ${participant.baseline_earned_income.toLocaleString()}</p>
              {participant.notes && <p className="text-muted-foreground mt-2">{participant.notes}</p>}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FSSParticipantDetail;
