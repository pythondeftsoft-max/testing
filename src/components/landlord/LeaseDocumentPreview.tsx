import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { generateLeasePDF } from '@/utils/leasePDFGenerator';

interface LeaseDocumentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  propertyAddress: string;
  unitNumber?: string;
  monthlyRent: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  landlordSignature?: string;
  landlordSignedAt?: string;
  tenantSignature?: string;
  tenantSignedAt?: string;
}

export const LeaseDocumentPreview = ({
  open,
  onOpenChange,
  tenantName,
  propertyAddress,
  unitNumber,
  monthlyRent,
  leaseStartDate,
  leaseEndDate,
  landlordSignature,
  landlordSignedAt,
  tenantSignature,
  tenantSignedAt,
}: LeaseDocumentPreviewProps) => {
  const startDate = leaseStartDate || new Date().toLocaleDateString();
  const endDate = leaseEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString();
  
  const handleDownloadPDF = () => {
    generateLeasePDF({
      tenantName,
      propertyAddress,
      unitNumber,
      monthlyRent,
      leaseStartDate,
      leaseEndDate,
      landlordSignature,
      landlordSignedAt,
      tenantSignature,
      tenantSignedAt,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Residential Lease Agreement Preview
            </DialogTitle>
            <Button 
              onClick={handleDownloadPDF} 
              variant="outline" 
              size="sm"
              className="gap-2 mr-12"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6 text-sm">
            {/* Header */}
            <div className="text-center space-y-2 pb-4 border-b">
              <h2 className="text-xl font-bold">RESIDENTIAL LEASE AGREEMENT</h2>
              <p className="text-muted-foreground">This lease is entered into and effective as of {startDate}</p>
            </div>

            {/* Parties */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">PARTIES</h3>
              <p>This Lease Agreement ("Lease") is made between:</p>
              <div className="pl-4 space-y-1">
                <p><span className="font-medium">Landlord/Property Manager:</span> OpenKey Property Management</p>
                <p><span className="font-medium">Tenant:</span> {tenantName}</p>
              </div>
            </section>

            {/* Property */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">PROPERTY</h3>
              <p>The Landlord agrees to lease to the Tenant the following property:</p>
              <div className="pl-4 space-y-1">
                <p><span className="font-medium">Address:</span> {propertyAddress}</p>
                {unitNumber && <p><span className="font-medium">Unit:</span> {unitNumber}</p>}
              </div>
            </section>

            {/* Term */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">TERM</h3>
              <p>The term of this Lease shall be:</p>
              <div className="pl-4 space-y-1">
                <p><span className="font-medium">Start Date:</span> {startDate}</p>
                <p><span className="font-medium">End Date:</span> {endDate}</p>
              </div>
            </section>

            {/* Rent */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">RENT</h3>
              <p>The Tenant agrees to pay rent as follows:</p>
              <div className="pl-4 space-y-1">
                <p><span className="font-medium">Monthly Rent:</span> ${monthlyRent.toFixed(2)}</p>
                <p><span className="font-medium">Due Date:</span> First day of each month</p>
                <p><span className="font-medium">Payment Method:</span> Electronic payment through OpenKey platform</p>
              </div>
            </section>

            {/* Security Deposit */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">SECURITY DEPOSIT</h3>
              <p>A security deposit in the amount of ${monthlyRent.toFixed(2)} shall be paid by the Tenant to the Landlord upon execution of this Lease. The security deposit will be held in accordance with applicable state laws and returned to the Tenant within the timeframe required by law, less any lawful deductions for damages beyond normal wear and tear.</p>
            </section>

            {/* Use of Premises */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">USE OF PREMISES</h3>
              <p>The Tenant shall use the property as a residential dwelling only and shall not use or permit the property to be used for any other purpose without the prior written consent of the Landlord.</p>
            </section>

            {/* Maintenance and Repairs */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">MAINTENANCE AND REPAIRS</h3>
              <p>The Landlord shall be responsible for maintaining the property in habitable condition and making necessary repairs to keep the property safe and functional, except for damages caused by the Tenant's negligence or misuse.</p>
              <p>The Tenant shall:</p>
              <ul className="list-disc pl-8 space-y-1">
                <li>Keep the property clean and sanitary</li>
                <li>Dispose of all waste properly</li>
                <li>Use all appliances and facilities in a reasonable manner</li>
                <li>Not damage or remove any part of the property</li>
                <li>Notify the Landlord promptly of any needed repairs</li>
              </ul>
            </section>

            {/* Utilities */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">UTILITIES</h3>
              <p>The Tenant shall be responsible for arranging and paying for all utilities and services, including but not limited to electricity, gas, water, sewer, trash collection, telephone, and internet, unless otherwise specified in writing by the Landlord.</p>
            </section>

            {/* Pets */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">PETS</h3>
              <p>No pets shall be kept on the premises without the prior written consent of the Landlord. If permission is granted, the Tenant may be required to pay an additional pet deposit and/or monthly pet rent.</p>
            </section>

            {/* Entry and Inspection */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">ENTRY AND INSPECTION</h3>
              <p>The Landlord or Landlord's agents may enter the property at reasonable times to inspect, make repairs, show the property to prospective tenants or buyers, or for any other lawful purpose. Except in cases of emergency, the Landlord shall provide at least 24 hours notice before entering.</p>
            </section>

            {/* Termination */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">TERMINATION</h3>
              <p>Either party may terminate this Lease by providing written notice as required by law. Early termination by the Tenant may result in forfeiture of the security deposit and liability for rent due through the end of the Lease term, unless otherwise agreed upon in writing.</p>
            </section>

            {/* Default */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">DEFAULT</h3>
              <p>If the Tenant fails to pay rent when due or breaches any other term of this Lease, the Landlord may pursue all remedies available under law, including eviction and recovery of damages.</p>
            </section>

            {/* Governing Law */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">GOVERNING LAW</h3>
              <p>This Lease shall be governed by and construed in accordance with the laws of the state in which the property is located.</p>
            </section>

            {/* Entire Agreement */}
            <section className="space-y-2">
              <h3 className="font-semibold text-base">ENTIRE AGREEMENT</h3>
              <p>This Lease constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. This Lease may only be modified in writing signed by both parties.</p>
            </section>

            {/* Signatures */}
            <section className="space-y-4 pt-6 mt-6 border-t">
              <h3 className="font-semibold text-base">SIGNATURES</h3>
              <p className="text-muted-foreground italic">This document will be electronically signed through the OpenKey platform.</p>
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="space-y-2">
                  <p className="font-medium">Landlord</p>
                  <div className="border-t border-foreground/20 pt-2 min-h-[40px]">
                    {landlordSignature ? (
                      <p className="font-serif text-lg italic">{landlordSignature}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Signature pending</p>
                    )}
                  </div>
                  <div className="border-t border-foreground/20 pt-2">
                    {landlordSignedAt ? (
                      <p className="text-sm">{new Date(landlordSignedAt).toLocaleDateString()}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Date</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Tenant: {tenantName}</p>
                  <div className="border-t border-foreground/20 pt-2 min-h-[40px]">
                    {tenantSignature ? (
                      <p className="font-serif text-lg italic">{tenantSignature}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Signature pending</p>
                    )}
                  </div>
                  <div className="border-t border-foreground/20 pt-2">
                    {tenantSignedAt ? (
                      <p className="text-sm">{new Date(tenantSignedAt).toLocaleDateString()}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Date</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
