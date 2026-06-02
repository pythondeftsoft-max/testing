
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { MessageSquare, Send, User, AlertTriangle, CheckCheck, Trash2, CheckCircle, ImagePlus, X, Calendar, Download } from 'lucide-react';
import { markAllMessagesAsReadByTenant, getUnreadMessageInfo } from '@/utils/messageUtils';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useMessagingQuota } from '@/hooks/useMessagingQuota';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/utils';
import MaintenanceMessageCard from './MaintenanceMessageCard';
import { useMaintenanceNotifications } from '@/hooks/useMaintenanceNotifications';
import AppointmentMessageCard from './AppointmentMessageCard';
import LeaseMessageCard from './LeaseMessageCard';
import TenantInterviewCalendar from './TenantInterviewCalendar';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import { useAppointmentReminders } from '@/hooks/useAppointmentReminders';
import { useMaintenanceAppointmentNotifications } from '@/hooks/useMaintenanceAppointmentNotifications';

// Message extensions that should NEVER be shown to tenants
// These are internal communications between OpenKey and landlords
const LANDLORD_ONLY_EXTENSIONS = ['placement_fee_payment'];

// Internal landlord events that should be hidden from tenant view
// These are operational updates (status changes, vendor assignments) that don't concern tenants
const LANDLORD_ONLY_EVENTS = ['status_update', 'vendor_assignment', 'maintenance_status_changed'];

interface TenantMessagesProps {
  userId: string;
  applications: any[];
  initialSelectedApplicationId?: string;
}

