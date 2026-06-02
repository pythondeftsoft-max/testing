
import React, { useEffect } from 'react';
import { useTheme } from './DynamicThemeProvider';

interface SubdomainDetectorProps {
  children: React.ReactNode;
}

const SubdomainDetector = ({ children }: SubdomainDetectorProps) => {
  const { isWhiteLabeled, whiteLabelConfig } = useTheme();

  useEffect(() => {
    // Log white label detection for debugging
    if (isWhiteLabeled && whiteLabelConfig) {
      console.log('White label branding detected:', {
        company: whiteLabelConfig.company_name,
        subdomain: whiteLabelConfig.custom_subdomain,
        domain: whiteLabelConfig.custom_domain,
      });
    }
  }, [isWhiteLabeled, whiteLabelConfig]);

  return <>{children}</>;
};

export default SubdomainDetector;
