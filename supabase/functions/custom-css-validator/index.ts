import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  css?: string;
  javascript?: string;
  html?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { css, javascript, html }: ValidationRequest = await req.json();

    console.log('Validating custom code...');

    const warnings: string[] = [];
    const errors: string[] = [];

    // CSS Validation
    if (css) {
      // Check for dangerous CSS properties
      const dangerousCssPatterns = [
        /javascript:/gi,
        /expression\s*\(/gi,
        /behavior\s*:/gi,
        /binding\s*:/gi,
        /@import\s+.*url\s*\(/gi,
        /moz-binding/gi,
      ];

      dangerousCssPatterns.forEach(pattern => {
        if (pattern.test(css)) {
          errors.push(`Dangerous CSS pattern detected: ${pattern.source}`);
        }
      });

      // Check for external URLs in CSS
      const externalUrlPattern = /url\s*\(\s*['"]?https?:\/\/(?!.*\.(woff|woff2|ttf|eot|svg|jpg|jpeg|png|gif|webp))/gi;
      if (externalUrlPattern.test(css)) {
        warnings.push('External URLs detected in CSS - ensure they are trusted sources');
      }

      // Check CSS syntax (basic validation)
      const unbalancedBraces = (css.match(/\{/g) || []).length !== (css.match(/\}/g) || []).length;
      if (unbalancedBraces) {
        errors.push('Unbalanced braces in CSS');
      }
    }

    // JavaScript Validation
    if (javascript) {
      // Check for dangerous JavaScript patterns
      const dangerousJsPatterns = [
        /eval\s*\(/gi,
        /Function\s*\(/gi,
        /setTimeout\s*\(\s*['"][^'"]*['"]/gi,
        /setInterval\s*\(\s*['"][^'"]*['"]/gi,
        /document\.write/gi,
        /innerHTML\s*=/gi,
        /outerHTML\s*=/gi,
        /window\.location/gi,
        /location\.href/gi,
        /document\.cookie/gi,
        /localStorage/gi,
        /sessionStorage/gi,
        /XMLHttpRequest/gi,
        /fetch\s*\(/gi,
        /navigator\./gi,
      ];

      dangerousJsPatterns.forEach(pattern => {
        if (pattern.test(javascript)) {
          errors.push(`Potentially dangerous JavaScript pattern detected: ${pattern.source}`);
        }
      });

      // Check for syntax errors (basic validation)
      try {
        new Function(javascript);
      } catch (syntaxError) {
        errors.push(`JavaScript syntax error: ${(syntaxError instanceof Error ? syntaxError.message : String(syntaxError))}`);
      }
    }

    // HTML Validation
    if (html) {
      // Check for dangerous HTML patterns
      const dangerousHtmlPatterns = [
        /<script[^>]*>/gi,
        /<iframe[^>]*>/gi,
        /<object[^>]*>/gi,
        /<embed[^>]*>/gi,
        /<form[^>]*>/gi,
        /on\w+\s*=/gi, // Event handlers
        /javascript:/gi,
        /data:text\/html/gi,
      ];

      dangerousHtmlPatterns.forEach(pattern => {
        if (pattern.test(html)) {
          errors.push(`Dangerous HTML pattern detected: ${pattern.source}`);
        }
      });

      // Check for unclosed tags (basic validation)
      const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
      const htmlWithoutSelfClosing = html.replace(/<(br|hr|img|input|meta|link)[^>]*\/?>/gi, '');
      const openTags = (htmlWithoutSelfClosing.match(/<[^\/][^>]*>/g) || []).length;
      const closeTags = (htmlWithoutSelfClosing.match(/<\/[^>]*>/g) || []).length;
      
      if (openTags !== closeTags) {
        warnings.push('Potentially unbalanced HTML tags detected');
      }
    }

    // Calculate security score
    const totalChecks = 20; // Approximate number of security checks
    const issuesFound = errors.length + warnings.length;
    const securityScore = Math.max(0, Math.round(((totalChecks - issuesFound) / totalChecks) * 100));

    const isValid = errors.length === 0;
    const sanitizedCode = {
      css: css ? css.replace(/javascript:/gi, '/* javascript: removed */') : '',
      javascript: javascript && isValid ? javascript : '',
      html: html ? html.replace(/<script[^>]*>.*?<\/script>/gi, '<!-- script removed -->') : ''
    };

    console.log('Code validation completed:', { isValid, errorsCount: errors.length, warningsCount: warnings.length });

    return new Response(
      JSON.stringify({
        isValid,
        errors,
        warnings,
        securityScore,
        sanitizedCode: isValid ? { css, javascript, html } : sanitizedCode,
        recommendations: [
          'Always test custom code thoroughly before deploying',
          'Avoid external scripts and links when possible',
          'Use content security policies for additional protection',
          'Regular security audits are recommended'
        ]
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in custom-css-validator function:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);