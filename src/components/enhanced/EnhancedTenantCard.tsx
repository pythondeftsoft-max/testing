import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Phone, 
  MapPin, 
  MessageCircle, 
  FileText, 
  Calendar,
  Building,
  Wrench,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { StatusIndicator } from '@/components/enhanced/StatusIndicator';
import { TenantAvatar } from '@/components/enhanced/TenantAvatar';
import { EnhancedHousedTenant } from '@/hooks/useEnhancedHousedTenants';
import TenantProfileModal from '@/components/TenantProfileModal';

interface EnhancedTenantCardProps {
  tenant: EnhancedHousedTenant;
}

export const EnhancedTenantCard = ({ tenant }: EnhancedTenantCardProps) => {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const tenantName = tenant.profiles?.first_name && tenant.profiles?.last_name 
    ? `${tenant.profiles.first_name} ${tenant.profiles.last_name}`
    : 'Current Tenant';

  const getRiskColor = (maintenanceCount: number, communicationCount: number) => {
    const riskScore = maintenanceCount * 5 + (communicationCount > 20 ? 10 : 0);
    if (riskScore <= 10) return 'text-green-600';
    if (riskScore <= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceScore = (tenant: EnhancedHousedTenant) => {
    let score = 85; // Base score
    
    // Adjust based on maintenance requests
    if (tenant.maintenance_summary.open_requests > 3) score -= 15;
    else if (tenant.maintenance_summary.open_requests === 0) score += 5;
    
    // Adjust based on communication
    if (tenant.communications_summary.unread_messages > 5) score -= 10;
    
    // Adjust based on housing history
    const renewalRate = tenant.housing_history.filter(h => h.lease_renewed).length / Math.max(tenant.housing_history.length, 1);
    score += renewalRate * 10;
    
    return Math.max(0, Math.min(100, score));
  };

  const getDaysAsTenant = () => {
    if (!tenant.properties?.lease_start_date) return 'N/A';
    const startDate = new Date(tenant.properties.lease_start_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const leaseRenewals = tenant.housing_history.filter(h => h.lease_renewed).length;
  const performanceScore = getPerformanceScore(tenant);

  return (
    <>
      <CardEnhanced variant="elevated" hover className="card-hover-blue">
        <CardEnhancedHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 flex-1">
              <TenantAvatar
                firstName={tenant.profiles?.first_name}
                lastName={tenant.profiles?.last_name}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <CardEnhancedTitle className="mb-1 text-base">
                  {tenantName}
                </CardEnhancedTitle>
                <CardEnhancedDescription className="mt-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tenant.properties?.address || 'Property Address'}
                    </span>
                    <Badge variant="outline" className="text-[#1e3a5f] border-[#1e3a5f]/20 bg-[#f8fafc] text-xs">
                      Current Tenant
                    </Badge>
                  </div>
                </CardEnhancedDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusIndicator status="current" size="sm" />
              <div className={`text-xs font-medium ${getRiskColor(tenant.maintenance_summary.open_requests, tenant.communications_summary.total_messages)}`}>
                Score: {performanceScore}
              </div>
            </div>
          </div>
        </CardEnhancedHeader>
        
        <CardEnhancedContent className="pt-0 space-y-4">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-600 text-sm flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                {tenant.properties?.monthly_rent?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-xs text-gray-600">Rent</div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-600 text-sm flex items-center justify-center gap-1">
                <Calendar className="h-3 w-3" />
                {getDaysAsTenant()}
              </div>
              <div className="text-xs text-gray-600">Days as Tenant</div>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <div className="font-semibold text-orange-600 text-sm flex items-center justify-center gap-1">
                <Wrench className="h-3 w-3" />
                {tenant.maintenance_summary.open_requests}
              </div>
              <div className="text-xs text-gray-600">Open Issues</div>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-600 text-sm flex items-center justify-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {leaseRenewals}
              </div>
              <div className="text-xs text-gray-600">Lease Renewals</div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
              <User className="h-3 w-3 text-[#1e3a5f]" />
              Contact Information
            </h4>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{tenant.profiles?.phone || 'Not provided'}</span>
              </div>
              {tenant.properties?.lease_start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>Lease: {new Date(tenant.properties.lease_start_date).toLocaleDateString()}</span>
                  {tenant.properties.lease_end_date && (
                    <span> - {new Date(tenant.properties.lease_end_date).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
              <Building className="h-3 w-3 text-[#1e3a5f]" />
              Property Details
            </h4>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Bedrooms: {tenant.properties?.bedrooms || 'N/A'}</div>
              <div>Bathrooms: {tenant.properties?.bathrooms || 'N/A'}</div>
              {tenant.landlord_info && (
                <div className="col-span-2">
                  Landlord: {tenant.landlord_info.first_name} {tenant.landlord_info.last_name}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProfileModal(true)}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white h-8 text-xs flex-1"
            >
              <FileText className="h-3 w-3 mr-1" />
              View Full Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard?portfolioId=everything', { 
                state: { activeTab: 'Messages', tenantIdToSelect: tenant.tenant_id } 
              })}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white h-8 text-xs flex-1"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Message
            </Button>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Tenant Profile Modal - shows full profile since they're housed */}
      <TenantProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        tenantId={tenant.tenant_id}
        propertyId={tenant.property_id}
        isPrimary={true}
      />
    </>
  );
};
