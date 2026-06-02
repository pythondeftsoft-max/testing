import React, { useEffect } from 'react';
import { SecurityDashboard } from '@/components/enterprise/SecurityDashboard';
import { MfaEnrollmentWidget } from '@/components/admin/MfaEnrollmentWidget';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, FileSearch, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SecurityDashboardPage = () => {
  const { logSecurityAccess } = useAdminAudit();
  const { data: isAdmin, isLoading } = useAdminCheck();

  useEffect(() => {
    logSecurityAccess('security_dashboard_page_view');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Enterprise Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor security incidents, compliance status, user sessions, and backup operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/compliance"><Shield className="h-4 w-4 mr-2" />HUD Compliance Center</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/security/pii-access-log"><FileSearch className="h-4 w-4 mr-2" />PII Access Log</Link>
          </Button>
        </div>
      </div>

      <MfaEnrollmentWidget />
      <SecurityDashboard />
    </div>
  );
};

export default SecurityDashboardPage;