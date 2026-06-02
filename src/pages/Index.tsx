import Footer from "../components/Footer";
import Navigation from "../components/Navigation";
import FAQHome from "../components/home/FAQHome";
import WhiteLabelLandingPage from "../components/WhiteLabelLandingPage";
import CommandCenterHero from "../components/home/CommandCenterHero";
import WealthMetricsTicker from "../components/home/WealthMetricsTicker";
import HowItWorks from "../components/home/HowItWorks";
import CommandCenterBentoGrid from "../components/home/CommandCenterBentoGrid";
import MultiAssetAdvantage from "../components/home/MultiAssetAdvantage";
import BorderlessDesign from "../components/home/BorderlessDesign";
import Section8Simplified from "../components/home/Section8Simplified";
import TrustSignals from "../components/home/TrustSignals";
import LatestArticles from "../components/home/LatestArticles";
import { useTheme } from "../components/DynamicThemeProvider";
import { useEffect } from "react";

const Index = () => {
  const { isWhiteLabeled, whiteLabelConfig } = useTheme();

  // SEO: homepage metadata (must be before any conditional return per React hooks rules)
  useEffect(() => {
    document.title = "OpenKey | Global Wealth & Asset Command Center";
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = "The only free platform that tracks your Global Real Estate, Section 8 Vouchers, Stocks, and CDs in a single pane of glass.";
    if (metaDesc) {
      metaDesc.setAttribute("content", content);
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = content;
      document.head.appendChild(m);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const href = window.location.origin + "/";
    if (canonicalLink) {
      canonicalLink.href = href;
    } else {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  // If white labeled with custom landing page, show that instead
  if (isWhiteLabeled && whiteLabelConfig?.landing_page_config) {
    return <WhiteLabelLandingPage />;
  }
  
  return (
    <div className="min-h-screen bg-background relative">
      <Navigation />
      
      {/* Command Center Hero */}
      <CommandCenterHero />
      
      {/* Wealth Metrics Ticker */}
      <WealthMetricsTicker />
      
      {/* How It Works Section */}
      <HowItWorks />
      
      {/* Command Center Bento Grid */}
      <CommandCenterBentoGrid />
      
      {/* Multi-Asset Advantage Section */}
      <MultiAssetAdvantage />
      
      {/* Borderless Design Section */}
      <BorderlessDesign />
      
      {/* Section 8 Simplified */}
      <Section8Simplified />
      
      {/* Trust Signals */}
      <TrustSignals />

      {/* Latest Blog Articles — internal links for SEO */}
      <LatestArticles />

      <FAQHome />

      <Footer />
    </div>
  );
};

export default Index;
