import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscriptionPlans';

interface PlanManagementCardProps {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (planId: string) => void;
  onSync: (planId: string) => void;
  isSyncing?: boolean;
}

export const PlanManagementCard = ({ plan, onEdit, onDelete, onSync, isSyncing }: PlanManagementCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const getSyncStatus = () => {
    if (plan.price === 0) {
      return { icon: CheckCircle, color: 'text-muted-foreground', label: 'Free Plan' };
    }
    if (!plan.stripe_product_id || !plan.stripe_price_id) {
      return { icon: AlertCircle, color: 'text-warning', label: 'Not Synced' };
    }
    if (plan.stripe_synced_at) {
      const syncedDate = new Date(plan.stripe_synced_at);
      const now = new Date();
      const hoursSinceSync = (now.getTime() - syncedDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync < 24) {
        return { icon: CheckCircle, color: 'text-success', label: 'Synced' };
      }
      return { icon: Clock, color: 'text-warning', label: 'Needs Sync' };
    }
    return { icon: AlertCircle, color: 'text-destructive', label: 'Sync Failed' };
  };

  const syncStatus = getSyncStatus();
  const SyncIcon = syncStatus.icon;

  const formatPrice = () => {
    if (plan.price === 0) return 'Free';
    return `$${(plan.price / 100).toFixed(2)}/${plan.billing_interval}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {plan.name}
                {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
                <Badge variant="outline">{plan.role}</Badge>
              </CardTitle>
              <CardDescription>{plan.target_audience || 'No audience specified'}</CardDescription>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-2xl font-bold whitespace-nowrap">{formatPrice()}</div>
              <div className="flex items-center justify-end gap-1 text-xs mt-1 whitespace-nowrap">
                <SyncIcon className={`h-3 w-3 ${syncStatus.color}`} />
                <span className={syncStatus.color}>{syncStatus.label}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.description && (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          )}

          {plan.features && plan.features.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Features</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                {(showAllFeatures ? plan.features : plan.features.slice(0, 3)).map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              {plan.features.length > 3 && (
                <button
                  onClick={() => setShowAllFeatures(!showAllFeatures)}
                  className="text-xs text-primary hover:text-primary/80 hover:underline mt-1 transition-colors"
                >
                  {showAllFeatures 
                    ? '← Show less' 
                    : `...and ${plan.features.length - 3} more →`
                  }
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {plan.limits?.properties && (
              <Badge variant="secondary">
                Properties: {plan.limits.properties === 'unlimited' ? '∞' : plan.limits.properties}
              </Badge>
            )}
            {plan.limits?.applications && (
              <Badge variant="secondary">
                Applications: {plan.limits.applications === 'unlimited' ? '∞' : plan.limits.applications}
              </Badge>
            )}
            {plan.limits?.managementUnits && (
              <Badge variant="secondary">
                Management Units: {plan.limits.managementUnits === 'unlimited' ? '∞' : plan.limits.managementUnits}
              </Badge>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(plan)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            {plan.price > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSync(plan.id)}
                disabled={isSyncing}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{plan.name}"? This action cannot be undone.
              Plans with active subscribers cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(plan.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
