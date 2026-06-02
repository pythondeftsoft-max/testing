// CSV Import Processor Edge Function
// Processes uploaded CSV files and creates portfolio assets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CSVRow {
  name: string;
  category: string;
  value: number;
  income?: number;
  expenses?: number;
  symbol?: string;
  quantity?: number;
  [key: string]: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { csvData, portfolioId, userId } = await req.json()

    console.log(`Processing CSV import for portfolio ${portfolioId} by user ${userId}`)

    // Get asset categories
    const { data: categories, error: categoriesError } = await supabase
      .from('asset_categories')
      .select('*')
      .eq('is_active', true)

    if (categoriesError) throw categoriesError

    const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat]))

    const results = []
    const errors = []

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i]
      
      try {
        // Validate required fields
        if (!row.name || !row.category || !row.value) {
          errors.push(`Row ${i + 1}: Missing required fields (name, category, value)`)
          continue
        }

        // Find matching category
        const category = categoryMap.get(row.category.toLowerCase()) || 
                        categoryMap.get('other') || 
                        categories[0] // fallback

        // Prepare asset data
        const assetData = {
          portfolio_id: portfolioId,
          asset_category_id: category.id,
          asset_name: row.name,
          asset_value: parseFloat(row.value) || 0,
          current_value: parseFloat(row.value) || 0,
          annual_income: parseFloat(row.income || 0),
          annual_expenses: parseFloat(row.expenses || 0),
          metadata: {
            imported_from_csv: true,
            import_date: new Date().toISOString(),
            original_row: row
          },
          created_by: userId
        }

        // Add category-specific metadata
        if (category.name === 'crypto' && row.symbol) {
          assetData.metadata.symbol = row.symbol.toUpperCase()
          assetData.metadata.shares = parseFloat(row.quantity || 1)
        } else if (category.name === 'stocks' && row.symbol) {
          assetData.metadata.symbol = row.symbol.toUpperCase()
          assetData.metadata.shares = parseFloat(row.quantity || 1)
        }

        // Insert asset
        const { data: asset, error: assetError } = await supabase
          .from('portfolio_assets')
          .insert(assetData)
          .select()
          .single()

        if (assetError) {
          errors.push(`Row ${i + 1}: ${assetError.message}`)
          continue
        }

        results.push({
          row: i + 1,
          asset_id: asset.id,
          asset_name: asset.asset_name,
          value: asset.current_value
        })

      } catch (error) {
        errors.push(`Row ${i + 1}: ${(error instanceof Error ? error.message : String(error))}`)
      }
    }

    // Trigger portfolio snapshot update
    try {
      await supabase.functions.invoke('portfolio-snapshotter', {
        body: { portfolioId, userId }
      })
    } catch (error) {
      console.error('Failed to trigger portfolio snapshot:', error)
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: results.length,
        total: csvData.length,
        errors: errors.length,
        results,
        errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('CSV import error:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})