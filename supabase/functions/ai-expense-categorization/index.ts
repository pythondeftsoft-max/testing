import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { expenseId, description, amount, vendor, portfolioId } = await req.json()

    console.log('AI Expense Categorization request:', { expenseId, description, amount, vendor })

    // Get expense categories and tax rules
    const standardCategories = [
      'maintenance', 'utilities', 'insurance', 'advertising', 'legal_professional',
      'travel', 'depreciation', 'mortgage_interest', 'property_taxes', 'repairs',
      'supplies', 'management_fees', 'other'
    ]

    const taxDeductibleCategories = [
      'maintenance', 'utilities', 'insurance', 'advertising', 'legal_professional',
      'travel', 'repairs', 'supplies', 'management_fees', 'mortgage_interest',
      'property_taxes', 'depreciation'
    ]

    // Use Gemini for intelligent categorization
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const prompt = `
    Analyze this real estate expense and categorize it accurately:

    Expense Details:
    - Description: "${description}"
    - Amount: $${amount}
    - Vendor: "${vendor || 'Unknown'}"

    Available Categories:
    ${standardCategories.map(cat => `- ${cat}`).join('\n')}

    Tax-Deductible Categories:
    ${taxDeductibleCategories.map(cat => `- ${cat}`).join('\n')}

    Provide a JSON response with:
    1. The most appropriate category from the available categories
    2. Whether this expense is typically tax-deductible for rental properties
    3. Confidence level (0-1)
    4. Brief explanation of the categorization
    5. Any tax implications or notes
    6. Suggested subcategory for better tracking

    Response format:
    {
      "category": "selected_category",
      "is_tax_deductible": boolean,
      "confidence": number,
      "explanation": "reasoning for categorization",
      "tax_notes": "relevant tax implications",
      "subcategory": "more specific categorization",
      "requires_receipt": boolean,
      "depreciation_eligible": boolean
    }
    `

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', await geminiResponse.text())
      throw new Error('Failed to get AI categorization')
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    let categorization = {
      category: 'other',
      is_tax_deductible: false,
      confidence: 0.5,
      explanation: 'Manual categorization required',
      tax_notes: '',
      subcategory: '',
      requires_receipt: true,
      depreciation_eligible: false
    }

    if (responseText) {
      try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0])
          categorization = { ...categorization, ...aiResult }
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        
        // Fallback: Simple keyword-based categorization
        const desc = description.toLowerCase()
        if (desc.includes('repair') || desc.includes('fix') || desc.includes('maintenance')) {
          categorization.category = 'maintenance'
          categorization.is_tax_deductible = true
        } else if (desc.includes('insurance')) {
          categorization.category = 'insurance'
          categorization.is_tax_deductible = true
        } else if (desc.includes('utility') || desc.includes('electric') || desc.includes('water')) {
          categorization.category = 'utilities'
          categorization.is_tax_deductible = true
        } else if (desc.includes('advertis') || desc.includes('listing') || desc.includes('marketing')) {
          categorization.category = 'advertising'
          categorization.is_tax_deductible = true
        }
      }
    }

    // Update the expense record if expenseId is provided
    if (expenseId) {
      const { error: updateError } = await supabaseClient
        .from('expense_tracking')
        .update({
          category: categorization.category,
          is_tax_deductible: categorization.is_tax_deductible,
          ai_categorization_data: {
            confidence: categorization.confidence,
            explanation: categorization.explanation,
            tax_notes: categorization.tax_notes,
            subcategory: categorization.subcategory,
            analysis_date: new Date().toISOString()
          }
        })
        .eq('id', expenseId)

      if (updateError) {
        console.error('Failed to update expense:', updateError)
        throw updateError
      }
    }

    // Log the categorization for learning
    const { error: logError } = await supabaseClient
      .from('ai_categorization_log')
      .insert({
        expense_description: description,
        amount: amount,
        vendor_name: vendor,
        ai_category: categorization.category,
        ai_confidence: categorization.confidence,
        is_tax_deductible: categorization.is_tax_deductible,
        portfolio_id: portfolioId
      })

    if (logError) {
      console.error('Failed to log categorization:', logError)
    }

    console.log(`Categorized expense as: ${categorization.category} (confidence: ${categorization.confidence})`)

    return new Response(
      JSON.stringify({ 
        success: true,
        categorization,
        processing_timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in AI expense categorization:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to categorize expense',
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})