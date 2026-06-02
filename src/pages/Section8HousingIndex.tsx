import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, ArrowRight } from 'lucide-react';
import { fetchTopCities } from '@/lib/citySeoGenerator';

const SITE_URL = 'https://openkeyhousing.com';

const Section8HousingIndex = () => {
  const { data: cities, isLoading } = useQuery({
    queryKey: ['top-cities-100'],
    queryFn: () => fetchTopCities(100),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Group by state
  const byState = (cities || []).reduce<Record<string, typeof cities>>((acc, c) => {
    if (!acc[c.state]) acc[c.state] = [] as any;
    (acc[c.state] as any).push(c);
    return acc;
  }, {});
  const sortedStates = Object.keys(byState).sort();

  return (
    <>
      <Helmet>
        <title>Section 8 Housing by City — Find HCV Voucher Rentals Nationwide | OpenKey</title>
        <meta
          name="description"
          content="Browse Section 8 approved housing in 100+ U.S. cities. Find verified landlords accepting Housing Choice Vouchers. Direct PHA contacts and live unit listings."
        />
        <link rel="canonical" href={`${SITE_URL}/section-8-housing`} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Section 8 Housing by City — OpenKey" />
        <meta property="og:description" content="Find Section 8 rentals in 100+ U.S. cities. Verified landlords. Direct PHA contacts." />
        <meta property="og:url" content={`${SITE_URL}/section-8-housing`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Section 8 Housing by City
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
              Find verified Section 8 approved rentals in {cities?.length || 100}+ U.S. cities.
              Direct contact for local PHAs. Real-time unit availability.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/auth?type=tenant">
                <Button size="lg">Create Free Tenant Profile</Button>
              </Link>
              <Link to="/auth?type=landlord">
                <Button size="lg" variant="outline">List Your Unit</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 24 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-10">
                {sortedStates.map((state) => (
                  <div key={state}>
                    <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {state}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {byState[state]!.map((c) => (
                        <Link key={c.slug} to={`/section-8-housing/${c.slug}`}>
                          <Card className="hover:shadow-md hover:border-primary transition-all">
                            <CardContent className="p-4">
                              <div className="font-medium text-foreground">{c.city}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                Section 8 Housing <ArrowRight className="h-3 w-3" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default Section8HousingIndex;
