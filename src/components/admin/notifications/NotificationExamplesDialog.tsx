import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import EnhancedNotificationCard from '@/components/notifications/EnhancedNotificationCard';

interface NotificationExample {
  id: string;
  title: string;
  description: string;
  link: string | null;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  read: boolean;
  action_type?: string;
  action_data?: any;
}

interface NotificationExamplesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationType: string;
  examples: NotificationExample[];
}

export const NotificationExamplesDialog = ({
  open,
  onOpenChange,
  notificationType,
  examples,
}: NotificationExamplesDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recent Examples: {notificationType}</DialogTitle>
          <DialogDescription>
            Showing up to 5 recent notifications of this type
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-3">
            {examples.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No examples found for this notification type
              </p>
            ) : (
              examples.map((example) => (
                <div key={example.id} className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-xs bg-muted px-2 py-1 rounded-md border text-muted-foreground">
                      Preview Only
                    </span>
                  </div>
                  <EnhancedNotificationCard
                    notification={example}
                    onRead={() => {}}
                    onDelete={() => {}}
                    onAction={() => {}}
                    onNavigate={() => {}}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
