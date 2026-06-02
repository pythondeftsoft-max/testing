
-- Create enums for standardized property values
CREATE TYPE property_type AS ENUM (
  'house',
  'apartment', 
  'condo',
  'townhouse',
  'duplex',
  'studio',
  'loft',
  'mobile_home',
  'other'
);

CREATE TYPE parking_type AS ENUM (
  'garage',
  'covered',
  'driveway',
  'street',
  'carport',
  'none'
);

CREATE TYPE pet_policy AS ENUM (
  'allowed',
  'not_allowed',
  'cats_only',
  'dogs_only',
  'small_pets_only',
  'case_by_case'
);

CREATE TYPE laundry_type AS ENUM (
  'in_unit',
  'shared_laundry',
  'hookups_provided',
  'none'
);

CREATE TYPE outdoor_space_type AS ENUM (
  'none',
  'balcony',
  'patio',
  'yard',
  'deck',
  'rooftop',
  'garden'
);

CREATE TYPE heating_type AS ENUM (
  'central_air',
  'forced_air',
  'radiant',
  'baseboard',
  'heat_pump',
  'fireplace',
  'none'
);

CREATE TYPE flooring_type AS ENUM (
  'hardwood',
  'carpet',
  'tile',
  'laminate',
  'vinyl',
  'concrete',
  'mixed'
);

-- Add comprehensive property detail columns to properties table
ALTER TABLE public.properties 
ADD COLUMN property_type property_type DEFAULT 'apartment',
ADD COLUMN square_feet INTEGER,
ADD COLUMN lot_size NUMERIC,
ADD COLUMN year_built INTEGER,
ADD COLUMN stories INTEGER,
ADD COLUMN garage_spaces INTEGER DEFAULT 0,
ADD COLUMN parking_type parking_type DEFAULT 'street',
ADD COLUMN pet_policy pet_policy DEFAULT 'case_by_case',
ADD COLUMN max_pets INTEGER DEFAULT 0,
ADD COLUMN pet_deposit NUMERIC DEFAULT 0,
ADD COLUMN furnished BOOLEAN DEFAULT false,
ADD COLUMN utilities_included TEXT[] DEFAULT '{}',
ADD COLUMN lease_terms TEXT[] DEFAULT '{}',
ADD COLUMN move_in_date DATE,
ADD COLUMN laundry_type laundry_type DEFAULT 'none',
ADD COLUMN air_conditioning BOOLEAN DEFAULT false,
ADD COLUMN heating_type heating_type DEFAULT 'central_air',
ADD COLUMN flooring_type flooring_type DEFAULT 'mixed',
ADD COLUMN appliances_included TEXT[] DEFAULT '{}',
ADD COLUMN outdoor_space_type outdoor_space_type DEFAULT 'none',
ADD COLUMN outdoor_space_size NUMERIC,
ADD COLUMN additional_features TEXT[] DEFAULT '{}',
ADD COLUMN school_district TEXT,
ADD COLUMN walk_score INTEGER,
ADD COLUMN bike_score INTEGER,
ADD COLUMN transit_score INTEGER,
ADD COLUMN security_features TEXT[] DEFAULT '{}',
ADD COLUMN community_amenities TEXT[] DEFAULT '{}';

-- Add constraints for sensible ranges
ALTER TABLE public.properties 
ADD CONSTRAINT check_year_built CHECK (year_built IS NULL OR (year_built >= 1800 AND year_built <= EXTRACT(YEAR FROM CURRENT_DATE) + 2)),
ADD CONSTRAINT check_stories CHECK (stories IS NULL OR (stories >= 1 AND stories <= 50)),
ADD CONSTRAINT check_garage_spaces CHECK (garage_spaces >= 0 AND garage_spaces <= 10),
ADD CONSTRAINT check_max_pets CHECK (max_pets >= 0 AND max_pets <= 20),
ADD CONSTRAINT check_walk_score CHECK (walk_score IS NULL OR (walk_score >= 0 AND walk_score <= 100)),
ADD CONSTRAINT check_bike_score CHECK (bike_score IS NULL OR (bike_score >= 0 AND bike_score <= 100)),
ADD CONSTRAINT check_transit_score CHECK (transit_score IS NULL OR (transit_score >= 0 AND transit_score <= 100));

-- Create indexes for filtering performance
CREATE INDEX idx_properties_property_type ON public.properties(property_type);
CREATE INDEX idx_properties_square_feet ON public.properties(square_feet);
CREATE INDEX idx_properties_year_built ON public.properties(year_built);
CREATE INDEX idx_properties_pet_policy ON public.properties(pet_policy);
CREATE INDEX idx_properties_parking_type ON public.properties(parking_type);
CREATE INDEX idx_properties_laundry_type ON public.properties(laundry_type);
CREATE INDEX idx_properties_move_in_date ON public.properties(move_in_date);
CREATE INDEX idx_properties_furnished ON public.properties(furnished);
CREATE INDEX idx_properties_air_conditioning ON public.properties(air_conditioning);

-- Create GIN indexes for array columns for efficient filtering
CREATE INDEX idx_properties_utilities_included ON public.properties USING GIN(utilities_included);
CREATE INDEX idx_properties_lease_terms ON public.properties USING GIN(lease_terms);
CREATE INDEX idx_properties_appliances_included ON public.properties USING GIN(appliances_included);
CREATE INDEX idx_properties_additional_features ON public.properties USING GIN(additional_features);
CREATE INDEX idx_properties_security_features ON public.properties USING GIN(security_features);
CREATE INDEX idx_properties_community_amenities ON public.properties USING GIN(community_amenities);

-- Add unit-specific columns to property_units table
ALTER TABLE public.property_units
ADD COLUMN unit_square_feet INTEGER,
ADD COLUMN unit_furnished BOOLEAN DEFAULT false,
ADD COLUMN unit_utilities_included TEXT[] DEFAULT '{}',
ADD COLUMN unit_appliances_included TEXT[] DEFAULT '{}',
ADD COLUMN unit_flooring_type flooring_type DEFAULT 'mixed',
ADD COLUMN unit_air_conditioning BOOLEAN DEFAULT false,
ADD COLUMN unit_heating_type heating_type DEFAULT 'central_air',
ADD COLUMN unit_outdoor_space_type outdoor_space_type DEFAULT 'none',
ADD COLUMN unit_outdoor_space_size NUMERIC,
ADD COLUMN unit_additional_features TEXT[] DEFAULT '{}';

-- Create indexes for unit filtering
CREATE INDEX idx_property_units_square_feet ON public.property_units(unit_square_feet);
CREATE INDEX idx_property_units_furnished ON public.property_units(unit_furnished);
CREATE INDEX idx_property_units_air_conditioning ON public.property_units(unit_air_conditioning);
CREATE INDEX idx_property_units_utilities_included ON public.property_units USING GIN(unit_utilities_included);
CREATE INDEX idx_property_units_appliances_included ON public.property_units USING GIN(unit_appliances_included);
CREATE INDEX idx_property_units_additional_features ON public.property_units USING GIN(unit_additional_features);
