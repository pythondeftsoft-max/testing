-- Seed blog_categories with the 4 content pillars (matching blog_pillars)
INSERT INTO blog_categories (name, slug, description, is_active) VALUES
('Tenants & Section 8', 'tenants', 'Eligibility, timelines, how programs work, and local housing guidance for Section 8 and voucher housing.', true),
('Landlords', 'landlords', 'Property management software, asset tracking, portfolio growth, and tenant acquisition strategies for all asset classes.', true),
('Property Managers', 'property-managers', 'Property management software reviews, portfolio analytics, business scaling strategies, and operations across all asset classes.', true),
('Real Estate & Market', 'real-estate', 'Housing market trends, affordable housing data, policy changes, and national/state-level insights.', true);