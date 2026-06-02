import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Shield, ScrollText, Calendar, Wrench, FileText, ExternalLink, FileSpreadsheet, Layers, Banknote, Wallet } from 'lucide-react';
import AgencyOperations from './AgencyOperations';
import AgencyAuditTrailTab from './AgencyAuditTrailTab';
import AgencySettings from './AgencySettings';
import AgencyAuditLog from './AgencyAuditLog';
import AgencyCalendar from './AgencyCalendar';
import AgencyWorkOrders from './AgencyWorkOrders';
import AgencyDocumentTemplates from './AgencyDocumentTemplates';
import AgencyPicSubmissions from './AgencyPicSubmissions';
import AgencyGlExports from './AgencyGlExports';
import AgencyProgramsConfig from './AgencyProgramsConfig';
import AgencyPaymentRails from './AgencyPaymentRails';
import AgencyPayouts from './AgencyPayouts';

interface AgencyAdminGroupProps {
  agencyId: string;
  agencySlug?: string;
  agencyName: string;
  staffId: string;
  role: string;
  showOperations: boolean;
  isAdmin: boolean;
  canManage: boolean;
  value?: string;
  onValueChange?: (v: string) => void;
}

/**
 * Admin tab is grouped into 4 sub-areas to avoid the previous 9-peer-tab sprawl:
 *   Schedule        → Calendar, Work Orders               (operational, role-gated)
 *   Configuration   → Settings, Templates, Programs       (admin-only)
 *   Integrations    → HUD PIC, GL Exports, Payment Rails  (admin-only)
 *   Audit           → Audit Trail, Change Log             (admin-only)
 */
const AgencyAdminGroup: React.FC<AgencyAdminGroupProps> = ({
  agencyId, agencySlug, agencyName, staffId, role, showOperations, isAdmin, canManage,
  value, onValueChange,
}) => {
  const tabsProps = value !== undefined ? { value, onValueChange } : { defaultValue: 'schedule' };
  // Default landing tab: schedule for everyone (most operational); admins still see config sub-groups.
  return (
    <Tabs {...tabsProps} className="space-y-4">
      {/* === SCHEDULE === */}
      <TabsContent value="schedule">
        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="h-auto gap-1 flex-wrap">
            <TabsTrigger value="calendar"><Calendar className="w-3.5 h-3.5 mr-1" /> Calendar</TabsTrigger>
            <TabsTrigger value="work_orders"><Wrench className="w-3.5 h-3.5 mr-1" /> Work Orders</TabsTrigger>
          </TabsList>
          <TabsContent value="calendar">
            <AgencyCalendar agencyId={agencyId} staffId={staffId} canManage={canManage} />
          </TabsContent>
          <TabsContent value="work_orders">
            <AgencyWorkOrders agencyId={agencyId} staffId={staffId} canManage={canManage} />
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* === CONFIGURATION === */}
      {isAdmin && (
        <TabsContent value="configuration">
          <Tabs defaultValue="settings" className="space-y-4">
            <TabsList className="h-auto gap-1 flex-wrap">
              <TabsTrigger value="settings"><Settings className="w-3.5 h-3.5 mr-1" /> Settings</TabsTrigger>
              <TabsTrigger value="templates"><FileText className="w-3.5 h-3.5 mr-1" /> Templates</TabsTrigger>
              <TabsTrigger value="programs"><Layers className="w-3.5 h-3.5 mr-1" /> Programs</TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
              <AgencySettings agencyId={agencyId} />
            </TabsContent>
            <TabsContent value="templates">
              <AgencyDocumentTemplates agencyId={agencyId} />
            </TabsContent>
            <TabsContent value="programs">
              <AgencyProgramsConfig agencyId={agencyId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      )}

      {/* === INTEGRATIONS === */}
      {isAdmin && (
        <TabsContent value="integrations">
          <Tabs defaultValue="payment_rails" className="space-y-4">
            <TabsList className="h-auto gap-1 flex-wrap">
              <TabsTrigger value="payment_rails"><Banknote className="w-3.5 h-3.5 mr-1" /> Payment Rails</TabsTrigger>
              <TabsTrigger value="pic"><ExternalLink className="w-3.5 h-3.5 mr-1" /> HUD PIC</TabsTrigger>
              <TabsTrigger value="gl_exports"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> GL Exports</TabsTrigger>
            </TabsList>
            <TabsContent value="payment_rails">
              <AgencyPaymentRails agencyId={agencyId} canManage={canManage} />
            </TabsContent>
            <TabsContent value="pic">
              <AgencyPicSubmissions agencyId={agencyId} />
            </TabsContent>
            <TabsContent value="gl_exports">
              <AgencyGlExports agencyId={agencyId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      )}

      {/* === BACK OFFICE (formerly Operations) === */}
      {showOperations && (
        <TabsContent value="back_office">
          <AgencyOperations agencyId={agencyId} agencySlug={agencySlug} role={role} />
        </TabsContent>
      )}

      {/* === PAYOUTS === */}
      {isAdmin && (
        <TabsContent value="payouts">
          <AgencyPayouts agencyId={agencyId} />
        </TabsContent>
      )}

      {/* === AUDIT === */}
      {isAdmin && (
        <TabsContent value="audit">
          <Tabs defaultValue="audit_trail" className="space-y-4">
            <TabsList className="h-auto gap-1 flex-wrap">
              <TabsTrigger value="audit_trail"><Shield className="w-3.5 h-3.5 mr-1" /> Audit Trail</TabsTrigger>
              <TabsTrigger value="audit_log"><ScrollText className="w-3.5 h-3.5 mr-1" /> Change Log</TabsTrigger>
            </TabsList>
            <TabsContent value="audit_trail">
              <AgencyAuditTrailTab agencyId={agencyId} agencyName={agencyName} />
            </TabsContent>
            <TabsContent value="audit_log">
              <AgencyAuditLog agencyId={agencyId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      )}
    </Tabs>
  );
};

export default AgencyAdminGroup;
