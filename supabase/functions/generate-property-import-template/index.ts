const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_type = 'simple' } = await req.json().catch(() => ({}));

    let csvHeaders: string[];
    let exampleRows: string[][];

    if (template_type === 'units') {
      // Multi-unit property template
      csvHeaders = [
        'street_address',
        'city', 
        'state',
        'zipcode',
        'property_type',
        'property_name',
        'unit_number',
        'unit_type',
        'bedrooms',
        'bathrooms',
        'square_feet',
        'monthly_rent',
        'deposit_amount',
        'pet_friendly',
        'parking_spots',
        'amenities',
        'unit_amenities',
        'lease_terms',
        'availability_date',
        'notes'
      ];

      exampleRows = [
        [
          '123 Oak Street',
          'Denver',
          'CO',
          '80202',
          'apartment',
          'Oak Street Apartments',
          '1A',
          'apartment',
          '2',
          '1',
          '900',
          '1200',
          '1200',
          'true',
          '1',
          'Pool, Gym, Laundry',
          'Dishwasher, AC',
          '12 months',
          '2024-02-01',
          'Recently renovated'
        ],
        [
          '123 Oak Street',
          'Denver',
          'CO',
          '80202',
          'apartment',
          'Oak Street Apartments',
          '2B',
          'apartment',
          '1',
          '1',
          '750',
          '1000',
          '1000',
          'false',
          '1',
          'Pool, Gym, Laundry',
          'Dishwasher',
          '6-12 months',
          '2024-03-01',
          'Great city view'
        ]
      ];
    } else {
      // Simple property template
      csvHeaders = [
        'street_address',
        'city',
        'state', 
        'zipcode',
        'property_type',
        'property_name',
        'bedrooms',
        'bathrooms',
        'square_feet',
        'monthly_rent',
        'deposit_amount',
        'pet_friendly',
        'parking_spots',
        'amenities',
        'lease_terms',
        'availability_date',
        'notes'
      ];

      exampleRows = [
        [
          '456 Pine Avenue',
          'Boulder',
          'CO',
          '80301',
          'single_family',
          'Pine Avenue House',
          '3',
          '2',
          '1500',
          '2200',
          '2200',
          'true',
          '2',
          'Garage, Garden, Deck',
          '12 months',
          '2024-02-15',
          'Beautiful mountain views'
        ],
        [
          '789 Elm Drive',
          'Fort Collins',
          'CO',
          '80525',
          'townhouse',
          'Elm Drive Townhome',
          '2',
          '1.5',
          '1200',
          '1800',
          '1800',
          'false',
          '1',
          'Pool, Fitness Center',
          '6-12 months',
          '2024-03-01',
          'Near university campus'
        ]
      ];
    }

    // Generate CSV content
    const csvRows = [csvHeaders, ...exampleRows];
    const csvContent = csvRows
      .map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const escaped = cell.replace(/"/g, '""');
          return cell.includes(',') || cell.includes('"') || cell.includes('\n') 
            ? `"${escaped}"` 
            : escaped;
        }).join(',')
      )
      .join('\n');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const templateName = template_type === 'units' ? 'multi-unit' : 'simple';
    const filename = `property-import-template-${templateName}-${timestamp}.csv`;

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error))
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});