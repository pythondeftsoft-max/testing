import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Loader2, Building2, Palette, Users, Upload, Bell, Rocket, Banknote } from 'lucide-react';
import WelcomeStep from './onboarding/WelcomeStep';
import BrandingStep from './onboarding/BrandingStep';
import StaffStep from './onboarding/StaffStep';
import CaseloadStep from './onboarding/CaseloadStep';
import LandlordsStep from './onboarding/LandlordsStep';
import InspectorsStep from './onboarding/InspectorsStep';
import NotificationsStep from './onboarding/NotificationsStep';
import PaymentRailsStep from './onboarding/PaymentRailsStep';
import GoLiveStep from './onboarding/GoLiveStep';

interface Props {
  agencyId: string;
  onComplete?: () => void;
}

const STEPS = ['Welcome', 'Branding', 'Staff', 'Caseload', 'Landlords', 'Inspectors', 'Notifications', 'Payments', 'Go Live'];

export const OnboardingWizard: React.FC<Props> = ({ agencyId, onComplete }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [agency, setAgency] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: prog }, { data: ag }] = await Promise.all([
        supabase.from('agency_onboarding_progress').select('*').eq('agency_id', agencyId).maybeSingle(),
        supabase.from('housing_authorities').select('id, name, slug, city, state, country, website, address, zipcode, zip, pha_code, latitude, longitude, is_active, is_onboarded, onboarding_completed, onboarding_step, tenant_count, metadata, default_required_docs, accepted_payment_methods, hap_block_unready_landlords, registry_status, is_archived, created_at, updated_at').eq('id', agencyId).single(),
      ]);
      setAgency(ag);
      if (prog) {
        setCurrentStep(Math.max(0, Math.min((prog.current_step || 1) - 1, STEPS.length - 1)));
        setCompletedSteps(prog.completed_steps || []);
      } else {
        await supabase.from('agency_onboarding_progress').insert({
          agency_id: agencyId,
          current_step: 1,
          completed_steps: [],
          step_data: {},
        });
      }
    };
    load();
  }, [agencyId]);

  const persist = async (nextStep: number, completed: number[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agency_onboarding_progress')
        .update({
          current_step: nextStep + 1,
          completed_steps: completed,
        })
        .eq('agency_id', agencyId);
      if (error) throw error;
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    const newCompleted = Array.from(new Set([...completedSteps, currentStep]));
    const nextStep = Math.min(currentStep + 1, STEPS.length - 1);
    setCompletedSteps(newCompleted);
    setCurrentStep(nextStep);
    await persist(nextStep, newCompleted);
  };

  const goBack = () => setCurrentStep(Math.max(0, currentStep - 1));

  const handleFinish = async () => {
    setSaving(true);
    try {
      await Promise.all([
        supabase.from('agency_onboarding_progress').update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_steps: STEPS.map((_, i) => i),
        }).eq('agency_id', agencyId),
        supabase.from('housing_authorities').update({
          is_onboarded: true,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        }).eq('id', agencyId),
      ]);
      toast({ title: '🎉 Onboarding complete!', description: 'Your agency is live.' });
      onComplete?.();
    } catch (e: any) {
      toast({ title: 'Failed to finish', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!agency) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const stepIcons = [Building2, Palette, Users, Upload, Upload, Upload, Bell, Banknote, Rocket];
  const StepIcon = stepIcons[currentStep];
  const stepDescriptions = [
    "Let's confirm your agency information.",
    'Upload your logo and pick brand colors for your tenant/landlord portals.',
    'Invite your team — caseworkers, inspectors, finance, etc.',
    'Import your existing tenant and voucher data — drop CSV/XLSX or HUD-50058 PDFs.',
    'Bring your landlords across — drop a roster CSV or W-9 PDFs.',
    'Invite or import your inspector roster and territories.',
    'Configure default notification preferences for your stakeholders.',
    'Connect a payment processor for HAP disbursements (optional now).',
    'Final checks before launch.',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Stepper currentStep={currentStep} steps={STEPS} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            Step {currentStep + 1}: {STEPS[currentStep]}
          </CardTitle>
          <CardDescription>{stepDescriptions[currentStep]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep === 0 && <WelcomeStep agency={agency} />}
          {currentStep === 1 && <BrandingStep agencyId={agencyId} agency={agency} />}
          {currentStep === 2 && <StaffStep agencyId={agencyId} />}
          {currentStep === 3 && <CaseloadStep agencyId={agencyId} />}
          {currentStep === 4 && <LandlordsStep agencyId={agencyId} />}
          {currentStep === 5 && <InspectorsStep agencyId={agencyId} />}
          {currentStep === 6 && <NotificationsStep agencyId={agencyId} />}
          {currentStep === 7 && <PaymentRailsStep agencyId={agencyId} />}
          {currentStep === 8 && <GoLiveStep agencySlug={agency.slug} />}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack} disabled={currentStep === 0 || saving}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={goNext} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={saving} variant="default" size="lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
            Go Live
          </Button>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
