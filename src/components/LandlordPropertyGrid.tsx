
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PropertyCardWithUnits from './PropertyCardWithUnits';
import LandlordPropertiesListView from './LandlordPropertiesListView';
import { 
  MapPin, 
  Home, 
  DollarSign, 
  Bed, 
  Bath, 
  Calendar,
  Users,
  Eye,
  MessageSquare,
  Edit,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  UserPlus
} from 'lucide-react';

interface Property {
  id: string;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  monthly_rent: number;
  desired_rent?: number;
  zipcode?: string;
  city?: string;
  state?: string;
  street_address?: string;
  photos?: string[];
  amenities?: string[];
  status: string;
  owner_id: string;
  unit_count: number;
  tenant_request_count?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  created_at?: string;
  updated_at?: string;
  country?: string;
}

interface LandlordPropertyGridProps {
  properties: Property[];
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (property: Property) => void;
  onViewApplications: (property: Property) => void;
  onViewMessages: (property: Property) => void;
  onCardClick: (property: Property) => void;
  onPropertyUpdated?: () => void;
}

const LandlordPropertyGrid = ({ 
  properties, 
  onEditProperty, 
  onDeleteProperty,
  onViewApplications, 
  onViewMessages,
  onCardClick,
  onPropertyUpdated
}: LandlordPropertyGridProps) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const { toast } = useToast();

  const handleRequestTenant = async (property: Property) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to request tenant placement.",
          variant: "destructive",
        });
        return;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('property_tenant_requests')
        .select('id')
        .eq('property_id', property.id)
        .eq('status', 'active')
        .single();

      if (existingRequest) {
        toast({
          title: "Request Already Submitted",
          description: "You have already requested tenant placement for this property.",
          variant: "destructive",
        });
        return;
      }

      // Create tenant request
      const { error } = await supabase
        .from('property_tenant_requests')
        .insert({
          property_id: property.id,
          requested_by: user.id,
          notes: `Tenant placement requested for ${property.street_address || property.city}`,
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your tenant placement request has been submitted to our admin team.",
      });
    } catch (error) {
      console.error('Error requesting tenant:', error);
      toast({
        title: "Error",
        description: "Failed to submit tenant request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (property: Property) => {
    switch (property.status) {
      case 'occupied':
        return <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Occupied
        </Badge>;
      case 'available':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Eye className="h-3 w-3 mr-1" />
          Available
        </Badge>;
      case 'vacant':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Vacant
        </Badge>;
      default:
        return <Badge variant="outline">{property.status}</Badge>;
    }
  };

  const getPerformanceIndicator = (property: Property) => {
    const requestCount = property.tenant_request_count || 0;
    const hasDesiredRent = property.desired_rent && property.desired_rent > 0;
    
    if (requestCount > 5) {
      return { icon: TrendingUp, color: 'text-green-600', label: 'High Interest' };
    } else if (requestCount > 0) {
      return { icon: TrendingUp, color: 'text-blue-600', label: 'Some Interest' };
    } else if (hasDesiredRent) {
      return { icon: Clock, color: 'text-yellow-600', label: 'Listed' };
    } else {
      return { icon: TrendingDown, color: 'text-gray-400', label: 'Not Listed' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Properties Yet</h3>
          <p className="text-gray-500 mb-6">
            Start building your property portfolio by adding your first property.
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Add Your First Property
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch auto-rows-fr">
      {properties.map((property) => (
        <PropertyCardWithUnits
          key={property.id}
          property={property}
          onViewDetails={onCardClick}
          onEdit={onEditProperty}
          onDelete={onDeleteProperty}
          onPropertyUpdated={onPropertyUpdated}
        />
      ))}
    </div>
  );
};

export default LandlordPropertyGrid;
