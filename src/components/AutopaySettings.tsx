import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, Settings, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface AutopaySchedule {
  id: string;
  tenant_id: string;
  property_id: string;
  autopay_day: number;
  amount: number;
  status: string;
  currency_code: string;
  next_payment_date: string;
  payment_method_type: string;
}

interface AutopaySettingsProps {
  propertyId: string;
  propertyName: string;
  monthlyAmount: number;
  onAutopayChange?: (enabled: boolean) => void;
}

export const AutopaySettings = ({ 
  propertyId, 
  propertyName, 
  monthlyAmount,
  onAutopayChange 
}: AutopaySettingsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [autopaySchedule, setAutopaySchedule] = useState<AutopaySchedule | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    fetchAutopaySchedule();
  }, [propertyId]);

  const fetchAutopaySchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('autopay_schedules')
        .select('*')
        .eq('property_id', propertyId)
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error fetching autopay schedule:', error);
        return;
      }

      if (data) {
        setAutopaySchedule(data);
        setEnabled(true);
        setSelectedDay(data.autopay_day);
      }
    } catch (error) {
      console.error('Error fetching autopay schedule:', error);
    }
  };

  const handleToggleAutopay = async (checked: boolean) => {
    if (!checked) {
      // Disable autopay
      await disableAutopay();
    } else {
      // Enable autopay
      await enableAutopay();
    }
  };

  const enableAutopay = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate next payment date
      const nextPaymentDate = calculateNextPaymentDate(selectedDay);

      const autopayData = {
        tenant_id: user.id,
        property_id: propertyId,
        autopay_day: selectedDay,
        amount: monthlyAmount,
        next_payment_date: nextPaymentDate,
        currency_code: 'USD',
        payment_method_id: 'reminder_only', // Phase 1: reminder only
        payment_method_type: 'reminder',
        status: 'active'
      };

      if (autopaySchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('autopay_schedules')
          .update(autopayData)
          .eq('id', autopaySchedule.id);

        if (error) throw error;
      } else {
        // Create new schedule
        const { data, error } = await supabase
          .from('autopay_schedules')
          .insert(autopayData)
          .select()
          .single();

        if (error) throw error;
        setAutopaySchedule(data);
      }

      setEnabled(true);
      onAutopayChange?.(true);

      toast({
        title: "Autopay Enabled",
        description: `Monthly reminders will be sent on the ${selectedDay}${getOrdinalSuffix(selectedDay)} of each month`,
      });
    } catch (error) {
      console.error('Error enabling autopay:', error);
      toast({
        title: "Error",
        description: "Failed to enable autopay. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disableAutopay = async () => {
    if (!autopaySchedule) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('autopay_schedules')
        .update({ status: 'cancelled' })
        .eq('id', autopaySchedule.id);

      if (error) throw error;

      setEnabled(false);
      setAutopaySchedule(null);
      onAutopayChange?.(false);

      toast({
        title: "Autopay Disabled",
        description: "Monthly payment reminders have been turned off",
      });
    } catch (error) {
      console.error('Error disabling autopay:', error);
      toast({
        title: "Error",
        description: "Failed to disable autopay. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (day: string) => {
    setSelectedDay(parseInt(day));
    if (enabled && autopaySchedule) {
      // Update existing schedule
      updateAutopayDay(parseInt(day));
    }
  };

  const updateAutopayDay = async (day: number) => {
    if (!autopaySchedule) return;

    try {
      const nextPaymentDate = calculateNextPaymentDate(day);
      
      const { error } = await supabase
        .from('autopay_schedules')
        .update({ 
          autopay_day: day,
          next_payment_date: nextPaymentDate
        })
        .eq('id', autopaySchedule.id);

      if (error) throw error;

      setAutopaySchedule(prev => prev ? {
        ...prev,
        autopay_day: day,
        next_payment_date: nextPaymentDate
      } : null);

      toast({
        title: "Autopay Updated",
        description: `Payment reminders will now be sent on the ${day}${getOrdinalSuffix(day)} of each month`,
      });
    } catch (error) {
      console.error('Error updating autopay day:', error);
      toast({
        title: "Error",
        description: "Failed to update autopay day",
        variant: "destructive",
      });
    }
  };

  const calculateNextPaymentDate = (day: number): string => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let nextPaymentDate = new Date(currentYear, currentMonth, day);
    
    // If the payment day has already passed this month, move to next month
    if (nextPaymentDate <= today) {
      nextPaymentDate = new Date(currentYear, currentMonth + 1, day);
    }
    
    return nextPaymentDate.toISOString().split('T')[0];
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const getNextPaymentText = (): string => {
    if (!autopaySchedule?.next_payment_date) return '';
    
    const nextDate = new Date(autopaySchedule.next_payment_date);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return nextDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          Autopay Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Enable Autopay Reminders</div>
            <div className="text-xs text-muted-foreground">
              Get payment reminders via email
            </div>
          </div>
          <Switch 
            checked={enabled}
            onCheckedChange={handleToggleAutopay}
            disabled={loading}
          />
        </div>

        {/* Day Selection */}
        {(enabled || autopaySchedule) && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Reminder Day of Month</label>
            <Select 
              value={selectedDay.toString()} 
              onValueChange={handleDayChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}{getOrdinalSuffix(day)} of each month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Display */}
        {enabled && autopaySchedule && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-success text-success-foreground">
                <CreditCard className="h-3 w-3 mr-1" />
                Active
              </Badge>
              <span className="text-sm text-muted-foreground">
                Payment reminders enabled
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Monthly Amount</div>
                <CurrencyDisplay 
                  amount={autopaySchedule.amount} 
                  className="font-medium"
                />
              </div>
              <div>
                <div className="text-muted-foreground">Next Reminder</div>
                <div className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {getNextPaymentText()}
                </div>
              </div>
            </div>

            <div className="bg-info/10 border border-info/20 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-info mb-1">Phase 1: Email Reminders</div>
                  <div className="text-muted-foreground">
                    You'll receive email reminders with a payment link. 
                    Automatic charging will be available in a future update.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};