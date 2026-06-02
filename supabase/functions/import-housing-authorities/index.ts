import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HUD_API_URL =
  "https://egis.hud.gov/arcgis/rest/services/gotit/PublicHousing/MapServer/0/query";

const PAGE_SIZE = 1000;

interface HudFeature {
  attributes: Record<string, any>;
}

function slugify(name: string, state: string, phaCode: string): string {
  return `${name}-${state}-${phaCode}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchAllPHAs(): Promise<HudFeature[]> {
  const allFeatures: HudFeature[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      where: "1=1",
      outFields:
        "FORMAL_PARTICIPANT_NAME,STD_CITY,STD_ST,STD_ZIP5,STD_ADDR,HA_PHN_NUM,HA_EMAIL_ADDR_TEXT,EXEC_DIR_EMAIL,SECTION8_UNITS_CNT,TOTAL_UNITS,PARTICIPANT_CODE",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
    });

    const res = await fetch(`${HUD_API_URL}?${params}`);
    if (!res.ok) {
      throw new Error(`HUD API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    // HUD returns 200 with an error object for bad queries
    if (json.error) {
      throw new Error(`HUD API query error: ${json.error.message || JSON.stringify(json.error)}`);
    }

    const features: HudFeature[] = json.features || [];
    allFeatures.push(...features);

    if (features.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      offset += PAGE_SIZE;
    }
  }

  return allFeatures;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Use the platform's is_admin() function to check system_admins
    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", {
      user_id: userId,
    });

    if (adminErr || !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required. You must be a system admin." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all PHAs from HUD
    const features = await fetchAllPHAs();

    let imported = 0;
    let skipped = 0;
    const batchErrors: string[] = [];
    const batchSize = 100;

    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize);
      const rows = batch
        .filter((f) => f.attributes.FORMAL_PARTICIPANT_NAME && f.attributes.PARTICIPANT_CODE)
        .map((f) => {
          const a = f.attributes;
          const geom = (f as any).geometry;
          const phaCode = a.PARTICIPANT_CODE?.trim();
          return {
            name: a.FORMAL_PARTICIPANT_NAME?.trim(),
            slug: slugify(a.FORMAL_PARTICIPANT_NAME || "", a.STD_ST || "", phaCode || ""),
            city: a.STD_CITY?.trim() || null,
            state: a.STD_ST?.trim() || null,
            zipcode: a.STD_ZIP5?.trim() || null,
            address: a.STD_ADDR?.trim() || null,
            phone: a.HA_PHN_NUM?.trim() || null,
            email: a.HA_EMAIL_ADDR_TEXT?.trim() || null,
            pha_code: phaCode,
            latitude: geom?.y || null,
            longitude: geom?.x || null,
            is_active: true,
            country: "US",
            metadata: {
              exec_dir_email: a.EXEC_DIR_EMAIL || null,
              section8_units: a.SECTION8_UNITS_CNT || 0,
              total_units: a.TOTAL_UNITS || 0,
              hud_participant_code: a.PARTICIPANT_CODE,
            },
          };
        });

      if (rows.length === 0) {
        skipped += batch.length;
        continue;
      }

      const { error: upsertErr } = await supabase
        .from("housing_authorities")
        .upsert(rows, { onConflict: "pha_code", ignoreDuplicates: false });

      if (upsertErr) {
        console.error("Upsert batch error:", upsertErr.message);
        skipped += rows.length;
        if (batchErrors.length < 5) {
          batchErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${upsertErr.message}`);
        }
      } else {
        imported += rows.length;
      }
    }

    const success = imported > 0 || batchErrors.length === 0;

    return new Response(
      JSON.stringify({
        success,
        data: {
          total_fetched: features.length,
          imported,
          skipped,
          errors: batchErrors.length > 0 ? batchErrors : undefined,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("import-housing-authorities error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err instanceof Error ? err.message : String(err)) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
