import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ThemeRequest {
  configId: string;
  themeName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily?: string;
  customCSS?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const themeData: ThemeRequest = await req.json();

    // Validate required fields
    if (!themeData.configId || !themeData.themeName || !themeData.primaryColor) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate CSS variables from colors
    const cssVariables = generateCSSVariables(themeData);

    // Generate component overrides
    const componentOverrides = generateComponentOverrides(themeData);

    // Prepare custom fonts configuration
    const customFonts = themeData.fontFamily ? {
      primary: {
        name: themeData.fontFamily,
        fallback: 'sans-serif',
        weights: ['400', '500', '600', '700']
      }
    } : {};

    // Deactivate other themes for this config
    await supabase
      .from('white_label_themes')
      .update({ is_active: false })
      .eq('config_id', themeData.configId);

    // Insert new theme
    const { data, error } = await supabase
      .from('white_label_themes')
      .insert({
        config_id: themeData.configId,
        theme_name: themeData.themeName,
        is_active: true,
        css_variables: cssVariables,
        component_overrides: componentOverrides,
        custom_fonts: customFonts,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating theme:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create theme' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate complete CSS file
    const cssContent = generateCompleteCSS(cssVariables, componentOverrides, customFonts);

    return new Response(
      JSON.stringify({ 
        success: true, 
        theme: data,
        cssContent,
        previewUrl: `/theme-preview/${data.id}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in theme-generator function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

function generateCSSVariables(themeData: ThemeRequest): Record<string, string> {
  // Convert hex colors to HSL
  const primaryHSL = hexToHSL(themeData.primaryColor);
  const secondaryHSL = hexToHSL(themeData.secondaryColor || themeData.primaryColor);
  const accentHSL = hexToHSL(themeData.accentColor || themeData.primaryColor);

  return {
    'primary': primaryHSL,
    'primary-foreground': getContrastColor(primaryHSL),
    'secondary': secondaryHSL,
    'secondary-foreground': getContrastColor(secondaryHSL),
    'accent': accentHSL,
    'accent-foreground': getContrastColor(accentHSL),
    'primary-glow': adjustLightness(primaryHSL, 10),
    'primary-variant': adjustLightness(primaryHSL, -10),
    'gradient-primary': `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${adjustLightness(primaryHSL, 15)}))`,
    'shadow-elegant': `0 10px 30px -10px hsl(${primaryHSL} / 0.3)`,
    'shadow-glow': `0 0 40px hsl(${primaryHSL} / 0.4)`,
  };
}

function generateComponentOverrides(themeData: ThemeRequest): Record<string, any> {
  return {
    button: {
      primary: {
        background: `hsl(var(--primary))`,
        color: `hsl(var(--primary-foreground))`,
        hover: {
          background: `hsl(var(--primary-variant))`,
        }
      },
      secondary: {
        background: `hsl(var(--secondary))`,
        color: `hsl(var(--secondary-foreground))`,
      }
    },
    card: {
      background: `hsl(var(--card))`,
      border: `hsl(var(--border))`,
      shadow: `var(--shadow-elegant)`,
    },
    header: {
      background: `var(--gradient-primary)`,
      color: `hsl(var(--primary-foreground))`,
    }
  };
}

function generateCompleteCSS(
  cssVariables: Record<string, string>,
  componentOverrides: Record<string, any>,
  customFonts: Record<string, any>
): string {
  let css = ':root {\n';
  
  // Add CSS variables
  Object.entries(cssVariables).forEach(([key, value]) => {
    css += `  --${key}: ${value};\n`;
  });
  
  css += '}\n\n';

  // Add font imports if custom fonts are specified
  Object.entries(customFonts).forEach(([_, fontConfig]: [string, any]) => {
    if (fontConfig.url) {
      css += `@import url('${fontConfig.url}');\n`;
    }
  });

  // Add component overrides
  css += generateComponentCSS(componentOverrides);

  return css;
}

function generateComponentCSS(overrides: Record<string, any>): string {
  let css = '\n/* Component Overrides */\n';
  
  if (overrides.button) {
    css += `
.btn-primary {
  background: ${overrides.button.primary?.background || 'hsl(var(--primary))'};
  color: ${overrides.button.primary?.color || 'hsl(var(--primary-foreground))'};
}

.btn-primary:hover {
  background: ${overrides.button.primary?.hover?.background || 'hsl(var(--primary-variant))'};
}

.btn-secondary {
  background: ${overrides.button.secondary?.background || 'hsl(var(--secondary))'};
  color: ${overrides.button.secondary?.color || 'hsl(var(--secondary-foreground))'};
}
`;
  }

  if (overrides.card) {
    css += `
.custom-card {
  background: ${overrides.card.background || 'hsl(var(--card))'};
  border: 1px solid ${overrides.card.border || 'hsl(var(--border))'};
  box-shadow: ${overrides.card.shadow || 'var(--shadow-elegant)'};
}
`;
  }

  if (overrides.header) {
    css += `
.custom-header {
  background: ${overrides.header.background || 'var(--gradient-primary)'};
  color: ${overrides.header.color || 'hsl(var(--primary-foreground))'};
}
`;
  }

  return css;
}

// Utility functions
function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getContrastColor(hsl: string): string {
  const lightness = parseInt(hsl.split(' ')[2]);
  return lightness > 50 ? '0 0% 0%' : '0 0% 100%';
}

function adjustLightness(hsl: string, adjustment: number): string {
  const parts = hsl.split(' ');
  const lightness = parseInt(parts[2]) + adjustment;
  return `${parts[0]} ${parts[1]} ${Math.max(0, Math.min(100, lightness))}%`;
}

serve(handler);