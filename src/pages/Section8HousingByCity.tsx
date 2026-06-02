import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Phone, Mail, Globe, ArrowRight, Home, BedDouble, DollarSign, CheckCircle2 } from 'lucide-react';
import { fetchCityPageData } from '@/lib/citySeoGenerator';
import { CityPageSEO } from '@/components/seo/CityPageSEO';
import { Skeleton } from '@/components/ui/skeleton';

const Section8HousingByCity = () => {
  const { citySlug } = useParams<{ citySlug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['city-page', citySlug],
    queryFn: () => fetchCityPageData(citySlug || ''),
    enabled: !!citySlug,
    staleTime: 30 * 60 * 1000, // 30 min
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <Navigate to="/section-8-housing" replace />;
  }

  const { cityName, state, primaryPHA, allPHAs, unitCount, units, nearbyCities } = data;

  return (
    <>
      <CityPageSEO data={data} />
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <Link to="/section-8-housing" className="hover:text-primary">Section 8 Housing</Link>
              <span>/</span>
              <span className="text-foreground">{cityName}, {state}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Section 8 Housing in {cityName}, {state}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mb-6">
              {unitCount > 0
                ? `${unitCount} verified Section 8 rental${unitCount === 1 ? '' : 's'} available now in ${cityName}.`
                : `Find landlords who accept Housing Choice Vouchers in ${cityName}, ${state}.`}
              {primaryPHA && ` Direct line to ${primaryPHA.name}.`}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth?type=tenant">
                <Button size="lg" className="gap-2">
                  Find Section 8 Housing in {cityName}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth?type=landlord">
                <Button size="lg" variant="outline" className="gap-2">
                  Are you a landlord in {cityName}?
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-8 px-4 border-b border-border">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{unitCount}</div>
                <div className="text-xs text-muted-foreground">Available Units</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Home className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{allPHAs.length}</div>
                <div className="text-xs text-muted-foreground">Local PHAs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {primaryPHA?.public_waitlist_open ? 'Open' : 'Varies'}
                </div>
                <div className="text-xs text-muted-foreground">Waitlist Status</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{state}</div>
                <div className="text-xs text-muted-foreground">State</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Available Units */}
        {units.length > 0 && (
          <section className="py-12 px-4">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Available Section 8 Units in {cityName}
              </h2>
              <p className="text-muted-foreground mb-8">
                Verified landlords accepting Housing Choice Vouchers
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {units.map((unit) => (
                  <Card key={unit.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-1">{unit.address}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {unit.city}, {unit.state} {unit.zipcode}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        {unit.bedrooms !== null && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <BedDouble className="h-4 w-4" />
                            {unit.bedrooms} bd
                          </span>
                        )}
                        {unit.monthly_rent !== null && (
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <DollarSign className="h-4 w-4" />
                            {Number(unit.monthly_rent).toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Section 8 Accepted
                      </Badge>
                      <Link to="/find-home">
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link to={`/find-home?city=${encodeURIComponent(cityName)}&state=${state}`}>
                  <Button size="lg" variant="outline" className="gap-2">
                    See All {cityName} Listings
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* PHA Contact Card */}
        {primaryPHA && (
          <section className="py-12 px-4 bg-muted/30">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Public Housing Authority for {cityName}
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>{primaryPHA.name}</CardTitle>
                  {primaryPHA.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {primaryPHA.address}, {primaryPHA.city}, {primaryPHA.state} {primaryPHA.zipcode}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {primaryPHA.phone && (
                    <a href={`tel:${primaryPHA.phone}`} className="flex items-center gap-2 text-foreground hover:text-primary">
                      <Phone className="h-4 w-4" />
                      {primaryPHA.phone}
                    </a>
                  )}
                  {primaryPHA.email && (
                    <a href={`mailto:${primaryPHA.email}`} className="flex items-center gap-2 text-foreground hover:text-primary">
                      <Mail className="h-4 w-4" />
                      {primaryPHA.email}
                    </a>
                  )}
                  {primaryPHA.website && (
                    <a href={primaryPHA.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary">
                      <Globe className="h-4 w-4" />
                      Visit Website
                    </a>
                  )}
                  <div className="pt-3">
                    <Badge variant={primaryPHA.public_waitlist_open ? 'default' : 'secondary'}>
                      Waitlist: {primaryPHA.public_waitlist_open ? 'Open' : 'Contact PHA'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How do I find Section 8 housing in {cityName}, {state}?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Browse {unitCount} verified Section 8 rentals on OpenKey. Create a free tenant profile, set your bedroom and budget preferences, and get matched with landlords who accept Housing Choice Vouchers in {cityName}.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Is the Section 8 waitlist open in {cityName}?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {primaryPHA?.public_waitlist_open
                    ? `Yes — ${primaryPHA.name}'s waitlist is currently open. Apply directly through their office.`
                    : `Waitlist status varies by program. Contact ${primaryPHA?.name || 'your local PHA'} directly to confirm.`}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What landlords in {cityName} accept Section 8?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  OpenKey lists {unitCount} units from landlords who accept Section 8 in {cityName}, {state}. All landlords on our platform have signed up specifically to work with HCV voucher holders.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Nearby cities */}
        {nearbyCities.length > 0 && (
          <section className="py-12 px-4 bg-muted/30">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Nearby Cities in {state}
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {nearbyCities.map((c) => (
                  <Link key={c.slug} to={`/section-8-housing/${c.slug}`}>
                    <Button variant="outline">
                      Section 8 in {c.name}, {c.state}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="py-16 px-4 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get matched with Section 8 housing in {cityName}
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Free profile. Verified landlords. Real-time matches.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/auth?type=tenant">
                <Button size="lg" variant="secondary">
                  Create Free Tenant Profile
                </Button>
              </Link>
              <Link to="/auth?type=landlord">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  List Your Unit
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Section8HousingByCity;
