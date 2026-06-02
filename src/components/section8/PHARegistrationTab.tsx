import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Plus, CreditCard, ChevronDown, ChevronUp, MapPin, Upload, AlertCircle, Home, FileText } from 'lucide-react';
import VacancyPostingForm from './VacancyPostingForm';
import { PHAEnrollmentForm } from './PHAEnrollmentForm';
import { PaymentSetupCard } from './PaymentSetupCard';
import { RegistrationExport } from './RegistrationExport';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AgencyLandlord } from '@/hooks/useAgencyLandlords';

interface PHARegistrationTabProps {
  registrations: AgencyLandlord[];
  user: any;
  onEnrollmentComplete: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export const PHARegistrationTab = ({ registrations, user, onEnrollmentComplete, getStatusBadge }: PHARegistrationTabProps) => {
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const notifyAgencyAdmin = async (agencyId: string, title: string, description: string, regId: string) => {
    // Find agency admin staff member to notify
    const { data: staff } = await supabase
      .from('agency_staff')
      .select('user_id')
      .eq('agency_id', agencyId)
      .eq('role', 'agency_admin')
      .eq('is_active', true)
      .limit(5);

    if (staff && staff.length > 0) {
      const notifications = staff.map(s => ({
        user_id: s.user_id,
        title,
        description,
        type: 'section8',
        read: false,
        category: 'section8',
        related_entity_type: 'agency_landlord',
        related_entity_id: regId,
      }));
      await supabase.from('notifications').insert(notifications);
    }
  };

  const handleDocUpload = async (regId: string, docType: string, file: File) => {
    setUploadingDoc(`${regId}-${docType}`);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/section8/${docType}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: true });
      if (error) throw error;

      // Update w9_status if W-9 upload
      if (docType === 'w9') {
        await supabase.from('agency_landlords')
          .update({ w9_status: 'submitted' as any })
          .eq('id', regId);
      }

      toast.success(`${docType.toUpperCase()} uploaded successfully`);
      onEnrollmentComplete(); // refresh

      // Notify agency admin about the upload
      const reg = registrations.find(r => r.id === regId);
      if (reg) {
        const phaName = reg.agency?.name || 'PHA';
        const landlordName = reg.landlord_name;
        notifyAgencyAdmin(
          reg.agency_id,
          `Document Uploaded: ${docType === 'w9' ? 'W-9' : docType}`,
          `${landlordName} uploaded a ${docType === 'w9' ? 'W-9 form' : docType} for their registration with ${phaName}.`,
          regId
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingDoc(null);
    }
  };

