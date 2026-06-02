import { supabase } from '@/integrations/supabase/client';

// OpenKey Housing system messages use Logan Bauer's admin profile as sender
const SYSTEM_ADMIN_ID = '926ac02b-ba75-4219-9a54-95ceaf658492';

// Helper function to check if message is recent (less than 7 days old)
const isRecentMessage = (createdAt: string): boolean => {
  const messageDate = new Date(createdAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return messageDate > sevenDaysAgo;
};

// Helper to get all linked application IDs (marketplace + any linked property applications)
const getLinkedApplicationIds = async (applicationId: string): Promise<string[]> => {
  const allIds = [applicationId];
  
  // Look up property_applications that reference this marketplace_application_id
  const { data: linkedPropertyApps } = await supabase
    .from('property_applications')
    .select('id')
    .eq('marketplace_application_id', applicationId);
  
  if (linkedPropertyApps && linkedPropertyApps.length > 0) {
    allIds.push(...linkedPropertyApps.map(pa => pa.id));
    console.log('🔍 DEBUG: Found linked property_application IDs:', linkedPropertyApps.map(pa => pa.id));
  }
  
  return allIds;
};

// Helper to get related property_push IDs for a given property
const getRelatedPropertyPushIds = async (propertyId: string): Promise<string[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data: pushes } = await supabase
    .from('property_pushes')
    .select('id')
    .eq('tenant_id', user.id)
    .eq('property_id', propertyId);
  
  const pushIds = (pushes || []).map(p => p.id);
  if (pushIds.length > 0) {
    console.log('🔍 DEBUG: Found related property_push IDs:', pushIds);
  }
  
  return pushIds;
};

// Mark recent messages as read by tenant (for landlord messages less than 7 days old)
export const markRecentMessagesAsReadByTenant = async (applicationId: string, propertyId?: string): Promise<{ success: boolean; markedCount: number }> => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get all linked application IDs (marketplace + property applications)
    const allIds = await getLinkedApplicationIds(applicationId);
    console.log('🔍 DEBUG: markRecentMessagesAsReadByTenant - All linked IDs:', allIds);
    
    // Get related property push IDs if we have a property ID
    let pushIds: string[] = [];
    if (propertyId) {
      pushIds = await getRelatedPropertyPushIds(propertyId);
      console.log('🔍 DEBUG: markRecentMessagesAsReadByTenant - Related push IDs:', pushIds);
    }
    
    // Build OR filter for all IDs
    const propertyAppFilter = allIds.map(id => `property_application_id.eq.${id}`).join(',');
    const marketplaceAppFilter = allIds.map(id => `marketplace_application_id.eq.${id}`).join(',');
    const pushFilter = pushIds.length > 0 ? `,${pushIds.map(id => `property_push_id.eq.${id}`).join(',')}` : '';
    
    const { data, error } = await supabase
      .from('messages')
      .update({ read_by_tenant: true })
      .or(`${propertyAppFilter},${marketplaceAppFilter}${pushFilter}`)
      .eq('created_by_tenant', false)
      .eq('read_by_tenant', false)
      .gte('created_at', sevenDaysAgo.toISOString())
      .select('id');

    if (error) throw error;
    return { success: true, markedCount: data?.length || 0 };
  } catch (error) {
    console.error('Error marking recent messages as read by tenant:', error);
    return { success: false, markedCount: 0 };
  }
};

// Mark recent messages as read by landlord (for tenant messages less than 7 days old)
export const markRecentMessagesAsReadByLandlord = async (applicationId: string): Promise<{ success: boolean; markedCount: number }> => {
  console.log('🔍 DEBUG: Starting markRecentMessagesAsReadByLandlord');
  console.log('🔍 DEBUG: Application ID:', applicationId);
  
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Step 1: First get message IDs by application/push ID
    const { data: applicationMessages } = await supabase
      .from('messages')
      .select('id')
      .or(`property_application_id.eq.${applicationId},marketplace_application_id.eq.${applicationId},property_push_id.eq.${applicationId}`);

    const messageIds = applicationMessages?.map(m => m.id) || [];
    
    if (messageIds.length === 0) {
      console.log('🔍 DEBUG: No messages found for this application');
      return { success: true, markedCount: 0 };
    }
    
    // Step 2: Update those messages filtering by tenant/system origin and recency
    const { data, error } = await supabase
      .from('messages')
      .update({ read_by_landlord: true })
      .in('id', messageIds)
      .or(`created_by_tenant.eq.true,sender_id.eq.${SYSTEM_ADMIN_ID}`)
      .eq('read_by_landlord', false)
      .gte('created_at', sevenDaysAgo.toISOString())
      .select('id');

    if (error) {
      console.error('🔍 DEBUG: Update query error:', error);
      throw error;
    }
    
    console.log('🔍 DEBUG: Number of recent messages marked as read:', data?.length || 0);
    
    return { success: true, markedCount: data?.length || 0 };
  } catch (error) {
    console.error('🔍 DEBUG: Exception in markRecentMessagesAsReadByLandlord:', error);
    return { success: false, markedCount: 0 };
  }
};

