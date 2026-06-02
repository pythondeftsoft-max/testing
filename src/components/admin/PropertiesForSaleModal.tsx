import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, DollarSign, Calendar, User, Phone, Mail, MessageSquare, Building2, Bath, Bed, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PropertyForSale {
  id: string;
  property_id: string;
  owner_id: string;
  marketing_price: number;
  additional_details?: string;
  reason_for_sale?: string;
  timeline_for_sale?: string;
  contact_preferences?: any;
  property_condition?: string;
  selling_points?: string;
  status: string;
  admin_notes?: string;
  admin_contacted_at?: string;
  admin_contacted_by?: string;
  created_at: string;
  updated_at: string;
  properties: {
    address: string;
    city: string;
    state: string;
    zipcode: string;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | null;
}

interface PropertiesForSaleModalProps {
  property: PropertyForSale;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string) => void;
}

export const PropertiesForSaleModal = ({ 
  property, 
  isOpen, 
  onClose, 
  onStatusUpdate 
}: PropertiesForSaleModalProps) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'reviewed':
        return <Badge variant="secondary">Reviewed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getConditionColor = (condition: string) => {
    if (!condition) return 'text-gray-600';
    switch (condition.toLowerCase()) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(property.id, newStatus);
      toast({
        title: "Status Updated",
        description: `Property status updated to ${newStatus}`,
      });
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const calculateCapRate = () => {
    const annualRent = (property.properties?.monthly_rent || 0) * 12;
    const capRate = (annualRent / property.marketing_price) * 100;
    return capRate.toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Property for Sale Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-lg">{property.properties?.address || 'N/A'}</h4>
                <p className="text-gray-600">
                  {property.properties?.city}, {property.properties?.state} {property.properties?.zipcode}
                </p>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4 text-gray-400" />
                  <span>{property.properties?.bedrooms} Bedrooms</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4 text-gray-400" />
                  <span>{property.properties?.bathrooms} Bathrooms</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Marketing Price:</span>
                  <span className="font-semibold text-green-600 text-lg">
                    {formatPrice(property.marketing_price)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Rent:</span>
                  <span className="font-medium">
                    {formatPrice(property.properties?.monthly_rent || 0)}/month
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Estimated Cap Rate:</span>
                  <span className="font-medium text-blue-600">
                    {calculateCapRate()}%
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Condition:</span>
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${getConditionColor(property.property_condition)}`} />
                  <span className={`font-medium ${getConditionColor(property.property_condition)}`}>
                    {property.property_condition || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                {getStatusBadge(property.status)}
              </div>
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-lg">
                  {property.profiles?.first_name} {property.profiles?.last_name}
                </h4>
                <p className="text-gray-600 text-sm">Property Owner</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600 text-sm">Email:</span>
                    <p className="font-medium">{property.profiles?.email}</p>
                  </div>
                </div>

                {property.profiles?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-gray-600 text-sm">Phone:</span>
                      <p className="font-medium">{property.profiles.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600 text-sm">Listed:</span>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(property.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600 text-sm">Last Updated:</span>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(property.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Details */}
        {property.additional_details && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Owner Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {property.additional_details}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Admin Notes (Internal):
              </label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this property sale request..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              {property.status === 'active' && (
                <Button
                  onClick={() => handleStatusUpdate('reviewed')}
                  disabled={isUpdating}
                  variant="secondary"
                >
                  Mark as Reviewed
                </Button>
              )}

              <Button
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={isUpdating}
                variant="destructive"
              >
                Remove from Sale
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open(`mailto:${property.profiles?.email}`, '_blank')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Owner
              </Button>

              {property.profiles?.phone && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`tel:${property.profiles.phone}`, '_blank')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Owner
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};