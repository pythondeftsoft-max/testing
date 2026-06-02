import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyWebhookPayload {
  event: string;
  unit_id: string;
  property_id: string;
  timestamp: string;
  n8n_webhook_url?: string;
}

interface SocialCaptions {
  instagram: string;
  facebook: string;
  twitter: string;
}

async function generateSocialCaptions(listingData: {
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  square_footage: number | null;
  parking_spaces: number | null;
  property_type: string;
  amenities: string[];
}): Promise<SocialCaptions> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not configured, using fallback captions');
    return generateFallbackCaptions(listingData);
  }

  const prompt = `Generate social media captions for this rental listing:

Location: ${listingData.city}, ${listingData.state}
Property: ${listingData.bedrooms}BR/${listingData.bathrooms}BA ${listingData.property_type}
Rent: $${listingData.monthly_rent?.toLocaleString()}/month
${listingData.square_footage ? `Size: ${listingData.square_footage} sq ft` : ''}
${listingData.parking_spaces ? `Parking: ${listingData.parking_spaces} spaces` : ''}
${listingData.amenities.length > 0 ? `Amenities: ${listingData.amenities.join(', ')}` : ''}

Create 3 platform-optimized versions:
1. Instagram - Engaging with emojis, line breaks, relevant hashtags (max 2200 chars)
2. Facebook - Professional, bullet points for features (max 500 chars)  
3. Twitter - Concise, key highlights only (max 280 chars)

Each should end with a call-to-action like "DM for details" or "Contact us to schedule a tour". Do not include specific street addresses.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a social media marketing expert for real estate. Generate engaging, professional captions that highlight property features and drive inquiries.' },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_captions',
              description: 'Generate platform-specific social media captions for a rental listing',
              parameters: {
                type: 'object',
                properties: {
                  instagram: {
                    type: 'string',
                    description: 'Instagram caption with emojis, line breaks, and hashtags (max 2200 chars)'
                  },
                  facebook: {
                    type: 'string', 
                    description: 'Facebook post with professional tone and bullet points (max 500 chars)'
                  },
                  twitter: {
                    type: 'string',
                    description: 'Twitter post, concise with key highlights (max 280 chars)'
                  }
                },
                required: ['instagram', 'facebook', 'twitter'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_captions' } }
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      return generateFallbackCaptions(listingData);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const captions = JSON.parse(toolCall.function.arguments);
      console.log('AI generated captions successfully');
      return {
        instagram: captions.instagram || generateFallbackCaptions(listingData).instagram,
        facebook: captions.facebook || generateFallbackCaptions(listingData).facebook,
        twitter: captions.twitter || generateFallbackCaptions(listingData).twitter,
      };
    }

    return generateFallbackCaptions(listingData);
  } catch (error) {
    console.error('Error generating AI captions:', error);
    return generateFallbackCaptions(listingData);
  }
}

function generateFallbackCaptions(listingData: {
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  square_footage: number | null;
  parking_spaces: number | null;
  amenities: string[];
}): SocialCaptions {
  const features = [
    listingData.square_footage ? `${listingData.square_footage} sq ft` : null,
    listingData.parking_spaces ? `${listingData.parking_spaces} parking` : null,
    ...listingData.amenities.slice(0, 3)
  ].filter(Boolean).join(' • ');

  return {
    instagram: `🏠 ${listingData.bedrooms}BR/${listingData.bathrooms}BA now available in ${listingData.city}, ${listingData.state}! ✨

💰 $${listingData.monthly_rent?.toLocaleString()}/month
${features ? `📋 ${features}` : ''}

DM us to schedule a tour! 🔑

