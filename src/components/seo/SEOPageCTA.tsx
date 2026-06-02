import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface SEOPageCTAProps {
  templateType: string;
  city?: string | null;
  state?: string | null;
  pageUrl: string;
  variant?: 'primary' | 'bottom';
}

const SEOPageCTA: React.FC<SEOPageCTAProps> = ({
  templateType,
  city,
  state,
  pageUrl,
  variant = 'primary'
}) => {
  const navigate = useNavigate();
  
  const locationString = city && state 
    ? `${city}, ${state}` 
    : state || 'Your Area';

  const buildParams = () => new URLSearchParams({
    source: 'seo',
    template_type: templateType,
    city: city || '',
    state: state || '',
    page_url: pageUrl
  });

  const tenantRoute = () => `/find-home?${buildParams().toString()}`;
  const landlordRoute = () => {
    const p = buildParams();
    p.set('mode', 'signup');
    p.set('type', 'landlord');
    return `/auth?${p.toString()}`;
  };
  const signupRoute = () => {
    const p = buildParams();
    p.set('mode', 'signup');
    return `/auth?${p.toString()}`;
  };

  const config: Record<string, { primaryText: string; primaryRoute: () => string; secondaryText: string; secondaryRoute: () => string }> = {
    section_8: { primaryText: `Get Housing Help in ${locationString}`, primaryRoute: tenantRoute, secondaryText: "I'm a landlord", secondaryRoute: landlordRoute },
    blog: { primaryText: 'Find Affordable Housing', primaryRoute: tenantRoute, secondaryText: "I'm a landlord", secondaryRoute: landlordRoute },
    city_landing: { primaryText: `Find Housing in ${locationString}`, primaryRoute: tenantRoute, secondaryText: "I'm a landlord", secondaryRoute: landlordRoute },
    landlord_voucher: { primaryText: 'List Your Property for Voucher Tenants', primaryRoute: landlordRoute, secondaryText: "I'm a tenant", secondaryRoute: tenantRoute },
    comparison: { primaryText: 'Try OpenKey Free', primaryRoute: signupRoute, secondaryText: "I'm a tenant looking for housing", secondaryRoute: tenantRoute },
    rent_data: { primaryText: `Find Affordable Rentals in ${locationString}`, primaryRoute: tenantRoute, secondaryText: "I'm a landlord", secondaryRoute: landlordRoute },
    page: { primaryText: 'Get Started', primaryRoute: signupRoute, secondaryText: "I'm a tenant looking for housing", secondaryRoute: tenantRoute },
  };

  const c = config[templateType] || config.section_8;

  const handlePrimaryCTA = () => navigate(c.primaryRoute());
  const handleSecondaryCTA = () => navigate(c.secondaryRoute());

  if (variant === 'bottom') {
    return (
      <div className="relative py-16 rounded-2xl bg-foreground/[0.03] border border-border/50">
        <div className="absolute inset-0 rounded-2xl" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.03) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        <div className="relative flex flex-col items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Ready to get started?
          </p>
          <Button 
            size="lg" 
            variant="gradient"
            className="text-lg px-10 py-6 h-auto gap-2"
            onClick={handlePrimaryCTA}
          >
            {c.primaryText}
            <ArrowRight size={18} />
          </Button>
          <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
            No public listings. Matching is handled directly by our team.
          </p>
          <button
            onClick={handleSecondaryCTA}
            className="text-sm text-primary hover:text-primary/80 transition-colors mt-2 inline-flex items-center gap-1"
          >
            {c.secondaryText}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10">
      <div className="w-12 h-px bg-border mb-8" />
      <Button 
        size="lg" 
        variant="gradient"
        className="text-lg px-10 py-6 h-auto gap-2"
        onClick={handlePrimaryCTA}
      >
        {c.primaryText}
        <ArrowRight size={18} />
      </Button>
      <p className="text-sm text-muted-foreground mt-3 text-center max-w-md">
        No public listings. Matching is handled directly by our team.
      </p>
      <button
        onClick={handleSecondaryCTA}
        className="text-sm text-primary hover:text-primary/80 transition-colors mt-4 inline-flex items-center gap-1"
      >
        {c.secondaryText}
        <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default SEOPageCTA;