// Mark ALL messages as read by tenant (manual action)
export const markAllMessagesAsReadByTenant = async (applicationId: string, propertyId?: string): Promise<{ success: boolean; markedCount: number }> => {
  console.log('🔍 DEBUG: Starting markAllMessagesAsReadByTenant');
  console.log('🔍 DEBUG: Application ID:', applicationId);
  console.log('🔍 DEBUG: Property ID:', propertyId);
  
  try {
    // Get current user to verify permissions
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔍 DEBUG: Current user ID:', user?.id);
    
    // Get all linked application IDs (marketplace + property applications)
    const allIds = await getLinkedApplicationIds(applicationId);
    console.log('🔍 DEBUG: All linked application IDs:', allIds);
    
    // Get related property push IDs if we have a property ID
    let pushIds: string[] = [];
    if (propertyId) {
      pushIds = await getRelatedPropertyPushIds(propertyId);
      console.log('🔍 DEBUG: Related property push IDs:', pushIds);
    }
    
    // Build OR filter for all IDs
    const propertyAppFilter = allIds.map(id => `property_application_id.eq.${id}`).join(',');
    const marketplaceAppFilter = allIds.map(id => `marketplace_application_id.eq.${id}`).join(',');
    const pushFilter = pushIds.length > 0 ? `,${pushIds.map(id => `property_push_id.eq.${id}`).join(',')}` : '';
    const combinedFilter = `${propertyAppFilter},${marketplaceAppFilter}${pushFilter}`;
    console.log('🔍 DEBUG: Combined filter:', combinedFilter);
    
    // Step 1: Query current state BEFORE update
    console.log('🔍 DEBUG: Step 1 - Querying messages BEFORE update...');
    const { data: beforeMessages, error: beforeError } = await supabase
      .from('messages')
      .select('id, created_at, created_by_tenant, read_by_tenant, sender_id, property_application_id, marketplace_application_id, property_push_id')
      .or(combinedFilter)
      .eq('created_by_tenant', false)
      .eq('read_by_tenant', false);
    
    if (beforeError) {
      console.error('🔍 DEBUG: Error querying messages before update:', beforeError);
      throw beforeError;
    }
    
    console.log('🔍 DEBUG: Messages BEFORE update:', beforeMessages);
    console.log('🔍 DEBUG: Number of unread landlord messages found:', beforeMessages?.length || 0);
    
    if (!beforeMessages || beforeMessages.length === 0) {
      console.log('🔍 DEBUG: No unread messages to mark as read');
      return { success: true, markedCount: 0 };
    }
    
    // Step 2: Perform the update using message IDs directly (most reliable)
    console.log('🔍 DEBUG: Step 2 - Performing update by message IDs...');
    const messageIds = beforeMessages.map(m => m.id);
    const { data: updateData, error: updateError } = await supabase
      .from('messages')
      .update({ read_by_tenant: true })
      .in('id', messageIds)
      .select('id');

    if (updateError) {
      console.error('🔍 DEBUG: Update query error:', updateError);
      throw updateError;
    }
    
    console.log('🔍 DEBUG: Update query response data:', updateData);
    console.log('🔍 DEBUG: Number of rows updated:', updateData?.length || 0);
    
    const markedCount = updateData?.length || 0;
    console.log('🔍 DEBUG: Final result - Success: true, Marked count:', markedCount);
    
    return { success: true, markedCount };
  } catch (error) {
    console.error('🔍 DEBUG: Exception in markAllMessagesAsReadByTenant:', error);
    return { success: false, markedCount: 0 };
  }
};

