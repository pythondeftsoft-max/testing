import { LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface HowItWorksProps {
  title?: string;
  steps: Step[];
}

export default function HowItWorks({ title = "How It Works", steps }: HowItWorksProps) {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-16">
          {title}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-border" />
          
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              <div className="relative z-10 mx-auto w-24 h-24 rounded-full bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center mb-6">
                <step.icon className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
