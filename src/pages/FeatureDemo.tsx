import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { FeatureDemoEmbed } from '@/components/marketing/FeatureDemoEmbed';

const FeatureDemo = () => {
  const { featureKey } = useParams<{ featureKey: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['feature-demo-page', featureKey],
    enabled: !!featureKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_demos')
        .select('*')
        .eq('feature_key', featureKey!)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <Helmet>
        <title>{data?.title || 'OpenKey Feature Demo'} — OpenKey</title>
        <meta
          name="description"
          content={data?.description || 'Watch a quick demo of OpenKey for Public Housing Authorities.'}
        />
        <link rel="canonical" href={`https://openkeyhousing.com/demos/${featureKey}`} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !data ? (
            <div className="text-center py-32">
              <h1 className="text-2xl font-bold mb-2">Demo not found</h1>
              <p className="text-muted-foreground mb-6">
                This demo is no longer available or hasn't been published yet.
              </p>
              <Button asChild>
                <Link to="/for-agencies">See OpenKey for Agencies</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-3">{data.title}</h1>
                {data.description && (
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {data.description}
                  </p>
                )}
              </div>

              <FeatureDemoEmbed featureKey={featureKey!} className="mb-8 shadow-lg" />

              <div className="text-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 border">
                <h2 className="text-2xl font-bold mb-2">See it on your data</h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Schedule a 30-minute walkthrough with your team and we'll show OpenKey configured for your agency.
                </p>
                <Button asChild size="lg" variant="gradient">
                  <Link to="/for-agencies#contact">
                    Get a Custom Demo <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default FeatureDemo;
