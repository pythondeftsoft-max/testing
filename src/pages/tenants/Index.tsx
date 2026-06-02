import { Helmet } from 'react-helmet-async';
import LandingHero from '@/components/landing/LandingHero';
import PainSolutionGrid from '@/components/landing/PainSolutionGrid';
import SocialProofBar from '@/components/landing/SocialProofBar';
import HowItWorks from '@/components/landing/HowItWorks';
import BottomCTA from '@/components/landing/BottomCTA';
import Footer from '@/components/Footer';
import { XCircle, Clock, ShieldX, UserCheck, Home, FileCheck } from 'lucide-react';

export default function TenantsLanding() {
  const painSolutionItems = [
    {
      icon: XCircle,
      pain: "Endless rejections",
      solution: "Connect with landlords who actively want Section 8 tenants"
    },
    {
      icon: ShieldX,
      pain: "Discrimination & bias",
      solution: "Pre-screened landlords committed to fair housing"
    },
    {
      icon: Clock,
      pain: "Voucher expiring soon",
      solution: "Fast matching before your deadline"
    }
  ];

  const howItWorksSteps = [
    {
      icon: UserCheck,
      title: "Complete Your Profile",
      description: "Tell us about your voucher, family size, and preferred areas"
    },
    {
      icon: Home,
      title: "Get Matched",
      description: "We connect you with landlords who have available units"
    },
    {
      icon: FileCheck,
      title: "Move In",
      description: "Complete your application and start your new chapter"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Find Section 8 Housing | OpenKey</title>
        <meta name="description" content="Find Section 8 housing from landlords who want you. Free matching. No discrimination. Pre-screened landlords ready to accept your voucher." />
      </Helmet>

      <LandingHero
        headline="Find Section 8 Housing That Wants You"
        subhead="Pre-screened landlords. No discrimination. Free for voucher holders."
        ctaText="Find a Home Now"
        ctaLink="/find-home"
        secondaryCta={{
          text: "Learn How It Works",
          link: "/section8-info"
        }}
      />

      <PainSolutionGrid
        title="We Know the Struggle"
        subtitle="You deserve housing without the runaround"
        items={painSolutionItems}
      />

      <SocialProofBar />

      <HowItWorks
        title="How OpenKey Works for You"
        steps={howItWorksSteps}
      />

      <BottomCTA
        headline="Ready to Find Your New Home?"
        subhead="Free for voucher holders. No hidden fees. Ever."
        ctaText="Start Your Search"
        ctaLink="/find-home"
      />

      <Footer />
    </>
  );
}
