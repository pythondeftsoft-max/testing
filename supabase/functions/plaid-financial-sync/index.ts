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

    const { action, accessToken, portfolioId, accountId } = await req.json()

    console.log('Plaid Financial Sync request:', { action, portfolioId, accountId })

    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID')
    const plaidSecret = Deno.env.get('PLAID_SECRET')
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox'

    if (!plaidClientId || !plaidSecret) {
      throw new Error('Plaid credentials not configured')
    }

    const plaidBaseUrl = plaidEnv === 'production' ? 'https://production.plaid.com' : 
                        plaidEnv === 'development' ? 'https://development.plaid.com' : 
                        'https://sandbox.plaid.com'

    let result = {}

    switch (action) {
      case 'sync_transactions':
        result = await syncTransactions(supabaseClient, plaidBaseUrl, plaidClientId, plaidSecret, accessToken, portfolioId)
        break
        
      case 'sync_accounts':
        result = await syncAccounts(supabaseClient, plaidBaseUrl, plaidClientId, plaidSecret, accessToken, portfolioId)
        break
        
      case 'match_hap_payments':
        result = await matchHAPPayments(supabaseClient, plaidBaseUrl, plaidClientId, plaidSecret, accessToken, portfolioId)
        break
        
      case 'categorize_expenses':
        result = await categorizeExpenses(supabaseClient, plaidBaseUrl, plaidClientId, plaidSecret, accessToken, portfolioId)
        break
        
      default:
        throw new Error('Invalid action specified')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        result,
        synced_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in Plaid financial sync:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync financial data',
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function syncTransactions(supabase: any, baseUrl: string, clientId: string, secret: string, accessToken: string, portfolioId: string) {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days ago

  const response = await fetch(`${baseUrl}/transactions/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      secret: secret,
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      count: 500
    })
  })

  if (!response.ok) {
    throw new Error(`Plaid API error: ${await response.text()}`)
  }

  const data = await response.json()
  const transactions = data.transactions || []

  console.log(`Retrieved ${transactions.length} transactions from Plaid`)

  // Process and store transactions
  const processedTransactions = []
  for (const transaction of transactions) {
    const isIncome = transaction.amount < 0 // Plaid uses negative amounts for credits
    const absAmount = Math.abs(transaction.amount)

    // Determine if this could be a rent payment or expense
    const description = transaction.name || transaction.merchant_name || 'Unknown Transaction'
    const category = transaction.category?.[0] || 'Other'

    // Insert/update the transaction
    const { data: insertedTransaction, error } = await supabase
      .from('plaid_transactions')
      .upsert({
        plaid_transaction_id: transaction.transaction_id,
        portfolio_id: portfolioId,
        account_id: transaction.account_id,
        amount: absAmount,
        is_income: isIncome,
        description: description,
        category: category,
        subcategory: transaction.category?.[1],
        date: transaction.date,
        pending: transaction.pending,
        plaid_data: transaction,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'plaid_transaction_id'
      })

    if (error) {
      console.error('Failed to insert transaction:', error)
      continue
    }

    processedTransactions.push(insertedTransaction)

    // Auto-categorize as expense if it looks like a property expense
    if (!isIncome && shouldCategorizeAsExpense(description, category)) {
      await categorizeAsExpense(supabase, transaction, portfolioId)
    }

    // Try to match HAP payments
    if (isIncome && couldBeHAPPayment(description, absAmount)) {
      await attemptHAPMatch(supabase, transaction, portfolioId, absAmount)
    }
  }

  return {
    transactions_synced: processedTransactions.length,
    date_range: { start_date: startDate, end_date: endDate }
  }
}

async function syncAccounts(supabase: any, baseUrl: string, clientId: string, secret: string, accessToken: string, portfolioId: string) {
  const response = await fetch(`${baseUrl}/accounts/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      secret: secret,
      access_token: accessToken
    })
  })

  if (!response.ok) {
    throw new Error(`Plaid API error: ${await response.text()}`)
  }

  const data = await response.json()
  const accounts = data.accounts || []

  const syncedAccounts = []
  for (const account of accounts) {
    const { data: insertedAccount, error } = await supabase
      .from('plaid_accounts')
      .upsert({
        plaid_account_id: account.account_id,
        portfolio_id: portfolioId,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: account.balances.current,
        available_balance: account.balances.available,
        currency: account.balances.iso_currency_code || 'USD',
        plaid_data: account,
        is_active: true,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'plaid_account_id'
      })

    if (error) {
      console.error('Failed to insert account:', error)
      continue
    }

    syncedAccounts.push(insertedAccount)
  }

  return {
    accounts_synced: syncedAccounts.length
  }
}

