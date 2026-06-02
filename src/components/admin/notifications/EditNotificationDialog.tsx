import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw } from 'lucide-react';
import { NotificationTypeStats } from '@/hooks/useNotificationTypeAnalytics';
import { 
  useSaveNotificationConfiguration, 
  useDeleteNotificationConfiguration 
} from '@/hooks/useNotificationConfiguration';
import { TENANT_NOTIFICATION_TRIGGERS, LANDLORD_NOTIFICATION_TRIGGERS } from '@/utils/notificationTriggers';
import { getNotificationLink } from '@/utils/notificationLinks';
import { getLandlordNotificationLink } from '@/utils/landlordNotificationLinks';

interface EditNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: NotificationTypeStats;
  customConfig?: {
    custom_link: string | null;
    custom_trigger: string | null;
    custom_category: string | null;
  };
}

export const EditNotificationDialog = ({
  open,
  onOpenChange,
  notification,
  customConfig,
}: EditNotificationDialogProps) => {
  const { mutate: saveConfig, isPending: isSaving } = useSaveNotificationConfiguration();
  const { mutate: deleteConfig, isPending: isDeleting } = useDeleteNotificationConfiguration();

  // Get default values
  const defaultTrigger = notification.userType === 'tenant'
    ? TENANT_NOTIFICATION_TRIGGERS[notification.type]?.trigger
    : LANDLORD_NOTIFICATION_TRIGGERS[notification.type]?.trigger;

  const defaultLink = notification.userType === 'tenant'
    ? getNotificationLink(notification.type, notification.category || undefined)
    : getLandlordNotificationLink(notification.type, notification.category || undefined);

  const [link, setLink] = useState(customConfig?.custom_link || defaultLink);
  const [trigger, setTrigger] = useState(customConfig?.custom_trigger || defaultTrigger || '');
  const [category, setCategory] = useState(customConfig?.custom_category || notification.category || '');

  const hasCustomConfig = !!customConfig;
  const isModified = 
    link !== defaultLink || 
    trigger !== (defaultTrigger || '') || 
    category !== (notification.category || '');

  useEffect(() => {
    if (open) {
      setLink(customConfig?.custom_link || defaultLink);
      setTrigger(customConfig?.custom_trigger || defaultTrigger || '');
      setCategory(customConfig?.custom_category || notification.category || '');
    }
  }, [open, customConfig, defaultLink, defaultTrigger, notification.category]);

  const handleSave = () => {
    saveConfig({
      notification_type: notification.type,
      user_type: notification.userType,
      custom_link: link !== defaultLink ? link : undefined,
      custom_trigger: trigger !== (defaultTrigger || '') ? trigger : undefined,
      custom_category: category !== (notification.category || '') ? category : undefined,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleReset = () => {
    if (hasCustomConfig) {
      deleteConfig({
        notification_type: notification.type,
        user_type: notification.userType,
      }, {
        onSuccess: () => {
          setLink(defaultLink);
          setTrigger(defaultTrigger || '');
          setCategory(notification.category || '');
        },
      });
    } else {
      setLink(defaultLink);
      setTrigger(defaultTrigger || '');
      setCategory(notification.category || '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Notification Configuration
            {hasCustomConfig && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">
                Custom
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Customize the link and trigger description for <strong>{notification.type}</strong>
            {' '}({notification.userType === 'tenant' ? 'Tenant' : 'Landlord'})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notification Link */}
          <div className="space-y-2">
            <Label htmlFor="link">Notification Link</Label>
            <Input
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/dashboard"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Default: <code className="bg-muted px-1 py-0.5 rounded">{defaultLink}</code>
            </p>
          </div>

          {/* Trigger Description */}
          <div className="space-y-2">
            <Label htmlFor="trigger">Trigger Description</Label>
            <Textarea
              id="trigger"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="Describe when this notification is triggered..."
              rows={3}
              className="resize-none"
            />
            {defaultTrigger && (
              <p className="text-xs text-muted-foreground">
                Default: {defaultTrigger}
              </p>
            )}
          </div>

          {/* Category (optional) */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Maintenance, Payment, Lease"
            />
            <p className="text-xs text-muted-foreground">
              Current: {notification.category || 'None'}
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> Custom configurations take precedence over code defaults. 
              Click "Reset to Default" to remove customizations.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || isDeleting || (!hasCustomConfig && !isModified)}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Reset to Default
          </Button>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isDeleting || !isModified}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
