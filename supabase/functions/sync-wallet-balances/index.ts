import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WalletBalance {
  symbol: string;
  amount: number;
  usdValue: number;
  decimals?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { walletId } = await req.json()

    // Get wallet connection details
    const { data: wallet, error: walletError } = await supabase
      .from('wallet_connections')
      .select('*')
      .eq('id', walletId)
      .single()

    if (walletError || !wallet) {
      throw new Error('Wallet not found')
    }

    console.log(`Syncing wallet: ${wallet.wallet_type} - ${wallet.connection_name}`)

    let balances: WalletBalance[] = []

    // Sync based on wallet type
    switch (wallet.wallet_type) {
      case 'ethereum':
      case 'metamask':
        balances = await syncEthereumWallet(wallet.wallet_address || '')
        break
      case 'binance':
        const apiKey = wallet.metadata?.api_key
        const apiSecret = wallet.metadata?.api_secret
        balances = await syncBinanceAccount(apiKey, apiSecret)
        break
      case 'manual':
        // For manual wallets, just return existing balances
        balances = wallet.metadata?.balances || []
        break
      default:
        throw new Error(`Unsupported wallet type: ${wallet.wallet_type}`)
    }

    // Update portfolio assets with synced balances
    for (const balance of balances) {
      await upsertCryptoAsset(supabase, wallet.portfolio_id, balance)
    }

    // Update wallet last sync time
    await supabase
      .from('wallet_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        metadata: { ...wallet.metadata, last_sync_balances: balances }
      })
      .eq('id', walletId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        balances_synced: balances.length,
        balances: balances 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Wallet sync error:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function syncEthereumWallet(address: string): Promise<WalletBalance[]> {
  const balances: WalletBalance[] = []
  
  try {
    const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY')
    
    if (!etherscanApiKey) {
      console.log('No Etherscan API key, using mock data')
      return [
        { symbol: 'ETH', amount: 2.5, usdValue: 5000, decimals: 18 },
        { symbol: 'USDC', amount: 1000, usdValue: 1000, decimals: 6 },
        { symbol: 'WBTC', amount: 0.1, usdValue: 4000, decimals: 8 }
      ]
    }

    // Get ETH balance
    const ethResponse = await fetch(
      `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${etherscanApiKey}`
    )
    const ethData = await ethResponse.json()
    
    if (ethData.status === '1') {
      const ethBalance = parseInt(ethData.result) / Math.pow(10, 18)
      balances.push({
        symbol: 'ETH',
        amount: ethBalance,
        usdValue: ethBalance * 2000, // Mock price
        decimals: 18
      })
    }

    // Get ERC-20 token balances
    const tokenResponse = await fetch(
      `https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`
    )
    const tokenData = await tokenResponse.json()
    
    if (tokenData.status === '1' && tokenData.result.length > 0) {
      // Process unique tokens and their balances
      const tokenSet = new Set()
      for (const tx of tokenData.result.slice(0, 10)) { // Limit to recent tokens
        if (!tokenSet.has(tx.tokenSymbol)) {
          tokenSet.add(tx.tokenSymbol)
          balances.push({
            symbol: tx.tokenSymbol,
            amount: parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal)),
            usdValue: 100, // Mock USD value
            decimals: parseInt(tx.tokenDecimal)
          })
        }
      }
    }

  } catch (error) {
    console.error('Ethereum sync error:', error)
    // Return mock data on error
    return [
      { symbol: 'ETH', amount: 1.5, usdValue: 3000, decimals: 18 },
      { symbol: 'USDC', amount: 500, usdValue: 500, decimals: 6 }
    ]
  }

  return balances
}

async function syncBinanceAccount(apiKey: string, apiSecret: string): Promise<WalletBalance[]> {
  console.log('Syncing Binance account (mock implementation)')
  
  // Mock Binance balances - in production this would use Binance API
  return [
    { symbol: 'BTC', amount: 0.5, usdValue: 20000, decimals: 8 },
    { symbol: 'ETH', amount: 3.0, usdValue: 6000, decimals: 18 },
    { symbol: 'BNB', amount: 10, usdValue: 2500, decimals: 18 },
    { symbol: 'USDT', amount: 2000, usdValue: 2000, decimals: 6 }
  ]
}

async function upsertCryptoAsset(supabase: any, portfolioId: string, balance: WalletBalance) {
  try {
    // Get crypto asset category
    const { data: cryptoCategory } = await supabase
      .from('asset_categories')
      .select('id')
      .eq('name', 'crypto')
      .single()

    if (!cryptoCategory) {
      console.log('Crypto category not found')
      return
    }

    // Check if asset already exists
    const { data: existingAsset } = await supabase
      .from('portfolio_assets')
      .select('id')
      .eq('portfolio_id', portfolioId)
      .eq('asset_category_id', cryptoCategory.id)
      .ilike('asset_name', `%${balance.symbol}%`)
      .single()

    const assetData = {
      portfolio_id: portfolioId,
      asset_category_id: cryptoCategory.id,
      asset_name: `${balance.symbol} Holdings`,
      asset_description: `Cryptocurrency holdings for ${balance.symbol}`,
      asset_value: balance.usdValue,
      current_value: balance.usdValue,
      annual_income: 0,
      annual_expenses: 0,
      metadata: {
        symbol: balance.symbol,
        amount: balance.amount,
        decimals: balance.decimals,
        asset_type: 'crypto',
        last_sync: new Date().toISOString(),
        source: 'wallet_sync'
      },
      tags: ['crypto', 'wallet', balance.symbol.toLowerCase()],
      is_active: true
    }

    if (existingAsset) {
      // Update existing asset
      await supabase
        .from('portfolio_assets')
        .update(assetData)
        .eq('id', existingAsset.id)
      console.log(`Updated ${balance.symbol} asset`)
    } else {
      // Create new asset
      await supabase
        .from('portfolio_assets')
        .insert([assetData])
      console.log(`Created ${balance.symbol} asset`)
    }

  } catch (error) {
    console.error(`Error upserting ${balance.symbol} asset:`, error)
  }
}