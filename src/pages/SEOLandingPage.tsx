import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEOPageCTA from '@/components/seo/SEOPageCTA';
import SEOPageContent from '@/components/seo/SEOPageContent';
import NotFound from './NotFound';

interface SEOPageData {
  id: string;
  title: string;
  meta_description: string | null;
  content: string | null;
  location_state: string | null;
  location_city: string | null;
  location_level: string;
  slug: string;
  published: boolean;
  template_id: string | null;
}

interface TemplateData {
  template_type: string;
  base_title: string;
}

const SEOLandingPage: React.FC = () => {
  const { state, city } = useParams<{ state?: string; city?: string }>();
  
  // Build expected slug from URL params
  const buildSlug = () => {
    if (city && state) {
      // City level: section-8-atlanta-ga
      return `section-8-${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
    } else if (state) {
      // State level: section-8-georgia
      return `section-8-${state.toLowerCase().replace(/\s+/g, '-')}`;
    }
    return '';
  };
  
  const expectedSlug = buildSlug();
  
  // Fetch the SEO page by matching URL pattern
  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ['seo-page', state, city],
    queryFn: async () => {
      // Try to find a page matching the URL pattern
      let query = supabase
        .from('seo_generated_pages')
        .select('*')
        .eq('published', true);
      
      if (city && state) {
        // City level match
        query = query
          .ilike('location_city', city.replace(/-/g, ' '))
          .ilike('location_state', state.replace(/-/g, ' '))
          .eq('location_level', 'city');
      } else if (state) {
        // State level match
        query = query
          .ilike('location_state', state.replace(/-/g, ' '))
          .eq('location_level', 'state');
      }
      
      const { data, error } = await query.limit(1).single();
      
      if (error) {
        console.error('Error fetching SEO page:', error);
        return null;
      }
      
      return data as SEOPageData;
    },
    enabled: !!(state || city)
  });
  
  // Fetch template info if we have a page
  const { data: templateData } = useQuery({
    queryKey: ['seo-template', pageData?.template_id],
    queryFn: async () => {
      if (!pageData?.template_id) return null;
      
      const { data, error } = await supabase
        .from('seo_page_templates')
        .select('template_type, base_title')
        .eq('id', pageData.template_id)
        .single();
      
      if (error) {
        console.error('Error fetching template:', error);
        return null;
      }
      
      return data as TemplateData;
    },
    enabled: !!pageData?.template_id
  });
  
  // Set page meta tags
  useEffect(() => {
    if (pageData) {
      document.title = pageData.title;
      
      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && pageData.meta_description) {
        metaDesc.setAttribute('content', pageData.meta_description);
      } else if (pageData.meta_description) {
        const newMeta = document.createElement('meta');
        newMeta.name = 'description';
        newMeta.content = pageData.meta_description;
        document.head.appendChild(newMeta);
      }
      
      // Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', pageData.title);
      }
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && pageData.meta_description) {
        ogDesc.setAttribute('content', pageData.meta_description);
      }
    }
    
    return () => {
      // Reset title on unmount
      document.title = 'OpenKey - Housing Assistance Platform';
    };
  }, [pageData]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto py-16 px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // 404 if no page found
  if (!pageData || error) {
    return <NotFound />;
  }
  
  const templateType = templateData?.template_type || 'section_8';
  const pageUrl = window.location.href;
  
  // Format location for display
  const formatLocation = () => {
    if (pageData.location_city && pageData.location_state) {
      return `${pageData.location_city}, ${pageData.location_state}`;
    }
    return pageData.location_state || '';
  };
  
  // Get template display name for intro
  const getTemplateDisplayName = () => {
    switch (templateType) {
      case 'section_8':
        return 'Section 8 housing assistance';
      case 'housing_voucher':
        return 'housing voucher assistance';
      case 'landlord_voucher':
        return 'voucher-friendly landlord services';
      case 'assisted_living':
        return 'assisted living placement';
      case 'senior_housing':
        return 'senior housing assistance';
      case 'affordable':
        return 'affordable housing assistance';
      default:
        return 'housing assistance';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Dynamic H1 */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          {pageData.title}
        </h1>
        
        {/* Intro paragraph */}
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          OpenKey provides {getTemplateDisplayName()} in {formatLocation()} through 
          a direct matching process. Unlike traditional listing sites, we connect 
          voucher holders directly with verified landlords to speed up placement 
          and reduce the stress of searching for housing.
        </p>
        
        {/* Primary CTA */}
        <SEOPageCTA 
          templateType={templateType}
          city={pageData.location_city}
          state={pageData.location_state}
          pageUrl={pageUrl}
          variant="primary"
        />
        
        {/* Main content sections */}
        <SEOPageContent 
          city={pageData.location_city}
          state={pageData.location_state}
          templateType={templateType}
        />
        
        {/* Bottom CTA */}
        <SEOPageCTA 
          templateType={templateType}
          city={pageData.location_city}
          state={pageData.location_state}
          pageUrl={pageUrl}
          variant="bottom"
        />
        
        {/* FAQ placeholder for future */}
        {/* 
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          // Dynamic FAQ content will go here
        </section>
        */}
      </main>
      
      <Footer />
    </div>
  );
};

export default SEOLandingPage;
