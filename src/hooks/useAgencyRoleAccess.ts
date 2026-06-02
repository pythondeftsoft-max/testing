import { useMemo } from 'react';
import { useAgencyPermissions } from './useAgencyPermissions';

/**
 * Centralized role-gating for the agency portal.
 * Wraps useAgencyPermissions and exposes high-level booleans used by the
 * dashboard shell (which top-level groups are visible) plus helpers.
 *
 * This is purely a refactor — behavior matches the inline checks that
 * previously lived in AgencyDashboardContent.
 */
export function useAgencyRoleAccess(role: string) {
  const perms = useAgencyPermissions(role);
  const { canView, canEdit, canCreate, loading } = perms;

  const flags = useMemo(() => {
    const isInspector = role === 'inspector';
    const isCaseworker = role === 'caseworker';
    const isAdmin = role === 'agency_admin';
    const isFinance = role === 'finance';

    const canManage =
      isAdmin ||
      isCaseworker ||
      role === 'caseworker_supervisor' ||
      role === 'inspection_supervisor';

    const showCaseload =
      canView('waitlist') ||
      canView('caseload') ||
      canView('rfta') ||
      canView('placements') ||
      canView('recertifications');

    const showCompliance =
      canView('inspections') ||
      canView('properties') ||
      isAdmin ||
      canView('caseload');

    const showFinance =
      isAdmin ||
      canView('placements') ||
      canView('hap_batching') ||
      canView('caseload');

    const showComms = canView('caseload') || isAdmin || canView('reports');
    const showAdmin = isAdmin;

    const defaultTab = isInspector ? 'compliance' : isCaseworker ? 'caseload' : 'overview';

    return {
      isInspector,
      isCaseworker,
      isAdmin,
      isFinance,
      canManage,
      showCaseload,
      showCompliance,
      showFinance,
      showComms,
      showAdmin,
      defaultTab,
    };
  }, [role, canView]);

  return { ...flags, canView, canEdit, canCreate, loading };
}
