
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentSchedule {
  type: 'hap' | 'tenant';
  dueDate: string;
  amount: number;
  status: 'upcoming' | 'due' | 'overdue' | 'received';
}

interface NextPaymentCalendarProps {
  payments: PaymentSchedule[];
  className?: string;
}

export const NextPaymentCalendar = ({ payments, className }: NextPaymentCalendarProps) => {
  const getStatusIcon = (status: PaymentSchedule['status']) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="h-4 w-4 text-[#bf9000]" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'due':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: PaymentSchedule['status']) => {
    const variants = {
      received: 'text-white border-transparent bg-[#bf9000]',
      overdue: 'bg-red-100 text-red-800 border-red-300',
      due: 'bg-amber-100 text-amber-800 border-amber-300',
      upcoming: 'bg-gray-100 text-gray-800 border-gray-300'
    };

    return (
      <Badge 
        variant="secondary" 
        className={cn(variants[status])}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeColor = (type: PaymentSchedule['type']) => {
    return type === 'hap' ? '#bf9000' : '#1e3a5f';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Payment Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {payments.map((payment, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(payment.status)}
                <div>
                  <div className="font-medium" style={{ color: getTypeColor(payment.type) }}>
                    {payment.type === 'hap' ? 'HAP Payment' : 'Tenant Payment'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Due: {new Date(payment.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">${payment.amount.toLocaleString()}</span>
                {getStatusBadge(payment.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
