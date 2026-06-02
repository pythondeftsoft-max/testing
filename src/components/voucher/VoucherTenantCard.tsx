
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  MessageCircle, 
  FileText, 
  ChevronDown,
  ChevronUp,
  Building,
  Calendar
} from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { StatusIndicator } from '@/components/enhanced/StatusIndicator';
import { TenantAvatar } from '@/components/enhanced/TenantAvatar';
import { RentSplitVisualization } from './RentSplitVisualization';
import { NextPaymentCalendar } from './NextPaymentCalendar';

interface VoucherTenantCardProps {
  tenant: any;
  onViewProfile: (tenant: any) => void;
  onMessage: (applicationId: string) => void;
}

export const VoucherTenantCard = ({ 
  tenant, 
  onViewProfile, 
  onMessage 
}: VoucherTenantCardProps) => {
  const [showPHADetails, setShowPHADetails] = useState(false);
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false);

  // Mock data for payments - in real app, this would come from props or API
  const mockPayments = [
    {
      type: 'hap' as const,
      dueDate: '2025-01-15',
      amount: 900,
      status: 'upcoming' as const
    },
    {
      type: 'tenant' as const,
      dueDate: '2025-01-01',
      amount: 500,
      status: 'received' as const
    }
  ];

  const rentSplitData = {
    totalRent: tenant.properties?.monthly_rent || 1400,
    phaPortion: 900,
    tenantPortion: 500,
    voucherType: 'Housing Choice Voucher'
  };

  return (
    <CardEnhanced variant="elevated" hover className="card-hover-gold">
      <CardEnhancedHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 flex-1">
            <TenantAvatar
              firstName={tenant.profiles?.first_name}
              lastName={tenant.profiles?.last_name}
              size="sm"
            />
            <div>
              <CardEnhancedTitle className="mb-0 text-base">
                {tenant.profiles?.first_name && tenant.profiles?.last_name 
                  ? `${tenant.profiles.first_name} ${tenant.profiles.last_name}`
                  : 'Current Tenant'
                }
              </CardEnhancedTitle>
              <CardEnhancedDescription className="mt-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {tenant.properties?.address || 'Property Address'}
                  </span>
                  <Badge variant="outline" className="text-[#1e3a5f] border-[#bf9000] bg-[#fff8e1] text-xs">
                    Section 8
                  </Badge>
                </div>
              </CardEnhancedDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status="current" size="sm" />
          </div>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent className="pt-0 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Tenant Information */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2 text-foreground text-sm">
              <User className="h-3 w-3 text-[#1e3a5f]" />
              Tenant Information
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{tenant.profiles?.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>Start: {tenant.properties?.lease_start_date ? new Date(tenant.properties.lease_start_date).toLocaleDateString() : 'Not set'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span>End: {tenant.properties?.lease_end_date ? new Date(tenant.properties.lease_end_date).toLocaleDateString() : 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* PHA Information */}
          <div>
            <Collapsible open={showPHADetails} onOpenChange={setShowPHADetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 font-medium mb-2 text-foreground hover:bg-transparent text-sm h-auto">
                  <span className="flex items-center gap-2">
                    <Building className="h-3 w-3 text-[#bf9000]" />
                    PHA Contact Information
                  </span>
                  {showPHADetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>Jennifer Smith</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>314-555-0123</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>j.smith@mha.gov</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  <span>Metropolitan Housing Authority</span>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Payment Schedule */}
        <div>
          <Collapsible open={showPaymentSchedule} onOpenChange={setShowPaymentSchedule}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 font-medium mb-2 text-foreground hover:bg-transparent text-sm h-auto">
                <span className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-[#1e3a5f]" />
                  Payment Schedule
                </span>
                {showPaymentSchedule ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <NextPaymentCalendar payments={mockPayments} />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Actions and Rent Split - Bottom Section */}
        <div className="flex justify-between items-end gap-4">
          {/* Enhanced Actions */}
          <div className="flex flex-wrap gap-2 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewProfile(tenant)}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white h-8 text-xs"
            >
              <User className="h-3 w-3 mr-1" />
              View Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMessage(tenant.application_id || tenant.id)}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Message
            </Button>
          </div>

          {/* Rent Split Visualization - Bottom Right */}
          <div className="flex-shrink-0 w-80">
            <RentSplitVisualization
              totalRent={rentSplitData.totalRent}
              phaPortion={rentSplitData.phaPortion}
              tenantPortion={rentSplitData.tenantPortion}
              voucherType={rentSplitData.voucherType}
              size="sm"
            />
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};
