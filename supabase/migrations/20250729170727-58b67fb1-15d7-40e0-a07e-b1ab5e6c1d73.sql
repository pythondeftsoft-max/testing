
-- Add missing amenity boolean columns to the properties table
ALTER TABLE public.properties 
ADD COLUMN balcony_patio boolean DEFAULT false,
ADD COLUMN dishwasher boolean DEFAULT false,
ADD COLUMN microwave boolean DEFAULT false,
ADD COLUMN refrigerator boolean DEFAULT false,
ADD COLUMN hardwood_floors boolean DEFAULT false,
ADD COLUMN carpet boolean DEFAULT false,
ADD COLUMN tile_floors boolean DEFAULT false,
ADD COLUMN central_heating boolean DEFAULT false,
ADD COLUMN fireplace boolean DEFAULT false,
ADD COLUMN walkin_closets boolean DEFAULT false,
ADD COLUMN storage_unit boolean DEFAULT false,
ADD COLUMN gym_fitness boolean DEFAULT false,
ADD COLUMN pool boolean DEFAULT false,
ADD COLUMN security_system boolean DEFAULT false,
ADD COLUMN in_unit_laundry boolean DEFAULT false,
ADD COLUMN shared_laundry boolean DEFAULT false,
ADD COLUMN laundry_hookups boolean DEFAULT false,
ADD COLUMN yard_garden boolean DEFAULT false,
ADD COLUMN parking_available boolean DEFAULT false,
ADD COLUMN pet_friendly boolean DEFAULT false;

-- Add comments to document the amenity columns
COMMENT ON COLUMN public.properties.balcony_patio IS 'Property has balcony or patio';
COMMENT ON COLUMN public.properties.dishwasher IS 'Property has dishwasher';
COMMENT ON COLUMN public.properties.microwave IS 'Property has microwave';
COMMENT ON COLUMN public.properties.refrigerator IS 'Property has refrigerator';
COMMENT ON COLUMN public.properties.hardwood_floors IS 'Property has hardwood flooring';
COMMENT ON COLUMN public.properties.carpet IS 'Property has carpeted flooring';
COMMENT ON COLUMN public.properties.tile_floors IS 'Property has tile flooring';
COMMENT ON COLUMN public.properties.central_heating IS 'Property has central heating system';
COMMENT ON COLUMN public.properties.fireplace IS 'Property has fireplace';
COMMENT ON COLUMN public.properties.walkin_closets IS 'Property has walk-in closets';
COMMENT ON COLUMN public.properties.storage_unit IS 'Property has storage unit';
COMMENT ON COLUMN public.properties.gym_fitness IS 'Property has gym or fitness facilities';
COMMENT ON COLUMN public.properties.pool IS 'Property has pool access';
COMMENT ON COLUMN public.properties.security_system IS 'Property has security system';
COMMENT ON COLUMN public.properties.in_unit_laundry IS 'Property has in-unit laundry';
COMMENT ON COLUMN public.properties.shared_laundry IS 'Property has shared laundry facilities';
COMMENT ON COLUMN public.properties.laundry_hookups IS 'Property has laundry hookups';
COMMENT ON COLUMN public.properties.yard_garden IS 'Property has yard or garden';
COMMENT ON COLUMN public.properties.parking_available IS 'Property has parking available';
COMMENT ON COLUMN public.properties.pet_friendly IS 'Property is pet friendly';
