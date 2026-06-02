import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface BottomCTAProps {
  headline: string;
  subhead?: string;
  ctaText: string;
  ctaLink: string;
}

export default function BottomCTA({ headline, subhead, ctaText, ctaLink }: BottomCTAProps) {
  return (
    <section className="py-20 px-4 bg-primary text-primary-foreground">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          {headline}
        </h2>
        {subhead && (
          <p className="text-xl opacity-90 mb-8">
            {subhead}
          </p>
        )}
        <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
          <Link to={ctaLink}>
            {ctaText}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
