import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  Phone,
  Copy,
  Edit,
  MapPin,
  DollarSign,
  FileText,
  Building2,
  Calendar,
  StickyNote,
} from 'lucide-react';
import { ClientPortfolio } from '@/hooks/useClientProperties';
import { useToast } from '@/hooks/use-toast';
import { EditClientModal } from './EditClientModal';

interface ViewClientDetailsModalProps {
  client: ClientPortfolio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (property: any) => void;
  onViewApplications: (propertyId: string) => void;
  refetch?: () => void;
}

export const ViewClientDetailsModal: React.FC<ViewClientDetailsModalProps> = ({
  client,
  open,
  onOpenChange,
  onEdit,
  onViewApplications,
  refetch,
}) => {
  const { toast } = useToast();
  const [editingClient, setEditingClient] = useState(false);

  if (!client) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleEmailClick = () => {
    if (client.client_email) {
      window.location.href = `mailto:${client.client_email}`;
    }
  };

  const handlePhoneClick = () => {
    if (client.client_phone) {
      window.location.href = `tel:${client.client_phone}`;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              View Client Details
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-4">
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  Contact Information
                </h3>
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Client Name</p>
                    <p className="font-semibold">{client.client_name}</p>
                  </div>
                  
                  {client.client_email && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{client.client_email}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(client.client_email!, 'Email')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEmailClick}
                        >
                          <Mail className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {client.client_phone && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{client.client_phone}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(client.client_phone!, 'Phone')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePhoneClick}
                        >
                          <Phone className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date Added</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">
                        {new Date(client.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portfolio Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  Portfolio Summary
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="px-4 py-2">
                    <Building2 className="w-4 h-4 mr-2" />
                    {client.property_count} {client.property_count === 1 ? 'Property' : 'Properties'}
                  </Badge>
                  <Badge variant="outline" className="px-4 py-2">
                    {client.active_listings} On Market
                  </Badge>
                  {client.application_count > 0 && (
                    <Badge variant="default" className="px-4 py-2">
                      <FileText className="w-4 h-4 mr-2" />
                      {client.application_count} Applications
                    </Badge>
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    Internal Notes
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingClient(true)}
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    Edit Notes
                  </Button>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg min-h-[80px]">
                  {client.client_notes ? (
                    <div className="flex gap-2">
                      <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm whitespace-pre-wrap">{client.client_notes}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No notes added yet</p>
                  )}
                </div>
              </div>

              {/* Properties List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  Properties ({client.properties.length})
                </h3>
                {client.properties.length === 0 ? (
                  <div className="bg-muted/50 p-8 rounded-lg text-center">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No properties for this client yet</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Address</TableHead>
                          <TableHead>Rent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.properties.map((property) => (
                          <TableRow key={property.id}>
                            <TableCell>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                                <div>
                                  <div className="font-medium">{property.address}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {property.city}, {property.state} {property.zipcode}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {(property.monthly_rent || property.property_units?.[0]?.monthly_rent)
                                    ? `$${(property.monthly_rent || property.property_units?.[0]?.monthly_rent)?.toLocaleString()}/mo` 
                                    : 'Not Set'
                                  }
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={property.on_market ? "default" : "secondary"}>
                                {property.on_market ? 'On Market' : 'Off Market'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    onEdit(property);
                                    onOpenChange(false);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    onViewApplications(property.id);
                                    onOpenChange(false);
                                  }}
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      <EditClientModal
        client={client}
        open={editingClient}
        onOpenChange={setEditingClient}
        onSuccess={() => {
          setEditingClient(false);
          onOpenChange(false);
          if (refetch) refetch();
        }}
      />
    </>
  );
};
