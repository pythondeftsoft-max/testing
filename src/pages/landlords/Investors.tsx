import { Helmet } from 'react-helmet-async';
import MetricTicker from '@/components/landing/investor/MetricTicker';
import InvestorHero from '@/components/landing/investor/InvestorHero';
import AssetClassExplorer from '@/components/landing/investor/AssetClassExplorer';
import BentoGrid from '@/components/landing/investor/BentoGrid';
import InvestorStats from '@/components/landing/investor/InvestorStats';
import InvestorHowItWorks from '@/components/landing/investor/InvestorHowItWorks';
import InvestorCTA from '@/components/landing/investor/InvestorCTA';
import Footer from '@/components/Footer';

export default function InvestorsLanding() {
  return (
    <div className="investor-theme">
      <Helmet>
        <title>Institutional Portfolio Intelligence | OpenKey</title>
        <meta 
          name="description" 
          content="Real-time asset monitoring for institutional investors. Independent rent verification, PM oversight tools, and Section 8 compliance tracking across residential, industrial, and specialty portfolios." 
        />
      </Helmet>

      {/* Metric Ticker Bar */}
      <MetricTicker />

      {/* Hero Section */}
      <InvestorHero />

      {/* Asset Class Explorer - Interactive Toggle */}
      <AssetClassExplorer />

      {/* Bento Grid - Asset Classes */}
      <BentoGrid />

      {/* Stats Section */}
      <InvestorStats />

      {/* How It Works */}
      <InvestorHowItWorks />

      {/* Bottom CTA */}
      <InvestorCTA />

      {/* Footer - will inherit dark styling from investor-theme */}
      <Footer />
    </div>
  );
}
