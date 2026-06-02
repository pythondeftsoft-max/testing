import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Phone, 
  CreditCard, 
  Home, 
  Eye, 
  MessageCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Heart,
  Briefcase,
  Car,
  Search
} from 'lucide-react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader } from '@/components/enhanced/CardEnhanced';
import { TenantQuotaResetButton } from '@/components/admin/TenantQuotaResetButton';
import { AdminMessageDialog } from '@/components/admin/AdminMessageDialog';

interface SeekingTenant {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email?: string;
  voucher_holder: boolean;
  voucher_amount: number;
  monthly_income: string | number;
  max_rent: number;
  credit_score: number;
  employment_status: string;
  preferred_locations: string[];
  city: string;
  zip_code: string;
  message_credits: number;
  is_plus_subscriber: boolean;
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

interface AdminSeekingTenantCardProps {
  tenant: SeekingTenant;
  onViewProfile: (tenant: SeekingTenant) => void;
  onMessage?: (tenantId: string) => void;
  showQuotaResetButton?: boolean;
}

export const AdminSeekingTenantCard: React.FC<AdminSeekingTenantCardProps> = ({
  tenant,
  onViewProfile,
  onMessage,
  showQuotaResetButton = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRentAffordabilityStatus = () => {
    const income = typeof tenant.monthly_income === 'number' ? tenant.monthly_income : parseFloat(String(tenant.monthly_income)) || 0;
    const rentToIncomeRatio = income > 0 ? (tenant.max_rent / income) * 100 : 0;
    if (rentToIncomeRatio <= 30) return { status: 'Excellent', color: 'text-green-600' };
    if (rentToIncomeRatio <= 40) return { status: 'Good', color: 'text-yellow-600' };
    return { status: 'High Budget', color: 'text-orange-600' };
  };

  const affordability = getRentAffordabilityStatus();

  return (
    <CardEnhanced variant="default" className="transition-all duration-200 hover:shadow-md">
      <CardEnhancedHeader>
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-full flex items-center justify-center">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">{tenant.full_name}</h3>
                {tenant.is_plus_subscriber && (
                  <Badge variant="default" className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white">Plus</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{tenant.city}, {tenant.zip_code}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{tenant.phone}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              <Search className="h-3 w-3 mr-1" />
              Seeking Housing
            </Badge>
          </div>
        </div>

        {/* Quick Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-semibold text-foreground">${tenant.monthly_income?.toLocaleString() || 0}</div>
              <div className="text-xs text-muted-foreground">Monthly Income</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-semibold text-foreground">${tenant.max_rent?.toLocaleString() || 0}</div>
              <div className="text-xs text-muted-foreground">Max Rent</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <div>
              <div className={`text-sm font-semibold ${getCreditScoreColor(tenant.credit_score)}`}>
                {tenant.credit_score || 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Credit Score</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <div>
              <div className={`text-sm font-semibold ${affordability.color}`}>
                {affordability.status}
              </div>
              <div className="text-xs text-muted-foreground">Budget Status</div>
            </div>
          </div>
        </div>
      </CardEnhancedHeader>

      <CardEnhancedContent>
        {/* Voucher & Key Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {tenant.voucher_holder && (
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <Shield className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium text-green-800">Voucher Holder</div>
                <div className="text-xs text-green-600">
                  ${tenant.voucher_amount?.toLocaleString() || 0} voucher amount
                </div>
                {tenant.housing_authority && (
                  <div className="text-xs text-green-600">{tenant.housing_authority}</div>
                )}
              </div>
            </div>
          )}

          {tenant.has_pets && (
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <Heart className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-800">Has Pets</div>
                <div className="text-xs text-blue-600">{tenant.pet_type || 'Pet owner'}</div>
              </div>
            </div>
          )}

          {tenant.has_accessibility_needs && (
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
              <User className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm font-medium text-purple-800">Accessibility Needs</div>
                <div className="text-xs text-purple-600">Special accommodations</div>
              </div>
            </div>
          )}
        </div>

        {/* Warning Indicators */}
        {(tenant.has_eviction || tenant.has_felonies) && (
          <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-sm font-medium text-red-800">Background Alerts</div>
            </div>
            <div className="space-y-1 text-xs text-red-600">
              {tenant.has_eviction && <div>• Previous eviction history</div>}
              {tenant.has_felonies && <div>• Felony background</div>}
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Less Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                More Details
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            {showQuotaResetButton && (
              <TenantQuotaResetButton 
                tenantId={tenant.user_id}
                tenantName={tenant.full_name}
                size="sm"
                variant="outline"
              />
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setMessageDialogOpen(true)}
              className="hover:scale-105 transition-transform"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button variant="default" size="sm" onClick={() => onViewProfile(tenant)}>
              <Eye className="h-4 w-4 mr-1" />
              View Profile
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Financial Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Profile
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Income:</span>
                    <span className="font-medium">${tenant.monthly_income?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Rent Budget:</span>
                    <span className="font-medium">${tenant.max_rent?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Message Credits:</span>
                    <span className="font-medium">{tenant.message_credits || 0}</span>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Personal Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employment:</span>
                    <span className="font-medium">{tenant.employment_status || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">City:</span>
                    <span className="font-medium">{tenant.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zip Code:</span>
                    <span className="font-medium">{tenant.zip_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Move-in Window:</span>
                    <span className="font-medium">{tenant.move_in_window || 'Flexible'}</span>
                  </div>
                </div>
              </div>

              {/* Housing Preferences */}
              {tenant.preferred_locations && tenant.preferred_locations.length > 0 && (
                <div className="space-y-3 md:col-span-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Preferred Locations
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {tenant.preferred_locations.map((location, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Details */}
            {(tenant.accessibility_details || tenant.eviction_details || tenant.felony_details) && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Additional Notes</h4>
                <div className="space-y-2 text-sm">
                  {tenant.accessibility_details && (
                    <div>
                      <span className="font-medium text-muted-foreground">Accessibility Details:</span>
                      <p className="mt-1 text-foreground">{tenant.accessibility_details}</p>
                    </div>
                  )}
                  {tenant.eviction_details && (
                    <div>
                      <span className="font-medium text-muted-foreground">Eviction Details:</span>
                      <p className="mt-1 text-foreground">{tenant.eviction_details}</p>
                    </div>
                  )}
                  {tenant.felony_details && (
                    <div>
                      <span className="font-medium text-muted-foreground">Felony Details:</span>
                      <p className="mt-1 text-foreground">{tenant.felony_details}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardEnhancedContent>

      {/* Message Dialog */}
      <AdminMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        recipientUserId={tenant.user_id}
        recipientName={tenant.full_name}
        recipientEmail={tenant.email}
      />
    </CardEnhanced>
  );
};