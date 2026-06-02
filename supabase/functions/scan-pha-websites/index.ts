// supabase/functions/scan-pha-websites/index.ts
// Chunked batch scanner that walks every PHA with a website and calls
// enrich-pha-website (Firecrawl) to populate detected_software / portal_vendor /
// has_online_portal / latest_rfp_url. Same resumable pattern as enrich-pha-registry.
//
// Body: { batchSize?: 100, resumeJobId?: string, startOffset?: number, mode?: 'all' | 'missing' }
// 'missing' (default) skips PHAs whose website_enriched_at is within 90 days.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESCAN_MAX_AGE_DAYS = 90;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

  if (!firecrawlKey) {
    return new Response(JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) {
    return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  let isAdmin = false;
  const r1 = await admin.rpc('is_admin', { user_id: userRes.user.id });
  if (r1.data === true) isAdmin = true;
  else {
    const r2 = await admin.rpc('is_admin', { _user_id: userRes.user.id });
    if (r2.data === true) isAdmin = true;
  }
  if (!isAdmin) {
    return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const mode: 'all' | 'missing' = body.mode === 'all' ? 'all' : 'missing';
  const batchSize: number = Math.min(Math.max(parseInt(body.batchSize ?? '50', 10) || 50, 10), 250);
  const resumeJobId: string | null = body.resumeJobId ?? null;
  const startOffset: number = Math.max(parseInt(body.startOffset ?? '0', 10) || 0, 0);

  // Mark stalled jobs
  await admin
    .from('pha_enrichment_jobs')
    .update({ status: 'stalled' })
    .eq('status', 'running')
    .eq('mode', 'website-scan')
    .lt('heartbeat_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  let initialProcessed = 0, initialUpdated = 0, initialErr = 0, cursorOffset = startOffset;
  let parentJobId: string | null = null;
  if (resumeJobId) {
    const { data: existing } = await admin
      .from('pha_enrichment_jobs')
      .select('id, processed_count, updated_count, error_count, cursor_offset')
      .eq('id', resumeJobId)
      .maybeSingle();
    if (existing) {
      parentJobId = existing.id;
      initialProcessed = existing.processed_count ?? 0;
      initialUpdated = existing.updated_count ?? 0;
      initialErr = existing.error_count ?? 0;
      cursorOffset = Math.max(existing.cursor_offset ?? 0, initialProcessed, startOffset);
    }
  }

  const { data: job, error: jobErr } = await admin
    .from('pha_enrichment_jobs')
    .insert({
      status: 'running',
      mode: 'website-scan',
      started_by: userRes.user.id,
      cursor_offset: cursorOffset,
      batch_size: batchSize,
      heartbeat_at: new Date().toISOString(),
      processed_count: initialProcessed,
      updated_count: initialUpdated,
      error_count: initialErr,
      parent_job_id: parentJobId,
    })
    .select('id')
    .single();
  if (jobErr) {
    return new Response(JSON.stringify({ success: false, error: jobErr.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const jobId = job.id;

  const work = (async () => {
    const errors: any[] = [];
    let updated = initialUpdated;
    let processed = initialProcessed;
    let lastCode: string | null = null;
    try {
      // Fetch all PHAs that have a website
      const phas: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await admin
          .from('housing_authorities')
          .select('id, pha_code, name, metadata')
          .not('metadata->>website', 'is', null)
          .order('pha_code', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        phas.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }

      // Pre-load existing scan ages for "missing" mode skip
      let recentlyScanned = new Set<string>();
      if (mode === 'missing') {
        const cutoff = new Date(Date.now() - RESCAN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const codes = phas.map((p) => p.pha_code).filter(Boolean);
        for (let i = 0; i < codes.length; i += 1000) {
          const chunk = codes.slice(i, i + 1000);
          const { data: enr } = await (admin as any)
            .from('pha_enrichment')
            .select('pha_code, website_enriched_at')
            .in('pha_code', chunk)
            .gte('website_enriched_at', cutoff);
          (enr ?? []).forEach((r: any) => recentlyScanned.add(String(r.pha_code).toUpperCase()));
        }
      }

      const total = phas.length;
      const sliceStart = Math.min(cursorOffset, total);
      const sliceEnd = Math.min(sliceStart + batchSize, total);
      const slice = phas.slice(sliceStart, sliceEnd);

      await admin.from('pha_enrichment_jobs').update({
        total_count: total,
        heartbeat_at: new Date().toISOString(),
      }).eq('id', jobId);

      let processedThisRun = 0;
      for (const p of slice) {
        processed++;
        processedThisRun++;
        const code = String(p.pha_code ?? '').toUpperCase();
        lastCode = code || lastCode;

        if (mode === 'missing' && code && recentlyScanned.has(code)) {
          // Skip — already scanned recently
          if (processedThisRun % 25 === 0) {
            await admin.from('pha_enrichment_jobs').update({
              processed_count: processed,
              updated_count: updated,
              error_count: errors.length,
              cursor_offset: sliceStart + processedThisRun,
              last_processed_pha_code: lastCode,
              heartbeat_at: new Date().toISOString(),
            }).eq('id', jobId);
          }
          continue;
        }

        try {
          // Call enrich-pha-website with a hard per-PHA timeout so one slow site can't stall the batch
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 90_000);
          let json: any = null;
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/enrich-pha-website`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                'apikey': anonKey,
              },
              body: JSON.stringify({ housing_authority_id: p.id }),
              signal: ctrl.signal,
            });
            json = await res.json().catch(() => null);
          } finally {
            clearTimeout(timer);
          }
          if (json?.success) updated++;
          else errors.push({ pha_code: code, error: json?.error ?? 'scan failed' });
        } catch (e: any) {
          const reason = e?.name === 'AbortError' ? 'timeout (>90s)' : (e?.message ?? 'error');
          errors.push({ pha_code: code, error: reason });
        }

        if (processedThisRun % 10 === 0) {
          await admin.from('pha_enrichment_jobs').update({
            processed_count: processed,
            updated_count: updated,
            error_count: errors.length,
            errors: errors.slice(-20),
            cursor_offset: sliceStart + processedThisRun,
            last_processed_pha_code: lastCode,
            heartbeat_at: new Date().toISOString(),
          }).eq('id', jobId);
        }
      }

      const newCursor = sliceStart + processedThisRun;
      const isDone = newCursor >= total;

      await admin.from('pha_enrichment_jobs').update({
        status: isDone ? 'completed' : 'paused',
        processed_count: processed,
        updated_count: updated,
        error_count: errors.length,
        errors: errors.slice(-50),
        cursor_offset: newCursor,
        last_processed_pha_code: lastCode,
        heartbeat_at: new Date().toISOString(),
        finished_at: isDone ? new Date().toISOString() : null,
      }).eq('id', jobId);

      // Auto-chain next chunk
      if (!isDone) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/scan-pha-websites`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
              'apikey': anonKey,
            },
            body: JSON.stringify({ mode, batchSize, resumeJobId: jobId, startOffset: newCursor }),
          });
        } catch (chainErr) {
          console.warn('chain invoke failed', chainErr);
        }
      }
    } catch (e: any) {
      console.error('website scan job failed', e);
      await admin.from('pha_enrichment_jobs').update({
        status: 'failed',
        processed_count: processed,
        updated_count: updated,
        error_count: errors.length + 1,
        errors: [...errors.slice(-50), { fatal: e?.message ?? String(e) }],
        last_processed_pha_code: lastCode,
        heartbeat_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }).eq('id', jobId);
    }
  })();

  // @ts-ignore EdgeRuntime
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  } else {
    work.catch((e) => console.error('bg', e));
  }

  return new Response(JSON.stringify({ success: true, job_id: jobId }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
