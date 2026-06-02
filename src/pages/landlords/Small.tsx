import { Helmet } from 'react-helmet-async';
import LandingHero from '@/components/landing/LandingHero';
import PainSolutionGrid from '@/components/landing/PainSolutionGrid';
import SocialProofBar from '@/components/landing/SocialProofBar';
import HowItWorks from '@/components/landing/HowItWorks';
import BottomCTA from '@/components/landing/BottomCTA';
import Footer from '@/components/Footer';
import { FileX, Users, Calculator, Home, UserCheck, DollarSign } from 'lucide-react';

export default function SmallLandlordsLanding() {
  const painSolutionItems = [
    {
      icon: FileX,
      pain: "Confusing paperwork",
      solution: "We guide you through every step of Section 8"
    },
    {
      icon: Users,
      pain: "Finding good tenants",
      solution: "Pre-screened tenants with verified vouchers"
    },
    {
      icon: Calculator,
      pain: "Tracking rent payments",
      solution: "Dashboard to monitor rent and lease health"
    }
  ];

  const howItWorksSteps = [
    {
      icon: Home,
      title: "List Your Property",
      description: "Add your units in minutes. It's free, no credit card required."
    },
    {
      icon: UserCheck,
      title: "Get Matched",
      description: "We send you pre-screened tenants who match your criteria"
    },
    {
      icon: DollarSign,
      title: "Collect Guaranteed Rent",
      description: "Housing authority pays on time, every month"
    }
  ];

  return (
    <>
      <Helmet>
        <title>List Your Section 8 Property Free | OpenKey</title>
        <meta name="description" content="List your property free. Get pre-screened Section 8 tenants with verified vouchers. No fees to list. Guaranteed rent from housing authority." />
      </Helmet>

      <LandingHero
        headline="Finally, a Free Tool Built for Section 8 Landlords"
        subhead="Get pre-screened tenants with verified vouchers. No fees to list."
        ctaText="List Your Property Free"
        ctaLink="/auth?mode=signup&type=landlord"
      />

      <PainSolutionGrid
        title="Section 8 Made Simple"
        subtitle="We handle the complexity so you can focus on your property"
        items={painSolutionItems}
      />

      <SocialProofBar 
        stats={[
          { label: 'Properties Listed', value: 650, suffix: '+' },
          { label: 'Avg Days to Fill', value: 18 },
          { label: 'Landlord Satisfaction', value: 94, suffix: '%' },
          { label: 'States Served', value: 11, suffix: '+' },
        ]}
      />

      <HowItWorks
        title="Start Earning Guaranteed Rent"
        steps={howItWorksSteps}
      />

      <BottomCTA
        headline="List Your Property in Minutes"
        subhead="Free forever. No hidden fees. No commission."
        ctaText="Get Started Free"
        ctaLink="/auth?mode=signup&type=landlord"
      />

      <Footer />
    </>
  );
}
