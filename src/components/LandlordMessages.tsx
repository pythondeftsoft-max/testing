
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, User, AlertTriangle, Home, Calendar, CheckCheck, Trash2, CheckCircle, Search, Plus } from 'lucide-react';
import ScheduleInterviewModal from './ScheduleInterviewModal';
import InterviewCalendar from './InterviewCalendar';
import { markAllMessagesAsReadByLandlord, getUnreadMessageInfo } from '@/utils/messageUtils';
import { useLandlordUnreadMessageCount } from '@/hooks/useLandlordUnreadMessageCount';
import { useLandlordMaintenanceNotifications } from '@/hooks/useLandlordMaintenanceNotifications';
import { useLeaseRenewalContractNotifications } from '@/hooks/useLeaseRenewalContractNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import MaintenanceMessageCard from './MaintenanceMessageCard';
import AppointmentMessageCard from './AppointmentMessageCard';
import LeaseMessageCard from './LeaseMessageCard';
import PlacementFeeMessageCard from './PlacementFeeMessageCard';
import { useAppointmentReminders } from '@/hooks/useAppointmentReminders';
import { useResendPaymentLink } from '@/hooks/useResendPaymentLink';
import LandlordNewMessageDialog from './LandlordNewMessageDialog';

interface LandlordMessagesProps {
  userId: string;
  initialApplicationId?: string;
  initialTenantId?: string;
  initialAction?: string;
  onBack?: () => void;
}

interface VirtualConversation {
  id: string;                    // e.g., "openkey_combined" or "abc-123_tenant"
  applicationId: string | null;  // The actual application ID (null for consolidated)
  type: 'openkey' | 'tenant';    // Type of conversation
  application?: any;             // Reference to the application (undefined for consolidated)
  applications?: any[];          // All applications for consolidated conversations
}

const SYSTEM_ADMIN_ID = '84b46bc8-1e8a-4f74-9349-0f765b364018';

