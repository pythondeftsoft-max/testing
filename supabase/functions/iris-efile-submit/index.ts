// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

async function handleValidate(supabase: any, batchId: string) {
  // Ensure batch has items
  const { data: items, error: itemsErr } = await supabase
    .from('tax_iris_batch_items')
    .select('id')
    .eq('batch_id', batchId);
  if (itemsErr) throw itemsErr;

  const hasItems = (items || []).length > 0;
  await supabase
    .from('tax_iris_batch_items')
    .update({ status: 'validated' })
    .eq('batch_id', batchId);

  await supabase
    .from('tax_iris_batches')
    .update({ status: hasItems ? 'ready' : 'draft' })
    .eq('id', batchId);

  return { ok: true, items: items?.length || 0 };
}

async function handleSubmit(supabase: any, batchId: string) {
  // Verify required secrets exist
  const hasClient = !!Deno.env.get('IRIS_CLIENT_ID');
  const hasSecret = !!Deno.env.get('IRIS_CLIENT_SECRET');
  const hasTcc = !!Deno.env.get('IRIS_TCC');
  if (!hasClient || !hasSecret || !hasTcc) {
    return new Response(
      JSON.stringify({ error: 'Missing IRIS API credentials. Please configure IRIS_CLIENT_ID, IRIS_CLIENT_SECRET, IRIS_TCC.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Transition statuses (stub integration)
  await supabase.from('tax_iris_batches').update({ status: 'submitting' }).eq('id', batchId);
  await supabase.from('tax_iris_batch_items').update({ status: 'submitted' }).eq('batch_id', batchId);

  // Simulate acceptance for now
  const { data: items } = await supabase
    .from('tax_iris_batch_items')
    .select('id')
    .eq('batch_id', batchId);
  const count = items?.length || 0;

  await supabase
    .from('tax_iris_batches')
    .update({ status: 'accepted', accepted_count: count, rejected_count: 0 })
    .eq('id', batchId);

  await supabase
    .from('tax_iris_batch_items')
    .update({ status: 'accepted' })
    .eq('batch_id', batchId);

  return { ok: true, accepted: count };
}

async function handleStatus(supabase: any, batchId: string) {
  const { data, error } = await supabase
    .from('tax_iris_batches')
    .select('*')
    .eq('id', batchId)
    .single();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if IRS e-filing is enabled
  const efilingEnabled = Deno.env.get('IRS_EFILING_ENABLED') === 'true';
  if (!efilingEnabled) {
    return new Response(
      JSON.stringify({ 
        error: 'IRS e-filing is not enabled. This feature will be available in V2.',
        code: 'FEATURE_DISABLED' 
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = getSupabaseClient();

    const { action, batchId } = await req.json();
    if (!batchId || !action) {
      return new Response(JSON.stringify({ error: 'batchId and action are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any;
    if (action === 'validate') {
      result = await handleValidate(supabase, batchId);
    } else if (action === 'submit') {
      const r = await handleSubmit(supabase, batchId);
      if (r instanceof Response) return r; // early return if error response
      result = r;
    } else if (action === 'status') {
      result = await handleStatus(supabase, batchId);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('iris-efile-submit error', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
