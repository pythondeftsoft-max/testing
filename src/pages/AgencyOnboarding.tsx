import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { OnboardingWizard } from '@/components/agency/OnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Full-screen onboarding wizard wrapper. Looks up the current user's
 * agency context from `agency_staff`, then renders the existing
 * `OnboardingWizard`. On completion, redirects to the main agency
 * dashboard.
 *
 * Optional ?agency_id= param lets admins preview onboarding for any agency.
 */
const AgencyOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      try {
        const override = params.get('agency_id');
        if (override) {
          setAgencyId(override);
          const { data } = await supabase
            .from('housing_authorities')
            .select('name')
            .eq('id', override)
            .maybeSingle();
          setAgencyName(data?.name || 'Your Agency');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/agency/login');
          return;
        }
        const { data: staff } = await supabase
          .from('agency_staff')
          .select('agency_id, housing_authorities(name)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (!staff?.agency_id) {
          toast({
            title: 'No agency assigned',
            description: 'Please contact support to be linked to an agency.',
            variant: 'destructive',
          });
          navigate('/agency');
          return;
        }
        setAgencyId(staff.agency_id);
        setAgencyName((staff as any).housing_authorities?.name || 'Your Agency');
      } catch (e) {
        console.error('Onboarding resolve error:', e);
        navigate('/agency');
      } finally {
        setLoading(false);
      }
    };
    resolve();
  }, [navigate, params, toast]);

  if (loading || !agencyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Welcome to OpenKey</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Let's get <strong>{agencyName}</strong> set up. Takes about 5 minutes.
          </p>
        </div>
        <OnboardingWizard
          agencyId={agencyId}
          onComplete={() => {
            toast({
              title: '🎉 Onboarding complete!',
              description: 'Welcome to your dashboard. We recommend running a system check next.',
            });
            navigate('/agency');
          }}
        />
      </div>
    </div>
  );
};

export default AgencyOnboarding;
