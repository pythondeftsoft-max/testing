import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Image, Upload, Users, Settings, GraduationCap, X, ArrowRight, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  onTabChange?: (tab: string) => void;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  navTab?: string;
  checkFn: () => Promise<boolean>;
}

const AgencyOnboardingChecklist: React.FC<Props> = ({ agencyId, onTabChange }) => {
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  const steps: Step[] = [
    {
      id: 'profile',
      label: 'Set Up Agency Profile',
      description: 'Add your agency name, address, PHA code, and contact info',
      icon: <Settings className="w-4 h-4" />,
      navTab: 'settings',
      checkFn: async () => {
        const { data } = await supabase.from('housing_authorities').select('name, pha_code').eq('id', agencyId).single();
        const { data: contact } = await (supabase as any).rpc('get_housing_authority_contact', { _id: agencyId });
        const c = Array.isArray(contact) ? contact[0] : contact;
        return !!(data?.name && data?.pha_code && c?.phone);
      },
    },
    {
      id: 'programs',
      label: 'Enable Housing Programs',
      description: 'Pick which programs your PHA runs (HCV, Public Housing, VASH, EHV, etc.)',
      icon: <Layers className="w-4 h-4" />,
      navTab: 'admin',
      checkFn: async () => {
        const { data } = await (supabase as any)
          .from('agency_programs')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('is_enabled', true)
          .limit(1);
        return (data?.length || 0) >= 1;
      },
    },
    {
      id: 'staff',
      label: 'Invite Staff Members',
      description: 'Add caseworkers, inspectors, and supervisors',
      icon: <Users className="w-4 h-4" />,
      navTab: 'staff',
      checkFn: async () => {
        const { count } = await supabase.from('agency_staff').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId);
        return (count || 0) >= 2;
      },
    },
    {
      id: 'tenants',
      label: 'Import Tenant Data',
      description: 'Add tenants via CSV import or manual entry',
      icon: <Upload className="w-4 h-4" />,
      navTab: 'tenants',
      checkFn: async () => {
        const { count } = await supabase.from('agency_vouchers').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId);
        return (count || 0) >= 1;
      },
    },
    {
      id: 'settings',
      label: 'Configure Payment Settings',
      description: 'Set HAP payment day, fiscal year, and enrollment defaults',
      icon: <Settings className="w-4 h-4" />,
      navTab: 'settings',
      checkFn: async () => {
        const { data } = await supabase.from('housing_authorities').select('metadata').eq('id', agencyId).single();
        const meta = (data?.metadata as any) || {};
        return !!meta.hap_payment_day;
      },
    },
    {
      id: 'training',
      label: 'Complete Training',
      description: 'Review the platform walkthrough and key workflows',
      icon: <GraduationCap className="w-4 h-4" />,
      checkFn: async () => false, // Manual step
    },
  ];

  useEffect(() => {
    const checkAll = async () => {
      const { data } = await supabase.from('housing_authorities').select('onboarding_completed').eq('id', agencyId).single();
      if ((data as any)?.onboarding_completed) {
        setOnboardingDone(true);
        setLoading(false);
        return;
      }

      const results: Record<string, boolean> = {};
      for (const step of steps) {
        results[step.id] = await step.checkFn();
      }
      setCompleted(results);
      setLoading(false);
    };
    checkAll();
  }, [agencyId]);

  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  const markTrainingComplete = async () => {
    setCompleted(prev => ({ ...prev, training: true }));
    toast.success('Training marked as complete');
  };

  const dismissOnboarding = async () => {
    setDismissed(true);
    if (completedCount === steps.length) {
      await supabase.from('housing_authorities').update({ onboarding_completed: true } as any).eq('id', agencyId);
    }
  };

  if (onboardingDone || dismissed || loading) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">🚀 Getting Started</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps to set up your agency ({completedCount}/{steps.length})
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={dismissOnboarding}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {steps.map(step => {
            const done = completed[step.id];
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  done ? 'bg-success/5' : 'bg-background hover:bg-muted/50 cursor-pointer'
                }`}
                onClick={() => {
                  if (!done && step.navTab && onTabChange) onTabChange(step.navTab);
                  if (step.id === 'training' && !done) markTrainingComplete();
                }}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {!done && step.navTab && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgencyOnboardingChecklist;
