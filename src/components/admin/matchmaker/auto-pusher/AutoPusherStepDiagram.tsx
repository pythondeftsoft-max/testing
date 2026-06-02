import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Database, Filter, Calculator, Send, MessageSquare } from 'lucide-react';

export const AutoPusherStepDiagram: React.FC = () => {
  const steps = [
    {
      icon: Database,
      title: 'Pull dirty entities',
      desc: 'Every 10 min, scan tenants and units flagged for recompute',
    },
    {
      icon: Calculator,
      title: 'Score against pool',
      desc: 'Compute match score 0–100 (location, bedrooms, budget, timing)',
    },
    {
      icon: Filter,
      title: 'Apply gates',
      desc: 'Score floor · Territory · Cooldown · Daily caps · Quiet hours',
    },
    {
      icon: Send,
      title: 'Suggest or push',
      desc: 'Suggest mode = approval queue. Auto = fires push',
    },
    {
      icon: MessageSquare,
      title: 'Notify tenant',
      desc: 'SMS/email with property link · Owner notified',
    },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={i}>
                <div className="flex-1 flex flex-col items-center text-center p-3 bg-muted/40 rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs font-semibold leading-tight">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex items-center justify-center px-1 lg:px-0">
                    <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90 lg:rotate-0" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
