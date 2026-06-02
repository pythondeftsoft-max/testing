import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { portfolioId, role = 'admin_partner' } = await req.json();

    if (!portfolioId) {
      return new Response(JSON.stringify({ error: 'Portfolio ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Granting role:', { userId: user.id, portfolioId, role });

    // Check if user is portfolio owner or account admin
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('owner_id')
      .eq('id', portfolioId)
      .single();

    const isOwner = portfolio?.owner_id === user.id;
    
    // Check if user is account admin
    const { data: accountRole } = await supabase
      .from('account_roles')
      .select('role_name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role_name', ['owner', 'admin_partner'])
      .single();

    const isAccountAdmin = !!accountRole;

    if (!isOwner && !isAccountAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Only portfolio owners or account admins can grant roles' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Grant the role
    const { data, error } = await supabase
      .from('portfolio_roles')
      .upsert({
        portfolio_id: portfolioId,
        user_id: user.id,
        role_name: role,
        added_by: user.id,
        permissions_level: role === 'admin_partner' ? 5 : 3,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error granting role:', error);
      return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Role granted successfully:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${role} role granted successfully`,
      data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in grant-portfolio-role function:', error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})