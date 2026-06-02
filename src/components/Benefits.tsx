
import React from 'react';
import { Check, Users, ArrowDown, ArrowUp } from "lucide-react";

const Benefits = () => {
  const benefits = [
    {
      icon: <Check className="w-8 h-8" />,
      title: "Free to Tenants",
      description: "Our housing search service is completely free for all Section 8 voucher holders"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Pre-Screened Applicants",
      description: "All tenants are thoroughly vetted for income, background, and rental history"
    },
    {
      icon: <ArrowUp className="w-8 h-8" />,
      title: "Fast Turnaround",
      description: "Quick matching process reduces vacancy time and gets tenants housed faster"
    },
    {
      icon: <ArrowDown className="w-8 h-8" />,
      title: "Streamlined Placement",
      description: "Simplified process from application to move-in with full support throughout"
    }
  ];

  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose OpenKey?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We make housing accessible and rental management simple through our comprehensive approach
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center group">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors duration-300">
                <div className="text-primary">
                  {benefit.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
