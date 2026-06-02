import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DollarSign, CreditCard, Clock, CheckCircle2, AlertTriangle, Calendar, Send, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PaymentRecord {
  id: string;
  tenantName: string;
  propertyAddress: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'paid' | 'pending' | 'late' | 'overdue';
  method: string;
  autopay: boolean;
}

// Demo data
const MOCK_PAYMENTS: PaymentRecord[] = [
  { id: '1', tenantName: 'Sarah Williams', propertyAddress: '123 Main St, Apt 4B', amount: 1200, dueDate: '2026-04-01', paidDate: '2026-03-30', status: 'paid', method: 'ACH', autopay: true },
  { id: '2', tenantName: 'Mike Chen', propertyAddress: '456 Oak Ave, Unit 2', amount: 950, dueDate: '2026-04-01', paidDate: null, status: 'pending', method: 'Card', autopay: false },
  { id: '3', tenantName: 'Lisa Brown', propertyAddress: '789 Elm St', amount: 1500, dueDate: '2026-03-01', paidDate: null, status: 'overdue', method: 'N/A', autopay: false },
  { id: '4', tenantName: 'David Park', propertyAddress: '321 Pine Rd, Apt 1A', amount: 1100, dueDate: '2026-04-01', paidDate: '2026-04-02', status: 'paid', method: 'ACH', autopay: true },
];

const RentCollectionHub: React.FC<{ landlordId: string }> = ({ landlordId }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>(MOCK_PAYMENTS);
  const [showReminder, setShowReminder] = useState<string | null>(null);

  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'late').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const autopayCount = payments.filter(p => p.autopay).length;

  const paidPayments = payments.filter(p => p.status === 'paid');
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'late');
  const overduePayments = payments.filter(p => p.status === 'overdue');

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = { paid: 'success', pending: 'secondary', late: 'default', overdue: 'destructive' };
    return <Badge variant={variants[status] as any}>{status.toUpperCase()}</Badge>;
  };

  const handleSendReminder = (id: string) => {
    toast.success('Payment reminder sent');
    setShowReminder(null);
  };

  const PaymentCard = ({ payment }: { payment: PaymentRecord }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{payment.tenantName}</p>
            <p className="text-xs text-muted-foreground">{payment.propertyAddress}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">${payment.amount.toLocaleString()}</p>
            {statusBadge(payment.status)}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due: {payment.dueDate}</span>
            {payment.paidDate && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Paid: {payment.paidDate}</span>}
            {payment.autopay && <Badge variant="outline" className="text-xs"><RotateCcw className="h-3 w-3 mr-1" /> Autopay</Badge>}
          </div>
          {(payment.status === 'pending' || payment.status === 'overdue') && (
            <Button size="sm" variant="outline" onClick={() => setShowReminder(payment.id)}>
              <Send className="h-3 w-3 mr-1" /> Remind
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">${totalCollected.toLocaleString()}</p><p className="text-xs text-muted-foreground">Collected</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">${totalPending.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">${totalOverdue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Overdue</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{autopayCount}</p><p className="text-xs text-muted-foreground">Autopay Enrolled</p></CardContent></Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paidPayments.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingPayments.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overduePayments.length})</TabsTrigger>
        </TabsList>

        {(['all', 'paid', 'pending', 'overdue'] as const).map(tab => {
          const list = tab === 'all' ? payments : tab === 'paid' ? paidPayments : tab === 'pending' ? pendingPayments : overduePayments;
          return (
            <TabsContent key={tab} value={tab}>
              {list.length ? (
                <div className="space-y-3">{list.map(p => <PaymentCard key={p.id} payment={p} />)}</div>
              ) : (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No {tab} payments.</CardContent></Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Reminder Dialog */}
      <Dialog open={!!showReminder} onOpenChange={o => { if (!o) setShowReminder(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Payment Reminder</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            A payment reminder will be sent to the tenant via email and in-app notification.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminder(null)}>Cancel</Button>
            <Button onClick={() => showReminder && handleSendReminder(showReminder)}>Send Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentCollectionHub;
