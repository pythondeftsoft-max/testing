import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Plus,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

const LandlordPaymentsPanel = () => {
  const { user } = useAuth();
  const { 
    reminders, 
    loading, 
    sendReminder, 
    markAsCompleted, 
    generateMonthlyReminders,
    refetchReminders 
  } = usePaymentReminders(user?.id, 'landlord');
  
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [markingCompleted, setMarkingCompleted] = useState<string | null>(null);
  const [generatingReminders, setGeneratingReminders] = useState(false);

  const handleSendReminder = async (reminderId: string) => {
    setSendingReminder(reminderId);
    await sendReminder(reminderId);
    setSendingReminder(null);
  };

  const handleMarkCompleted = async (reminderId: string) => {
    setMarkingCompleted(reminderId);
    await markAsCompleted(reminderId);
    setMarkingCompleted(null);
  };

  const handleGenerateMonthlyReminders = async () => {
    setGeneratingReminders(true);
    await generateMonthlyReminders();
    setGeneratingReminders(false);
  };

  const getStatusBadge = (reminder: any) => {
    if (reminder.status === 'completed') {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
    }
    
    const dueDate = new Date(reminder.due_date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Overdue</Badge>;
    }
    if (diffDays <= 3) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Due Soon</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Upcoming</Badge>;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const pendingReminders = reminders.filter(r => r.status !== 'completed');
  const completedReminders = reminders.filter(r => r.status === 'completed');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payment Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-blue-gold text-white relative overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Payment Reminders
              </h1>
              <p className="text-white/90 text-lg">
                Manage rent payments and keep tenants on track
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleGenerateMonthlyReminders}
                disabled={generatingReminders}
                variant="outline"
                className="bg-white text-openkey-blue border-openkey-blue/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                {generatingReminders ? 'Generating...' : 'Generate Monthly'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold">{pendingReminders.length}</p>
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
                  {pendingReminders.filter(r => new Date(r.due_date) < new Date()).length}
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
                <p className="text-lg font-semibold">{completedReminders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-lg font-semibold">
                  ${pendingReminders.reduce((sum, r) => sum + r.amount_due, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending reminders */}
      {pendingReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Payment Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{reminder.property?.address}</h4>
                      {getStatusBadge(reminder)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Tenant: {reminder.tenant?.first_name} {reminder.tenant?.last_name}</p>
                      <p>Amount: ${reminder.amount_due.toLocaleString()}</p>
                      <p>{getDaysUntilDue(reminder.due_date)}</p>
                      {reminder.sent_date && (
                        <p>Last reminder: {format(new Date(reminder.sent_date), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendReminder(reminder.id)}
                      disabled={sendingReminder === reminder.id}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendingReminder === reminder.id ? 'Sending...' : 'Send Reminder'}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleMarkCompleted(reminder.id)}
                      disabled={markingCompleted === reminder.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {markingCompleted === reminder.id ? 'Marking...' : 'Mark Paid'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {reminders.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Payment Reminders</h3>
            <p className="text-muted-foreground mb-4">
              Generate monthly payment reminders for your tenants to keep track of rent payments.
            </p>
            <Button onClick={handleGenerateMonthlyReminders} disabled={generatingReminders}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Monthly Reminders
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed reminders (collapsed) */}
      {completedReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Recent Completed Payments ({completedReminders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedReminders.slice(0, 5).map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium">{reminder.property?.address}</div>
                    <div className="text-sm text-muted-foreground">
                      {reminder.tenant?.first_name} {reminder.tenant?.last_name} • 
                      Due: {format(new Date(reminder.due_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${reminder.amount_due.toLocaleString()}</div>
                    <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>
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

export default LandlordPaymentsPanel;