const TenantMessages = ({ userId, applications, initialSelectedApplicationId }: TenantMessagesProps) => {
  const hasAutoOpenedRef = useRef<string | null>(null);
  
  // Read message subtab from URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const messageSubtab = searchParams.get('messageSubtab') || 'messages';
  
  const [messages, setMessages] = useState([]);
  const [landlordOnlyMaintenanceIds, setLandlordOnlyMaintenanceIds] = useState<Set<string>>(new Set());
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewFullImage, setPreviewFullImage] = useState<string | null>(null);
  const [downloadingLeaseId, setDownloadingLeaseId] = useState<string | null>(null);
  const { toast } = useToast();
  const { refetch: refetchUnreadCount, immediateRefresh } = useUnreadMessageCount();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const selectedApplication = applications.find(app => app.id === selectedApplicationId);
  const { canMessage, messagesRemaining, reason, sendMessage: sendMessageWithQuota } = useMessagingQuota(userId, selectedApplication?.id);

  useEffect(() => {
    console.log('📱 Applications prop received:', applications.length, applications);
    fetchMessages();
    // Force sync header count on mount to ensure consistency
    immediateRefresh?.();
  }, [applications, applications.length]);

  // Scoped realtime subscription — refetch when ANY message change touches this tenant's threads.
  // Daily-brief / system push messages flow through the same `messages` table, so this also keeps
  // those updates ticking live without a manual refresh.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`tenant-messages:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m: any = payload.new;
          const appIds = applications.map(a => a.id);
          const touchesUs =
            (m.property_application_id && appIds.includes(m.property_application_id)) ||
            (m.marketplace_application_id && appIds.includes(m.marketplace_application_id)) ||
            (m.property_push_id && appIds.includes(m.property_push_id));
          if (touchesUs) {
            console.log('[TenantMessages] Realtime INSERT touches us, refetching');
            fetchMessages();
            immediateRefresh?.();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const m: any = payload.new;
          const appIds = applications.map(a => a.id);
          const touchesUs =
            (m.property_application_id && appIds.includes(m.property_application_id)) ||
            (m.marketplace_application_id && appIds.includes(m.marketplace_application_id)) ||
            (m.property_push_id && appIds.includes(m.property_push_id));
          if (touchesUs) {
            console.log('[TenantMessages] Realtime UPDATE touches us, refetching');
            fetchMessages();
          }
        }
      )
      .subscribe((status) => {
        console.log(`[TenantMessages] Realtime status (${userId}):`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, applications.length]);

  // Auto-select application if initialSelectedApplicationId is provided
  useEffect(() => {
    if (
      initialSelectedApplicationId && 
      applications.length > 0 && 
      hasAutoOpenedRef.current !== initialSelectedApplicationId
    ) {
      console.log('[TenantMessages] Auto-opening chat for application:', initialSelectedApplicationId);
      setSelectedApplicationId(initialSelectedApplicationId);
      setIsModalOpen(true);
      hasAutoOpenedRef.current = initialSelectedApplicationId;
    }
  }, [initialSelectedApplicationId, applications.length]);

  const scrollToBottom = (force = false) => {
    if (force && scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Only auto-scroll when a new message is added
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  // Scroll to bottom when modal opens or conversation changes
  useEffect(() => {
    if (isModalOpen && selectedApplicationId && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
  }, [isModalOpen, selectedApplicationId, messages.length]);

  // Reset auto-open tracking when modal is closed manually
  useEffect(() => {
    if (!isModalOpen) {
      hasAutoOpenedRef.current = null;
    }
  }, [isModalOpen]);

  // Setup maintenance notifications
  useMaintenanceNotifications({
    userId,
    onNavigateToMessages: (applicationId: string) => {
      setSelectedApplicationId(applicationId);
      setIsModalOpen(true);
    },
  });

  // Setup appointment notifications
  const [activeTab, setActiveTab] = useState(messageSubtab);
  
  useAppointmentNotifications({
    userId,
    userType: 'tenant',
    onAppointmentChange: () => {
      // Switch to calendar tab when appointment notification received
      setActiveTab('calendar');
    }
  });

  // Setup appointment reminders
  useAppointmentReminders({
    userId,
    userType: 'tenant'
  });

  // Setup maintenance appointment notifications
  useMaintenanceAppointmentNotifications({
    userId,
    onAppointmentScheduled: () => {
      setActiveTab('calendar');
    }
  });


  const fetchMessages = async () => {
    console.log('📱 DEBUG: fetchMessages called');
    console.log('📱 DEBUG: Applications length:', applications.length);
    
    if (applications.length === 0) {
      console.log('📱 DEBUG: No applications, setting loading to false');
      setLoading(false);
      return;
    }

    try {
      const applicationIds = applications.map(app => app.id);
      
      // Extract ALL push IDs from applications (including linked ones marked as _isLinked)
      // This is critical because linked pushes still have messages we need to fetch
      const allPushIds = applications
        .filter(app => app._source === 'push')
        .map(app => app.id);
      
      // DEBUG: Log all applications with their sources and linked status
      console.log('📱 DEBUG: ========== FETCH MESSAGES START ==========');
      console.log('📱 DEBUG: Total applications:', applications.length);
      console.log('📱 DEBUG: Application IDs:', applicationIds);
      console.log('📱 DEBUG: All push IDs (including linked):', allPushIds);
      console.log('📱 DEBUG: Applications breakdown:', applications.map(app => ({
        id: app.id,
        source: app._source,
        isLinked: app._isLinked,
        propertyId: app.property_id,
        status: app.status
      })));
      
      // Fetch messages from marketplace, property applications, AND property pushes
      const [marketplaceResult, propertyResult, pushResult] = await Promise.all([
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
          .in('marketplace_application_id', applicationIds)
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
          .in('property_application_id', applicationIds)
          .order('created_at', { ascending: true }),
        
        // Use allPushIds instead of applicationIds to ensure we fetch messages
        // for pushes that are marked as _isLinked (consolidated into another conversation)
        allPushIds.length > 0 ? supabase
          .from('messages')
          .select(`
            *,
            profiles!messages_sender_id_fkey (
              first_name,
              last_name,
              user_type
            )
          `)
          .in('property_push_id', allPushIds)
          .order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null })
      ]);

      // DEBUG: Log query results
      console.log('📱 DEBUG: ========== QUERY RESULTS ==========');
      console.log('📱 DEBUG: Marketplace messages count:', marketplaceResult.data?.length || 0);
      console.log('📱 DEBUG: Property messages count:', propertyResult.data?.length || 0);
      console.log('📱 DEBUG: Push messages count:', pushResult.data?.length || 0);
      console.log('📱 DEBUG: Push messages data:', pushResult.data);
      console.log('📱 DEBUG: Push query error:', pushResult.error);

      if (marketplaceResult.error) {
        console.error('📱 DEBUG: Error in marketplace messages query:', marketplaceResult.error);
        throw marketplaceResult.error;
      }
      if (propertyResult.error) {
        console.error('📱 DEBUG: Error in property messages query:', propertyResult.error);
        throw propertyResult.error;
      }
      if (pushResult.error) {
        console.error('📱 DEBUG: Error in push messages query:', pushResult.error);
        throw pushResult.error;
      }

      // Combine and deduplicate messages
      const allMessages = [
        ...(marketplaceResult.data || []),
        ...(propertyResult.data || []),
        ...(pushResult.data || [])
      ];

      console.log('📱 DEBUG: Total combined messages before dedup:', allMessages.length);

      // Remove duplicates by message ID and sort by created_at
      const allMessagesDeduped = Array.from(
        new Map(allMessages.map(m => [m.id, m])).values()
      ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      console.log('📱 DEBUG: Total messages after dedup:', allMessagesDeduped.length);
      console.log('📱 DEBUG: ========== FETCH MESSAGES END ==========');

      // Filter out landlord-only messages (placement fees, etc.)
      const data = allMessagesDeduped.filter(
        msg => !LANDLORD_ONLY_EXTENSIONS.includes(msg.extension)
      );

      // Collect maintenance request IDs from messages to check for landlord-created requests
      const maintenanceRequestIds = data
        .filter(msg => msg.extension === 'maintenance' && (msg.payload as any)?.maintenance_request_id)
        .map(msg => (msg.payload as any).maintenance_request_id);

      if (maintenanceRequestIds.length > 0) {
        const { data: maintenanceRequests } = await supabase
          .from('maintenance_requests')
          .select('id, tenant_id')
          .in('id', maintenanceRequestIds);
        
        // Track which maintenance requests are landlord-created (no tenant_id)
        const landlordOnlyIds = new Set(
          (maintenanceRequests || [])
            .filter(req => req.tenant_id === null)
            .map(req => req.id)
        );
        setLandlordOnlyMaintenanceIds(landlordOnlyIds);
      }

      console.log('📱 DEBUG: Fetched messages count (after filtering):', data?.length || 0);
      console.log('📱 DEBUG: Sample messages (first 3):', data?.slice(0, 3));
      
      // Log message read status for debugging
      if (data) {
        const unreadLandlordMessages = data.filter(m => !m.created_by_tenant && !m.read_by_tenant);
        console.log('📱 DEBUG: Unread landlord messages after fetch:', unreadLandlordMessages.length);
        if (unreadLandlordMessages.length > 0) {
          console.log('📱 DEBUG: Unread messages details:', unreadLandlordMessages.map(m => ({
            id: m.id,
            property_application_id: m.property_application_id,
            read_by_tenant: m.read_by_tenant,
            created_by_tenant: m.created_by_tenant,
            created_at: m.created_at
          })));
        }
      }

      setMessages(data || []);
      
      // Scroll to bottom after loading messages if modal is open
      if (isModalOpen && data && data.length > 0) {
        setTimeout(() => {
          scrollToBottom(true);
        }, 150);
      }
    } catch (error) {
      console.error('📱 DEBUG: Exception in fetchMessages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedApplicationId) return;

    const messageText = newMessage.trim() || (selectedImage ? '📎 Image attachment' : '');
    const tempId = `temp-${Date.now()}`;
    
    // Determine which application ID field to use based on source
    const isPush = selectedApplication?._source === 'push';
    const isProperty = selectedApplication?._source === 'property';
    
    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      marketplace_application_id: (!isPush && !isProperty) ? selectedApplicationId : null,
      property_application_id: isProperty ? selectedApplicationId : null,
      property_push_id: isPush ? selectedApplicationId : null,
      sender_id: userId,
      message_text: messageText,
      created_at: new Date().toISOString(),
      created_by_tenant: true,
      read_by_tenant: true,
      read_by_landlord: false,
      is_flagged: false,
      payload: null,
      profiles: null,
      _sending: true // Flag to show "sending" indicator
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Clear input immediately for better UX
    const originalMessage = newMessage;
    const originalImage = selectedImage;
    const originalPreview = imagePreview;
    setNewMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    
    // Auto-scroll to bottom immediately
    scrollToBottom(true);

    setSendingMessage(true);
    try {
      let imageUrl = null;

      // Upload image if one is selected
      if (originalImage) {
        const fileName = `${userId}/${Date.now()}-${originalImage.name}`;
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, originalImage);

        if (uploadError) {
          // Rollback optimistic message
          setMessages(prev => prev.filter(m => m.id !== tempId));
          setNewMessage(originalMessage);
          setSelectedImage(originalImage);
          setImagePreview(originalPreview);
          
          toast({
            title: "Upload Failed",
            description: "Failed to upload image. Please try again.",
            variant: "destructive",
          });
          setSendingMessage(false);
          return;
        }

        const { data: signedData, error: signedErr } = await supabase.storage
          .from('message-attachments')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

        if (signedErr || !signedData?.signedUrl) {
          setMessages(prev => prev.filter(m => m.id !== tempId));
          setNewMessage(originalMessage);
          setSelectedImage(originalImage);
          setImagePreview(originalPreview);
          toast({
            title: "Upload Failed",
            description: "Failed to generate image link. Please try again.",
            variant: "destructive",
          });
          setSendingMessage(false);
          return;
        }

        imageUrl = signedData.signedUrl;
      }

      // Send message with optional image payload
      const payload = imageUrl ? { image_url: imageUrl } : undefined;
      
      const result = await sendMessageWithQuota(messageText, payload);
      
      if (!result.success) {
        // Rollback optimistic message
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(originalMessage);
        setSelectedImage(originalImage);
        setImagePreview(originalPreview);
        
        toast({
          title: "Cannot Send Message",
          description: result.error || "Failed to send message",
          variant: "destructive",
        });
        setSendingMessage(false);
        return;
      }

      // Replace optimistic message with real one & refresh in parallel
      Promise.all([
        fetchMessages(),
        immediateRefresh()
      ]).then(() => {
        scrollToBottom(true);
      });

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Rollback optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(originalMessage);
      setSelectedImage(originalImage);
      setImagePreview(originalPreview);
      
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Build mapping from marketplace_application_id to linked property_application_ids
  // This allows us to show messages from property_applications in the marketplace conversation
  const linkedPropertyAppIds = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    applications.forEach(app => {
      // If this app has a marketplace_application_id reference, it's a property_application linked to a marketplace one
      if (app.marketplace_application_id) {
        const marketplaceId = app.marketplace_application_id;
        if (!mapping[marketplaceId]) mapping[marketplaceId] = [];
        mapping[marketplaceId].push(app.id);
      }
    });
    console.log('📱 DEBUG: Built linkedPropertyAppIds mapping:', mapping);
    return mapping;
  }, [applications]);

  // Build mapping of property_id to all application IDs (including pushes) for that property
  // This allows consolidating all messages for the same property into one conversation
  const appIdsByPropertyId = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    applications.forEach(app => {
      const propertyId = app.property_id || app.properties?.id;
      if (propertyId) {
        if (!mapping[propertyId]) mapping[propertyId] = [];
        mapping[propertyId].push(app.id);
      }
    });
    console.log('📱 DEBUG: Built appIdsByPropertyId mapping:', mapping);
    return mapping;
  }, [applications]);

  const getMessagesForApplication = (applicationId: string) => {
    // Get linked property application IDs for this marketplace application
    const linkedIds = linkedPropertyAppIds[applicationId] || [];
    
    // Also get ALL application IDs (including pushes) for the same property
    const selectedApp = applications.find(a => a.id === applicationId);
    const propertyId = selectedApp?.property_id || selectedApp?.properties?.id;
    const allPropertyAppIds = propertyId ? (appIdsByPropertyId[propertyId] || []) : [];
    
    // Combine all IDs: the selected app, linked marketplace→property apps, and all apps for same property
    const allRelevantIds = [...new Set([applicationId, ...linkedIds, ...allPropertyAppIds])];
    
    console.log('📱 DEBUG: getMessagesForApplication', { applicationId, linkedIds, allPropertyAppIds, allRelevantIds });
    
    return messages.filter(msg => {
      const matchesMarketplace = msg.marketplace_application_id && allRelevantIds.includes(msg.marketplace_application_id);
      const matchesProperty = msg.property_application_id && allRelevantIds.includes(msg.property_application_id);
      const matchesPush = msg.property_push_id && allRelevantIds.includes(msg.property_push_id);
      const isNotLandlordOnlyExtension = !LANDLORD_ONLY_EXTENSIONS.includes(msg.extension);
      const isNotLandlordOnlyEvent = !LANDLORD_ONLY_EVENTS.includes(msg.event);
      
      // Filter out maintenance messages for landlord-created requests (no tenant_id)
      const msgPayload = msg.payload as any;
      if (msg.extension === 'maintenance' && msgPayload?.maintenance_request_id) {
        if (landlordOnlyMaintenanceIds.has(msgPayload.maintenance_request_id)) {
          return false;
        }
      }
      
      return (matchesMarketplace || matchesProperty || matchesPush) && isNotLandlordOnlyExtension && isNotLandlordOnlyEvent;
    });
  };

  const getLastMessage = (applicationId: string) => {
    const appMessages = getMessagesForApplication(applicationId);
    return appMessages[appMessages.length - 1];
  };

  const getConversationName = (applicationId: string) => {
    const appMessages = getMessagesForApplication(applicationId);
    const landlordMessage = appMessages.find(msg => msg.sender_id !== userId);
    if (landlordMessage?.profiles) {
      const firstName = landlordMessage.profiles.first_name || '';
      const lastName = landlordMessage.profiles.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'Landlord';
    }
    return 'Landlord';
  };

  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  // Determine if this is their current home or an application
  const getHousingStatusLabel = (application: any) => {
    // Handle push-based matches
    if (application._source === 'push') {
      if (application.status === 'primary_applicant') {
        return {
          label: 'Primary Applicant',
          variant: 'success' as const,
          icon: '⭐'
        };
      } else if (application.status === 'landlord_review') {
        return {
          label: 'Landlord Review',
          variant: 'default' as const,
          icon: '⏳'
        };
      } else if (application.status === 'push_sent' || application.status === 'interested') {
        return {
          label: 'Match',
          variant: 'default' as const,
          icon: '🔗'
        };
      } else if (application.status === 'denied') {
        return {
          label: 'Declined',
          variant: 'danger' as const,
          icon: '❌'
        };
      }
      return {
        label: 'Match',
        variant: 'neutral' as const,
        icon: '🔗'
      };
    }
    
    // Check if tenant is housed (payment completed)
    if (application.status === 'housed' || application.lifecycle_stage === 'current_tenant') {
      return {
        label: 'My Property',
        variant: 'success' as const,
        icon: '🏠'
      };
    } else if (application.status === 'lease_signed') {
      return {
        label: 'Lease Signed',
        variant: 'default' as const,
        icon: '📝'
      };
    } else if (application.status === 'submitted' || application.status === 'pending') {
      return {
        label: 'Application',
        variant: 'default' as const,
        icon: '📋'
      };
    } else if (application.status === 'rejected' || application.status === 'withdrawn') {
      return {
        label: 'Application Declined',
        variant: 'danger' as const,
        icon: '❌'
      };
    }
    return {
      label: 'Application',
      variant: 'neutral' as const,
      icon: '📋'
    };
  };

  // Get property display string with unit info
  const getPropertyDisplay = (application: any) => {
    const property = application.properties;
    if (!property) return 'Property address not available';
    
    const address = property.address || 'Address not available';
    
    // Use unit_number (friendly) instead of unit_id (UUID)
    const unitNumber = application.property_units?.unit_number || application.unit_number;
    const unit = unitNumber ? ` - Unit ${unitNumber}` : '';
    
    const bedBath = property.bedrooms && property.bathrooms 
      ? ` • ${property.bedrooms}bd/${property.bathrooms}ba` 
      : '';
    
    return `${address}${unit}${bedBath}`;
  };

  // Enhanced conversation name with better role detection
  // Only unmask landlord identity after housing fee is paid (housed_and_paid)
  const getEnhancedConversationName = (applicationId: string, application: any) => {
    // Only unmask landlord identity after housing fee is paid
    const isHousedAndPaid = application.housing_status === 'housed_and_paid';
    
    // If NOT housed_and_paid, show property address instead of landlord name
    if (!isHousedAndPaid) {
      const propertyName = getPropertyDisplay(application);
      return {
        name: propertyName || 'Property',
        role: ''
      };
    }
    
    // After housing fee is paid, show landlord details
    const appMessages = getMessagesForApplication(applicationId);
    
    // Try to get name from messages first (most accurate)
    const landlordMessage = appMessages.find(msg => msg.sender_id !== userId);
    if (landlordMessage?.profiles) {
      const firstName = landlordMessage.profiles.first_name || '';
      const lastName = landlordMessage.profiles.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      if (fullName) {
        // Determine if it's property manager or landlord
        const isPropertyManager = application.properties?.property_manager_id === landlordMessage.sender_id;
        return {
          name: fullName,
          role: isPropertyManager ? 'Property Manager' : 'Landlord'
        };
      }
    }
    
    // Fallback: Try property manager first, then owner
    const property = application.properties;
    if (property) {
      // Check if there's a property manager
      if (property.property_managers) {
        const pm = property.property_managers;
        const pmName = `${pm.first_name || ''} ${pm.last_name || ''}`.trim();
        if (pmName) {
          return {
            name: pmName,
            role: 'Property Manager'
          };
        }
      }
      
      // Check if there's an owner
      if (property.owners) {
        const owner = property.owners;
        const ownerName = `${owner.first_name || ''} ${owner.last_name || ''}`.trim();
        if (ownerName) {
          return {
            name: ownerName,
            role: 'Landlord'
          };
        }
      }
    }
    
    // Final fallback
    return {
      name: 'Landlord',
      role: 'Landlord'
    };
  };

  const hasUnreadInCurrentConversation = () => {
    if (!selectedApplicationId) return false;
    const appMessages = getMessagesForApplication(selectedApplicationId);
    return appMessages.some(msg => !msg.created_by_tenant && !msg.read_by_tenant);
  };

  const handleMarkAllAsRead = async () => {
    if (!selectedApplicationId) return;
    
    const selectedApp = applications.find(a => a.id === selectedApplicationId);
    const propertyId = selectedApp?.property_id || selectedApp?.properties?.id;
    const result = await markAllMessagesAsReadByTenant(selectedApplicationId, propertyId);
    if (result.success) {
      await Promise.all([
        fetchMessages(),
        immediateRefresh ? immediateRefresh() : refetchUnreadCount()
      ]);
      
      if (result.markedCount > 0) {
        toast({
          title: "Success",
          description: `${result.markedCount} message(s) marked as read`
        });
      }
    } else {
      console.error('❌ Failed to mark messages as read');
      toast({
        title: "Error",
        description: "Failed to mark messages as read. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteConversation = async (applicationId: string) => {
    try {
      // Delete all messages for this application (marketplace, property, and push)
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`marketplace_application_id.eq.${applicationId},property_application_id.eq.${applicationId},property_push_id.eq.${applicationId}`);

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
      // Filter out linked apps for deletion
      const applicationIds = applications.filter(app => !app._isLinked).map(app => app.id);
      
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`marketplace_application_id.in.(${applicationIds.join(',')}),property_application_id.in.(${applicationIds.join(',')}),property_push_id.in.(${applicationIds.join(',')})`)

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

  const handleDeleteClick = (e: React.MouseEvent, applicationId: string) => {
    e.stopPropagation();
    setDeleteTargetId(applicationId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
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

  const handleMarkAsRead = async (e: React.MouseEvent, applicationId: string) => {
    e.stopPropagation();
    
    const app = applications.find(a => a.id === applicationId);
    const propertyId = app?.property_id || app?.properties?.id;
    const result = await markAllMessagesAsReadByTenant(applicationId, propertyId);
    if (result.success) {
      await Promise.all([
        fetchMessages(),
        immediateRefresh ? immediateRefresh() : refetchUnreadCount()
      ]);
      
      if (result.markedCount > 0) {
        toast({
          title: "Success",
          description: "Conversation marked as read"
        });
      }
    } else {
      console.error('❌ Failed to mark conversation as read');
      toast({
        title: "Error",
        description: "Failed to mark as read. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllConversationsAsRead = async () => {
    try {
      const unreadApplicationIds = applications
        .filter(app => !app._isLinked)
        .map(app => app.id)
        .filter(appId => {
          const appMessages = getMessagesForApplication(appId);
          const unreadInfo = getUnreadMessageInfo(appMessages, userId, 'tenant');
          return unreadInfo.totalUnread > 0;
        });

      if (unreadApplicationIds.length === 0) return;

      // Mark all unread messages across all conversations as read
      const { error } = await supabase
        .from('messages')
        .update({ read_by_tenant: true })
        .or(`marketplace_application_id.in.(${unreadApplicationIds.join(',')}),property_application_id.in.(${unreadApplicationIds.join(',')})`)
        .eq('created_by_tenant', false)
        .eq('read_by_tenant', false);

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
            Messages
          </CardTitle>
          <CardDescription>
            Communicate with landlords about your applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet.</p>
            <p className="text-sm">Messages with landlords will appear here after you submit screening requests.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </CardTitle>
        <CardDescription>
          Chat with your landlords and property managers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-6">
            {/* Bulk Actions */}
            {applications.filter(app => !app._isLinked).length > 0 && (
              <div className="flex justify-end gap-2 mb-4">
                {applications.filter(app => !app._isLinked).some(app => {
                  const appMessages = getMessagesForApplication(app.id);
                  const unreadInfo = getUnreadMessageInfo(appMessages, userId, 'tenant');
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
            )}
            <div className="space-y-2">
              {(() => {
                console.log('🔍 [TenantMessages] ========== RENDER CONVERSATIONS START ==========');
                console.log('🔍 [TenantMessages] Total applications:', applications.length);
                console.log('🔍 [TenantMessages] Total messages loaded:', messages.length);
                
                const applicationsWithMessages = applications.filter(application => {
                  // Skip linked property apps (they're for message mapping only, not display)
                  if (application._isLinked) {
                    console.log('🔍 [TenantMessages] Skipping linked app:', application.id, application._source);
                    return false;
                  }
                  // Only show applications that have at least one message
                  const appMessages = getMessagesForApplication(application.id);
                  console.log('🔍 [TenantMessages] App', application.id, '(', application._source, ') has', appMessages.length, 'messages');
                  return appMessages.length > 0;
                });

                console.log('🔍 [TenantMessages] Applications with messages:', applicationsWithMessages.length);
                console.log('🔍 [TenantMessages] ========== RENDER CONVERSATIONS END ==========');

                if (applicationsWithMessages.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Messages Yet</h3>
                      <p className="text-muted-foreground">
                        Conversations will appear here once a landlord or property manager messages you about your applications
                      </p>
                    </div>
                  );
                }

                return applicationsWithMessages.map((application) => {
                const appMessages = getMessagesForApplication(application.id);
                const unreadInfo = getUnreadMessageInfo(appMessages, userId, 'tenant');
                const hasUnreadMessages = unreadInfo.totalUnread > 0;
                const lastMessage = getLastMessage(application.id);
                const conversationName = getConversationName(application.id);

                return (
                  <Card 
                    key={application.id}
                    className={`cursor-pointer hover:shadow-md transition-all ${
                      hasUnreadMessages ? 'border-l-4 border-l-primary' : ''
                    }`}
                    onClick={async () => {
                      console.log('📱 DEBUG: Opening conversation:', application.id);
                      setSelectedApplicationId(application.id);
                      setIsModalOpen(true);
                      
                      // Mark messages as read when opening
                      const propertyId = application.property_id || application.properties?.id;
                      const result = await markAllMessagesAsReadByTenant(application.id, propertyId);
                      if (result.success) {
                        await Promise.all([
                          fetchMessages(),
                          immediateRefresh ? immediateRefresh() : refetchUnreadCount()
                        ]);
                        
                        setTimeout(async () => {
                          await immediateRefresh();
                        }, 500);
                      }
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Name and Role Row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className={hasUnreadMessages ? 'font-bold' : 'font-semibold'}>
                              {(() => {
                                const { name, role } = getEnhancedConversationName(application.id, application);
                                return (
                                  <>
                                    {name}
                                    <span className="text-xs text-muted-foreground font-normal ml-2">
                                      ({role})
                                    </span>
                                  </>
                                );
                              })()}
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
                          
                          {/* Property Info Row */}
                          <div className="text-sm text-muted-foreground">
                            {getPropertyDisplay(application)}
                          </div>
                          
                          {/* Housing Status Badge Row */}
                          <div className="flex items-center gap-2">
                            {(() => {
                              const status = getHousingStatusLabel(application);
                              return (
                                <Badge variant={status.variant} className="text-xs">
                                  {status.icon} {status.label}
                                </Badge>
                              );
                            })()}
                          </div>
                          
                          {/* Last Message Preview */}
                          {lastMessage && (
                            <>
                              <div className={`text-sm line-clamp-2 ${
                                hasUnreadMessages ? 'font-medium text-foreground' : 'text-muted-foreground'
                              }`}>
                                {lastMessage.sender_id === userId 
                                  ? 'You: ' 
                                  : lastMessage.profiles?.user_type === 'admin'
                                    ? 'OpenKey Housing: '
                                    : `${getEnhancedConversationName(application.id, application).name}: `}
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
                              onClick={(e) => handleMarkAsRead(e, application.id)}
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
                            onClick={(e) => handleDeleteClick(e, application.id)}
                            className="h-8 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
                });
              })()}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <TenantInterviewCalendar tenantId={userId} />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Message Thread Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>
                {selectedApplicationId && selectedApplication && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span>{(() => {
                        const { name, role } = getEnhancedConversationName(selectedApplicationId, selectedApplication);
                        return (
                          <>
                            {name}
                            <span className="text-sm text-muted-foreground font-normal ml-2">({role})</span>
                          </>
                        );
                      })()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground flex-wrap">
                      <span>{getPropertyDisplay(selectedApplication)}</span>
                      {(() => {
                        const status = getHousingStatusLabel(selectedApplication);
                        return (
                          <Badge variant={status.variant} className="text-xs">
                            {status.icon} {status.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0" viewportRef={scrollViewportRef}>
            <div className="space-y-3 pb-4 px-6">
              {selectedApplicationId && getMessagesForApplication(selectedApplicationId).map((message) => {
                const isSender = message.sender_id === userId;
                
                // Render special card for maintenance messages
                if (message.extension === 'maintenance') {
                  return (
                    <div key={message.id} className="mb-4">
                      <MaintenanceMessageCard message={message} isSender={isSender} userType="tenant" />
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
                        userType="tenant"
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
                        userType="tenant"
                        application={selectedApplication}
                        onUpdate={fetchMessages}
                      />
                    </div>
                  );
                }

                // Render special card for lease_signed messages (uploaded lease documents)
                if (message.extension === 'lease_signed' && message.payload?.attachment_url) {
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      <div className="max-w-[70%]">
                        <Card className="border-l-4 border-l-success">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-3 w-3" />
                              <span className="text-xs font-medium">
                                {isSender ? 'You' : 'Landlord'}
                              </span>
                            </div>
                            <p className="text-sm mb-3">{message.message_text}</p>
                            <Button 
                              variant="default" 
                              size="sm"
                              disabled={downloadingLeaseId === message.payload.lease_document_id}
                              onClick={async () => {
                                const leaseId = message.payload.lease_document_id;
                                if (downloadingLeaseId === leaseId) return;
                                
                                setDownloadingLeaseId(leaseId);
                                const loadingToast = sonnerToast.loading('Downloading lease document...');
                                
                                try {
                                  const filePath = message.payload.lease_document_id;
                                  if (!filePath) {
                                    throw new Error('No document path found');
                                  }
                                  
                                  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                                    .from('property-documents')
                                    .createSignedUrl(filePath, 300);
                                  
                                  if (signedUrlError || !signedUrlData?.signedUrl) {
                                    throw new Error('Failed to generate download link');
                                  }
                                  
                                  // Add timeout to fetch
                                  const controller = new AbortController();
                                  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
                                  
                                  const response = await fetch(signedUrlData.signedUrl, { signal: controller.signal });
                                  clearTimeout(timeoutId);
                                  
                                  if (!response.ok) throw new Error('Download failed');
                                  const blob = await response.blob();
                                  
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = message.payload.attachment_name || 'Lease Document.pdf';
                                  document.body.appendChild(link);
                                  link.click();
                                  
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  
                                  sonnerToast.dismiss(loadingToast);
                                  sonnerToast.success('Lease downloaded successfully');
                                } catch (error: any) {
                                  sonnerToast.dismiss(loadingToast); // Always dismiss loading toast
                                  console.error('Download error:', error);
                                  
                                  if (error.name === 'AbortError') {
                                    sonnerToast.error('Download timed out. Please try again.');
                                  } else {
                                    sonnerToast.error('Failed to download document');
                                  }
                                } finally {
                                  setDownloadingLeaseId(null);
                                }
                              }}
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download {message.payload.attachment_name || 'Lease Document'}
                            </Button>
                            <div className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
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
                        !message.created_by_tenant && !message.read_by_tenant 
                          ? 'ring-2 ring-primary/50' 
                          : ''
                      } ${
                        message._sending ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {isSender ? 'You' : 
                           message.profiles?.user_type === 'admin' 
                             ? 'OpenKey Housing' 
                             : `${message.profiles?.first_name || 'Landlord'} ${message.profiles?.last_name || ''}`}
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
                            onClick={() => setPreviewFullImage(message.payload.image_url)}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs opacity-75 mt-1">
                        <span>
                          {message._sending ? 'Sending...' : (
                            new Date(message.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
                              ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
                              : new Date(message.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })
                          )}
                        </span>
                        {!message.created_by_tenant && !message.read_by_tenant && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedApplicationId && getMessagesForApplication(selectedApplicationId).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start a conversation!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <ScrollBar className="w-3" />
          </ScrollArea>

          {/* Fixed Message Input at Bottom */}
          <div className="border-t p-6 pt-4 space-y-2">
            {!canMessage && (
              <div className="p-2 bg-muted rounded text-sm text-muted-foreground">
                {reason}
              </div>
            )}
            {canMessage && messagesRemaining < 4 && (
              <div className="p-2 bg-muted rounded text-sm">
                💬 {messagesRemaining} message{messagesRemaining !== 1 ? 's' : ''} remaining before landlord response needed
              </div>
            )}
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-32 rounded-md border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <Textarea
              placeholder={canMessage ? "Type your message... (Max 2000 characters)" : "Wait for landlord response..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={!canMessage}
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  className="hidden"
                  disabled={!canMessage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validate file type
                      if (!file.type.startsWith('image/')) {
                        toast({
                          title: "Invalid File",
                          description: "Please select an image file.",
                          variant: "destructive",
                        });
                        return;
                      }
                      // Validate file size (5MB max)
                      if (file.size > 5 * 1024 * 1024) {
                        toast({
                          title: "File Too Large",
                          description: "Image must be less than 5MB.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setSelectedImage(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMessage}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <div className="text-xs text-muted-foreground">
                  {newMessage.length}/2000 characters
                </div>
              </div>
              <Button
                onClick={sendMessage}
                disabled={(!newMessage.trim() && !selectedImage) || sendingMessage || !canMessage}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingMessage ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all message conversations? This action cannot be undone and will permanently remove all messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteAll} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image preview lightbox */}
      <Dialog open={!!previewFullImage} onOpenChange={() => setPreviewFullImage(null)}>
        <DialogContent className="max-w-4xl">
          <img src={previewFullImage || ''} alt="Preview" className="w-full h-auto" />
        </DialogContent>
      </Dialog>

      {/* Delete Individual Conversation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and will permanently remove all messages in this thread.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default TenantMessages;
