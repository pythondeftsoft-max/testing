
import React from 'react';
import { useTheme } from './DynamicThemeProvider';

const WhiteLabelFooter = () => {
  const { isWhiteLabeled, whiteLabelConfig } = useTheme();

  if (!isWhiteLabeled || !whiteLabelConfig?.footer_text) {
    return null; // Don't render anything if no white label footer is configured
  }

  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center text-sm text-muted-foreground">
          {whiteLabelConfig.footer_text}
        </div>
        
        {/* Contact Information */}
        {(whiteLabelConfig.contact_email || whiteLabelConfig.contact_phone || whiteLabelConfig.address) && (
          <div className="mt-4 text-center text-xs text-muted-foreground space-y-1">
            {whiteLabelConfig.contact_email && (
              <div>Email: {whiteLabelConfig.contact_email}</div>
            )}
            {whiteLabelConfig.contact_phone && (
              <div>Phone: {whiteLabelConfig.contact_phone}</div>
            )}
            {whiteLabelConfig.address && (
              <div>{whiteLabelConfig.address}</div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
};

export default WhiteLabelFooter;
