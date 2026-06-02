
import React from 'react';
import { getCountrySpecificRules } from '@/lib/internationalUtils';

interface CountryAwareFormatterProps {
  countryCode: string;
  children: (rules: ReturnType<typeof getCountrySpecificRules>) => React.ReactNode;
}

export const CountryAwareFormatter: React.FC<CountryAwareFormatterProps> = ({
  countryCode,
  children
}) => {
  const rules = React.useMemo(() => 
    getCountrySpecificRules(countryCode), 
    [countryCode]
  );

  return <>{children(rules)}</>;
};

interface CountryAwareTextProps {
  countryCode: string;
  field: 'postalCodeName' | 'dateFormat' | 'phoneFormat';
  className?: string;
}

export const CountryAwareText: React.FC<CountryAwareTextProps> = ({
  countryCode,
  field,
  className = ''
}) => {
  const rules = getCountrySpecificRules(countryCode);
  
  return (
    <span className={className}>
      {rules[field]}
    </span>
  );
};