#${listingData.city.replace(/\s/g, '')}Rentals #ForRent #${listingData.state}Homes #ApartmentHunting`,

    facebook: `🏠 New Listing Alert!

${listingData.bedrooms}-bedroom, ${listingData.bathrooms}-bathroom home now available in ${listingData.city}, ${listingData.state} for $${listingData.monthly_rent?.toLocaleString()}/month.

${features ? `Features: ${features}` : ''}

Contact us today to schedule a showing!`,

    twitter: `🏠 ${listingData.bedrooms}BR/${listingData.bathrooms}BA in ${listingData.city}, ${listingData.state} - $${listingData.monthly_rent?.toLocaleString()}/mo

${features ? `✅ ${features}` : ''}

DM for details! 🔑`
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const n8nWebhookUrl = Deno.env.get('N8N_PROPERTY_WEBHOOK_URL');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PropertyWebhookPayload = await req.json();
    console.log('Received property webhook payload:', payload);

    // Fetch full property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        id,
        city,
        state,
        description,
        property_type,
        year_built,
        square_feet,
        garage_spaces,
        photos
      `)
      .eq('id', payload.property_id)
      .single();

    if (propertyError) {
      console.error('Error fetching property:', propertyError);
      throw new Error(`Failed to fetch property: ${propertyError.message}`);
    }

    // Fetch unit details
    const { data: unit, error: unitError } = await supabase
      .from('property_units')
      .select(`
        id,
        bedrooms,
        bathrooms,
        square_feet,
        monthly_rent,
        unit_amenities,
        unit_photos
      `)
      .eq('id', payload.unit_id)
      .single();

    if (unitError) {
      console.error('Error fetching unit:', unitError);
      throw new Error(`Failed to fetch unit: ${unitError.message}`);
    }

    // Parse amenities
    let amenities: string[] = [];
    if (unit.unit_amenities) {
      try {
        amenities = typeof unit.unit_amenities === 'string' 
          ? JSON.parse(unit.unit_amenities) 
          : unit.unit_amenities;
      } catch {
        amenities = [];
      }
    }

    // Get photos from array columns (unit photos first, then property photos)
    const propertyPhotos: string[] = property.photos || [];
    const unitPhotos: string[] = unit.unit_photos || [];
    const allPhotos = [...unitPhotos, ...propertyPhotos];
    const primaryPhoto = allPhotos[0] || null;

    // Generate AI-powered social media captions
    console.log('Generating AI social media captions...');
    const captions = await generateSocialCaptions({
      city: property.city,
      state: property.state,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      monthly_rent: unit.monthly_rent,
      square_footage: unit.square_feet,
      parking_spaces: property.garage_spaces,
      property_type: property.property_type,
      amenities: amenities,
    });

    // Build SOCIAL-MEDIA-READY payload for n8n
    const n8nPayload = {
      event: 'property_available',
      timestamp: payload.timestamp || new Date().toISOString(),
      
      // AI-generated captions ready to post
      captions: captions,
      
      // Media for social posts
      media: {
        primary_photo: primaryPhoto,
        all_photos: allPhotos,
      },
      
      // Listing URL (update domain as needed)
      listing_url: `https://openkey-housing-hub.lovable.app/properties/${property.id}`,
      
      // Raw listing data for reference/customization
      listing_data: {
        location: {
          city: property.city,
          state: property.state,
          display: `${property.city}, ${property.state}`,
        },
        unit: {
          id: unit.id,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          square_footage: unit.square_feet,
          monthly_rent: unit.monthly_rent,
          amenities: amenities,
        },
        property: {
          id: property.id,
          property_type: property.property_type,
          year_built: property.year_built,
          square_footage: property.square_feet,
          parking_spaces: property.garage_spaces,
          description: property.description,
        },
        summary: {
          headline: `${unit.bedrooms}BR/${unit.bathrooms}BA Available in ${property.city}, ${property.state}`,
          rent_display: `$${unit.monthly_rent?.toLocaleString()}/month`,
          key_features: [
            `${unit.bedrooms} Bedrooms`,
            `${unit.bathrooms} Bathrooms`,
            unit.square_feet ? `${unit.square_feet} sq ft` : null,
            property.garage_spaces ? `${property.garage_spaces} Parking Spaces` : null,
            ...amenities.slice(0, 5),
          ].filter(Boolean),
        },
      },
    };

    console.log('Enriched payload with AI captions for n8n:', JSON.stringify(n8nPayload, null, 2));

    // Forward to n8n webhook if URL is configured
    const webhookUrl = payload.n8n_webhook_url || n8nWebhookUrl;
    
    if (webhookUrl) {
      console.log('Forwarding to n8n webhook:', webhookUrl);
      
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
      });

      if (!n8nResponse.ok) {
        console.error('n8n webhook failed:', n8nResponse.status, await n8nResponse.text());
        // Don't throw - we still want to return success for the trigger
      } else {
        console.log('Successfully sent to n8n webhook');
      }
    } else {
      console.log('No n8n webhook URL configured - payload ready for manual retrieval');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Property data processed with AI captions',
        payload: n8nPayload,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in n8n-property-webhook:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