  if (showEnrollment) {
    return (
      <PHAEnrollmentForm
        user={user}
        onComplete={() => {
          setShowEnrollment(false);
          onEnrollmentComplete();
        }}
        onCancel={() => setShowEnrollment(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Enrollment CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Register with a Housing Authority</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit an enrollment request to your local PHA. They'll review and let you know what documents are needed.
                </p>
              </div>
            </div>
            <Button onClick={() => setShowEnrollment(true)} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Enroll with PHA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Registrations */}
      {registrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No PHA Registrations Yet</h3>
            <p className="text-muted-foreground">Click "Enroll with PHA" above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        registrations.map((reg) => {
          const isExpanded = expandedCards[reg.id] || false;
          const phaName = reg.agency?.name || 'Housing Authority';
          const phaLocation = [reg.agency?.city, reg.agency?.state].filter(Boolean).join(', ');
          const hasRequirements = reg.w9_required || (reg.additional_docs_required && reg.additional_docs_required.length > 0);
          const needsAction = reg.onboarding_status === 'pending_review' || (hasRequirements && reg.w9_status === 'pending');

          return (
            <Card key={reg.id} className={needsAction ? 'border-amber-500/30' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{phaName}</CardTitle>
                      {phaLocation && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {phaLocation}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RegistrationExport registration={reg} />
                    {getStatusBadge(reg.onboarding_status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Registered Name</p>
                    <p className="text-sm font-medium">{reg.landlord_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">W-9 Status</p>
                    <div className="mt-0.5">{getStatusBadge(reg.w9_status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <Badge variant="outline" className="mt-0.5">
                      <CreditCard className="w-3 h-3 mr-1" />
                      {reg.payment_method === 'ach' ? 'ACH' : reg.payment_method === 'direct_deposit' ? 'Direct Deposit' : 'Check'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registered</p>
                    <p className="text-sm font-medium">{new Date(reg.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Agency Requirements Section */}
                {hasRequirements && reg.onboarding_status !== 'pending_review' && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">PHA Requirements</p>
                    </div>
                    {reg.requirements_notes && (
                      <p className="text-sm text-muted-foreground">{reg.requirements_notes}</p>
                    )}
                    <div className="space-y-2">
                      {reg.w9_required && reg.w9_status === 'pending' && (
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">W-9 Form</span>
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          </div>
                          <div>
                            <Label htmlFor={`w9-${reg.id}`} className="cursor-pointer">
                              <Button variant="outline" size="sm" asChild disabled={uploadingDoc === `${reg.id}-w9`}>
                                <span>
                                  <Upload className="w-3 h-3 mr-1" />
                                  {uploadingDoc === `${reg.id}-w9` ? 'Uploading...' : 'Upload'}
                                </span>
                              </Button>
                            </Label>
                            <input
                              id={`w9-${reg.id}`}
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) handleDocUpload(reg.id, 'w9', f);
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {reg.additional_docs_required?.map((docType) => (
                        <div key={docType} className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{docType}</span>
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          </div>
                          <div>
                            <Label htmlFor={`doc-${reg.id}-${docType}`} className="cursor-pointer">
                              <Button variant="outline" size="sm" asChild>
                                <span><Upload className="w-3 h-3 mr-1" /> Upload</span>
                              </Button>
                            </Label>
                            <input
                              id={`doc-${reg.id}-${docType}`}
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) handleDocUpload(reg.id, docType.replace(/\s+/g, '_').toLowerCase(), f);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expandable Details */}
                <Collapsible open={isExpanded} onOpenChange={() => toggleCard(reg.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-center gap-1 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isExpanded ? 'Show Less' : 'Show Details'}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    {/* Enrolled Units */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Home className="w-4 h-4" /> Enrolled Units ({reg.units?.length || 0})
                      </h4>
                      {reg.units && reg.units.length > 0 ? (
                        <div className="space-y-2">
                          {reg.units.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                              <div>
                                <p className="text-sm font-medium">
                                  {u.property?.address || u.property?.name || 'Property'}
                                  {u.unit?.unit_number && ` — Unit ${u.unit.unit_number}`}
                                </p>
                                {u.property?.city && (
                                  <p className="text-xs text-muted-foreground">
                                    {[u.property.city, u.property.state].filter(Boolean).join(', ')}
                                  </p>
                                )}
                              </div>
                              {u.unit?.monthly_rent && (
                                <span className="text-sm text-muted-foreground">${u.unit.monthly_rent}/mo</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">No units enrolled yet.</p>
                      )}

                      {/* Vacancy Posting */}
                      {reg.onboarding_status === 'active' && (
                        <VacancyPostingForm
                          registrationId={reg.id}
                          agencyId={reg.agency_id}
                          units={(reg.units || []).map(u => ({ id: u.id, property: u.property, unit: u.unit }))}
                        />
                      )}
                    </div>

                    {/* Payment Setup */}
                    {reg.onboarding_status === 'active' && reg.landlord_id && (
                      <PaymentSetupCard
                        registrationId={reg.id}
                        landlordId={reg.landlord_id}
                        paymentMethod={reg.payment_method}
                      />
                    )}

                    {/* Notes */}
                    {reg.notes && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm mt-1">{reg.notes}</p>
                      </div>
                    )}

                    {/* Contact Info */}
                    {reg.agency && (reg.agency.phone || reg.agency.email) && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">PHA Contact</p>
                        {reg.agency.phone && <p className="text-sm">{reg.agency.phone}</p>}
                        {reg.agency.email && <p className="text-sm">{reg.agency.email}</p>}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
