import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Wrench, Zap, Wind, Package, Hammer, AlertCircle, Image as ImageIcon, Clock, User, Phone, Mail, DollarSign } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MaintenanceRequestDetailModalProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  userType?: 'tenant' | 'landlord' | 'admin';
}

const MaintenanceRequestDetailModal = ({ requestId, isOpen, onClose, userType = 'landlord' }: MaintenanceRequestDetailModalProps) => {
  const [selectedAttachment, setSelectedAttachment] = React.useState<any>(null);
  
  const { data: request, isLoading } = useQuery({
    queryKey: ['maintenance-request-detail', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      
      // First, try to fetch from maintenance_requests
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties (
            address,
            owner_id,
            owner:profiles!properties_owner_id_fkey(
              first_name,
              last_name,
              email,
              phone,
              user_type
            )
          ),
          property_units (unit_number),
          maintenance_documents (
            id,
            file_name,
            file_path,
            file_type,
            document_type,
            created_at
          )
        `)
        .eq('id', requestId)
        .maybeSingle();

      // If found in maintenance_requests, return it
      if (maintenanceData) {
        return { ...maintenanceData, _source: 'maintenance_request' };
      }

      // If not found, try fetching from notifications
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (notificationError) throw notificationError;
      
      // If notification found and has related_entity_id, fetch the actual maintenance request
      if (notificationData?.related_entity_id) {
        const { data: relatedRequest, error: relatedError } = await supabase
          .from('maintenance_requests')
          .select(`
            *,
            properties (
              address,
              owner_id,
              owner:profiles!properties_owner_id_fkey(
                first_name,
                last_name,
                email,
                phone,
                user_type
              )
            ),
            property_units (unit_number)
          `)
          .eq('id', notificationData.related_entity_id)
          .maybeSingle();

        if (relatedRequest) {
          return { ...relatedRequest, _source: 'maintenance_request' };
        }
      }

      // Fallback: return notification data if no maintenance request found
      if (notificationData) {
        return { 
          ...notificationData, 
          _source: 'notification',
          // Map notification fields to expected format for display
          title: notificationData.title,
          description: notificationData.description || 'No description available',
          status: notificationData.type?.includes('completed') ? 'completed' : 
                  notificationData.type?.includes('progress') ? 'in_progress' : 'pending',
          category: notificationData.title?.toLowerCase().includes('plumbing') ? 'plumbing' :
                   notificationData.title?.toLowerCase().includes('electrical') ? 'electrical' :
                   notificationData.title?.toLowerCase().includes('hvac') ? 'hvac' :
                   notificationData.title?.toLowerCase().includes('appliance') ? 'appliance' : 'general',
          submitted_date: notificationData.created_at,
        };
      }

      return null;
    },
    enabled: !!requestId && isOpen,
  });

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'plumbing':
        return <Wrench className="h-5 w-5 text-blue-600" />;
      case 'electrical':
        return <Zap className="h-5 w-5 text-yellow-600" />;
      case 'hvac':
        return <Wind className="h-5 w-5 text-cyan-600" />;
      case 'appliance':
      case 'appliance_repair':
        return <Package className="h-5 w-5 text-purple-600" />;
      default:
        return <Hammer className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    if (!category) return 'General';
    return category.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', variant: 'warning' as const, color: 'text-orange-600' };
      case 'in_progress':
        return { text: 'In Progress', variant: 'default' as const, color: 'text-blue-600' };
      case 'completed':
        return { text: 'Completed', variant: 'success' as const, color: 'text-green-600' };
      default:
        return { text: status, variant: 'secondary' as const, color: 'text-muted-foreground' };
    }
  };

  const parseDescription = (desc: string) => {
    if (!desc) return { cleanDesc: '', preferredTime: null, contact: null, legacyAttachments: [] };
    
    // Extract preferred time
    const timeMatch = desc.match(/\*\*Preferred Repair Time:\*\* (.+?)(?:\n|$)/);
    const preferredTime = timeMatch ? timeMatch[1] : null;
    
    // Extract contact info
    const contactMatch = desc.match(/\*\*Contact:\*\* (.+?) \| (.+?) \| (.+?)(?:\n|$)/);
    const contact = contactMatch ? {
      name: contactMatch[1],
      email: contactMatch[2],
      phone: contactMatch[3]
    } : null;
    
    // Extract legacy attachments from description
    const legacyAttachments: any[] = [];
    const attachmentMatch = desc.match(/\*\*Attachments:\*\*\n([\s\S]*?)(?=\n\n|$)/);
    if (attachmentMatch) {
      const urlPattern = /https:\/\/[^\s)]+/g;
      const urls = attachmentMatch[1].match(urlPattern) || [];
      urls.forEach((url, index) => {
        const fileName = url.split('/').pop() || `attachment-${index + 1}`;
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
        legacyAttachments.push({
          url,
          name: decodeURIComponent(fileName),
          isImage,
          type: isImage ? 'image/jpeg' : 'application/octet-stream'
        });
      });
    }
    
    // Remove the appended sections to get clean description
    let cleanDesc = desc
      .replace(/\n\n\*\*Preferred Repair Time:\*\*.*?(?=\n|$)/g, '')
      .replace(/\n\n\*\*Contact:\*\*.*?$/g, '')
      .replace(/\n\n\*\*Attachments:\*\*[\s\S]*?(?=\n\n|$)/g, '')
      .trim();
    
    return { cleanDesc, preferredTime, contact, legacyAttachments };
  };

  if (!request) return null;

  const isNotificationOnly = (request as any)._source === 'notification';
  const statusInfo = getStatusDisplay(request.status);
  
  const { cleanDesc, preferredTime, contact, legacyAttachments } = parseDescription(request.description || '');
  
  // Get attachments from maintenance_documents table
  const documents = (request as any).maintenance_documents || [];
  const newAttachments = documents.map((doc: any) => {
    const { data } = supabase.storage
      .from('maintenance-documents')
      .getPublicUrl(doc.file_path);
    return {
      url: data.publicUrl,
      name: doc.file_name,
      type: doc.file_type,
      isImage: doc.file_type?.startsWith('image/')
    };
  });
  
  // Merge legacy attachments from description with new attachments from database
  const attachments = [...newAttachments, ...legacyAttachments];

  // Get owner info
  const owner = (request as any).properties?.owner;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <div className="flex items-center gap-3">
              {getCategoryIcon(request.category)}
              <DialogTitle className="text-xl">{request.title}</DialogTitle>
              <Badge 
                variant={statusInfo.variant}
                className="shrink-0"
              >
                {statusInfo.text}
              </Badge>
            </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Property Information */}
          {(request as any).properties?.address && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Property Location</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{(request as any).properties.address}</span>
                {(request as any).property_units?.unit_number && (
                  <span className="font-medium">- Unit {(request as any).property_units.unit_number}</span>
                )}
              </div>
            </div>
          )}

          {/* Property Manager / Landlord Information */}
          {owner && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Property Manager / Landlord
                </h3>
                <div className="grid gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{owner.first_name} {owner.last_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {owner.user_type === 'property_manager' ? 'PM' : 'Landlord'}
                    </Badge>
                  </div>
                  {owner.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <a href={`mailto:${owner.email}`} className="text-primary hover:underline">
                        {owner.email}
                      </a>
                    </div>
                  )}
                  {owner.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <a href={`tel:${owner.phone}`} className="text-primary hover:underline">
                        {owner.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!isNotificationOnly && <Separator />}

          {/* Category */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Category</h3>
            <div className="flex items-center gap-2">
              {getCategoryIcon(request.category)}
              <span className="text-sm">{getCategoryLabel(request.category)}</span>
            </div>
          </div>

          {/* Cost Information - Hidden from tenants */}
          {userType !== 'tenant' && ((request as any).estimated_cost || (request as any).actual_cost) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cost
                </h3>
                <div className="flex gap-6">
                  {(request as any).estimated_cost != null && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Estimated:</span>
                      <span className="ml-2 font-medium">${Number((request as any).estimated_cost).toLocaleString()}</span>
                    </div>
                  )}
                  {(request as any).actual_cost != null && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Actual:</span>
                      <span className="ml-2 font-medium text-green-600">${Number((request as any).actual_cost).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Full Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {cleanDesc}
            </p>
          </div>

          {/* Preferred Repair Time */}
          {preferredTime && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Preferred Repair Time
                </h3>
                <Badge variant="secondary" className="text-sm">
                  {preferredTime}
                </Badge>
              </div>
            </>
          )}

          {/* Contact Information */}
          {contact && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="grid gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contact.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`tel:${contact.phone}`}
                      className="text-primary hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}


          {/* Attachments / Photos - only show for full maintenance requests */}
          {!isNotificationOnly && attachments && attachments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedAttachment(attachments[0])}
                    className="text-xs"
                  >
                    {attachments.length === 1 
                      ? (attachments[0].isImage ? 'View Image' : 'View File')
                      : `View Attachments (${attachments.length})`
                    }
                  </Button>
                </div>
              </div>
            </>
          )}

          <Separator />
          
          {/* Attachment Lightbox Modal */}
          {selectedAttachment && (
            <Dialog open={!!selectedAttachment} onOpenChange={() => setSelectedAttachment(null)}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>{selectedAttachment.name}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4">
                  {selectedAttachment.isImage ? (
                    <img
                      src={selectedAttachment.url}
                      alt={selectedAttachment.name}
                      className="w-full max-h-[70vh] object-contain rounded-lg border shadow-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <ImageIcon className="h-16 w-16 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Preview not available</p>
                    </div>
                  )}
                  <a
                    href={selectedAttachment.url}
                    download={selectedAttachment.name}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    Download File
                  </a>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Submitted on {formatDate(request.submitted_date)}</span>
                <span className="text-xs">
                  ({formatDistanceToNow(new Date(request.submitted_date), { addSuffix: true })})
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Current Status:</span>
                <span className={cn("font-medium", statusInfo.color)}>
                  {statusInfo.text}
                </span>
              </div>

              {request.status === 'completed' && (request as any).completed_date && (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <Calendar className="h-4 w-4" />
                  <span>Completed on {formatDate((request as any).completed_date)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceRequestDetailModal;
