import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, ClipboardCheck, FileText, Send, Package, FileSpreadsheet } from 'lucide-react';
import AgencyW9ReviewQueue from '@/components/tax/AgencyW9ReviewQueue';
import { Tax1099Dashboard } from '@/components/tax/Tax1099Dashboard';
import { IRSEfilePanel } from '@/components/tax/IRSEfilePanel';
import Reconciliation1099Panel from '@/components/tax/Reconciliation1099Panel';
import VMSSubmissionsTab from '@/components/agency/vms/VMSSubmissionsTab';

interface Props {
  agencyId: string;
  staffUserId: string;
  portfolioId?: string;
}

const AgencyTaxCenter: React.FC<Props> = ({ agencyId, staffUserId, portfolioId }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" />Tax Center</CardTitle>
              <CardDescription>W-9 collection, 1099 forms, IRS e-filing, and year-end bundles.</CardDescription>
            </div>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0,1,2,3].map(o => <SelectItem key={o} value={String(currentYear-o)}>Tax Year {currentYear-o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="w9" className="space-y-4">
        <TabsList>
          <TabsTrigger value="w9"><ClipboardCheck className="w-4 h-4 mr-1" />W-9 Queue</TabsTrigger>
          <TabsTrigger value="forms"><FileText className="w-4 h-4 mr-1" />1099 Forms</TabsTrigger>
          <TabsTrigger value="iris"><Send className="w-4 h-4 mr-1" />IRS E-File</TabsTrigger>
          <TabsTrigger value="vms"><FileSpreadsheet className="w-4 h-4 mr-1" />HUD VMS</TabsTrigger>
          <TabsTrigger value="bundles"><Package className="w-4 h-4 mr-1" />Year-End Bundles</TabsTrigger>
        </TabsList>

        <TabsContent value="w9">
          <AgencyW9ReviewQueue agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="forms">
          <div className="space-y-4">
            <Reconciliation1099Panel agencyId={agencyId} taxYear={year} />
            <Tax1099Dashboard portfolioId={portfolioId} taxYear={year} userId={staffUserId} />
          </div>
        </TabsContent>

        <TabsContent value="iris">
          {portfolioId ? (
            <IRSEfilePanel portfolioId={portfolioId} userId={staffUserId} taxYear={year} />
          ) : (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              Configure a portfolio tax profile first to enable IRS e-filing.
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="vms">
          <VMSSubmissionsTab agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="bundles">
          <Card>
            <CardHeader>
              <CardTitle>Year-End Statement Bundles</CardTitle>
              <CardDescription>
                Combined PDFs containing each landlord's monthly HAP statements plus their 1099 forms for the tax year.
                Bundles are generated on-demand from each landlord's profile or via the Landlord 1099 Summary panel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Open any landlord's 1099 Summary to download their year-end bundle. Bulk generation will be added in a follow-up release.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgencyTaxCenter;
