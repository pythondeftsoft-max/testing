import React from 'react';
import { useTheme } from './DynamicThemeProvider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const WhiteLabelTestComponent = () => {
  const { isWhiteLabeled, whiteLabelConfig } = useTheme();

  if (!isWhiteLabeled) {
    return (
      <Card className="m-4 border-dashed">
        <CardHeader>
          <CardTitle>White Label Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No white label configuration detected. Using default OpenKey branding.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          White Label Active
          <Badge variant="secondary">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Company:</strong> {whiteLabelConfig?.company_name || 'Not set'}
          </div>
          <div>
            <strong>Subdomain:</strong> {whiteLabelConfig?.custom_subdomain || 'Not set'}
          </div>
          <div>
            <strong>Domain:</strong> {whiteLabelConfig?.custom_domain || 'Not set'}
          </div>
          <div>
            <strong>Theme:</strong> {whiteLabelConfig?.theme_preset || 'custom'}
          </div>
        </div>

        {whiteLabelConfig?.landing_page_config && (
          <div className="mt-4 p-3 bg-secondary/20 rounded-md">
            <strong className="text-sm">Landing Page:</strong> Configured
          </div>
        )}

        {whiteLabelConfig?.email_template_config && (
          <div className="mt-2 p-3 bg-secondary/20 rounded-md">
            <strong className="text-sm">Email Template:</strong> Configured
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <div 
            className="w-6 h-6 rounded border"
            style={{ backgroundColor: whiteLabelConfig?.primary_color || '#2563eb' }}
            title="Primary Color"
          />
          <div 
            className="w-6 h-6 rounded border"
            style={{ backgroundColor: whiteLabelConfig?.secondary_color || '#1e40af' }}
            title="Secondary Color"
          />
          <div 
            className="w-6 h-6 rounded border"
            style={{ backgroundColor: whiteLabelConfig?.accent_color || '#3b82f6' }}
            title="Accent Color"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default WhiteLabelTestComponent;