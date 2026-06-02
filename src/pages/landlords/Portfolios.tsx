import { Helmet } from 'react-helmet-async';
import LandingHero from '@/components/landing/LandingHero';
import PainSolutionGrid from '@/components/landing/PainSolutionGrid';
import SocialProofBar from '@/components/landing/SocialProofBar';
import HowItWorks from '@/components/landing/HowItWorks';
import BottomCTA from '@/components/landing/BottomCTA';
import Footer from '@/components/Footer';
import { Layers, AlertTriangle, FileWarning, Upload, LayoutDashboard, Bell } from 'lucide-react';

export default function PortfoliosLanding() {
  const painSolutionItems = [
    {
      icon: Layers,
      pain: "Scattered property data",
      solution: "One dashboard for all your rentals"
    },
    {
      icon: AlertTriangle,
      pain: "Vacancy blind spots",
      solution: "Real-time occupancy tracking and alerts"
    },
    {
      icon: FileWarning,
      pain: "Compliance headaches",
      solution: "Auto-tag rents to units with one click"
    }
  ];

  const howItWorksSteps = [
    {
      icon: Upload,
      title: "Add Your Properties",
      description: "Add properties one by one as you onboard"
    },
    {
      icon: LayoutDashboard,
      title: "Track Everything",
      description: "See rent status, vacancies, and tenant pipeline in one view"
    },
    {
      icon: Bell,
      title: "Stay Ahead",
      description: "Get alerts for inspections, lease renewals, and issues"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Section 8 Portfolio Management | OpenKey</title>
        <meta name="description" content="Track your Section 8 portfolio in one dashboard. Multi-property oversight. Tenant pipeline. Rent health scoring. Free for property managers." />
      </Helmet>

      <LandingHero
        headline="Track Your Section 8 Portfolio in One Dashboard"
        subhead="Multi-property oversight. Tenant pipeline. Rent health scoring."
        ctaText="Add Your Portfolio"
        ctaLink="/auth?mode=signup&type=landlord"
        secondaryCta={{
          text: "See Features",
          link: "/resources"
        }}
      />

      <PainSolutionGrid
        title="Built for Portfolio Scale"
        subtitle="Stop juggling spreadsheets and sticky notes"
        items={painSolutionItems}
      />

      <SocialProofBar 
        stats={[
          { label: 'Units Managed', value: 2400, suffix: '+' },
          { label: 'Portfolio Managers', value: 180, suffix: '+' },
          { label: 'Rent Tracked Monthly', value: 3, suffix: 'M+' },
          { label: 'Avg Properties/Manager', value: 14 },
        ]}
      />

      <HowItWorks
        title="Get Your Portfolio Under Control"
        steps={howItWorksSteps}
      />

      <BottomCTA
        headline="Manage Your Entire Portfolio From One Place"
        subhead="Free for property managers. Unlimited properties."
        ctaText="Start Managing"
        ctaLink="/auth?mode=signup&type=landlord"
      />

      <Footer />
    </>
  );
}
