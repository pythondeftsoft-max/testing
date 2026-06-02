
import { supabase } from '@/integrations/supabase/client';
import { getPointsConfig } from './systemConfig';

export interface AwardPointsParams {
  userId: string;
  eventType: string;
  pointsChange: number;
  notes?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  processedBy?: string;
}

export const awardPoints = async (params: AwardPointsParams) => {
  try {
    // Check if points system is enabled
    const systemEnabled = await getPointsConfig.systemEnabled();
    if (!systemEnabled) {
      console.log('Points system is disabled');
      return { success: false, message: 'Points system is disabled' };
    }

    // Check for duplicates to prevent double-awarding
    if (params.relatedEntityId && params.relatedEntityType) {
      const { data: existingPoints } = await supabase
        .from('points_history')
        .select('id')
        .eq('user_id', params.userId)
        .eq('event_type', params.eventType)
        .eq('related_entity_id', params.relatedEntityId)
        .eq('related_entity_type', params.relatedEntityType)
        .limit(1);

      if (existingPoints && existingPoints.length > 0) {
        console.log('Points already awarded for this entity', { 
          userId: params.userId, 
          eventType: params.eventType, 
          entityId: params.relatedEntityId 
        });
        return { success: false, message: 'Points already awarded for this entity' };
      }
    }

    // Get current balance
    const { data: historyData } = await supabase
      .from('points_history')
      .select('points_balance_after')
      .eq('user_id', params.userId)
      .order('timestamp', { ascending: false })
      .limit(1);

    const currentBalance = historyData?.[0]?.points_balance_after || 0;
    const newBalance = currentBalance + params.pointsChange;

    // Insert points history record
    const { error } = await supabase
      .from('points_history')
      .insert({
        user_id: params.userId,
        event_type: params.eventType,
        points_change: params.pointsChange,
        points_balance_after: newBalance,
        notes: params.notes,
        related_entity_id: params.relatedEntityId,
        related_entity_type: params.relatedEntityType,
        processed_by: params.processedBy,
      });

    if (error) throw error;

    // Check for points milestone achievements
    await checkPointsMilestone(params.userId, currentBalance, newBalance);

    return { 
      success: true, 
      newBalance,
      pointsAwarded: params.pointsChange
    };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error };
  }
};

// Specific point awarding functions using system config
export const awardRentPaymentPoints = async (userId: string, amountPaid: number, isEarly: boolean = false, isSection8: boolean = false) => {
  // 1 point per dollar paid by tenant
  const basePoints = Math.floor(amountPaid);
  const earlyBonus = isEarly ? await getPointsConfig.earlyPaymentBonus() : 0;
  const section8Multiplier = isSection8 ? await getPointsConfig.section8Multiplier() : 1;
  
  const totalPoints = Math.floor((basePoints + earlyBonus) * section8Multiplier);
  
  return awardPoints({
    userId,
    eventType: 'rent_payment',
    pointsChange: totalPoints,
    notes: `Rent payment points${isEarly ? ' (early payment bonus)' : ''}${isSection8 ? ' (Section 8 bonus)' : ''}: $${amountPaid}`,
  });
};

export const awardRentCollectionPoints = async (userId: string, amountCollected: number) => {
  // 0.2 points per dollar collected by landlord/PM
  const points = Math.floor(amountCollected * 0.2);
  
  return awardPoints({
    userId,
    eventType: 'rent_collection',
    pointsChange: points,
    notes: `Rent collection points: $${amountCollected}`,
  });
};

export const awardReferralPoints = async (userId: string, referralId: string) => {
  const points = await getPointsConfig.referral();
  
  return awardPoints({
    userId,
    eventType: 'referral_completion',
    pointsChange: points,
    notes: 'Referral completed successfully - tenant housed for 60+ days',
    relatedEntityId: referralId,
    relatedEntityType: 'referral',
  });
};

export const awardLeaseRenewalPoints = async (userId: string, propertyId: string) => {
  const points = await getPointsConfig.leaseRenewal();
  
  return awardPoints({
    userId,
    eventType: 'lease_renewal',
    pointsChange: points,
    notes: 'Lease renewal completed',
    relatedEntityId: propertyId,
    relatedEntityType: 'property',
  });
};

export const awardMaintenanceCooperationPoints = async (userId: string, maintenanceRequestId: string) => {
  const points = await getPointsConfig.maintenanceBonus();
  
  return awardPoints({
    userId,
    eventType: 'maintenance_cooperation',
    pointsChange: points,
    notes: 'Maintenance cooperation bonus',
    relatedEntityId: maintenanceRequestId,
    relatedEntityType: 'maintenance_request',
  });
};

export const awardReferralMilestoneBonus = async (userId: string) => {
  const bonusPoints = await getPointsConfig.referral5xBonus();
  
  return awardPoints({
    userId,
    eventType: 'referral_milestone',
    pointsChange: bonusPoints,
    notes: '5 successful referrals milestone bonus',
  });
};

// Check and award points milestone notifications
export const checkPointsMilestone = async (userId: string, previousBalance: number, newBalance: number) => {
  try {
    // Calculate which 2000-point thresholds were crossed
    const MILESTONE_INTERVAL = 2000;
    const previousMilestone = Math.floor(previousBalance / MILESTONE_INTERVAL);
    const newMilestone = Math.floor(newBalance / MILESTONE_INTERVAL);
    
    // If we crossed one or more milestones
    if (newMilestone > previousMilestone) {
      // Create notifications for each milestone crossed
      for (let milestone = previousMilestone + 1; milestone <= newMilestone; milestone++) {
        const milestonePoints = milestone * MILESTONE_INTERVAL;
        
        // Create milestone notification (duplicates prevented by unique constraint or acceptable)
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            event_type: 'points_awarded',
            title: '🎉 Milestone Reached!',
            message: `Congratulations! You've earned ${milestonePoints.toLocaleString()} points total!`,
            related_entity_id: String(milestonePoints),
            related_entity_type: 'points_milestone',
          });
        
        if (!error) {
          console.log(`Awarded milestone notification for ${milestonePoints} points`, { userId });
        }
      }
    }
  } catch (error) {
    console.error('Error checking points milestone:', error);
  }
};

// Check and award referral milestone bonus
export const checkReferralMilestone = async (userId: string) => {
  try {
    // Count successful referrals (60+ day milestone)
    const { data: referrals } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', userId)
      .eq('status', 'qualified');

    const referralCount = referrals?.length || 0;
    
    // Check if they've hit milestone multiples of 5
    if (referralCount > 0 && referralCount % 5 === 0) {
      // Check if milestone bonus already awarded for this count
      const { data: existingBonus } = await supabase
        .from('points_history')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'referral_milestone')
        .eq('notes', `5 successful referrals milestone bonus (${referralCount} total)`)
        .limit(1);

      if (!existingBonus || existingBonus.length === 0) {
        await awardPoints({
          userId,
          eventType: 'referral_milestone',
          pointsChange: await getPointsConfig.referral5xBonus(),
          notes: `5 successful referrals milestone bonus (${referralCount} total)`,
        });
        
        console.log(`Awarded milestone bonus for ${referralCount} referrals`, { userId });
      }
    }
  } catch (error) {
    console.error('Error checking referral milestone:', error);
  }
};
