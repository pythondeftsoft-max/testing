import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { useAuth } from '@/hooks/useAuth';
import { NextPaymentCalendar } from '@/components/voucher/NextPaymentCalendar';

interface PaymentSchedule {
  type: 'hap' | 'tenant';
  dueDate: string;
  amount: number;
  status: 'upcoming' | 'due' | 'overdue' | 'received';
}

interface TenantPaymentsTabProps {
  propertyId?: string; // Optional property ID for asset-specific context
}

const TenantPaymentsTab = ({ propertyId }: TenantPaymentsTabProps = {}) => {
  const { user } = useAuth();
  const { reminders, loading } = usePaymentReminders(user?.id, 'tenant');

  const getStatusFromReminder = (reminder: any): PaymentSchedule['status'] => {
    if (reminder.status === 'completed') return 'received';
    
    const dueDate = new Date(reminder.due_date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'due';
    return 'upcoming';
  };

  // Filter reminders by property ID if specified (for asset context)
  const filteredReminders = propertyId 
    ? reminders.filter(reminder => reminder.property_id === propertyId)
    : reminders;

  const payments: PaymentSchedule[] = filteredReminders.map(reminder => ({
    type: 'tenant',
    dueDate: reminder.due_date,
    amount: reminder.amount_due,
    status: getStatusFromReminder(reminder),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const upcomingPayments = payments.filter(p => ['upcoming', 'due', 'overdue'].includes(p.status));
  const completedPayments = payments.filter(p => p.status === 'received');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">
          {propertyId ? 'Asset Payment Schedule' : 'Payment Schedule'}
        </h2>
        {propertyId && (
          <span className="text-sm text-muted-foreground">
            (Filtered by selected asset)
          </span>
        )}
      </div>

      {/* Payment Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Next Due</p>
                <p className="text-lg font-semibold">
                  {upcomingPayments.length > 0 
                    ? `$${upcomingPayments[0]?.amount.toLocaleString()}`
                    : 'No payments due'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-lg font-semibold">
                  {payments.filter(p => p.status === 'overdue').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold">{completedPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Calendar */}
      {payments.length > 0 ? (
        <NextPaymentCalendar payments={payments} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payment Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payment reminders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your payment schedule will appear here once set up by your landlord
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Recent Payment Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredReminders.slice(0, 5).map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{reminder.property?.address}</div>
                    <div className="text-sm text-muted-foreground">
                      Due: {new Date(reminder.due_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${reminder.amount_due.toLocaleString()}</span>
                    <Badge variant={reminder.status === 'completed' ? 'default' : 'secondary'}>
                      {reminder.status === 'completed' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenantPaymentsTab;