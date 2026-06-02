import React from 'react';
import DOMPurify from 'dompurify';
import { useTheme } from './DynamicThemeProvider';

interface WhiteLabelEmailTemplateProps {
  subject?: string;
  preheader?: string;
  content?: string;
  ctaText?: string;
  ctaUrl?: string;
  recipientName?: string;
}

const WhiteLabelEmailTemplate = ({ 
  subject = "Welcome!",
  preheader = "",
  content = "Thank you for joining us.",
  ctaText = "Get Started",
  ctaUrl = "#",
  recipientName = "Valued Customer"
}: WhiteLabelEmailTemplateProps) => {
  const { isWhiteLabeled, whiteLabelConfig } = useTheme();

  const emailConfig = whiteLabelConfig?.email_template_config || {};
  const companyName = whiteLabelConfig?.company_name || 'OpenKey';
  const logoUrl = whiteLabelConfig?.company_logo_url;
  const primaryColor = whiteLabelConfig?.primary_color || '#2563eb';
  const footerText = whiteLabelConfig?.footer_text;

  // Apply email template customizations
  const headerBgColor = emailConfig.header_background_color || primaryColor;
  const buttonColor = emailConfig.button_color || primaryColor;
  const customFont = emailConfig.font_family || 'system-ui, -apple-system, sans-serif';

  return (
    <div 
      className="max-w-2xl mx-auto bg-white"
      style={{ fontFamily: customFont }}
    >
      {/* Email Header */}
      <div 
        className="px-6 py-8 text-center text-white"
        style={{ backgroundColor: headerBgColor }}
      >
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={companyName}
            className="h-12 mx-auto mb-4"
            style={{ maxHeight: '48px' }}
          />
        ) : (
          <h1 className="text-2xl font-bold mb-4">{companyName}</h1>
        )}
        
        {preheader && (
          <p className="text-sm opacity-90">{preheader}</p>
        )}
      </div>

      {/* Email Body */}
      <div className="px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {subject}
        </h2>
        
        <p className="text-gray-700 mb-6">
          Hello {recipientName},
        </p>
        
        <div 
          className="text-gray-700 mb-8 leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(content, {
              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span'],
              ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
              ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
            })
          }}
        />
        
        {ctaText && ctaUrl && (
          <div className="text-center mb-8">
            <a 
              href={ctaUrl}
              className="inline-block px-8 py-3 text-white font-semibold rounded-lg text-decoration-none"
              style={{ backgroundColor: buttonColor }}
            >
              {ctaText}
            </a>
          </div>
        )}

        {/* Contact Information */}
        {(whiteLabelConfig?.contact_email || whiteLabelConfig?.contact_phone) && (
          <div className="border-t pt-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Need Help? We're Here for You
            </h3>
            
            <div className="space-y-2 text-gray-600">
              {whiteLabelConfig.contact_email && (
                <p>
                  <strong>Email:</strong>{' '}
                  <a 
                    href={`mailto:${whiteLabelConfig.contact_email}`}
                    className="text-blue-600"
                  >
                    {whiteLabelConfig.contact_email}
                  </a>
                </p>
              )}
              
              {whiteLabelConfig.contact_phone && (
                <p>
                  <strong>Phone:</strong>{' '}
                  <a 
                    href={`tel:${whiteLabelConfig.contact_phone}`}
                    className="text-blue-600"
                  >
                    {whiteLabelConfig.contact_phone}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Email Footer */}
      <div className="px-6 py-6 bg-gray-50 text-center">
        {footerText ? (
          <p className="text-sm text-gray-600 mb-4">{footerText}</p>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            © {new Date().getFullYear()} {companyName}. All rights reserved.
          </p>
        )}
        
        {whiteLabelConfig?.address && (
          <p className="text-xs text-gray-500">{whiteLabelConfig.address}</p>
        )}
        
        <div className="mt-4 text-xs text-gray-500">
          <a href="#" className="mx-2 hover:text-gray-700">Unsubscribe</a>
          <span>|</span>
          <a href="#" className="mx-2 hover:text-gray-700">Privacy Policy</a>
          <span>|</span>
          <a href="#" className="mx-2 hover:text-gray-700">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};

export default WhiteLabelEmailTemplate;