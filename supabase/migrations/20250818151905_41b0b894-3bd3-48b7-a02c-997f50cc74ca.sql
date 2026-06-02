
-- Add country support to properties table
ALTER TABLE public.properties 
ADD COLUMN country TEXT DEFAULT 'US' NOT NULL,
ADD COLUMN international_address JSONB DEFAULT '{}';

-- Add location fields to portfolio_assets for international support
ALTER TABLE public.portfolio_assets 
ADD COLUMN location_country TEXT DEFAULT 'US',
ADD COLUMN registration_country TEXT,
ADD COLUMN location_metadata JSONB DEFAULT '{}';

-- Create countries reference table
CREATE TABLE public.countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  iso_code_2 TEXT NOT NULL UNIQUE,
  iso_code_3 TEXT NOT NULL UNIQUE,
  currency_code TEXT DEFAULT 'USD',
  address_format JSONB DEFAULT '{}',
  postal_code_regex TEXT,
  phone_prefix TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert common countries
INSERT INTO public.countries (id, name, iso_code_2, iso_code_3, currency_code, address_format, postal_code_regex, phone_prefix) VALUES
('US', 'United States', 'US', 'USA', 'USD', '{"format": ["street", "city", "state", "postal_code"], "required": ["street", "city", "state", "postal_code"]}', '^[0-9]{5}(-[0-9]{4})?$', '+1'),
('CA', 'Canada', 'CA', 'CAN', 'CAD', '{"format": ["street", "city", "province", "postal_code"], "required": ["street", "city", "province", "postal_code"]}', '^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$', '+1'),
('GB', 'United Kingdom', 'GB', 'GBR', 'GBP', '{"format": ["street", "city", "postal_code"], "required": ["street", "city", "postal_code"]}', '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$', '+44'),
('DE', 'Germany', 'DE', 'DEU', 'EUR', '{"format": ["street", "postal_code", "city"], "required": ["street", "postal_code", "city"]}', '^[0-9]{5}$', '+49'),
('FR', 'France', 'FR', 'FRA', 'EUR', '{"format": ["street", "postal_code", "city"], "required": ["street", "postal_code", "city"]}', '^[0-9]{5}$', '+33'),
('AU', 'Australia', 'AU', 'AUS', 'AUD', '{"format": ["street", "city", "state", "postal_code"], "required": ["street", "city", "state", "postal_code"]}', '^[0-9]{4}$', '+61'),
('JP', 'Japan', 'JP', 'JPN', 'JPY', '{"format": ["postal_code", "prefecture", "city", "street"], "required": ["postal_code", "prefecture", "city", "street"]}', '^[0-9]{3}-[0-9]{4}$', '+81'),
('MX', 'Mexico', 'MX', 'MEX', 'MXN', '{"format": ["street", "city", "state", "postal_code"], "required": ["street", "city", "state", "postal_code"]}', '^[0-9]{5}$', '+52');

-- Enable RLS on countries table
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view countries
CREATE POLICY "Anyone can view countries" ON public.countries
  FOR SELECT USING (is_active = true);

-- Add country preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN preferred_country TEXT DEFAULT 'US' REFERENCES public.countries(id);

-- Add country preferences to white_label_configs
ALTER TABLE public.white_label_configs 
ADD COLUMN default_country TEXT DEFAULT 'US' REFERENCES public.countries(id);

-- Add country preferences to portfolios
ALTER TABLE public.portfolios 
ADD COLUMN default_country TEXT DEFAULT 'US' REFERENCES public.countries(id);

-- Create function to get country address format
CREATE OR REPLACE FUNCTION public.get_country_address_format(country_code TEXT)
RETURNS JSONB
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(address_format, '{"format": ["street", "city", "state", "postal_code"], "required": ["street", "city"]}')
  FROM public.countries
  WHERE id = country_code AND is_active = true;
$$;

-- Create function to validate international postal code
CREATE OR REPLACE FUNCTION public.validate_postal_code(postal_code TEXT, country_code TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE 
    WHEN postal_code IS NULL OR postal_code = '' THEN true
    WHEN country_code IS NULL THEN true
    ELSE COALESCE(
      postal_code ~ COALESCE(
        (SELECT postal_code_regex FROM public.countries WHERE id = country_code),
        '.*'
      ),
      true
    )
  END;
$$;

-- Update commercial property metadata to support international addresses
COMMENT ON COLUMN public.properties.international_address IS 'Flexible address storage for international properties: {"street_1", "street_2", "city", "state_province", "postal_code", "district", "region"}';

COMMENT ON COLUMN public.portfolio_assets.location_country IS 'Country where the asset is currently located';
COMMENT ON COLUMN public.portfolio_assets.registration_country IS 'Country where the asset is registered/incorporated';
COMMENT ON COLUMN public.portfolio_assets.location_metadata IS 'Asset-specific location data: {"marina_berth", "hangar_code", "storage_facility", "vault_location", etc.}';
