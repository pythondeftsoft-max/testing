import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, Mail, Smartphone, Clock } from 'lucide-react';
import { useNotificationPreferences, useUpsertNotificationPreference } from '@/hooks/useNotificationPreferences';

interface NotificationPreferencesPanelProps {
  userId: string;
  className?: string;
}

const NotificationPreferencesPanel: React.FC<NotificationPreferencesPanelProps> = ({
  userId,
  className = ''
}) => {
  const { data: preferences, isLoading } = useNotificationPreferences(userId);
  const upsertPreference = useUpsertNotificationPreference();

  // Local state for market alert preferences
  const [marketAlertPrefs, setMarketAlertPrefs] = useState({
    in_app_enabled: true,
    email_enabled: false,
    digest_mode: false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state from fetched preferences
  useEffect(() => {
    if (preferences) {
      const marketAlert = preferences.find(p => p.notification_type === 'market_alert');
      if (marketAlert) {
        setMarketAlertPrefs({
          in_app_enabled: marketAlert.in_app_enabled,
          email_enabled: marketAlert.email_enabled,
          digest_mode: marketAlert.digest_mode,
        });
      }
    }
  }, [preferences]);

  const handleInAppToggle = (enabled: boolean) => {
    setMarketAlertPrefs(prev => ({ ...prev, in_app_enabled: enabled }));
    setHasChanges(true);
  };

  const handleEmailToggle = (enabled: boolean) => {
    setMarketAlertPrefs(prev => ({ 
      ...prev, 
      email_enabled: enabled,
      // If disabling email, also disable digest mode
      digest_mode: enabled ? prev.digest_mode : false
    }));
    setHasChanges(true);
  };

  const handleFrequencyChange = (frequency: string) => {
    const digestMode = frequency === 'digest';
    setMarketAlertPrefs(prev => ({ ...prev, digest_mode: digestMode }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await upsertPreference.mutateAsync({
        notification_type: 'market_alert',
        ...marketAlertPrefs,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (preferences) {
      const marketAlert = preferences.find(p => p.notification_type === 'market_alert');
      if (marketAlert) {
        setMarketAlertPrefs({
          in_app_enabled: marketAlert.in_app_enabled,
          email_enabled: marketAlert.email_enabled,
          digest_mode: marketAlert.digest_mode,
        });
      }
    }
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Configure how you want to receive market alert notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Alerts Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Market Alerts</h3>
          </div>
          
          {/* In-App Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="in-app-alerts" className="font-medium">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">Show notifications in the app</p>
              </div>
            </div>
            <Switch
              id="in-app-alerts"
              checked={marketAlertPrefs.in_app_enabled}
              onCheckedChange={handleInAppToggle}
            />
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="email-alerts" className="font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts via email</p>
              </div>
            </div>
            <Switch
              id="email-alerts"
              checked={marketAlertPrefs.email_enabled}
              onCheckedChange={handleEmailToggle}
            />
          </div>

          {/* Email Frequency */}
          {marketAlertPrefs.email_enabled && (
            <div className="ml-7 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Email Frequency</Label>
              </div>
              <RadioGroup
                value={marketAlertPrefs.digest_mode ? 'digest' : 'immediate'}
                onValueChange={handleFrequencyChange}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="immediate" id="immediate" />
                  <Label htmlFor="immediate" className="text-sm">
                    Immediate - Send email when alert triggers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="digest" id="digest" />
                  <Label htmlFor="digest" className="text-sm">
                    Daily Digest - Summary of alerts once per day
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave}
              disabled={upsertPreference.isPending}
            >
              {upsertPreference.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleCancel}
              disabled={upsertPreference.isPending}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesPanel;