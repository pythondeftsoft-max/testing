import React from 'react';
import { useTheme } from './DynamicThemeProvider';
import { ThemeLoadingSkeleton } from './WhiteLabelLoadingStates';

interface ThemeGuardProps {
  children: React.ReactNode;
}

export const ThemeGuard = ({ children }: ThemeGuardProps) => {
  const { isInitialized, isApplyingTheme, themeError } = useTheme();

  // CRITICAL: If there's a theme error, render children anyway
  // This ensures auth forms always load even if white-label lookup fails
  if (themeError) {
    console.warn('[ThemeGuard] Theme error detected, rendering without custom theme:', themeError);
    return <>{children}</>;
  }

  // Only show skeleton briefly - don't block indefinitely
  if (!isInitialized || isApplyingTheme) {
    return <ThemeLoadingSkeleton />;
  }

  return <>{children}</>;
};