-- Update landlord4 white-label config with proper landing page and email template configs
UPDATE white_label_configs 
SET 
    landing_page_config = jsonb_build_object(
        'hero', jsonb_build_object(
            'title', 'Welcome to Foster Investment Group',
            'subtitle', 'Professional property management services for modern investors',
            'ctaText', 'Get Started Today',
            'backgroundType', 'gradient'
        ),
        'features', jsonb_build_array(
            jsonb_build_object(
                'title', 'Property Management',
                'description', 'Full-service property management with 24/7 support',
                'icon', 'Building'
            ),
            jsonb_build_object(
                'title', 'Tenant Portal',
                'description', 'Modern tenant experience with online payments',
                'icon', 'Users'
            ),
            jsonb_build_object(
                'title', 'Real-time Analytics',
                'description', 'Track performance and maximize your ROI',
                'icon', 'TrendingUp'
            )
        )
    ),
    email_template_config = jsonb_build_object(
        'headerBackground', '#2563eb',
        'footerText', 'Foster Investment Group - Professional Property Management',
        'showCompanyLogo', true,
        'showContactInfo', true
    )
WHERE user_id = '50a0100f-7fc2-46ca-8335-dd6ed2512d56'
  AND company_name = 'Foster Investment Group';