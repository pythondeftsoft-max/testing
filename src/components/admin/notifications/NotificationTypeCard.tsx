import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { NotificationTypeStats } from '@/hooks/useNotificationTypeAnalytics';
import { LinkValidationBadge } from './LinkValidationBadge';
import { NotificationExamplesDialog } from './NotificationExamplesDialog';
import { EditNotificationDialog } from './EditNotificationDialog';
import { ExternalLink, CheckCircle2, AlertCircle, Send, Zap, Loader2, Eye, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { TENANT_NOTIFICATION_TRIGGERS, LANDLORD_NOTIFICATION_TRIGGERS } from '@/utils/notificationTriggers';
import { useSendTestNotification } from '@/hooks/useSendTestNotification';
import { useNotificationConfigurations } from '@/hooks/useNotificationConfiguration';
import { toast } from 'sonner';

interface NotificationTypeCardProps {
  stat: NotificationTypeStats;
}

export const NotificationTypeCard = ({ stat }: NotificationTypeCardProps) => {
  const [showExamples, setShowExamples] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const isNeverSent = stat.status === 'never_sent';
  const { mutate: sendTestNotification, isPending: isSendingTest } = useSendTestNotification();
  const { data: customConfigs } = useNotificationConfigurations();

  // Find custom config for this notification type
  const customConfig = customConfigs?.find(
    c => c.notification_type === stat.type && c.user_type === stat.userType
  );

  const triggerInfo = stat.userType === 'tenant' 
    ? TENANT_NOTIFICATION_TRIGGERS[stat.type]
    : LANDLORD_NOTIFICATION_TRIGGERS[stat.type];

  // Use custom values if available, otherwise use defaults
  const displayRoute = customConfig?.custom_link || stat.route;
  const displayTrigger = customConfig?.custom_trigger || triggerInfo?.trigger;

  const handleTestLink = () => {
    if (displayRoute) {
      setShowPreview(true);
    }
  };

  const handleSendTest = () => {
    if (!triggerInfo) {
      toast.error("No test data available for this notification type");
      return;
    }

    sendTestNotification({
      notificationType: stat.type,
      userType: stat.userType,
      notificationData: triggerInfo.testData,
      link: displayRoute || '/dashboard',
      category: stat.category,
    });
  };

  return (
    <>
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{stat.type}</h3>
              {stat.category && (
                <span className="text-sm text-muted-foreground">({stat.category})</span>
              )}
              <Badge variant="outline" className={`gap-1 ${stat.userType === 'tenant' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' : 'bg-purple-500/10 text-purple-700 border-purple-500/20'}`}>
                {stat.userType === 'tenant' ? '👤 Tenant' : '🏢 Landlord'}
              </Badge>
              <LinkValidationBadge status={stat.linkStatus} route={stat.route} />
              {isNeverSent ? (
                <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                  <AlertCircle className="h-3 w-3" />
                  Never Sent
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Active ({stat.total_count})
                </Badge>
              )}
            </div>
            
            {isNeverSent ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground italic">
                  This notification hasn't been sent yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Defined in code and ready to use when triggered
                </p>
              </div>
            ) : (
              stat.examples[0] && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {stat.examples[0].title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {stat.examples[0].description}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Trigger Information */}
        {displayTrigger && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-900">
                  Triggered when:
                  {customConfig?.custom_trigger && (
                    <Badge variant="secondary" className="ml-2 text-xs bg-blue-500/10 text-blue-700">
                      Custom
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-amber-800 mt-1">{displayTrigger}</p>
              </div>
            </div>
          </div>
        )}

        {!triggerInfo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              ⚠️ No trigger information available for this notification type
            </p>
          </div>
        )}

        {/* Notification Link */}
        {displayRoute && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs font-mono">
            <code className="flex-1 truncate">{displayRoute}</code>
            {customConfig?.custom_link && (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700">
                Custom
              </Badge>
            )}
          </div>
        )}

        {!isNeverSent && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Sent</p>
              <p className="font-semibold text-lg">{stat.total_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last 24h</p>
              <p className="font-semibold text-lg">{stat.last_24h}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Unread</p>
              <p className="font-semibold text-lg">{stat.unread_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">No Link</p>
              <p className="font-semibold text-lg">{stat.no_link_count}</p>
            </div>
          </div>
        )}

        {isNeverSent && (
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">
              <span className="font-medium">Status:</span> Ready to use when triggered in the system
            </p>
          </div>
        )}

        {/* Action Buttons - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit2 className="w-3 h-3 mr-1" />
            Edit Config
          </Button>
          
          {displayRoute && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestLink}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Test Link
            </Button>
          )}
          
          {/* If no route, add empty div to maintain grid */}
          {!displayRoute && <div />}
          
          {triggerInfo && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSendTest}
              disabled={isSendingTest}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSendingTest ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Send className="w-3 h-3 mr-1" />
              )}
              Send Test
            </Button>
          )}
          
          {/* If no trigger, add empty div to maintain grid */}
          {!triggerInfo && <div />}
          
          {stat.examples && stat.examples.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExamples(true)}
            >
              <Eye className="w-3 h-3 mr-1" />
              Examples ({stat.examples.length})
            </Button>
          )}
        </div>
      </Card>

      {!isNeverSent && (
        <NotificationExamplesDialog
          open={showExamples}
          onOpenChange={setShowExamples}
          notificationType={stat.type}
          examples={stat.examples}
        />
      )}

      <EditNotificationDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        notification={stat}
        customConfig={customConfig}
      />

      {/* Page Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-2 pb-1 border-b space-y-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base">Page Preview: {stat.type}</DialogTitle>
                <DialogDescription className="flex items-center gap-1">
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                    {displayRoute}
                  </span>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(displayRoute, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Open in New Tab
                </Button>
                <DialogClose asChild>
                  <Button variant="secondary" size="sm">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 relative overflow-hidden min-h-0">
            {displayRoute ? (
              <iframe
                src={`${displayRoute
                  .replace('{portfolio_id}', 'everything')
                  .replace('{property_id}', 'preview')
                  .replace('{unit_id}', 'preview')
                  .replace('{tenant_id}', 'preview')}${displayRoute.includes('?') ? '&' : '?'}previewAs=${stat.userType}`}
                className="w-full h-full border-0 block"
                title={`Preview of ${stat.type}`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No link available to preview
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
