
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { PermissionExplorerControls } from './PermissionExplorerControls';
import { EffectivePermissionsDisplay, DecisionTrace } from './PermissionExplorerResults';
import { PermissionDebugPanel } from './PermissionDebugPanel';
import { PermissionTabErrorBoundary } from './PermissionTabErrorBoundary';
import RbacLogs from '../../pages/admin/RbacLogs';
import { useAccountEffectivePermissions, usePortfolioEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { useAccountPermissionCheck } from '@/hooks/useAccountPermissionCheck';
import { usePortfolioPermissionCheck } from '@/hooks/usePortfolioPermissionCheck';

// Debug logging utility
const debugLog = (component: string, message: string, data?: any) => {
  const debugEnabled = localStorage.getItem('permission-debug:enabled') === 'true';
  if (debugEnabled) {
    console.log(`[${component}] ${message}`, data);
  }
};

export default function PermissionExplorer() {
  // State declarations
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [selectedScope, setSelectedScope] = useState<'account' | 'portfolio'>('account');
  const [selectedObject, setSelectedObject] = useState('');
  const [selectedAction, setSelectedAction] = useState<'view' | 'edit' | 'delete' | 'create'>('view');
  const [inspectionResults, setInspectionResults] = useState<any>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);

  debugLog('PermissionExplorer', 'Component rendered', {
    selectedUserId,
    selectedPortfolioId,
    selectedScope,
    selectedObject,
    selectedAction
  });

  // Queries
  const { data: accountPermissions, isLoading: accountLoading } = useAccountEffectivePermissions();
  const { data: portfolioPermissions, isLoading: portfolioLoading } = usePortfolioEffectivePermissions(
    selectedScope === 'portfolio' ? selectedPortfolioId : null
  );

  const { data: specificAccountCheck, isLoading: specificAccountLoading } = useAccountPermissionCheck(
    selectedObject,
    selectedAction
  );

  const { data: specificPortfolioCheck, isLoading: specificPortfolioLoading } = usePortfolioPermissionCheck(
    selectedScope === 'portfolio' ? selectedPortfolioId : null,
    selectedObject,
    selectedAction
  );

  // Fetch permission objects
  const { data: permissionObjects = [], isLoading: objectsLoading } = useQuery({
    queryKey: ['permission-objects', selectedScope],
    queryFn: async () => {
      debugLog('PermissionExplorer', 'Fetching permission objects', { scope: selectedScope });
      
      const { data, error } = await supabase
        .from('permission_objects')
        .select('name, display_name, category')
        .eq('scope', selectedScope)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) {
        console.error('Error fetching permission objects:', error);
        return [];
      }

      debugLog('PermissionExplorer', 'Permission objects loaded', data);
      return data;
    },
    staleTime: 300000,
  });

  const handleInspect = async () => {
    setInspectionLoading(true);
    
    try {
      debugLog('PermissionExplorer', 'Starting permission inspection', {
        userId: selectedUserId,
        portfolioId: selectedPortfolioId,
        scope: selectedScope,
        object: selectedObject,
        action: selectedAction
      });

      const results = {
        timestamp: new Date().toISOString(),
        userId: selectedUserId,
        portfolioId: selectedPortfolioId,
        scope: selectedScope,
        object: selectedObject,
        action: selectedAction,
        effectivePermissions: selectedScope === 'account' ? accountPermissions : portfolioPermissions,
        specificCheck: selectedScope === 'account' ? specificAccountCheck : specificPortfolioCheck
      };

      debugLog('PermissionExplorer', 'Inspection completed', results);
      setInspectionResults(results);
    } catch (error) {
      console.error('Error during inspection:', error);
      debugLog('PermissionExplorer', 'Inspection failed', error);
    } finally {
      setInspectionLoading(false);
    }
  };

  const effectivePermissions = selectedScope === 'account' ? accountPermissions : portfolioPermissions;
  const effectiveLoading = selectedScope === 'account' ? accountLoading : portfolioLoading;
  const specificCheck = selectedScope === 'account' ? specificAccountCheck : specificPortfolioCheck;
  const specificLoading = selectedScope === 'account' ? specificAccountLoading : specificPortfolioLoading;


  return (
    <div className="space-y-6">
      <PermissionDebugPanel />
      
      <PermissionTabErrorBoundary tabName="Permission Inspector">
        <PermissionExplorerControls
          selectedUserId={selectedUserId}
          selectedPortfolioId={selectedPortfolioId}
          selectedScope={selectedScope}
          selectedObject={selectedObject}
          selectedAction={selectedAction}
          onUserIdChange={setSelectedUserId}
          onPortfolioIdChange={setSelectedPortfolioId}
          onScopeChange={setSelectedScope}
          onObjectChange={setSelectedObject}
          onActionChange={setSelectedAction}
          onInspect={handleInspect}
          loading={inspectionLoading || objectsLoading}
          permissionObjects={permissionObjects}
        />

        <DecisionTrace
          userId={selectedUserId}
          scope={selectedScope}
          portfolioId={selectedPortfolioId}
          objectName={selectedObject}
          action={selectedAction}
          result={!!specificCheck}
        />
      </PermissionTabErrorBoundary>
    </div>
  );
}
