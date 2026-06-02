import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Quote, Building2 } from 'lucide-react';

// Placeholder cards — fill in once we have signed wins.
const placeholders = [
  { state: 'Coming Soon', size: '1,200 vouchers', region: 'Pacific Northwest' },
  { state: 'Coming Soon', size: '450 vouchers', region: 'Midwest' },
  { state: 'Coming Soon', size: '3,800 vouchers', region: 'Southeast' },
];

export const CaseStudyShowcase: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">
            <Quote className="h-3 w-3 mr-1" /> Customer Stories
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Built With Housing Authorities</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're partnering with forward-thinking PHAs across the country. Case studies coming soon —
            be among our first featured agencies.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {placeholders.map((p, i) => (
            <Card key={i} className="border-dashed bg-background/50">
              <CardContent className="p-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <Badge variant="secondary">{p.state}</Badge>
                <div className="text-sm text-muted-foreground">
                  <div>{p.size}</div>
                  <div>{p.region}</div>
                </div>
                <p className="text-sm italic text-muted-foreground/70">
                  "Quote from a happy PHA director will go here."
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
