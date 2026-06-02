import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { maskEmail, shouldMaskContact } from '@/utils/contactInfoMasking';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileText, 
  User, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  Calendar,
  X,
  Crown,
  Pause
} from 'lucide-react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { TenantAvatar } from '@/components/enhanced/TenantAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SendLeaseDialog } from '@/components/landlord/SendLeaseDialog';

interface PropertyWithApplications {
  propertyId: string;
  address: string;
  status: string;
  applicationCount: number;
  applications: any[];
  hasPrimaryApplicant?: boolean;
  units: {
    unitId: string;
    unitNumber: string;
    status: string;
    applicationCount: number;
    applications: any[];
    hasPrimaryApplicant?: boolean;
  }[];
}

interface ApplicationsMasterDetailViewProps {
  propertiesWithApplications: PropertyWithApplications[];
  primaryApplicants?: Record<string, { id: string; name: string; unitId?: string }>;
  onViewProfile: (tenantId: string, propertyId: string, unitId?: string) => void;
  onMessage: (applicationId: string) => void;
  onScheduleInterview: (applicationId: string, tenantId: string, propertyId: string) => void;
  onApprove: (application: any) => void;
  onDeny: (applicationId: string) => void;
  onSetAsPrimary?: (application: any) => void;
}

const ApplicationsMasterDetailView = ({
  propertiesWithApplications,
  primaryApplicants = {},
  onViewProfile,
  onMessage,
  onScheduleInterview,
  onApprove,
  onDeny,
  onSetAsPrimary
}: ApplicationsMasterDetailViewProps) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [sendLeaseDialogOpen, setSendLeaseDialogOpen] = useState(false);
  const [selectedApplicationForLease, setSelectedApplicationForLease] = useState<any>(null);

  // Helper function to remove zip code from address
  const formatAddressWithoutZip = (address: string) => {
    return address.replace(/,?\s*\d{5}(-\d{4})?$/g, '').trim();
  };

  const totalApplications = useMemo(() => {
    return propertiesWithApplications.reduce((sum, prop) => sum + prop.applicationCount, 0);
  }, [propertiesWithApplications]);

  // Get filtered applications for the right panel
  const displayedApplications = useMemo(() => {
    if (!selectedPropertyId) return [];

    const property = propertiesWithApplications.find(p => p.propertyId === selectedPropertyId);
    if (!property) return [];

    if (selectedUnitId) {
      const unit = property.units.find(u => u.unitId === selectedUnitId);
      return unit?.applications || [];
    }

    // For property-level selection, show all applications (property + all units)
    return [...property.applications, ...property.units.flatMap(u => u.applications)];
  }, [selectedPropertyId, selectedUnitId, propertiesWithApplications]);

  const selectedProperty = useMemo(() => {
    return propertiesWithApplications.find(p => p.propertyId === selectedPropertyId);
  }, [selectedPropertyId, propertiesWithApplications]);

  const selectedUnit = useMemo(() => {
    if (!selectedProperty || !selectedUnitId) return null;
    return selectedProperty.units.find(u => u.unitId === selectedUnitId);
  }, [selectedProperty, selectedUnitId]);

  const handlePropertyClick = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedUnitId(null);
  };

  const handleUnitClick = (propertyId: string, unitId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedUnitId(unitId);
  };

  const togglePropertyExpansion = (propertyId: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  };

  // Format rent range display
  const formatRentRange = (app: any) => {
    const snapshot = app.profile_snapshot;
    if (!snapshot) return 'N/A';
    
    if (snapshot.rent_range_min && snapshot.rent_range_max) {
      return `$${snapshot.rent_range_min?.toLocaleString()} - $${snapshot.rent_range_max?.toLocaleString()}`;
    }
    
    return 'N/A';
  };

  // Format move-in date
  const formatMoveIn = (app: any) => {
    const snapshot = app.profile_snapshot;
    if (!snapshot) return 'N/A';
    
    if (snapshot.preferred_move_date) {
      return new Date(snapshot.preferred_move_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    if (snapshot.move_in_window) {
      const window = snapshot.move_in_window.toLowerCase();
      if (window === 'asap') return 'ASAP';
      if (window === 'within_30_days') return 'Within 30 days';
      if (window === '1_3_months') return '1-3 months';
      if (window === '3_6_months') return '3-6 months';
      return window;
    }
    
    return 'N/A';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 mt-6">
      {/* LEFT PANEL: Property Selector */}
      <CardEnhanced variant="outlined">
        <CardEnhancedContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">On-Market Properties</h3>
              </div>
              <Badge variant="default" className="bg-primary text-primary-foreground">
                {totalApplications}
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            {propertiesWithApplications.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No on-market properties found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {propertiesWithApplications.map(property => (
                  <div key={property.propertyId} className="mb-2">
                    {/* Property row - single unit properties or multi-unit with expandable */}
                    {property.units.length <= 1 ? (
                      // Single unit property - direct click
                      <button
                        onClick={() => handlePropertyClick(property.propertyId)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedPropertyId === property.propertyId && !selectedUnitId
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {formatAddressWithoutZip(property.address)}
                              {property.units.length === 1 && property.units[0]?.unitNumber && (
                                <span className="text-muted-foreground ml-1">– Unit {property.units[0].unitNumber}</span>
                              )}
                            </p>
                          </div>
                          <div className="w-8 flex justify-end flex-shrink-0">
                            <Badge 
                              variant={property.applicationCount === 0 ? "outline" : "secondary"}
                              className={selectedPropertyId === property.propertyId && !selectedUnitId ? 'bg-primary-foreground/20' : ''}
                            >
                              {property.applicationCount}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ) : (
                      // Multi-unit property - expandable
                      <Collapsible 
                        open={expandedProperties.has(property.propertyId)}
                        onOpenChange={() => togglePropertyExpansion(property.propertyId)}
                      >
                        <div className="flex items-center w-full">
                          <CollapsibleTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 flex-shrink-0"
                            >
                              {expandedProperties.has(property.propertyId) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <button
                            onClick={() => handlePropertyClick(property.propertyId)}
                            className={`flex-1 text-left px-3 py-2 rounded-lg transition-colors ${
                              selectedPropertyId === property.propertyId && !selectedUnitId
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {formatAddressWithoutZip(property.address)}
                                </p>
                              </div>
                              <div className="w-8 flex justify-end flex-shrink-0">
                                <Badge 
                                  variant={property.applicationCount === 0 ? "outline" : "secondary"}
                                  className={selectedPropertyId === property.propertyId && !selectedUnitId ? 'bg-primary-foreground/20' : ''}
                                >
                                  {property.applicationCount}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Units list */}
                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1">
                            {property.units.map(unit => (
                              <button
                                key={unit.unitId}
                                onClick={() => handleUnitClick(property.propertyId, unit.unitId)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                                  selectedUnitId === unit.unitId
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted/30'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-xs">•</span>
                                    Unit {unit.unitNumber}
                                  </span>
                                  <div className="w-8 flex justify-end flex-shrink-0">
                                    <Badge 
                                      variant={unit.applicationCount === 0 ? "outline" : "secondary"}
                                      className={`text-xs ${selectedUnitId === unit.unitId ? 'border-primary-foreground/30 bg-primary-foreground/20' : ''}`}
                                    >
                                      {unit.applicationCount}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* RIGHT PANEL: Applicants Table */}
      <CardEnhanced variant="outlined">
        <CardEnhancedContent className="p-0">
          {!selectedPropertyId ? (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[600px]">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Select a property to view applicants
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Click on a property from the list on the left to see its applicants and manage their applications.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      Applicants for: {selectedProperty?.address}
{selectedUnit 
                  ? ` – ${selectedUnit.unitNumber}`
                  : selectedProperty?.units.length === 1 && selectedProperty.units[0]?.unitNumber
                    ? ` – ${selectedProperty.units[0].unitNumber}`
                    : ''
                }
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {displayedApplications.length} {displayedApplications.length === 1 ? 'applicant' : 'applicants'}
                    </p>
                    
                    {(selectedProperty?.hasPrimaryApplicant || selectedUnit?.hasPrimaryApplicant) && (
                      <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                        <Pause className="h-4 w-4" />
                        <span>Listing paused because primary applicant is selected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              <ScrollArea className="h-[600px]">
                {displayedApplications.length === 0 ? (
                  <div className="p-8 text-center">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {selectedProperty && selectedProperty.applicationCount === 0
                        ? "No applicants yet for this property"
                        : "No applicants for this selection"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Rent Range</TableHead>
                        <TableHead>Move-In</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedApplications.map(app => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <TenantAvatar
                                firstName={app.profiles?.first_name}
                                lastName={app.profiles?.last_name}
                                email={app.profiles?.email}
                                size="sm"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-foreground">
                                    {app.profiles?.first_name && app.profiles?.last_name
                                      ? `${app.profiles.first_name} ${app.profiles.last_name}`
                                      : 'Applicant'}
                                  </p>
                                  {app.is_primary_applicant && (
                                    <Badge className="bg-openkey-gold text-white flex items-center gap-1 whitespace-nowrap text-xs">
                                      <Crown className="h-3 w-3" />
                                      Primary
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {shouldMaskContact(app.is_primary_applicant)
                                    ? maskEmail(app.profiles?.email || '')
                                    : (app.profiles?.email || 'No email')}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground">
                              {formatRentRange(app)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground">
                              {formatMoveIn(app)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(app.created_at).toLocaleDateString('en-US', { 
                                month: 'numeric', 
                                day: 'numeric',
                                year: '2-digit'
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewProfile(app.tenant_id, app.property_id, app.unit_id || app.application_data?.original_unit_id)}
                                className="h-8 w-8 p-0"
                                title="View profile"
                              >
                                <User className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSetAsPrimary?.(app)}
                                className={`h-8 w-8 p-0 transition-all duration-300 relative ${
                                  app.is_primary_applicant
                                    ? 'text-openkey-gold hover:text-openkey-gold/80 scale-110' 
                                    : 'text-muted-foreground hover:text-openkey-gold hover:scale-110'
                                }`}
                                title={
                                  app.is_primary_applicant 
                                    ? 'Primary Applicant (active)' 
                                    : 'Click to set as Primary Applicant'
                                }
                                disabled={!onSetAsPrimary}
                              >
                                <Star 
                                  className={`h-4 w-4 transition-all duration-300 ${
                                    app.is_primary_applicant 
                                      ? 'fill-current drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]' 
                                      : ''
                                  }`} 
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onMessage(app.id)}
                                className="h-8 w-8 p-0"
                                title="Message applicant"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onScheduleInterview(app.id, app.tenant_id, app.property_id)}
                                className="h-8 w-8 p-0"
                                title="Schedule interview"
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedApplicationForLease(app);
                                  setSendLeaseDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0"
                                title={app.status === 'lease_signed' ? "Lease already signed" : "Send lease agreement"}
                                disabled={app.status === 'lease_signed'}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              {app.status !== 'approved' && app.status !== 'rejected' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeny(app.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Not a fit"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </>
          )}
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Send Lease Dialog */}
      {selectedApplicationForLease && (
        <SendLeaseDialog
          open={sendLeaseDialogOpen}
          onOpenChange={setSendLeaseDialogOpen}
          applicationId={selectedApplicationForLease.id}
          propertyId={selectedApplicationForLease.property_id}
          tenantName={
            selectedApplicationForLease.profiles?.first_name && selectedApplicationForLease.profiles?.last_name
              ? `${selectedApplicationForLease.profiles.first_name} ${selectedApplicationForLease.profiles.last_name}`
              : 'Applicant'
          }
          propertyAddress={selectedProperty?.address || 'Property Address'}
          unitId={selectedApplicationForLease.unit_id}
          unitNumber={selectedApplicationForLease.unit_number || selectedApplicationForLease.property_units?.unit_number}
          monthlyRent={selectedApplicationForLease.properties?.desired_rent || selectedApplicationForLease.properties?.monthly_rent || 0}
        />
      )}
    </div>
  );
};

export default ApplicationsMasterDetailView;
