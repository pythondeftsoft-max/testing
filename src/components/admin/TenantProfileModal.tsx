import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Phone, 
  DollarSign, 
  CreditCard, 
  MapPin, 
  Briefcase, 
  Home,
  FileText,
  Mail,
  Calendar
} from 'lucide-react';

interface TenantProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  voucher_holder: boolean;
  voucher_amount: number;
  monthly_income: number;
  max_rent: number;
  credit_score: number;
  employment_status: string;
  preferred_locations: string[];
  city: string;
  zip_code: string;
  message_credits: number;
  is_plus_subscriber: boolean;
  email?: string;
  housing_authority?: string;
  move_in_window?: string;
  has_pets?: boolean;
  pet_type?: string;
  has_accessibility_needs?: boolean;
  accessibility_details?: string;
  has_eviction?: boolean;
  eviction_details?: string;
  has_felonies?: boolean;
  felony_details?: string;
}

interface TenantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantProfile | null;
}

const TenantProfileModal = ({ isOpen, onClose, tenant }: TenantProfileModalProps) => {
  if (!tenant) return null;

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 670) return 'text-blue-600';
    if (score >= 580) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCreditScoreLabel = (score: number) => {
    if (score >= 750) return 'Excellent';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    if (score > 0) return 'Poor';
    return 'N/A';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-primary" />
            {tenant.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Phone:</span>
                <span className="text-sm">{tenant.phone}</span>
              </div>
              {tenant.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{tenant.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Employment:</span>
                <span className="text-sm">{tenant.employment_status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Message Credits:</span>
                <Badge variant="outline">{tenant.message_credits}</Badge>
              </div>
              {tenant.is_plus_subscriber && (
                <Badge className="bg-blue-100 text-blue-800">Plus Subscriber</Badge>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Yearly Income:</span>
                <span className="text-sm font-semibold text-green-600">
                  ${tenant.monthly_income.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Max Rent:</span>
                <span className="text-sm font-semibold text-blue-600">
                  ${tenant.max_rent.toLocaleString()}
                </span>
              </div>
              {tenant.credit_score > 0 && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Credit Score:</span>
                  <span className={`text-sm font-semibold ${getCreditScoreColor(tenant.credit_score)}`}>
                    {tenant.credit_score} ({getCreditScoreLabel(tenant.credit_score)})
                  </span>
                </div>
              )}
              {tenant.voucher_holder && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Housing Voucher</span>
                  </div>
                  <div className="text-sm text-purple-700">
                    Amount: ${tenant.voucher_amount.toLocaleString()}
                  </div>
                  {tenant.housing_authority && (
                    <div className="text-xs text-purple-600 mt-1">
                      Authority: {tenant.housing_authority}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Current Location:</span>
                <span className="text-sm">{tenant.city}, {tenant.zip_code}</span>
              </div>
              {tenant.preferred_locations && tenant.preferred_locations.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Preferred Areas:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tenant.preferred_locations.map((location, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {tenant.move_in_window && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Move-in Window:</span>
                  <span className="text-sm">{tenant.move_in_window}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenant.has_pets && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <span className="text-sm font-medium text-amber-800">Has Pets</span>
                  {tenant.pet_type && (
                    <div className="text-xs text-amber-700 mt-1">Type: {tenant.pet_type}</div>
                  )}
                </div>
              )}
              
              {tenant.has_accessibility_needs && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-800">Accessibility Needs</span>
                  {tenant.accessibility_details && (
                    <div className="text-xs text-blue-700 mt-1">{tenant.accessibility_details}</div>
                  )}
                </div>
              )}
              
              {tenant.has_eviction && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-800">Previous Eviction</span>
                  {tenant.eviction_details && (
                    <div className="text-xs text-red-700 mt-1">{tenant.eviction_details}</div>
                  )}
                </div>
              )}
              
              {tenant.has_felonies && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-800">Criminal Background</span>
                  {tenant.felony_details && (
                    <div className="text-xs text-red-700 mt-1">{tenant.felony_details}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantProfileModal;