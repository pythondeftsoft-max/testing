import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMfaEnrollmentStats, MfaEnrollmentStat } from '@/hooks/useMfaEnrollmentStats';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const ROLE_LABELS: Record<string, string> = {
  admin: 'OpenKey Admin',
  system_admin: 'System Admin',
  agency_admin: 'Agency Admin',
  agency_staff: 'Agency Staff',
  caseworker: 'Caseworker',
  caseworker_supervisor: 'Caseworker Supervisor',
  inspector: 'Inspector',
};

export const MfaEnrollmentWidget: React.FC = () => {
  const { data: stats, isLoading, error } = useMfaEnrollmentStats();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ role: string; enable: boolean } | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleConfirm = async () => {
    if (!pending) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          operation: 'update_mfa_enforcement',
          role_name: pending.role,
          required: pending.enable,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: pending.enable ? 'MFA enforcement enabled' : 'MFA enforcement disabled',
        description: `${ROLE_LABELS[pending.role] ?? pending.role} ${pending.enable
          ? 'users will be required to enroll on next login.'
          : 'users no longer required to use MFA.'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['mfa-enrollment-stats'] });
    } catch (e: any) {
      toast({
        title: 'Failed to update enforcement',
        description: e.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          MFA Enrollment & Enforcement
        </CardTitle>
        <CardDescription>
          Track multi-factor authentication coverage across privileged roles. Toggle enforcement
          to require MFA on the next login for all users in that role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading enrollment stats...
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive py-4">
            Failed to load MFA stats: {(error as Error).message}
          </div>
        )}
        {stats && (
          <div className="space-y-3">
            {stats.map((row: MfaEnrollmentStat) => (
              <RoleRow
                key={row.role_name}
                row={row}
                onToggle={(enable) => setPending({ role: row.role_name, enable })}
              />
            ))}
            {stats.length === 0 && (
              <div className="text-sm text-muted-foreground py-4">
                No privileged roles configured.
              </div>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pending?.enable ? (
                <ShieldAlert className="h-5 w-5 text-amber-500" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              )}
              {pending?.enable ? 'Enable MFA enforcement?' : 'Disable MFA enforcement?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.enable ? (
                <>
                  All <strong>{ROLE_LABELS[pending?.role ?? ''] ?? pending?.role}</strong> users
                  who haven't already enrolled will be required to set up MFA on their next login.
                  They won't be locked out — they'll be guided through enrollment immediately.
                </>
              ) : (
                <>
                  <strong>{ROLE_LABELS[pending?.role ?? ''] ?? pending?.role}</strong> users will
                  no longer be required to use MFA. Existing enrollments stay active.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending?.enable ? 'Enable enforcement' : 'Disable enforcement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

interface RoleRowProps {
  row: MfaEnrollmentStat;
  onToggle: (enable: boolean) => void;
}

const RoleRow: React.FC<RoleRowProps> = ({ row, onToggle }) => {
  const label = ROLE_LABELS[row.role_name] ?? row.role_name;
  return (
    <div className="flex items-center gap-4 p-3 rounded-md border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{label}</span>
          {row.enforcement_enabled ? (
            <Badge variant="default" className="text-xs">Enforced</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Optional</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Progress value={row.enrolled_pct} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
            {row.enrolled_users} / {row.total_users} ({row.enrolled_pct}%)
          </span>
        </div>
      </div>
      <Switch
        checked={row.enforcement_enabled}
        onCheckedChange={onToggle}
        aria-label={`Toggle MFA enforcement for ${label}`}
      />
    </div>
  );
};

export default MfaEnrollmentWidget;
