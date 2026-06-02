import { Helmet } from 'react-helmet-async';
import LandingHero from '@/components/landing/LandingHero';
import PainSolutionGrid from '@/components/landing/PainSolutionGrid';
import SocialProofBar from '@/components/landing/SocialProofBar';
import HowItWorks from '@/components/landing/HowItWorks';
import BottomCTA from '@/components/landing/BottomCTA';
import Footer from '@/components/Footer';
import { Building2, Users, DollarSign, Handshake, Send, Banknote } from 'lucide-react';

export default function RealtorsLanding() {
  const painSolutionItems = [
    {
      icon: Building2,
      pain: "Clients with vacancies",
      solution: "Fill units with pre-screened Section 8 tenants"
    },
    {
      icon: Users,
      pain: "Sourcing quality tenants",
      solution: "Access our verified tenant pipeline"
    },
    {
      icon: DollarSign,
      pain: "Unpaid placement work",
      solution: "Earn placement fees for successful matches"
    }
  ];

  const howItWorksSteps = [
    {
      icon: Handshake,
      title: "Become a Partner",
      description: "Join our realtor and property manager network"
    },
    {
      icon: Send,
      title: "Submit Vacancies",
      description: "Add your clients' properties to our matching system"
    },
    {
      icon: Banknote,
      title: "Earn Placement Fees",
      description: "Get paid when we successfully place a tenant"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Partner With OpenKey | Realtors & Property Managers</title>
        <meta name="description" content="Fill vacant units with pre-screened Section 8 tenants. Partner with OpenKey. Get tenants for your clients. Earn placement fees." />
      </Helmet>

      <LandingHero
        headline="Fill Vacant Units with Pre-Screened Section 8 Tenants"
        subhead="Partner with OpenKey. Get tenants for your clients. Earn placement fees."
        ctaText="Become a Partner"
        ctaLink="/auth?mode=signup&type=landlord"
        secondaryCta={{
          text: "Learn About Partnership",
          link: "/contact"
        }}
      />

      <PainSolutionGrid
        title="Grow Your Business with Section 8"
        subtitle="A new revenue stream for your real estate practice"
        items={painSolutionItems}
      />

      <SocialProofBar 
        stats={[
          { label: 'Partner Agents', value: 85, suffix: '+' },
          { label: 'Units Filled Monthly', value: 45, suffix: '+' },
          { label: 'Avg Placement Fee', value: 500, suffix: '$' },
          { label: 'Partner Satisfaction', value: 96, suffix: '%' },
        ]}
      />

      <HowItWorks
        title="How the Partnership Works"
        steps={howItWorksSteps}
      />

      <BottomCTA
        headline="Ready to Fill More Units?"
        subhead="Join our partner network. No upfront costs."
        ctaText="Apply to Partner"
        ctaLink="/auth?mode=signup&type=landlord"
      />

      <Footer />
    </>
  );
}
