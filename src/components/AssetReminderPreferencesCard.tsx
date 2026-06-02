
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Mail, Send, Eye, Calendar } from 'lucide-react';
import { useAssetReminderPreferences } from '@/hooks/useAssetReminderPreferences';
import { useReminderEmailLogs } from '@/hooks/useReminderEmailLogs';
import { useSendTestEmail } from '@/hooks/useSendTestEmail';
import { useSendTestDigest } from '@/hooks/useSendTestDigest';
import { formatDistanceToNow } from 'date-fns';

interface AssetReminderPreferencesCardProps {
  assetId: string;
  assetName: string;
  suggestedFrequency?: 'quarterly' | 'semi-annual' | 'annual';
}

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const AssetReminderPreferencesCard: React.FC<AssetReminderPreferencesCardProps> = ({
  assetId,
  assetName,
}) => {
  const { preferences, updatePreferences, isUpdating } = useAssetReminderPreferences(assetId);
  const { data: emailLogs } = useReminderEmailLogs(preferences?.id || '');
  const sendTestEmail = useSendTestEmail();
  const sendTestDigest = useSendTestDigest();

  const handleToggleEnabled = (enabled: boolean) => {
    updatePreferences({ is_enabled: enabled });
  };

  const handleFrequencyChange = (frequency: 'quarterly' | 'semi-annual' | 'annual') => {
    updatePreferences({ frequency });
  };

  const handleEmailEnabledChange = (emailEnabled: boolean) => {
    updatePreferences({ email_enabled: emailEnabled });
  };

  const handleDeliveryChannelChange = (channel: 'in_app' | 'email' | 'both') => {
    updatePreferences({ delivery_channel: channel });
  };

  const handleDigestIntervalChange = (interval: 'immediate' | 'daily' | 'weekly') => {
    const updates: any = { digest_interval: interval };
    
    // If switching to weekly, set a default day (Monday)
    if (interval === 'weekly' && !preferences?.digest_day_of_week) {
      updates.digest_day_of_week = 1;
    }
    
    updatePreferences(updates);
  };

  const handleDigestDayChange = (dayOfWeek: number) => {
    updatePreferences({ digest_day_of_week: dayOfWeek });
  };

  const handleSendTimeChange = (hour: number) => {
    updatePreferences({ preferred_send_hour: hour });
  };

  const handleTimezoneChange = (timezone: string) => {
    updatePreferences({ timezone });
  };

  const handleSendTestEmail = () => {
    if (preferences?.id) {
      sendTestEmail.mutate(preferences.id);
    }
  };

  const handleSendTestDigest = () => {
    if (preferences?.id) {
      sendTestDigest.mutate(preferences.id);
    }
  };

  const isEmailEnabled = preferences?.email_enabled && 
    (preferences?.delivery_channel === 'email' || preferences?.delivery_channel === 'both');

  const isDigestMode = preferences?.digest_interval === 'daily' || preferences?.digest_interval === 'weekly';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Financial Update Reminders
        </CardTitle>
        <CardDescription>
          Configure how and when you receive reminders to update financial information for {assetName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Reminders</Label>
            <div className="text-sm text-muted-foreground">
              Receive periodic reminders to update asset financial information
            </div>
          </div>
          <Switch
            checked={preferences?.is_enabled || false}
            onCheckedChange={handleToggleEnabled}
            disabled={isUpdating}
          />
        </div>

        {preferences?.is_enabled && (
          <>
            <Separator />

            {/* Reminder Frequency */}
            <div className="space-y-3">
              <Label className="text-base">Reminder Frequency</Label>
              <Select
                value={preferences.frequency}
                onValueChange={handleFrequencyChange}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly (every 3 months)</SelectItem>
                  <SelectItem value="semi-annual">Semi-annual (every 6 months)</SelectItem>
                  <SelectItem value="annual">Annual (every 12 months)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Email Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label className="text-base">Email Notifications</Label>
              </div>

              {/* Email Enabled Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive reminder emails in addition to in-app notifications
                  </div>
                </div>
                <Switch
                  checked={preferences?.email_enabled || false}
                  onCheckedChange={handleEmailEnabledChange}
                  disabled={isUpdating}
                />
              </div>

              {preferences?.email_enabled && (
                <>
                  {/* Delivery Channel */}
                  <div className="space-y-3">
                    <Label>Delivery Channel</Label>
                    <Select
                      value={preferences.delivery_channel || 'both'}
                      onValueChange={handleDeliveryChannelChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_app">In-app only</SelectItem>
                        <SelectItem value="email">Email only</SelectItem>
                        <SelectItem value="both">Both in-app and email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Digest Settings */}
                  <div className="space-y-3">
                    <Label>Email Grouping</Label>
                    <Select
                      value={preferences.digest_interval || 'immediate'}
                      onValueChange={handleDigestIntervalChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select email grouping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Send immediately</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                        <SelectItem value="weekly">Weekly digest</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground">
                      {preferences?.digest_interval === 'immediate' && 'Each reminder sent as individual email'}
                      {preferences?.digest_interval === 'daily' && 'Group all reminders into a daily summary email'}
                      {preferences?.digest_interval === 'weekly' && 'Group all reminders into a weekly summary email'}
                    </div>
                  </div>

                  {/* Weekly Digest Day Selection */}
                  {preferences?.digest_interval === 'weekly' && (
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Weekly Digest Day
                      </Label>
                      <Select
                        value={preferences.digest_day_of_week?.toString() || '1'}
                        onValueChange={(value) => handleDigestDayChange(parseInt(value))}
                        disabled={isUpdating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day of week" />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAY_OPTIONS.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Send Time and Timezone (only for digest modes) */}
                  {isDigestMode && (
                    <>
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Preferred Send Time
                        </Label>
                        <Select
                          value={preferences.preferred_send_hour?.toString() || '9'}
                          onValueChange={(value) => handleSendTimeChange(parseInt(value))}
                          disabled={isUpdating}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}:00 
                                {i === 0 ? ' (Midnight)' : i === 12 ? ' (Noon)' : i < 12 ? ' AM' : ' PM'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label>Timezone</Label>
                        <Select
                          value={preferences.timezone || 'UTC'}
                          onValueChange={handleTimezoneChange}
                          disabled={isUpdating}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONE_OPTIONS.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Test and Monitoring Section */}
            {isEmailEnabled && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base">Testing & Monitoring</Label>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isDigestMode ? handleSendTestDigest : handleSendTestEmail}
                      disabled={sendTestEmail.isPending || sendTestDigest.isPending}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {isDigestMode ? 'Preview Digest' : 'Send Test Email'}
                    </Button>
                  </div>

                  {/* Delivery Log */}
                  {emailLogs && emailLogs.length > 0 && (
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Recent Delivery Log
                      </Label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {emailLogs.slice(0, 5).map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  log.status === 'sent' ? 'default' :
                                  log.status === 'failed' ? 'destructive' : 'secondary'
                                }
                              >
                                {log.status}
                              </Badge>
                              {log.error_message && (
                                <span className="text-destructive text-xs">
                                  {log.error_message}
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Status Info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              {preferences.next_reminder_date && (
                <p>Next reminder: {new Date(preferences.next_reminder_date).toLocaleDateString()}</p>
              )}
              {preferences.last_email_sent_at && (
                <p>
                  Last email sent: {formatDistanceToNow(new Date(preferences.last_email_sent_at), { addSuffix: true })}
                </p>
              )}
              <p>Reminder count: {preferences.reminder_count || 0}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