// Mark ALL messages as read by landlord (manual action)
export const markAllMessagesAsReadByLandlord = async (applicationId: string): Promise<{ success: boolean; markedCount: number }> => {
  console.log('🔍 DEBUG: Starting markAllMessagesAsReadByLandlord');
  console.log('🔍 DEBUG: Application ID:', applicationId);
  
  try {
    // Step 1: First get message IDs by application/push ID
    const { data: applicationMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id')
      .or(`property_application_id.eq.${applicationId},marketplace_application_id.eq.${applicationId},property_push_id.eq.${applicationId}`);

    if (fetchError) {
      console.error('🔍 DEBUG: Error fetching message IDs:', fetchError);
      throw fetchError;
    }

    const messageIds = applicationMessages?.map(m => m.id) || [];
    console.log('🔍 DEBUG: Found message IDs for application:', messageIds.length);
    
    if (messageIds.length === 0) {
      console.log('🔍 DEBUG: No messages found for this application');
      return { success: true, markedCount: 0 };
    }
    
    // Step 2: Find unread messages from tenant or system within those IDs
    const { data: unreadMessages, error: unreadError } = await supabase
      .from('messages')
      .select('id')
      .in('id', messageIds)
      .or(`created_by_tenant.eq.true,sender_id.eq.${SYSTEM_ADMIN_ID}`)
      .eq('read_by_landlord', false);

    if (unreadError) {
      console.error('🔍 DEBUG: Error fetching unread messages:', unreadError);
      throw unreadError;
    }

    const unreadIds = unreadMessages?.map(m => m.id) || [];
    console.log('🔍 DEBUG: Found unread messages to mark:', unreadIds.length);
    
    if (unreadIds.length === 0) {
      console.log('🔍 DEBUG: No unread messages to mark as read');
      return { success: true, markedCount: 0 };
    }
    
    // Step 3: Update those specific messages
    const { data: updateData, error: updateError } = await supabase
      .from('messages')
      .update({ read_by_landlord: true })
      .in('id', unreadIds)
      .select('id');

    if (updateError) {
      console.error('🔍 DEBUG: Update query error:', updateError);
      throw updateError;
    }
    
    const markedCount = updateData?.length || 0;
    console.log('🔍 DEBUG: Successfully marked as read:', markedCount);
    
    return { success: true, markedCount };
  } catch (error) {
    console.error('🔍 DEBUG: Exception in markAllMessagesAsReadByLandlord:', error);
    return { success: false, markedCount: 0 };
  }
};

// Mark specific message as read by tenant
export const markSpecificMessageAsReadByTenant = async (messageId: string): Promise<{ success: boolean }> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_by_tenant: true })
      .eq('id', messageId)
      .eq('created_by_tenant', false);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking specific message as read by tenant:', error);
    return { success: false };
  }
};

// Mark specific message as read by landlord
export const markSpecificMessageAsReadByLandlord = async (messageId: string): Promise<{ success: boolean }> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_by_landlord: true })
      .eq('id', messageId)
      .eq('created_by_tenant', true);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking specific message as read by landlord:', error);
    return { success: false };
  }
};

// Get unread message info for an application (for UI display)
export const getUnreadMessageInfo = (messages: any[], currentUserId: string, userType: 'tenant' | 'landlord') => {
  const unreadMessages = messages.filter(msg => {
    if (userType === 'tenant') {
      return !msg.created_by_tenant && !msg.read_by_tenant;
    } else {
      // Include both tenant messages AND system messages (from OpenKey Housing) as unread
      const isFromTenant = msg.created_by_tenant && !msg.read_by_landlord;
      const isSystemMessage = !msg.created_by_tenant && !msg.read_by_landlord && msg.sender_id === SYSTEM_ADMIN_ID;
      return isFromTenant || isSystemMessage;
    }
  });

  const recentUnread = unreadMessages.filter(msg => isRecentMessage(msg.created_at));
  const oldUnread = unreadMessages.filter(msg => !isRecentMessage(msg.created_at));

  return {
    totalUnread: unreadMessages.length,
    recentUnread: recentUnread.length,
    oldUnread: oldUnread.length,
    hasOldUnread: oldUnread.length > 0
  };
};