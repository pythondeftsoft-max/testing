import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface LandingHeroProps {
  headline: string;
  subhead: string;
  ctaText: string;
  ctaLink: string;
  secondaryCta?: {
    text: string;
    link: string;
  };
}

export default function LandingHero({ 
  headline, 
  subhead, 
  ctaText, 
  ctaLink,
  secondaryCta 
}: LandingHeroProps) {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-background via-background to-muted overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-20">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
          {headline}
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          {subhead}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link to={ctaLink}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          
          {secondaryCta && (
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link to={secondaryCta.link}>
                {secondaryCta.text}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
