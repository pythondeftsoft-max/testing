
export interface Country {
  id: string;
  name: string;
  iso_code_2: string;
  iso_code_3: string;
  currency_code: string;
  address_format: {
    format: string[];
    required: string[];
  };
  postal_code_regex?: string;
  phone_prefix: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressFormat {
  format: string[];
  required: string[];
}

export interface InternationalAddress {
  street_1?: string;
  street_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  district?: string;
  region?: string;
}

export interface AssetLocationMetadata {
  marina_berth?: string;
  hangar_code?: string;
  storage_facility?: string;
  vault_location?: string;
  registration_number?: string;
  current_location?: string;
  home_base?: string;
  insurance_location?: string;
  operational_locations?: string[];
}