async function matchHAPPayments(supabase: any, baseUrl: string, clientId: string, secret: string, accessToken: string, portfolioId: string) {
  // Get unmatched HAP payments
  const { data: hapPayments } = await supabase
    .from('hap_payments')
    .select('*')
    .eq('matched_via_plaid', false)
    .eq('payment_status', 'expected')

  if (!hapPayments || hapPayments.length === 0) {
    return { matches_found: 0, message: 'No unmatched HAP payments to process' }
  }

  // Get recent Plaid transactions for matching
  const { data: plaidTransactions } = await supabase
    .from('plaid_transactions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('is_income', true)
    .is('matched_expense_id', null)
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

  let matchesFound = 0

  for (const hapPayment of hapPayments) {
    // Look for matching transactions by amount and timing
    const expectedAmount = hapPayment.expected_amount
    const tolerance = expectedAmount * 0.02 // 2% tolerance

    const matchingTransactions = plaidTransactions.filter(transaction => {
      const amountMatch = Math.abs(transaction.amount - expectedAmount) <= tolerance
      const dateMatch = new Date(transaction.date) >= new Date(hapPayment.payment_period_start) &&
                       new Date(transaction.date) <= new Date(hapPayment.payment_period_end)
      
      return amountMatch && dateMatch
    })

    if (matchingTransactions.length > 0) {
      const bestMatch = matchingTransactions[0] // Take the first match

      // Update HAP payment with match information
      const { error } = await supabase
        .from('hap_payments')
        .update({
          actual_amount: bestMatch.amount,
          payment_date: bestMatch.date,
          payment_status: 'received',
          matched_via_plaid: true,
          plaid_transaction_id: bestMatch.plaid_transaction_id,
          plaid_match_confidence: calculateMatchConfidence(hapPayment, bestMatch)
        })
        .eq('id', hapPayment.id)

      if (!error) {
        matchesFound++
        
        // Mark the Plaid transaction as matched
        await supabase
          .from('plaid_transactions')
          .update({
            matched_hap_payment_id: hapPayment.id,
            is_categorized: true
          })
          .eq('plaid_transaction_id', bestMatch.plaid_transaction_id)
      }
    }
  }

  return {
    matches_found: matchesFound,
    total_hap_payments_checked: hapPayments.length
  }
}

async function categorizeExpenses(supabase: any, baseUrl: string, clientId: string, secret: string, accessToken: string, portfolioId: string) {
  // Get uncategorized expense transactions
  const { data: uncategorizedTransactions } = await supabase
    .from('plaid_transactions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('is_income', false)
    .eq('is_categorized', false)

  if (!uncategorizedTransactions || uncategorizedTransactions.length === 0) {
    return { expenses_categorized: 0, message: 'No uncategorized expenses to process' }
  }

  let categorizedCount = 0

  for (const transaction of uncategorizedTransactions) {
    const expenseCategory = await determineExpenseCategory(transaction)
    
    if (expenseCategory) {
      // Create expense tracking record
      const { error } = await supabase
        .from('expense_tracking')
        .insert({
          portfolio_id: portfolioId,
          amount: transaction.amount,
          expense_date: transaction.date,
          category: expenseCategory.category,
          description: transaction.description,
          vendor_name: transaction.plaid_data?.merchant_name,
          is_tax_deductible: expenseCategory.is_tax_deductible,
          payment_method: 'bank_transfer',
          plaid_transaction_id: transaction.plaid_transaction_id,
          ai_categorization_data: expenseCategory.ai_data
        })

      if (!error) {
        // Mark transaction as categorized
        await supabase
          .from('plaid_transactions')
          .update({ is_categorized: true })
          .eq('plaid_transaction_id', transaction.plaid_transaction_id)

        categorizedCount++
      }
    }
  }

  return {
    expenses_categorized: categorizedCount,
    total_transactions_processed: uncategorizedTransactions.length
  }
}

// Helper functions

function shouldCategorizeAsExpense(description: string, category: string): boolean {
  const expenseKeywords = [
    'repair', 'maintenance', 'utility', 'insurance', 'property',
    'contractor', 'plumber', 'electrician', 'hvac', 'paint',
    'home depot', 'lowes', 'hardware', 'supply'
  ]
  
  const desc = description.toLowerCase()
  return expenseKeywords.some(keyword => desc.includes(keyword)) ||
         ['Payment', 'Transfer'].includes(category)
}

function couldBeHAPPayment(description: string, amount: number): boolean {
  const hapKeywords = [
    'housing', 'authority', 'pha', 'hap', 'voucher', 'section',
    'subsidy', 'assistance', 'govt', 'government'
  ]
  
  const desc = description.toLowerCase()
  return hapKeywords.some(keyword => desc.includes(keyword)) &&
         amount >= 500 // Minimum reasonable HAP payment amount
}

async function categorizeAsExpense(supabase: any, transaction: any, portfolioId: string) {
  const category = determineBasicCategory(transaction.name, transaction.category)
  
  await supabase
    .from('expense_tracking')
    .insert({
      portfolio_id: portfolioId,
      amount: Math.abs(transaction.amount),
      expense_date: transaction.date,
      category: category,
      description: transaction.name,
      vendor_name: transaction.merchant_name,
      plaid_transaction_id: transaction.transaction_id,
      is_tax_deductible: isTaxDeductible(category)
    })
}

async function attemptHAPMatch(supabase: any, transaction: any, portfolioId: string, amount: number) {
  // Look for expected HAP payments that match this amount
  const { data: hapPayments } = await supabase
    .from('hap_payments')
    .select('*')
    .eq('payment_status', 'expected')
    .lte('expected_amount', amount * 1.05)
    .gte('expected_amount', amount * 0.95)

  if (hapPayments && hapPayments.length > 0) {
    const hapPayment = hapPayments[0]
    
    await supabase
      .from('hap_payments')
      .update({
        actual_amount: amount,
        payment_date: transaction.date,
        payment_status: 'received',
        matched_via_plaid: true,
        plaid_transaction_id: transaction.transaction_id
      })
      .eq('id', hapPayment.id)
  }
}

function determineBasicCategory(description: string, plaidCategory: string[]): string {
  const desc = description.toLowerCase()
  
  if (desc.includes('repair') || desc.includes('maintenance')) return 'maintenance'
  if (desc.includes('insurance')) return 'insurance'
  if (desc.includes('utility') || desc.includes('electric') || desc.includes('gas')) return 'utilities'
  if (desc.includes('advertis') || desc.includes('marketing')) return 'advertising'
  if (plaidCategory?.includes('Professional Services')) return 'legal_professional'
  
  return 'other'
}

function isTaxDeductible(category: string): boolean {
  const deductibleCategories = [
    'maintenance', 'insurance', 'utilities', 'advertising', 
    'legal_professional', 'repairs', 'supplies'
  ]
  return deductibleCategories.includes(category)
}

function calculateMatchConfidence(hapPayment: any, transaction: any): number {
  const amountDiff = Math.abs(hapPayment.expected_amount - transaction.amount)
  const amountConfidence = Math.max(0, 1 - (amountDiff / hapPayment.expected_amount))
  
  // Add other confidence factors (date proximity, description matching, etc.)
  return Math.min(1, amountConfidence + 0.2)
}

async function determineExpenseCategory(transaction: any) {
  // This would integrate with the AI expense categorization function
  const description = transaction.description || transaction.plaid_data?.name || ''
  const amount = transaction.amount
  
  // For now, return a basic categorization
  const category = determineBasicCategory(description, transaction.plaid_data?.category || [])
  
  return {
    category,
    is_tax_deductible: isTaxDeductible(category),
    ai_data: {
      confidence: 0.8,
      method: 'rule_based',
      processed_at: new Date().toISOString()
    }
  }
}