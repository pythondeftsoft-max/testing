
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ObjectSelector } from './ObjectSelector';
import { Search, User, Shield, Building2, Eye, Edit, Plus, Trash2 } from 'lucide-react';

// Export individual components for EffectivePermissionsInspector
export const UserSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <div className="space-y-2">
    <Label htmlFor="userId" className="flex items-center gap-2">
      <User className="h-4 w-4" />
      User ID
    </Label>
    <Input
      id="userId"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter user ID..."
      disabled={disabled}
    />
  </div>
);

export const PortfolioSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <div className="space-y-2">
    <Label htmlFor="portfolioId">Portfolio ID</Label>
    <Input
      id="portfolioId"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter portfolio ID..."
      disabled={disabled}
    />
  </div>
);

export const ActionSelector: React.FC<{
  value: 'view' | 'edit' | 'create' | 'delete';
  onChange: (value: 'view' | 'edit' | 'create' | 'delete') => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view': return <Eye className="h-3 w-3" />;
      case 'edit': return <Edit className="h-3 w-3" />;
      case 'create': return <Plus className="h-3 w-3" />;
      case 'delete': return <Trash2 className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {getActionIcon(value)}
        Action
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="view">
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3" />
              View
            </div>
          </SelectItem>
          <SelectItem value="edit">
            <div className="flex items-center gap-2">
              <Edit className="h-3 w-3" />
              Edit
            </div>
          </SelectItem>
          <SelectItem value="create">
            <div className="flex items-center gap-2">
              <Plus className="h-3 w-3" />
              Create
            </div>
          </SelectItem>
          <SelectItem value="delete">
            <div className="flex items-center gap-2">
              <Trash2 className="h-3 w-3" />
              Delete
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// Re-export ObjectSelector for convenience
export { ObjectSelector } from './ObjectSelector';

interface PermissionExplorerControlsProps {
  selectedUserId: string;
  selectedPortfolioId: string;
  selectedScope: 'account' | 'portfolio';
  selectedObject: string;
  selectedAction: 'view' | 'edit' | 'create' | 'delete';
  onUserIdChange: (userId: string) => void;
  onPortfolioIdChange: (portfolioId: string) => void;
  onScopeChange: (scope: 'account' | 'portfolio') => void;
  onObjectChange: (object: string) => void;
  onActionChange: (action: 'view' | 'edit' | 'create' | 'delete') => void;
  onInspect: () => void;
  loading?: boolean;
  permissionObjects?: Array<{
    name: string;
    display_name: string;
    category?: string;
  }>;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'view': return <Eye className="h-3 w-3" />;
    case 'edit': return <Edit className="h-3 w-3" />;
    case 'create': return <Plus className="h-3 w-3" />;
    case 'delete': return <Trash2 className="h-3 w-3" />;
    default: return <Shield className="h-3 w-3" />;
  }
};

export const PermissionExplorerControls: React.FC<PermissionExplorerControlsProps> = ({
  selectedUserId,
  selectedPortfolioId,
  selectedScope,
  selectedObject,
  selectedAction,
  onUserIdChange,
  onPortfolioIdChange,
  onScopeChange,
  onObjectChange,
  onActionChange,
  onInspect,
  loading = false,
  permissionObjects = []
}) => {
  // Debug logging
  console.log('PermissionExplorerControls rendered:', {
    selectedUserId,
    selectedPortfolioId,
    selectedScope,
    selectedObject,
    selectedAction,
    permissionObjects: permissionObjects?.length,
    loading
  });

  const handleScopeChange = (value: string) => {
    if (value === '__loading') return;
    console.log('Scope changed:', value);
    onScopeChange(value as 'account' | 'portfolio');
  };

  const handleActionChange = (value: string) => {
    if (value === '__loading') return;
    console.log('Action changed:', value);
    onActionChange(value as 'view' | 'edit' | 'create' | 'delete');
  };

  const handleObjectChange = (value: string) => {
    if (value === '__loading' || value === '__all') return;
    console.log('Object changed:', value);
    onObjectChange(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Permission Inspector
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* User ID */}
          <UserSearch
            value={selectedUserId}
            onChange={onUserIdChange}
            disabled={loading}
          />

          {/* Scope */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Scope
            </Label>
            <Select value={selectedScope} onValueChange={handleScopeChange} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Portfolio ID (only if scope is portfolio) */}
          {selectedScope === 'portfolio' && (
            <PortfolioSelector
              value={selectedPortfolioId}
              onChange={onPortfolioIdChange}
              disabled={loading}
            />
          )}

          {/* Object */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Object
            </Label>
            <ObjectSelector
              value={selectedObject}
              onValueChange={handleObjectChange}
              objects={permissionObjects}
              placeholder="Select object..."
              disabled={loading}
            />
          </div>

          {/* Action */}
          <ActionSelector
            value={selectedAction}
            onChange={onActionChange}
            disabled={loading}
          />
        </div>

        <Button 
          onClick={onInspect} 
          disabled={loading || !selectedUserId || !selectedObject || !selectedAction}
          className="w-full"
        >
          {loading ? 'Inspecting...' : 'Inspect Permissions'}
        </Button>
      </CardContent>
    </Card>
  );
};
