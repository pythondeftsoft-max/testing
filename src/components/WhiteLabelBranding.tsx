
import React from 'react';
import { useTheme } from './DynamicThemeProvider';

interface WhiteLabelBrandingProps {
  className?: string;
  showLogo?: boolean;
  showCompanyName?: boolean;
  fallbackText?: string;
}

const WhiteLabelBranding = ({ 
  className = '', 
  showLogo = true, 
  showCompanyName = true,
  fallbackText = 'OpenKey'
}: WhiteLabelBrandingProps) => {
  const { isWhiteLabeled, whiteLabelConfig } = useTheme();

  if (!isWhiteLabeled || !whiteLabelConfig) {
    return <span className={`inline-block ${className}`}>{fallbackText}</span>;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLogo && whiteLabelConfig.company_logo_url && (
        <img 
          src={whiteLabelConfig.company_logo_url} 
          alt={whiteLabelConfig.company_name || 'Company Logo'}
          className="h-8 w-auto object-contain"
        />
      )}
      {showCompanyName && whiteLabelConfig.company_name && (
        <span className="font-semibold">
          {whiteLabelConfig.company_name}
        </span>
      )}
      {!showCompanyName && !whiteLabelConfig.company_logo_url && fallbackText && (
        <span>{fallbackText}</span>
      )}
    </div>
  );
};

export default WhiteLabelBranding;
