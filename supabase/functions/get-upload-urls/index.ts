import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Parse request body
    const { propertyId, fileExtensions, bucket: requestedBucket } = await req.json();

    // Validate bucket parameter
    const allowedBuckets = ['property-images', 'rent-proof'];
    const bucket = allowedBuckets.includes(requestedBucket) ? requestedBucket : 'property-images';

    if (!Array.isArray(fileExtensions) || fileExtensions.length === 0) {
      return new Response(
        JSON.stringify({ error: "fileExtensions must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size to prevent abuse
    if (fileExtensions.length > 20) {
      return new Response(
        JSON.stringify({ error: "Maximum 20 files per batch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URLs for all files
    const urls = await Promise.all(
      fileExtensions.map(async (ext: string) => {
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 15);
        const nanoRandom = Math.random().toString(36).substring(2, 9);
        
        // Clean extension
        const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        
        // Generate path: propertyId/userId/timestamp_random.ext or userId/timestamp_random.ext
        const path = propertyId 
          ? `${propertyId}/${userId}/${timestamp}_${randomPart}_${nanoRandom}.${cleanExt}`
          : `${userId}/${timestamp}_${randomPart}_${nanoRandom}.${cleanExt}`;

        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUploadUrl(path);

        if (error) {
          console.error(`Failed to create signed URL for ${path}:`, error);
          throw error;
        }

        // Get public URL (pre-calculated so client doesn't need another call)
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        return { 
          path, 
          token: data.token, 
          publicUrl 
        };
      })
    );

    return new Response(
      JSON.stringify({ urls }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-upload-urls:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
