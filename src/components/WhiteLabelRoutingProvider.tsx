import React from 'react';
import { useTheme } from './DynamicThemeProvider';

// Legacy provider removed - now using DynamicThemeProvider

// HOC to wrap route components with white-label logic
export const withWhiteLabelRouting = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const { isWhiteLabeled, whiteLabelConfig } = useTheme();
    
    // For white-label domains, let the React app handle all routes with custom theming
    // The DynamicThemeProvider will apply the appropriate branding
    return <Component {...props} />;
  };
};
