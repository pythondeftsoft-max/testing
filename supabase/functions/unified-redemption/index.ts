
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedemptionRequest {
  pointsAmount: number;
  dollarAmount: number;
  scope?: 'portfolio' | 'global';
  portfolioId?: string;
  notes?: string;
  action?: 'redeem' | 'convert' | 'get_balance' | 'get_conversion_rates';
  rewardId?: string;
  pointsUsed?: number;
  pointType?: 'portfolio' | 'referral' | 'mixed';
  conversionParams?: {
    fromType: 'portfolio_points' | 'gift_card_value';
    toType: 'portfolio_points' | 'gift_card_value';
    amount: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the JWT token
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const requestData: RedemptionRequest = await req.json();
    
    // Handle legacy actions first
    if (requestData.action) {
      switch (requestData.action) {
        case 'get_balance':
          return await getUnifiedBalance(supabase, user.id);
        
        case 'get_conversion_rates':
          return await getConversionRates();
        
        case 'convert':
          if (!requestData.conversionParams) {
            throw new Error('Conversion parameters required');
          }
          return await convertPoints(supabase, user.id, requestData.conversionParams);
        
        case 'redeem':
          if (!requestData.rewardId || !requestData.pointsUsed || !requestData.pointType) {
            throw new Error('Reward ID, points used, and point type required');
          }
          return await redeemWithUnifiedPoints(
            supabase, 
            user.id, 
            requestData.rewardId, 
            requestData.pointsUsed, 
            requestData.pointType
          );
        
        default:
          throw new Error('Invalid action');
      }
    }

    // Handle new scope-based point conversion
    const { pointsAmount, dollarAmount, scope = 'global', portfolioId, notes } = requestData;

    // Reject global redemptions - users must specify a portfolio
    if (scope === 'global') {
      throw new Error('Cannot redeem points from global view. Please select a specific portfolio to spend points from.');
    }

    console.log('Processing redemption:', { 
      userId: user.id, 
      pointsAmount, 
      dollarAmount, 
      scope, 
      portfolioId 
    });

    // Validate redemption parameters
    if (!pointsAmount || pointsAmount <= 0) {
      throw new Error('Invalid points amount');
    }

    if (!dollarAmount || dollarAmount <= 0) {
      throw new Error('Invalid dollar amount');
    }

    // Check user's available balance based on scope
    let availablePoints = 0;
    
    if (scope === 'portfolio' && portfolioId && portfolioId !== 'everything') {
      // Get portfolio-specific points
      const { data: portfolioSummary, error: portfolioError } = await supabase.rpc('get_user_points_summary', {
        p_user_id: user.id,
        p_portfolio_id: portfolioId
      });

      if (portfolioError) {
        console.error('Error fetching portfolio points:', portfolioError);
        throw new Error('Failed to fetch portfolio points balance');
      }

      availablePoints = portfolioSummary?.spendable_points || 0;
      
      if (availablePoints < pointsAmount) {
        throw new Error(`Insufficient portfolio points. Available: ${availablePoints}, Required: ${pointsAmount}`);
      }
    } else {
      // Get global points (all portfolios)
      const { data: globalSummary, error: globalError } = await supabase.rpc('get_user_points_summary', {
        p_user_id: user.id,
        p_portfolio_id: null
      });

      if (globalError) {
        console.error('Error fetching global points:', globalError);
        throw new Error('Failed to fetch global points balance');
      }

      availablePoints = globalSummary?.spendable_points || 0;
      
      if (availablePoints < pointsAmount) {
        throw new Error(`Insufficient points. Available: ${availablePoints}, Required: ${pointsAmount}`);
      }
    }

    // Calculate conversion details
    const conversionRate = 100; // 100 points = $1
    const feeAmount = dollarAmount * 0.05; // 5% fee
    const netAmount = dollarAmount - feeAmount;

    // Create the point conversion record
    const { data: conversion, error: conversionError } = await supabase
      .from('point_conversions')
      .insert({
        user_id: user.id,
        points_amount: pointsAmount,
        dollar_amount: netAmount,
        conversion_rate: conversionRate,
        fee_amount: feeAmount,
        from_type: 'portfolio_points',
        to_type: 'gift_card',
        status: 'completed',
        notes: notes || `${scope === 'portfolio' ? 'Portfolio' : 'Global'} points redemption: $${dollarAmount.toFixed(2)} gift card`,
        metadata: {
          scope: scope,
          portfolio_id: scope === 'portfolio' ? portfolioId : null,
          original_dollar_amount: dollarAmount,
          net_amount: netAmount,
          fee_rate: 0.05
        }
      })
      .select()
      .single();

    if (conversionError) {
      console.error('Error creating conversion record:', conversionError);
      throw new Error('Failed to process redemption');
    }

    console.log('Redemption processed successfully:', conversion);

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversion,
        message: `Successfully redeemed ${pointsAmount} points for $${netAmount.toFixed(2)} gift card value`,
        details: {
          points_redeemed: pointsAmount,
          gift_card_value: netAmount,
          fee_amount: feeAmount,
          scope: scope,
          portfolio_id: scope === 'portfolio' ? portfolioId : null
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in unified-redemption function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to process redemption' 
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

async function getUnifiedBalance(supabase: any, userId: string) {
  // Get portfolio points
  const { data: portfolioPoints } = await supabase
    .from('points_history')
    .select('points_balance_after')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1);

  // Get referral gift card value
  const { data: referralValue } = await supabase
    .rpc('get_unified_referral_value', { p_user_id: userId });

  const portfolioBalance = portfolioPoints?.[0]?.points_balance_after || 0;
  const referralBalance = referralValue?.[0]?.available_point_equivalent || 0;
  const giftCardValue = referralValue?.[0]?.total_gift_card_value || 0;

  return new Response(
    JSON.stringify({
      success: true,
      balance: {
        portfolioPoints: portfolioBalance,
        referralPoints: referralBalance,
        giftCardValue: giftCardValue,
        totalUnifiedPoints: portfolioBalance + referralBalance,
        conversionRate: 100 // 100 points = $1
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getConversionRates() {
  return new Response(
    JSON.stringify({
      success: true,
      rates: {
        pointsToGiftCard: 100, // 100 points = $1 gift card
        giftCardToPoints: 100, // $1 gift card = 100 points
        conversionFee: 0, // No conversion fee for now
        minimumConversion: 500 // Minimum 500 points or $5
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function convertPoints(supabase: any, userId: string, params: any) {
  const { fromType, toType, amount } = params;
  const conversionRate = 100;
  const minimumConversion = 500;

  if (amount < minimumConversion) {
    throw new Error(`Minimum conversion amount is ${minimumConversion}`);
  }

  // Begin transaction logic
  if (fromType === 'portfolio_points' && toType === 'gift_card_value') {
    // Convert portfolio points to gift card value
    const giftCardValue = amount / conversionRate;
    
    // Deduct portfolio points
    await supabase.rpc('award_points', {
      p_user_id: userId,
      p_event_type: 'point_conversion',
      p_points_change: -amount,
      p_notes: `Converted ${amount} portfolio points to $${giftCardValue.toFixed(2)} gift card value`
    });

    // Add gift card reward
    await supabase.from('referral_rewards').insert({
      user_id: userId,
      reward_type: 'gift_card',
      reward_amount: giftCardValue,
      reward_description: `Converted from ${amount} portfolio points`,
      status: 'available',
      equivalent_points: amount,
      conversion_rate: conversionRate
    });

  } else if (fromType === 'gift_card_value' && toType === 'portfolio_points') {
    // Convert gift card value to portfolio points
    const pointsToAdd = amount * conversionRate;
    
    // Check if user has enough gift card value
    const { data: availableRewards } = await supabase
      .from('referral_rewards')
      .select('reward_amount')
      .eq('user_id', userId)
      .eq('status', 'available');

    const totalAvailable = availableRewards?.reduce((sum: number, reward: any) => 
      sum + Number(reward.reward_amount), 0) || 0;

    if (totalAvailable < amount) {
      throw new Error('Insufficient gift card balance');
    }

    // Mark gift card value as used (simplified - would need more complex logic for partial usage)
    await supabase.from('referral_rewards')
      .update({ status: 'converted' })
      .eq('user_id', userId)
      .eq('status', 'available')
      .lte('reward_amount', amount);

    // Add portfolio points
    await supabase.rpc('award_points', {
      p_user_id: userId,
      p_event_type: 'point_conversion',
      p_points_change: pointsToAdd,
      p_notes: `Converted $${amount} gift card value to ${pointsToAdd} portfolio points`
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Successfully converted ${fromType} to ${toType}`,
      conversionDetails: {
        originalAmount: amount,
        convertedAmount: fromType === 'portfolio_points' ? amount / conversionRate : amount * conversionRate,
        conversionRate
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function redeemWithUnifiedPoints(
  supabase: any, 
  userId: string, 
  rewardId: string, 
  pointsUsed: number, 
  pointType: string
) {
  // Get reward details
  const { data: reward, error: rewardError } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .eq('status', 'active')
    .single();

  if (rewardError || !reward) {
    throw new Error('Reward not found or inactive');
  }

  if (pointsUsed !== reward.cost) {
    throw new Error('Invalid points amount for this reward');
  }

  // Handle different point type redemptions
  if (pointType === 'portfolio') {
    // Use existing portfolio points redemption
    const result = await supabase.rpc('redeem_reward', {
      p_user_id: userId,
      p_reward_id: rewardId,
      p_points_used: pointsUsed
    });

    const parsedResult = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
    
    if (!parsedResult.success) {
      throw new Error(parsedResult.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        redemption: parsedResult,
        pointType: 'portfolio'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } else if (pointType === 'referral') {
    // Convert referral points to gift card and create redemption
    const giftCardValue = pointsUsed / 100; // 100 points = $1
    
    // Check if user has enough referral points
    const { data: referralValue } = await supabase
      .rpc('get_unified_referral_value', { p_user_id: userId });
    
    const availablePoints = referralValue?.[0]?.available_point_equivalent || 0;
    
    if (availablePoints < pointsUsed) {
      throw new Error('Insufficient referral points');
    }

    // Mark referral rewards as used (simplified logic)
    await supabase.from('referral_rewards')
      .update({ status: 'redeemed' })
      .eq('user_id', userId)
      .eq('status', 'available')
      .lte('equivalent_points', pointsUsed);

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .insert({
        user_id: userId,
        reward_id: rewardId,
        points_used: pointsUsed,
        status: 'pending'
      })
      .select()
      .single();

    if (redemptionError) {
      throw new Error('Failed to create redemption record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        redemption: {
          redemption_id: redemption.id,
          new_balance: availablePoints - pointsUsed,
          message: 'Reward redeemed with referral points'
        },
        pointType: 'referral'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } else if (pointType === 'mixed') {
    // Handle mixed point redemption (future enhancement)
    throw new Error('Mixed point redemptions not yet implemented');
  }

  throw new Error('Invalid point type');
}

serve(handler);
