import { LucideIcon } from 'lucide-react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';

interface PainSolutionItem {
  icon: LucideIcon;
  pain: string;
  solution: string;
}

interface PainSolutionGridProps {
  title: string;
  subtitle?: string;
  items: PainSolutionItem[];
}

export default function PainSolutionGrid({ title, subtitle, items }: PainSolutionGridProps) {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <CardEnhanced key={index} variant="elevated" className="text-center">
              <CardEnhancedHeader className="pb-2">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <CardEnhancedTitle className="text-lg text-destructive line-through opacity-70">
                  {item.pain}
                </CardEnhancedTitle>
              </CardEnhancedHeader>
              <CardEnhancedContent>
                <p className="text-foreground font-medium text-lg">
                  {item.solution}
                </p>
              </CardEnhancedContent>
            </CardEnhanced>
          ))}
        </div>
      </div>
    </section>
  );
}
