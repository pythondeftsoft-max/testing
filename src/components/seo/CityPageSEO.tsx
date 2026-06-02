import { Helmet } from 'react-helmet-async';
import type { CityPageData } from '@/lib/citySeoGenerator';

interface CityPageSEOProps {
  data: CityPageData;
}

const SITE_URL = 'https://openkeyhousing.com';

export const CityPageSEO = ({ data }: CityPageSEOProps) => {
  const { cityName, state, primaryPHA, unitCount, citySlug, units } = data;
  const title = `Section 8 Housing in ${cityName}, ${state} — ${unitCount} Available Units | OpenKey`;
  const description = `Find Section 8 approved housing in ${cityName}, ${state}. ${unitCount} verified rentals${primaryPHA ? ` and direct contact for ${primaryPHA.name}` : ''}. Match with landlords who accept HCV vouchers.`;
  const canonical = `${SITE_URL}/section-8-housing/${citySlug}`;

  // Place / LocalBusiness for the PHA
  const localBusiness = primaryPHA
    ? {
        '@context': 'https://schema.org',
        '@type': 'GovernmentOrganization',
        name: primaryPHA.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: primaryPHA.address || undefined,
          addressLocality: primaryPHA.city,
          addressRegion: primaryPHA.state,
          postalCode: primaryPHA.zipcode || undefined,
          addressCountry: 'US',
        },
        telephone: primaryPHA.phone || undefined,
        email: primaryPHA.email || undefined,
        url: primaryPHA.website || canonical,
      }
    : null;

  // FAQ schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How do I find Section 8 housing in ${cityName}, ${state}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Browse ${unitCount} verified Section 8 rentals on OpenKey. Filter by bedrooms, budget, and move-in date. ${primaryPHA ? `Contact ${primaryPHA.name} for voucher questions.` : ''}`,
        },
      },
      {
        '@type': 'Question',
        name: `Is the Section 8 waitlist open in ${cityName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: primaryPHA?.public_waitlist_open
            ? `Yes, the waitlist for ${primaryPHA.name} is currently open. Apply directly through their office or check their website.`
            : `Waitlist status varies. Contact ${primaryPHA?.name || 'your local PHA'} directly to confirm whether applications are being accepted.`,
        },
      },
      {
        '@type': 'Question',
        name: `What landlords in ${cityName} accept Section 8 vouchers?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `OpenKey lists ${unitCount} units from landlords who accept Section 8 in ${cityName}, ${state}. Create a free tenant profile to get matched.`,
        },
      },
    ],
  };

  // RealEstateListing schema for top units
  const listingSchemas = units.slice(0, 3).map((u) => ({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: u.address,
    address: {
      '@type': 'PostalAddress',
      streetAddress: u.address,
      addressLocality: u.city || cityName,
      addressRegion: u.state || state,
      postalCode: u.zipcode || undefined,
      addressCountry: 'US',
    },
    numberOfRooms: u.bedrooms || undefined,
    floorSize: u.bedrooms ? { '@type': 'QuantitativeValue', value: u.bedrooms, unitText: 'bedrooms' } : undefined,
    offers: u.monthly_rent
      ? {
          '@type': 'Offer',
          price: u.monthly_rent,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        }
      : undefined,
  }));

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content="index, follow" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="OpenKey Housing" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {/* JSON-LD */}
      {localBusiness && (
        <script type="application/ld+json">{JSON.stringify(localBusiness)}</script>
      )}
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      {listingSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
    </Helmet>
  );
};
