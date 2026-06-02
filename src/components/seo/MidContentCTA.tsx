import React from 'react';
import { ArrowRight, Home, Building2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type CTAVariant = 'tenant' | 'landlord' | 'signup';

interface MidContentCTAProps {
  variant: CTAVariant;
  city?: string | null;
  state?: string | null;
  className?: string;
}

const CTA_CONFIG: Record<CTAVariant, {
  icon: React.ElementType;
  label: string;
  title: (loc: string) => string;
  description: string;
  buttonText: string;
  route: (city?: string | null, state?: string | null) => string;
}> = {
  tenant: {
    icon: Home,
    label: 'Find Housing',
    title: (loc) => `Looking for Section 8 Housing${loc ? ` in ${loc}` : ''}?`,
    description: 'Get matched with landlords who accept vouchers — no waitlist needed.',
    buttonText: 'Find Housing Now',
    route: (city, state) => `/find-home?source=seo&city=${city || ''}&state=${state || ''}`,
  },
  landlord: {
    icon: Building2,
    label: 'For Landlords',
    title: (loc) => `Accept Section 8 Vouchers${loc ? ` in ${loc}` : ''}`,
    description: 'List your property for free and get connected with vetted, voucher-holding tenants.',
    buttonText: 'List Your Property Free',
    route: (city, state) => `/auth?mode=signup&type=landlord&city=${city || ''}&state=${state || ''}`,
  },
  signup: {
    icon: Bell,
    label: 'Stay Informed',
    title: () => 'Get Housing Market Alerts',
    description: 'Be first to know when waitlists open, rents change, or new voucher units are listed.',
    buttonText: 'Sign Up for Alerts',
    route: () => '/auth?mode=signup',
  },
};

const MidContentCTA: React.FC<MidContentCTAProps> = ({ variant, city, state, className = '' }) => {
  const navigate = useNavigate();
  const config = CTA_CONFIG[variant];
  const Icon = config.icon;
  const locationString = city && state ? `${city}, ${state}` : state || '';

  return (
    <div className={`relative rounded-xl border border-primary/20 bg-primary/[0.03] overflow-hidden ${className}`}>
      {/* Subtle dot pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.06) 1px, transparent 0)',
        backgroundSize: '20px 20px',
      }} />

      <div className="relative px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center gap-6">
        {/* Icon + Text */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">
            <Icon size={12} />
            {config.label}
          </div>
          <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight mb-1.5">
            {config.title(locationString)}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {config.description}
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex-shrink-0">
          <Button
            variant="gradient"
            size="lg"
            className="gap-2 px-8"
            onClick={() => navigate(config.route(city, state))}
          >
            {config.buttonText}
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MidContentCTA;
