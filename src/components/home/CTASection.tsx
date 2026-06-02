import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CTASection() {
  const { t } = useLanguage();
  
  return (
    <section className="relative py-20 px-4 bg-gradient-blue-gold overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle-blue opacity-30" />
      <div className="max-w-5xl mx-auto text-center relative">
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
          {t('cta.title')}
        </h2>
        <p className="text-white/90 mb-8 max-w-2xl mx-auto">
          {t('cta.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" variant="gold" className="px-8">
            <Link to="/find-home">{t('cta.findHousing')}</Link>
          </Button>
          <Button asChild size="lg" variant="blue" className="px-8">
            <Link to="/auth?mode=signup&type=landlord">{t('cta.listProperty')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
