import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientPropertyUnit {
  id: string;
  monthly_rent: number | null;
}

export interface ClientProperty {
  id: string;
  address: string;
  property_name: string | null;
  city: string;
  state: string;
  zipcode: string;
  monthly_rent: number | null;
  status: string;
  on_market: boolean;
  created_at: string;
  portfolio_id: string;
  unit_count: number;
  bedrooms: number | null;
  bathrooms: number | null;
  owner_id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  property_units?: ClientPropertyUnit[];
}

export interface ClientPortfolio {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_notes: string | null;
  created_at: string;
  properties: ClientProperty[];
  property_count: number;
  active_listings: number;
  application_count: number;
}

export const useClientProperties = () => {
  const [clients, setClients] = useState<ClientPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchClientPortfolios = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all portfolios with client information (external clients only)
      const { data: portfolios, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .or('client_email.not.is.null,client_phone.not.is.null,client_notes.not.is.null')
        .order('client_name');

      if (portfoliosError) throw portfoliosError;

      if (!portfolios || portfolios.length === 0) {
        setClients([]);
        return;
      }

      // Fetch properties for each portfolio
      const portfolioIds = portfolios.map(p => p.id);
      
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, address, property_name, city, state, zipcode, monthly_rent, status, on_market, created_at, portfolio_id, unit_count, bedrooms, bathrooms, owner_id, contact_name, contact_email, contact_phone, property_units(id, monthly_rent)')
        .in('portfolio_id', portfolioIds)
        .is('deleted_at', null);

      if (propertiesError) throw propertiesError;

      // Fetch application counts for each property
      const propertyIds = properties?.map(p => p.id) || [];
      
      const { data: applications, error: applicationsError } = await supabase
        .from('property_applications')
        .select('property_id, id')
        .in('property_id', propertyIds);

      if (applicationsError) throw applicationsError;

      // Group applications by property
      const applicationsByProperty = (applications || []).reduce((acc, app) => {
        if (!acc[app.property_id]) {
          acc[app.property_id] = 0;
        }
        acc[app.property_id]++;
        return acc;
      }, {} as Record<string, number>);

      // Combine data
      const clientPortfolios: ClientPortfolio[] = portfolios.map(portfolio => {
        const portfolioProperties = (properties || []).filter(
          p => p.portfolio_id === portfolio.id
        );

        const activeListings = portfolioProperties.filter(
          p => p.on_market === true
        ).length;

        const totalApplications = portfolioProperties.reduce(
          (sum, p) => sum + (applicationsByProperty[p.id] || 0),
          0
        );

        return {
          id: portfolio.id,
          client_name: portfolio.client_name || 'Unknown Client',
          client_email: portfolio.client_email,
          client_phone: portfolio.client_phone,
          client_notes: portfolio.client_notes,
          created_at: portfolio.created_at,
          properties: portfolioProperties,
          property_count: portfolioProperties.length,
          active_listings: activeListings,
          application_count: totalApplications,
        };
      });

      setClients(clientPortfolios);
    } catch (err) {
      console.error('Error fetching client portfolios:', err);
      setError('Failed to fetch client portfolios');
      toast({
        title: "Error",
        description: "Failed to load client portfolios. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientPortfolios();
  }, []);

  const refetch = () => {
    fetchClientPortfolios();
  };

  return { clients, loading, error, refetch };
};
