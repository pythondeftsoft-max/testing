import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, CreditCard, Building, AlertTriangle, CheckCircle, Trash2, Settings } from 'lucide-react';
import { useAutopay, type AutopaySchedule } from '@/hooks/useAutopay';
import { useToast } from '@/hooks/use-toast';

interface AutopayStatusCardProps {
  schedule: AutopaySchedule;
  propertyAddress: string;
  onEdit: (schedule: AutopaySchedule) => void;
  onToggle: (scheduleId: string, isActive: boolean) => void;
  onDelete: (scheduleId: string) => void;
}

export function AutopayStatusCard({ 
  schedule, 
  propertyAddress, 
  onEdit, 
  onToggle, 
  onDelete 
}: AutopayStatusCardProps) {
  const { loading } = useAutopay();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const handleToggleStatus = () => {
    onToggle(schedule.id, schedule.status !== 'active');
  };

  const handleEditClick = () => {
    onEdit(schedule);
  };

  const handleDeleteClick = () => {
    if (confirm('Are you sure you want to delete this autopay schedule? This action cannot be undone.')) {
      onDelete(schedule.id);
    }
  };

  const nextPaymentDate = new Date(schedule.next_payment_date);
  const isOverdue = nextPaymentDate < new Date() && schedule.status === 'active';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{propertyAddress}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {schedule.payment_method_type === 'card' ? (
                <CreditCard className="h-4 w-4" />
              ) : (
                <Building className="h-4 w-4" />
              )}
              {schedule.payment_method_type === 'card' ? 'Card' : 'Bank Account'} autopay
            </CardDescription>
          </div>
          <Badge variant={getStatusColor(schedule.status)} className="flex items-center gap-1">
            {getStatusIcon(schedule.status)}
            {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-semibold">${Number(schedule.amount).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Day</p>
            <p className="font-semibold">
              {schedule.autopay_day}
              {schedule.autopay_day === 1 ? 'st' : 
               schedule.autopay_day === 2 ? 'nd' : 
               schedule.autopay_day === 3 ? 'rd' : 'th'} of month
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Next Payment</p>
            <p className={`font-semibold ${isOverdue ? 'text-destructive' : ''}`}>
              {nextPaymentDate.toLocaleDateString()}
              {isOverdue && ' (Overdue)'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Failures</p>
            <p className="font-semibold">{schedule.failure_count || 0}</p>
          </div>
        </div>

        {schedule.last_failure_reason && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm font-medium text-destructive mb-1">Last Failure:</p>
            <p className="text-sm text-destructive/80">{schedule.last_failure_reason}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              checked={schedule.status === 'active'}
              onCheckedChange={handleToggleStatus}
              disabled={loading}
            />
            <span className="text-sm font-medium">
              {schedule.status === 'active' ? 'Active' : 'Paused'}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEditClick}
              disabled={loading}
            >
              <Settings className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDeleteClick}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}