const LandlordMessages = ({ userId, initialApplicationId, initialTenantId, initialAction, onBack }: LandlordMessagesProps) => {
  const [applications, setApplications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedVirtualConversationId, setSelectedVirtualConversationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initialSelectionPerformedRef = useRef(false);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const { toast } = useToast();
  const { refetch: refetchUnreadCount, immediateRefresh } = useLandlordUnreadMessageCount();
  const { mutate: resendPaymentLink, isPending: isResending } = useResendPaymentLink();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedApplication = applications.find(app => app.id === selectedApplicationId);

  // Set up landlord maintenance notifications
  useLandlordMaintenanceNotifications({
    userId,
    onNavigateToMessages: (applicationId: string) => {
      setSelectedApplicationId(applicationId);
      setIsModalOpen(true);
    }
  });

  // Set up lease renewal contract notifications
  useLeaseRenewalContractNotifications({
    userId,
    userType: 'landlord'
  });

  // Set up appointment reminders
  useAppointmentReminders({
    userId,
    userType: 'landlord'
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  // Auto-select conversation if passed from navigation (by applicationId or tenantId)
  useEffect(() => {
    if (applications.length === 0 || messages.length === 0) return;
    if (initialSelectionPerformedRef.current) return; // Already performed selection
    
    // Handle tenant ID-based selection (from Current Tenants tab)
    if (initialTenantId) {
      const virtualConvos = getVirtualConversations();
      // Find the tenant conversation by tenant_id pattern
      const tenantConvo = virtualConvos.find(vc => vc.id === `${initialTenantId}_tenant`);
      if (tenantConvo) {
        setSelectedVirtualConversationId(tenantConvo.id);
        if (tenantConvo.applicationId) {
          setSelectedApplicationId(tenantConvo.applicationId);
        }
        setIsModalOpen(true);
        initialSelectionPerformedRef.current = true;
        return;
      }
    }
    
    // Handle application ID-based selection (legacy/fallback)
    if (initialApplicationId) {
      const application = applications.find(app => app.id === initialApplicationId);
      
      if (application) {
        setSelectedApplicationId(application.id);
        // For initial selection, pick the first virtual conversation for this application
        const virtualConvos = getVirtualConversations().filter(vc => vc.applicationId === application.id);
        if (virtualConvos.length > 0) {
          setSelectedVirtualConversationId(virtualConvos[0].id);
        }
        setIsModalOpen(true);
        initialSelectionPerformedRef.current = true;
        
        // If action is 'schedule', open the schedule modal
        if (initialAction === 'schedule') {
          setShowScheduleModal(true);
        }
      }
    }
  }, [initialApplicationId, initialTenantId, applications, messages, initialAction]);

  useEffect(() => {
    if (applications.length > 0) {
      fetchMessages();
    }
  }, [applications]);

  // Real-time subscription for messages
  useEffect(() => {
    const channel = supabase
      .channel('landlord-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          console.log('[LandlordMessages] Real-time message update received');
          fetchMessages();
          immediateRefresh ? immediateRefresh() : refetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isModalOpen && selectedVirtualConversationId) {
      setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  }, [isModalOpen, selectedVirtualConversationId]);

  const fetchApplications = async () => {
    try {
      // Fetch landlord's property IDs first
      const { data: ownedProperties } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', userId);

      const propertyIds = ownedProperties?.map(p => p.id) || [];

      // Fetch property_applications - include 'submitted' status to capture push-related apps
      const { data: propertyAppsData, error: propertyError } = await supabase
        .from('property_applications')
        .select(`
          *,
          properties!property_applications_property_id_fkey (
            id,
            address,
            monthly_rent,
            bedrooms,
            bathrooms,
            owner_id
          ),
          profiles!property_applications_tenant_id_fkey (
            first_name,
            last_name,
            id
          )
        `)
        .in('property_id', propertyIds)
        .in('status', ['submitted', 'lease_signed', 'housed'])
        .order('created_at', { ascending: false });

      if (propertyError) throw propertyError;

      // Fetch property_units for those properties
      const { data: ownedUnits } = await supabase
        .from('property_units')
        .select('id, property_id')
        .in('property_id', propertyIds);

      const unitIds = ownedUnits?.map(u => u.id) || [];

      // Fetch marketplace_applications using unit_id.in()
      const { data: marketplaceAppsData, error: marketplaceError } = await supabase
        .from('marketplace_applications')
        .select(`
          id,
          status,
          created_at,
          user_id,
          unit_id,
          property_units(
            property_id,
            properties(
              id, address, monthly_rent, bedrooms, bathrooms, owner_id
            )
          )
        `)
        .in('unit_id', unitIds)
        .in('status', ['submitted', 'lease_signed', 'housed'])
        .order('created_at', { ascending: false });

      if (marketplaceError) throw marketplaceError;

      // Fetch property_pushes for the landlord's properties
      const { data: propertyPushesData, error: pushError } = await supabase
        .from('property_pushes')
        .select(`
          id,
          property_id,
          tenant_id,
          status,
          created_at,
          properties!fk_property_pushes_property_id (
            id,
            address,
            monthly_rent,
            bedrooms,
            bathrooms,
            owner_id
          ),
          profiles!fk_property_pushes_tenant_id (
            id,
            first_name,
            last_name
          )
        `)
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false });

      if (pushError) throw pushError;

      // Fetch tenant profiles separately for marketplace apps
      const tenantIds = marketplaceAppsData?.map(app => app.user_id).filter(Boolean) || [];
      const { data: tenantProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', tenantIds);

      // Create a map of tenant profiles
      const profileMap = new Map(tenantProfiles?.map(p => [p.id, p]) || []);

      // Normalize marketplace apps to match property apps structure
      const normalizedMarketplaceApps = (marketplaceAppsData || []).map(app => ({
        id: app.id,
        status: app.status,
        created_at: app.created_at,
        tenant_id: app.user_id,
        property_id: app.property_units?.property_id,
        properties: app.property_units?.properties,
        profiles: profileMap.get(app.user_id) || null,
        source: 'marketplace'
      }));

      // Normalize property pushes to match property apps structure
      const normalizedPushApps = (propertyPushesData || []).map(push => ({
        id: push.id,
        status: push.status,
        created_at: push.created_at,
        tenant_id: push.tenant_id,
        property_id: push.property_id,
        properties: push.properties,
        profiles: push.profiles,
        source: 'property_push'
      }));

      // Combine all - property apps, marketplace apps, and property pushes
      const allApps = [
        ...(propertyAppsData || []).map(app => ({ ...app, property_id: app.property_id })),
        ...normalizedMarketplaceApps,
        ...normalizedPushApps
      ];

      setApplications(allApps);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (applications.length === 0) {
      return;
    }

    try {
      const applicationIds = applications.map(app => app.id);
      const pushIds = applications.filter(app => app.source === 'property_push').map(app => app.id);
      const nonPushIds = applications.filter(app => app.source !== 'property_push').map(app => app.id);
      
      // Fetch messages by property_application_id, marketplace_application_id, AND property_push_id
      const [propertyResult, marketplaceResult, pushResult] = await Promise.all([
        supabase
          .from('messages')
          .select(`
            *,
            profiles!messages_sender_id_fkey (
              first_name,
              last_name,
              user_type
            )
          `)
          .in('property_application_id', nonPushIds)
          .order('created_at', { ascending: true }),
        
        supabase
          .from('messages')
          .select(`
            *,
            profiles!messages_sender_id_fkey (
              first_name,
              last_name,
              user_type
            )
          `)
          .in('marketplace_application_id', nonPushIds)
          .order('created_at', { ascending: true }),

        pushIds.length > 0 ? supabase
          .from('messages')
          .select(`
            *,
            profiles!messages_sender_id_fkey (
              first_name,
              last_name,
              user_type
            )
          `)
          .in('property_push_id', pushIds)
          .order('created_at', { ascending: true }) : { data: [], error: null }
      ]);

      if (propertyResult.error) throw propertyResult.error;
      if (marketplaceResult.error) throw marketplaceResult.error;
      if (pushResult.error) throw pushResult.error;

      // Combine and deduplicate messages
      const allMessages = [
        ...(propertyResult.data || []), 
        ...(marketplaceResult.data || []),
        ...(pushResult.data || [])
      ];
      const uniqueMessages = allMessages.filter((msg, idx, arr) => 
        arr.findIndex(m => m.id === msg.id) === idx
      );
      
      // Sort by created_at
      uniqueMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(uniqueMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedApplicationId) return;

    setSendingMessage(true);
    try {
      const application = applications.find(app => app.id === selectedApplicationId);
      const isMarketplaceApp = application?.source === 'marketplace';

      // Insert the message with the appropriate application ID field
      const messageData: any = {
        sender_id: userId,
        message_text: newMessage.trim(),
        created_by_tenant: false
      };

      if (isMarketplaceApp) {
        messageData.marketplace_application_id = selectedApplicationId;
      } else {
        messageData.property_application_id = selectedApplicationId;
      }

      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageData);

      if (messageError) throw messageError;

      // Update message count to mark landlord as responded
      if (application) {
        const { error: countError } = await supabase.rpc('update_message_count', {
          p_tenant_id: application.tenant_id,
          p_property_application_id: selectedApplicationId,
          p_is_from_tenant: false
        });

        if (countError) throw countError;
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent to the tenant.",
      });

      setNewMessage('');
      await Promise.all([
        fetchMessages(),
        immediateRefresh ? immediateRefresh() : refetchUnreadCount()
      ]);
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // System message extensions that should ALWAYS go to OpenKey Housing
  const SYSTEM_MESSAGE_EXTENSIONS = ['placement_fee_payment', 'lease_executed'];

  // Helper to find linked property push for an application (same property + tenant)
  const getLinkedPushId = (application: any) => {
    if (!application || application.source === 'property_push') return null;
    const push = applications.find(app => 
      app.source === 'property_push' && 
      app.property_id === application.property_id && 
      app.tenant_id === application.tenant_id
    );
    return push?.id || null;
  };

  // Helper to find linked application for a property push (same property + tenant)
  const getLinkedApplicationId = (push: any) => {
    if (!push || push.source !== 'property_push') return null;
    const app = applications.find(a => 
      a.source !== 'property_push' && 
      a.property_id === push.property_id && 
      a.tenant_id === push.tenant_id
    );
    return app?.id || null;
  };

  const getMessagesForApplication = (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId);
    
    // Get the linked push ID if this is a property application
    const linkedPushId = getLinkedPushId(application);
    
    // Get the linked application ID if this is a property push
    const linkedAppId = getLinkedApplicationId(application);
    
    return messages.filter(msg => {
      // Direct match on property_application_id or marketplace_application_id
      if (msg.property_application_id === applicationId || msg.marketplace_application_id === applicationId) {
        return true;
      }
      // Direct match on property_push_id for push-type applications
      if (application?.source === 'property_push' && msg.property_push_id === applicationId) {
        return true;
      }
      // Include messages from linked property push
      if (linkedPushId && msg.property_push_id === linkedPushId) {
        return true;
      }
      // Include messages from linked application (when viewing a push)
      if (linkedAppId && (msg.property_application_id === linkedAppId || msg.marketplace_application_id === linkedAppId)) {
        return true;
      }
      return false;
    });
  };

  // Create virtual conversations - one for OpenKey messages, one per unique tenant
  const getVirtualConversations = () => {
    const virtualConvos: VirtualConversation[] = [];
    
    // Collect all applications with admin messages for a single OpenKey conversation
    const appsWithAdminMessages: any[] = [];
    
    // Group tenant conversations by unique tenant_id to avoid duplicates
    // Include property pushes and their linked applications
    const tenantConversationMap = new Map<string, { apps: any[], hasTenantMessages: boolean, propertyId: string | null }>();
    
    // Track which property+tenant combos have been processed to avoid duplicates
    const processedCombos = new Set<string>();
    
    applications.forEach(app => {
      const appMessages = getMessagesForApplication(app.id);
      const tenantId = app.tenant_id || app.user_id;
      const propertyId = app.property_id || app.properties?.id;
      const comboKey = `${propertyId}_${tenantId}`;
      
      // Admin/system messages = from admin OR SYSTEM_ADMIN_ID OR has system extension
      const adminMessages = appMessages.filter(m => 
        m.profiles?.user_type === 'admin' || 
        m.sender_id === SYSTEM_ADMIN_ID ||
        SYSTEM_MESSAGE_EXTENSIONS.includes(m.extension)
      );
      
      // Track apps with admin messages
      if (adminMessages.length > 0) {
        appsWithAdminMessages.push(app);
      }
      
      // Tenant messages = non-admin AND no system extension
      const tenantMessages = appMessages.filter(m => 
        m.profiles?.user_type !== 'admin' && 
        m.sender_id !== SYSTEM_ADMIN_ID &&
        !SYSTEM_MESSAGE_EXTENSIONS.includes(m.extension)
      );
      
      // Include apps with messages regardless of status (to capture push-based conversations)
      // Also include housed apps and property_push apps
      const shouldInclude = (
        (app.status === 'housed' || app.source === 'property_push' || tenantMessages.length > 0) && 
        tenantId
      );
      
      if (shouldInclude && !processedCombos.has(comboKey)) {
        processedCombos.add(comboKey);
        
        if (!tenantConversationMap.has(tenantId)) {
          tenantConversationMap.set(tenantId, { apps: [], hasTenantMessages: false, propertyId });
        }
        const entry = tenantConversationMap.get(tenantId)!;
        entry.apps.push(app);
        if (tenantMessages.length > 0) {
          entry.hasTenantMessages = true;
        }
      } else if (shouldInclude && tenantConversationMap.has(tenantId)) {
        // Add to existing entry if not already there
        const entry = tenantConversationMap.get(tenantId)!;
        if (!entry.apps.find(a => a.id === app.id)) {
          entry.apps.push(app);
        }
        if (tenantMessages.length > 0) {
          entry.hasTenantMessages = true;
        }
      }
    });
    
    // Create ONE consolidated conversation per tenant
    tenantConversationMap.forEach(({ apps, hasTenantMessages }, tenantId) => {
      if (hasTenantMessages) {
        // Prefer non-push application as primary, otherwise use most recent
        const nonPushApps = apps.filter(a => a.source !== 'property_push');
        const primaryApp = nonPushApps.length > 0 
          ? nonPushApps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : apps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
        virtualConvos.push({
          id: `${tenantId}_tenant`,
          applicationId: primaryApp.id,
          type: 'tenant',
          application: primaryApp,
          applications: apps
        });
      }
    });
    
    // Create ONE consolidated OpenKey conversation if there are any admin messages
    if (appsWithAdminMessages.length > 0) {
      virtualConvos.unshift({
        id: 'openkey_combined',
        applicationId: null,
        type: 'openkey',
        applications: appsWithAdminMessages
      });
    }
    
    return virtualConvos;
  };

  // Filter conversations based on search query
  const getFilteredConversations = () => {
    const conversations = getVirtualConversations();
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    
    return conversations.filter(vc => {
      // Search by display name
      const displayName = getVirtualConversationDisplayName(vc);
      if (displayName.name.toLowerCase().includes(query)) return true;
      if (displayName.subtitle.toLowerCase().includes(query)) return true;
      
      // Search by property address (for tenant conversations)
      if (vc.application?.properties?.address?.toLowerCase().includes(query)) return true;
      
      // Search by last message content
      const lastMessage = getLastMessageForVirtualConvo(vc);
      if (lastMessage?.message_text?.toLowerCase().includes(query)) return true;
      
      return false;
    });
  };

  // Get messages for a virtual conversation (filtered by type)
  const getMessagesForVirtualConversation = (virtualConvo: VirtualConversation) => {
    // For consolidated OpenKey conversation, get messages from all applications
    if (virtualConvo.type === 'openkey' && virtualConvo.applications) {
      const allAdminMessages: any[] = [];
      virtualConvo.applications.forEach(app => {
        const appMessages = getMessagesForApplication(app.id);
        const adminMessages = appMessages.filter(m => 
          m.profiles?.user_type === 'admin' || 
          m.sender_id === SYSTEM_ADMIN_ID ||
          SYSTEM_MESSAGE_EXTENSIONS.includes(m.extension)
        );
        allAdminMessages.push(...adminMessages);
      });
      // Sort by created_at to maintain chronological order
      return allAdminMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    
    // For consolidated tenant conversations, get messages from all tenant applications
    if (virtualConvo.type === 'tenant' && virtualConvo.applications) {
      const allTenantMessages: any[] = [];
      virtualConvo.applications.forEach(app => {
        const appMessages = getMessagesForApplication(app.id);
        const tenantMessages = appMessages.filter(m => 
          m.profiles?.user_type !== 'admin' && 
          m.sender_id !== SYSTEM_ADMIN_ID &&
          !SYSTEM_MESSAGE_EXTENSIONS.includes(m.extension) &&
          // For maintenance messages, only show if created by tenant (not landlord-created without tenant)
          (m.extension !== 'maintenance' || m.created_by_tenant === true)
        );
        allTenantMessages.push(...tenantMessages);
      });
      // Sort by created_at and deduplicate
      const uniqueMessages = allTenantMessages.filter((msg, idx, arr) => 
        arr.findIndex(m => m.id === msg.id) === idx
      );
      return uniqueMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    
    // For regular conversations, get messages from single application
    const allMessages = getMessagesForApplication(virtualConvo.applicationId!);
    
    if (virtualConvo.type === 'openkey') {
      // OpenKey: admin messages OR messages with system extensions (handles bad old data)
      return allMessages.filter(m => 
        m.profiles?.user_type === 'admin' || 
        m.sender_id === SYSTEM_ADMIN_ID ||
        SYSTEM_MESSAGE_EXTENSIONS.includes(m.extension)
      );
    } else {
      // Tenant: ALL messages EXCEPT admin messages AND system extensions
      // Also filter out maintenance messages not created by tenant
      return allMessages.filter(m => 
        m.profiles?.user_type !== 'admin' && 
        m.sender_id !== SYSTEM_ADMIN_ID &&
        !SYSTEM_MESSAGE_EXTENSIONS.includes(m.extension) &&
        (m.extension !== 'maintenance' || m.created_by_tenant === true)
      );
    }
  };

  const getLastMessageForVirtualConvo = (virtualConvo: VirtualConversation) => {
    const convoMessages = getMessagesForVirtualConversation(virtualConvo);
    return convoMessages[convoMessages.length - 1];
  };

  const getLastMessage = (applicationId: string) => {
    const appMessages = getMessagesForApplication(applicationId);
    return appMessages[appMessages.length - 1];
  };

  const getTenantName = (application: any) => {
    if (application.profiles) {
      const firstName = application.profiles.first_name || '';
      const lastName = application.profiles.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'Tenant';
    }
    return 'Tenant';
  };

  const getVirtualConversationDisplayName = (virtualConvo: VirtualConversation) => {
    if (virtualConvo.type === 'openkey') {
      // For consolidated OpenKey conversation, check if any application is in lease_signed status
      const hasPaymentPending = virtualConvo.applications?.some(app => app.status === 'lease_signed') || false;
      return {
        name: 'OpenKey Housing',
        subtitle: hasPaymentPending ? 'Payment Pending' : 'System'
      };
    }
    
    // Tenant conversation - show as "Tenant: Name" for housed status
    const tenantName = getTenantName(virtualConvo.application!);
    return {
      name: virtualConvo.application?.status === 'housed' ? `Tenant: ${tenantName}` : tenantName,
      subtitle: virtualConvo.application?.status === 'housed' ? 'Current Tenant' : 'Lease Signed'
    };
  };

  const getConversationDisplayName = (application: any) => {
    // For lease_signed, show as OpenKey Housing (payment pending)
    if (application.status === 'lease_signed') {
      return {
        name: 'OpenKey Housing',
        subtitle: 'Payment Pending'
      };
    }
    
    // For housed applications, show tenant name
    return {
      name: getTenantName(application),
      subtitle: 'Tenant'
    };
  };

  const getMessageSenderDisplay = (message: any, virtualConvo?: VirtualConversation) => {
    const isSender = message.sender_id === userId;
    if (isSender) return 'You';
    
    // If in openkey conversation, show OpenKey Housing
    if (virtualConvo?.type === 'openkey') {
      return 'OpenKey Housing';
    }
    
    // Admin messages show as "OpenKey Housing"
    if (message.profiles?.user_type === 'admin') {
      return 'OpenKey Housing';
    }
    
    // Show actual tenant name for tenant conversations
    return `${message.profiles?.first_name || 'Tenant'} ${message.profiles?.last_name || ''}`.trim() || 'Tenant';
  };

  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const getPropertyDisplay = (application: any) => {
    const property = application.properties;
    if (!property) return 'Property address not available';
    
    const address = property.address || 'Address not available';
    const bedBath = property.bedrooms && property.bathrooms 
      ? ` • ${property.bedrooms}bd/${property.bathrooms}ba` 
      : '';
    
    return `${address}${bedBath}`;
  };

  const getApplicationStatusLabel = (application: any) => {
    switch (application.status) {
      case 'housed':
        return { label: 'Housed', variant: 'default' as const, icon: '🏠' };
      case 'lease_signed':
        return { label: 'Lease Signed', variant: 'secondary' as const, icon: '📝' };
      case 'approved':
        return { label: 'Approved', variant: 'success' as const, icon: '✓' };
      case 'pending':
        return { label: 'Pending', variant: 'secondary' as const, icon: '📋' };
      case 'rejected':
        return { label: 'Rejected', variant: 'destructive' as const, icon: '✗' };
      case 'withdrawn':
        return { label: 'Withdrawn', variant: 'outline' as const, icon: '↩️' };
      default:
        return { label: 'Application', variant: 'secondary' as const, icon: '📋' };
    }
  };

  const hasUnreadInCurrentConversation = () => {
    if (!selectedApplicationId) return false;
    const appMessages = getMessagesForApplication(selectedApplicationId);
    return appMessages.some(msg => msg.created_by_tenant && !msg.read_by_landlord);
  };

  const handleMarkAllAsRead = async () => {
    // Find the selected virtual conversation to get all related applications
    const selectedVirtualConvo = getVirtualConversations().find(vc => vc.id === selectedVirtualConversationId);
    
    if (selectedVirtualConvo?.applications && selectedVirtualConvo.applications.length > 0) {
      // Mark all related applications' messages as read (includes both property_applications and property_pushes)
      const results = await Promise.all(
        selectedVirtualConvo.applications.map(app => markAllMessagesAsReadByLandlord(app.id))
      );
      
      if (results.some(r => r.success)) {
        await Promise.all([
          fetchMessages(),
          immediateRefresh ? immediateRefresh() : refetchUnreadCount()
        ]);
        
        toast({
          title: "Success",
          description: "All messages marked as read"
        });
      }
    } else if (selectedApplicationId) {
      // Fallback for single application
      const result = await markAllMessagesAsReadByLandlord(selectedApplicationId);
      if (result.success) {
        await Promise.all([
          fetchMessages(),
          immediateRefresh ? immediateRefresh() : refetchUnreadCount()
        ]);
        
        toast({
          title: "Success", 
          description: "All messages marked as read"
        });
      }
    }
  };

  const deleteConversation = async (applicationId: string) => {
    try {
      // Delete messages by either property_application_id OR marketplace_application_id
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`property_application_id.eq.${applicationId},marketplace_application_id.eq.${applicationId}`);

      if (error) throw error;

      await Promise.all([
        fetchMessages(),
        immediateRefresh ? immediateRefresh() : refetchUnreadCount()
      ]);

      toast({
        title: "Success",
        description: "Conversation deleted"
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    }
  };

  const deleteAllConversations = async () => {
    try {
      const applicationIds = applications.map(app => app.id);
      
      // Build OR clause for both ID types
      const orClauses = applicationIds.flatMap(id => [
        `property_application_id.eq.${id}`,
        `marketplace_application_id.eq.${id}`
      ]);
      
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(orClauses.join(','));

      if (error) throw error;

      await Promise.all([
        fetchMessages(),
        immediateRefresh ? immediateRefresh() : refetchUnreadCount()
      ]);

      toast({
        title: "Success",
        description: "All conversations deleted"
      });
    } catch (error) {
      console.error('Error deleting all conversations:', error);
      toast({
        title: "Error",
        description: "Failed to delete all conversations",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, applicationId: string | null, virtualConvo?: VirtualConversation) => {
    e.stopPropagation();
    
    // For consolidated OpenKey conversations, delete all applications' messages
    if (!applicationId && virtualConvo?.applications) {
      // We'll handle this by deleting messages from all applications
      // Store all application IDs as a special marker
      setDeleteTargetId('__CONSOLIDATED__');
      setShowDeleteDialog(true);
      return;
    }
    
    setDeleteTargetId(applicationId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId === '__CONSOLIDATED__') {
      // Delete messages from all OpenKey applications
      const virtualConversations = getVirtualConversations();
      const openKeyConvo = virtualConversations.find(vc => vc.type === 'openkey');
      
      if (openKeyConvo?.applications) {
        await Promise.all(
          openKeyConvo.applications.map(app => deleteConversation(app.id))
        );
      }
      
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
      return;
    }
    
    if (deleteTargetId) {
      await deleteConversation(deleteTargetId);
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
    }
  };

  const confirmDeleteAll = async () => {
    await deleteAllConversations();
    setShowDeleteAllDialog(false);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, applicationId: string | null, virtualConvo?: VirtualConversation) => {
    e.stopPropagation();
    
    // For consolidated OpenKey conversations, mark all applications' messages as read
    if (!applicationId && virtualConvo?.applications) {
      const results = await Promise.all(
        virtualConvo.applications.map(app => markAllMessagesAsReadByLandlord(app.id))
      );
      
      if (results.every(r => r.success)) {
        await Promise.all([
          fetchMessages(),
          immediateRefresh ? immediateRefresh() : refetchUnreadCount()
        ]);
        
        toast({
          title: "Success",
          description: "All conversations marked as read"
        });
      }
      return;
    }
    
    // For single application conversations
    if (applicationId) {
      const result = await markAllMessagesAsReadByLandlord(applicationId);
      if (result.success) {
        await Promise.all([
          fetchMessages(),
          immediateRefresh ? immediateRefresh() : refetchUnreadCount()
        ]);
        
        toast({
          title: "Success",
          description: "Conversation marked as read"
        });
      }
    }
  };

  const handleMarkAllConversationsAsRead = async () => {
    try {
      const unreadApplicationIds = applications
        .map(app => app.id)
        .filter(appId => {
          const appMessages = getMessagesForApplication(appId);
          const unreadInfo = getUnreadMessageInfo(appMessages, userId, 'landlord');
          return unreadInfo.totalUnread > 0;
        });

      if (unreadApplicationIds.length === 0) return;

      // Build OR clause for both ID types
      const orClauses = unreadApplicationIds.flatMap(id => [
        `property_application_id.eq.${id}`,
        `marketplace_application_id.eq.${id}`
      ]);

      // Mark all unread messages across all conversations as read (tenant messages AND system messages)
      const { error } = await supabase
        .from('messages')
        .update({ read_by_landlord: true })
        .or(orClauses.join(','))
        .or(`created_by_tenant.eq.true,sender_id.eq.${SYSTEM_ADMIN_ID}`)
        .eq('read_by_landlord', false);

      if (error) throw error;

      await Promise.all([
        fetchMessages(),
        immediateRefresh ? immediateRefresh() : refetchUnreadCount()
      ]);

      toast({
        title: "Success",
        description: "All conversations marked as read"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Tenant Messages
          </CardTitle>
          <CardDescription>
            Communicate with tenants who have applied for your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tenant applications yet.</p>
            <p className="text-sm">Messages from tenants will appear here when they apply for your properties.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <Tabs defaultValue={initialAction === 'schedule' ? 'calendar' : 'messages'} className="w-full">
        <TabsList className="command-tabs grid w-full grid-cols-2">
          <TabsTrigger value="messages" className="command-tab-trigger flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="calendar" className="command-tab-trigger flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Tenant Messages
              </CardTitle>
              <CardDescription>
                Communicate with tenants about their applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations by name, property, or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Actions Row */}
              {getVirtualConversations().length > 0 && (
                <div className="flex justify-between items-center gap-2 mb-4">
                  <Button 
                    onClick={() => setShowNewMessageDialog(true)} 
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                  <div className="flex gap-2">
                    {getVirtualConversations().some(vc => {
                      const convoMessages = getMessagesForVirtualConversation(vc);
                      const unreadInfo = getUnreadMessageInfo(convoMessages, userId, 'landlord');
                      return unreadInfo.totalUnread > 0;
                    }) && (
                      <Button 
                        onClick={handleMarkAllConversationsAsRead} 
                        variant="outline" 
                        size="sm"
                      >
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Mark All Read
                      </Button>
                    )}
                    <Button 
                      onClick={() => setShowDeleteAllDialog(true)} 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete All
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {getFilteredConversations().length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">
                    {searchQuery.trim() ? 'No conversations match your search' : 'No message conversations yet'}
                  </p>
                  <p className="text-sm">
                    {searchQuery.trim() 
                      ? 'Try adjusting your search terms' 
                      : 'Conversations will appear here when you or tenants start messaging about applications.'}
                  </p>
                </div>
              ) : (
                /* Conversation Cards */
                <div className="space-y-2">
                  {getFilteredConversations().map((virtualConvo) => {
                  const convoMessages = getMessagesForVirtualConversation(virtualConvo);
                  const unreadInfo = getUnreadMessageInfo(convoMessages, userId, 'landlord');
                  const hasUnreadMessages = unreadInfo.totalUnread > 0;
                  const lastMessage = getLastMessageForVirtualConvo(virtualConvo);
                  const displayName = getVirtualConversationDisplayName(virtualConvo);

                  return (
                    <Card 
                      key={virtualConvo.id}
                      className={`cursor-pointer hover:shadow-md transition-all ${
                        hasUnreadMessages ? 'border-l-4 border-l-primary' : ''
                      }`}
                      onClick={async () => {
                        // For consolidated OpenKey, set a flag or handle differently
                        if (virtualConvo.type === 'openkey' && !virtualConvo.applicationId) {
                          // For consolidated conversations, we don't set a single applicationId
                          setSelectedApplicationId(null);
                        } else {
                          setSelectedApplicationId(virtualConvo.applicationId);
                        }
                        
                        setSelectedVirtualConversationId(virtualConvo.id);
                        setIsModalOpen(true);
                        
                        // Mark messages as read when opening - prioritize applications array to catch all related IDs
                        if (virtualConvo.applications && virtualConvo.applications.length > 0) {
                          // Mark all related applications' messages as read (includes both property_applications and property_pushes)
                          const results = await Promise.all(
                            virtualConvo.applications.map(app => markAllMessagesAsReadByLandlord(app.id))
                          );
                          
                          if (results.some(r => r.success)) {
                            await Promise.all([
                              fetchMessages(),
                              immediateRefresh ? immediateRefresh() : refetchUnreadCount()
                            ]);
                            
                            setTimeout(async () => {
                              await immediateRefresh();
                            }, 500);
                          }
                        } else if (virtualConvo.applicationId) {
                          // Fallback for single application conversations without applications array
                          const result = await markAllMessagesAsReadByLandlord(virtualConvo.applicationId);
                          if (result.success) {
                            await Promise.all([
                              fetchMessages(),
                              immediateRefresh ? immediateRefresh() : refetchUnreadCount()
                            ]);
                            
                            setTimeout(async () => {
                              await immediateRefresh();
                            }, 500);
                          }
                        }
                      }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            {/* Conversation Name and Type Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className={hasUnreadMessages ? 'font-bold' : 'font-semibold'}>
                                {displayName.name}
                                <span className="text-xs text-muted-foreground font-normal ml-2">
                                  ({displayName.subtitle})
                                </span>
                              </div>
                              {hasUnreadMessages && (
                                <>
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                  <Badge variant="default" className="text-xs">
                                    {unreadInfo.totalUnread} new
                                  </Badge>
                                </>
                              )}
                            </div>
                            
                            {/* Property Info Row - Only for tenant conversations */}
                            {virtualConvo.type !== 'openkey' && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Home className="h-3 w-3" />
                                {getPropertyDisplay(virtualConvo.application)}
                              </div>
                            )}
                            
                            {/* Status Badge Row - Only for tenant conversations */}
                            {virtualConvo.type !== 'openkey' && (
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const status = getApplicationStatusLabel(virtualConvo.application);
                                  return (
                                    <Badge variant={status.variant} className="text-xs">
                                      {status.icon} {status.label}
                                    </Badge>
                                  );
                                })()}
                                {virtualConvo.application.priority_payment_made && (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                    Priority
                                  </Badge>
                                )}
                              </div>
                            )}
                            
                            {/* Last Message Preview */}
                            {lastMessage && (
                              <>
                                <div className={`text-sm line-clamp-2 ${
                                  hasUnreadMessages ? 'font-medium text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {lastMessage.sender_id === userId 
                                    ? 'You: ' 
                                    : `${getMessageSenderDisplay(lastMessage, virtualConvo)}: `}
                                  {lastMessage.message_text}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatRelativeTime(lastMessage.created_at)}
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Mark Read Button/Icon */}
                            {hasUnreadMessages ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleMarkAsRead(e, virtualConvo.applicationId, virtualConvo)}
                                className="h-8 px-2 text-xs hover:bg-accent"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark Read
                              </Button>
                            ) : (
                              <div className="h-8 px-2 flex items-center">
                                <CheckCircle className="w-4 h-4 text-success" />
                              </div>
                            )}
                            
                            {/* Delete Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleDeleteClick(e, virtualConvo.applicationId, virtualConvo)}
                              className="h-8 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <InterviewCalendar landlordId={userId} />
        </TabsContent>
      </Tabs>

      {/* Message Thread Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setSelectedVirtualConversationId(null);
        }
      }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 pr-24">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle>
                {selectedApplicationId && selectedVirtualConversationId && selectedApplication && (() => {
                  const selectedVirtualConvo = getVirtualConversations().find(vc => vc.id === selectedVirtualConversationId);
                  const displayName = selectedVirtualConvo ? getVirtualConversationDisplayName(selectedVirtualConvo) : getConversationDisplayName(selectedApplication);
                  
                  return selectedVirtualConvo?.type === 'openkey' ? (
                    // Simplified header for OpenKey Housing
                    <div className="flex items-center gap-2">
                      <span>{displayName.name}</span>
                      <span className="text-sm text-muted-foreground font-normal">(System Messages)</span>
                    </div>
                  ) : (
                    // Full header with property info for tenant conversations
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span>{displayName.name}</span>
                        <span className="text-sm text-muted-foreground font-normal">({displayName.subtitle})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground flex-wrap">
                        <span>{getPropertyDisplay(selectedApplication)}</span>
                        {(() => {
                          const status = getApplicationStatusLabel(selectedApplication);
                          return (
                            <Badge variant={status.variant} className="text-xs">
                              {status.icon} {status.label}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {selectedApplicationId && selectedApplication && selectedVirtualConversationId && (() => {
                  const selectedVirtualConvo = getVirtualConversations().find(vc => vc.id === selectedVirtualConversationId);
                  return selectedVirtualConvo?.type !== 'openkey' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setShowScheduleModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule Appointment
                    </Button>
                  );
                })()}
                {selectedApplicationId && hasUnreadInCurrentConversation() && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3 pb-4 px-6">
              {selectedVirtualConversationId && (() => {
                // Find the selected virtual conversation
                const selectedVirtualConvo = getVirtualConversations().find(vc => vc.id === selectedVirtualConversationId);
                const messagesToShow = selectedVirtualConvo 
                  ? getMessagesForVirtualConversation(selectedVirtualConvo)
                  : getMessagesForApplication(selectedApplicationId);
                
                return messagesToShow.map((message) => {
                  const isSender = message.sender_id === userId;
                
                // Render special card for placement fee payment messages
                if (message.extension === 'placement_fee_payment') {
                  return (
                    <div key={message.id} className="mb-4">
                      <PlacementFeeMessageCard message={message} isSender={isSender} />
                    </div>
                  );
                }

                // Render special card for maintenance messages
                if (message.extension === 'maintenance') {
                  return (
                    <div key={message.id} className="mb-4">
                      <MaintenanceMessageCard message={message} isSender={isSender} userType="landlord" />
                    </div>
                  );
                }

                // Render special card for appointment messages
                if (message.extension === 'appointment') {
                  return (
                    <div key={message.id} className="mb-4">
                      <AppointmentMessageCard 
                        message={message} 
                        isSender={isSender}
                        userType="landlord"
                        onUpdate={fetchMessages}
                      />
                    </div>
                  );
                }

                // Render special card for lease notification messages
                if (message.extension === 'lease_notification' || message.extension === 'lease_sent') {
                  return (
                    <div key={message.id} className="mb-4">
                      <LeaseMessageCard 
                        message={message} 
                        isSender={isSender}
                        userType="landlord"
                        application={selectedApplication}
                        onUpdate={fetchMessages}
                      />
                    </div>
                  );
                }

                // Regular message rendering
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-3 rounded-lg ${
                        isSender
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } ${
                        message.created_by_tenant && !message.read_by_landlord 
                          ? 'ring-2 ring-primary/50' 
                          : ''
                      }`}
                    >
                       <div className="flex items-center gap-2 mb-1">
                         <User className="h-3 w-3" />
                             <span className="text-xs font-medium">
                               {(() => {
                                 const selectedVirtualConvo = getVirtualConversations().find(vc => vc.id === selectedVirtualConversationId);
                                 return getMessageSenderDisplay(message, selectedVirtualConvo);
                               })()}
                             </span>
                         {message.is_flagged && (
                           <AlertTriangle className="h-3 w-3 text-yellow-500" />
                         )}
                       </div>
                      <p className="text-sm">{message.message_text}</p>
                      {message.payload?.image_url && (
                        <div className="mt-2">
                          <img 
                            src={message.payload.image_url}
                            alt="Attachment"
                            className="rounded-md max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ maxHeight: '300px' }}
                            onClick={() => setPreviewImage(message.payload.image_url)}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs opacity-75 mt-1">
                        <span>
                          {new Date(message.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
                            ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
                            : new Date(message.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })
                          }
                        </span>
                        {message.created_by_tenant && !message.read_by_landlord && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            New
                          </Badge>
                        )}
                       </div>
                     </div>
                   </div>
                 );
               });
             })()}
               <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-6 border-t">
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button 
                onClick={sendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                className="self-end"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingMessage ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Single Conversation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image preview lightbox */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <img src={previewImage || ''} alt="Preview" className="w-full h-auto" />
        </DialogContent>
      </Dialog>

      {/* Delete All Conversations Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in all conversations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && selectedApplication && (
        <ScheduleInterviewModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          application={selectedApplication}
          landlordId={userId}
          onInterviewScheduled={() => {
            setShowScheduleModal(false);
            fetchApplications();
          }}
        />
      )}

      {/* New Message Dialog */}
      <LandlordNewMessageDialog
        open={showNewMessageDialog}
        onOpenChange={setShowNewMessageDialog}
        applications={applications}
        userId={userId}
        onMessageSent={() => {
          fetchMessages();
        }}
      />
    </div>
  );
};

export default LandlordMessages;
