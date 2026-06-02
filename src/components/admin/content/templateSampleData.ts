/**
 * Static sample data used to render miniature previews of each template.
 */

const today = new Date().toISOString().split('T')[0];

export const TEMPLATE_SAMPLE_DATA: Record<string, any> = {
  blog: {
    title: 'How to Find Affordable Housing in 2025',
    h1: 'How to Find Affordable Housing in 2025',
    body_content:
      '<p>Finding affordable housing can feel overwhelming, but with the right strategy you can secure a safe, comfortable home within your budget.</p><h2>Start with Your Budget</h2><p>Before you begin searching, calculate how much you can realistically spend on rent each month. Most experts recommend spending no more than 30% of your gross income on housing.</p><h2>Explore Assistance Programs</h2><p>Programs like Section 8, public housing, and state-level rental assistance can significantly reduce your monthly costs.</p>',
    excerpt: 'A practical guide to navigating the affordable housing market — from budgeting tips to assistance programs.',
    featured_image: null,
    cta_block: '<p><strong>Need help finding housing?</strong></p><p><a href="/find-home">Search available listings near you →</a></p>',
    publish_date: today,
    city: null,
    state: null,
  },

  'city-landing': {
    title: 'Affordable Housing in Houston, Texas',
    h1: 'Affordable Housing in Houston, Texas',
    body_content:
      '<p>Houston offers a wide range of affordable housing options for renters. Whether you\'re looking for Section 8 properties or market-rate apartments, the city has programs to help.</p><h2>Why Houston?</h2><p>With a lower cost of living compared to other major metros, Houston is one of the best cities for affordable housing in the South.</p>',
    cta_block: '<p><strong>Find your next home in Houston</strong></p><p><a href="/find-home">Browse listings →</a></p>',
    city: 'Houston',
    state: 'Texas',
    featured_image: null,
    schema_data: {
      highlights: [
        { title: 'Median Rent', value: '$1,180/mo', description: '2-bedroom average' },
        { title: 'Voucher Acceptance', value: '68%', description: 'Of listed properties' },
        { title: 'Population', value: '2.3M', description: '4th largest US city' },
      ],
      neighborhoods: [
        { name: 'Midtown', bullets: ['Walkable dining & nightlife', 'Light rail access', 'Avg rent: $1,350'] },
        { name: 'Third Ward', bullets: ['Historic arts district', 'Near University of Houston', 'Avg rent: $980'] },
        { name: 'Spring Branch', bullets: ['Family-friendly', 'Top-rated schools', 'Avg rent: $1,100'] },
      ],
      faq: [
        { question: 'What is the average rent in Houston?', answer: '<p>The average rent for a 2-bedroom apartment in Houston is approximately $1,180/month, though prices vary significantly by neighborhood.</p>' },
        { question: 'Does Houston accept housing vouchers?', answer: '<p>Yes. About 68% of properties listed on OpenKey in Houston accept Section 8 and other housing vouchers.</p>' },
      ],
    },
  },

  section8: {
    title: 'Section 8 Housing in Houston, Texas',
    h1: 'Section 8 Housing in Houston, Texas',
    body_content:
      '<p>Section 8, also known as the Housing Choice Voucher Program, helps low-income families afford safe housing in Houston.</p>',
    cta_block: '<p><strong>Get help with your voucher</strong></p><p><a href="/find-home">Start your search →</a></p>',
    city: 'Houston',
    state: 'Texas',
    schema_data: {
      housing_authority: { name: 'Houston Housing Authority', phone: '(713) 260-0500', address: '2640 Fountain View Dr, Houston, TX 77057', website: 'https://www.housingforhouston.com' },
      waitlist_status: { is_open: false, closed_since: '2023', notes: 'The waitlist has been closed since 2023. OpenKey helps you bypass the waitlist by connecting you directly with participating landlords.' },
      neighborhoods: [
        { name: 'Midtown', bullets: ['Walkable dining & nightlife', 'Light rail access', 'Avg rent: $1,350'] },
        { name: 'Third Ward', bullets: ['Historic arts district', 'Near University of Houston', 'Avg rent: $980'] },
      ],
      faq: [
        { question: 'Is the Houston Section 8 waitlist open?', answer: '<p>No, the Houston Housing Authority waitlist has been closed since 2023. OpenKey helps you find voucher-friendly landlords without waiting.</p>' },
        { question: 'How does OpenKey help with Section 8?', answer: '<p>We connect voucher holders directly with landlords who accept housing vouchers, skipping the traditional waitlist process.</p>' },
      ],
    },
  },

  landlord: {
    title: 'List Your Property in Houston, Texas',
    h1: 'List Your Property in Houston, Texas',
    body_content:
      '<p>Partnering with housing voucher programs gives landlords guaranteed rental income and access to a large pool of pre-screened tenants.</p><h2>Benefits for Landlords</h2><ul><li>Guaranteed monthly payments from the housing authority</li><li>Reduced vacancy rates</li><li>Access to vetted, qualified tenants</li></ul><h2>How It Works</h2><p>Simply list your property, pass a basic inspection, and start receiving tenants. We handle the paperwork.</p>',
    cta_block: '<p><strong>Ready to list?</strong></p><p><a href="/auth">Create your landlord account →</a></p>',
    city: 'Houston',
    state: 'Texas',
    schema_data: {
      property_requirements: [
        'Pass HQS (Housing Quality Standards) inspection',
        'Rent must be at or below Fair Market Rent',
        'Property must have working smoke detectors',
        'No lead-based paint hazards',
        'Working plumbing, heating, and electrical systems',
        'Adequate weatherization and ventilation',
      ],
      faq: [
        { question: 'Is it free to list my property?', answer: '<p>Yes. Listing on OpenKey is completely free — no fees, no commissions.</p>' },
        { question: 'How long does the inspection take?', answer: '<p>Most HQS inspections are completed within 1-2 business days. We help you prepare to pass on the first try.</p>' },
        { question: 'When do I start receiving rent?', answer: '<p>Once a tenant is placed and the HAP contract is signed, you\'ll receive guaranteed monthly payments from the housing authority.</p>' },
      ],
    },
  },

  comparison: {
    title: 'AppFolio vs Buildium: Property Management Software Compared',
    h1: 'AppFolio vs Buildium: Which Is Better in 2025?',
    body_content:
      '<p>Choosing the right property management software can save hours of work each week. Here\'s how AppFolio and Buildium stack up.</p><table><thead><tr><th>Feature</th><th>AppFolio</th><th>Buildium</th></tr></thead><tbody><tr><td>Starting Price</td><td>$1.40/unit</td><td>$55/mo</td></tr><tr><td>Tenant Screening</td><td>✓</td><td>✓</td></tr><tr><td>Online Payments</td><td>✓</td><td>✓</td></tr><tr><td>Maintenance Tracking</td><td>✓</td><td>✓</td></tr></tbody></table><p>Both platforms are solid choices, but AppFolio edges ahead for larger portfolios while Buildium is more budget-friendly for small landlords.</p>',
    cta_block: '<p><strong>Try OpenKey instead — it\'s free</strong></p><p><a href="/auth">Get started →</a></p>',
    city: null,
    state: null,
    schema_data: {
      competitors: [
        { name: 'AppFolio', pros: ['Robust mobile app', 'AI-powered leasing tools', 'Great for large portfolios'], cons: ['Higher price point', 'No free tier', 'Minimum unit requirement'] },
        { name: 'Buildium', pros: ['Affordable for small landlords', 'Strong accounting tools', 'Free trial available'], cons: ['Dated interface', 'Limited automation', 'No AI features'] },
      ],
      verdict: 'AppFolio is the better choice for landlords with 50+ units who need automation and AI tools. Buildium wins for small landlords on a budget. For voucher-specific property management, OpenKey is the only platform purpose-built for Section 8 and HCV landlords — and it\'s free.',
      faq: [
        { question: 'Can I use AppFolio for Section 8 properties?', answer: '<p>AppFolio supports general property management but lacks voucher-specific features like HAP tracking and HQS inspection management.</p>' },
        { question: 'Is OpenKey really free?', answer: '<p>Yes. OpenKey is 100% free for landlords. We connect you with voucher-holding tenants at zero cost.</p>' },
      ],
    },
  },

  'rent-data': {
    title: 'Rent Prices in Houston, Texas — 2025 Data',
    h1: 'Houston, Texas Rent Data — 2025',
    body_content:
      '<p>Average rent in Houston continues to evolve. Here are the latest figures.</p><h2>Market Overview</h2><p>Houston remains one of the most affordable major metros in the US. Rent growth has been moderate, driven by steady population inflows and new construction.</p>',
    cta_block: '<p><strong>Find affordable rentals in Houston</strong></p><p><a href="/find-home">Search listings →</a></p>',
    city: 'Houston',
    state: 'Texas',
    schema_data: {
      metrics: [
        { label: '1-Bedroom', value: '$1,050/mo', change: '+2.8%' },
        { label: '2-Bedroom', value: '$1,280/mo', change: '+3.2%' },
        { label: '3-Bedroom', value: '$1,620/mo', change: '+1.9%' },
      ],
      neighborhoods: [
        { name: 'Midtown', bullets: ['1-Bed: $1,200', '2-Bed: $1,500', 'High walkability'] },
        { name: 'Heights', bullets: ['1-Bed: $1,100', '2-Bed: $1,400', 'Trendy dining scene'] },
        { name: 'Katy', bullets: ['1-Bed: $950', '2-Bed: $1,150', 'Top school district'] },
      ],
      faq: [
        { question: 'What is the average rent in Houston in 2025?', answer: '<p>The average rent for a 2-bedroom apartment in Houston is $1,280/month as of 2025, up 3.2% year-over-year.</p>' },
        { question: 'Is Houston rent going up?', answer: '<p>Yes, but moderately. Houston rent has increased 2-3% annually, well below the national average of 4.5%.</p>' },
      ],
    },
  },

  page: {
    title: 'About OpenKey Housing',
    h1: 'About OpenKey Housing',
    body_content:
      '<p>OpenKey Housing connects tenants, landlords, and housing authorities on a single platform — making affordable housing accessible to everyone.</p><h2>Our Mission</h2><p>We believe everyone deserves a safe, affordable place to call home. Our technology simplifies the process of finding, listing, and managing housing voucher properties.</p>',
    cta_block: '<p><strong>Join the platform</strong></p><p><a href="/auth">Create your free account →</a></p>',
    featured_image: null,
    city: null,
    state: null,
  },
};

/** Load saved template settings from localStorage */
export function getTemplateSettings(template: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`template-settings-${template}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save template settings to localStorage */
export function saveTemplateSettings(template: string, settings: Record<string, string>) {
  localStorage.setItem(`template-settings-${template}`, JSON.stringify(settings));
}
