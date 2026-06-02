
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Crown, Shield, Users, Settings } from 'lucide-react';
import { AccountRoleType } from '@/hooks/useAccountRoles';

interface RoleSelectorProps {
  selectedRole?: AccountRoleType;
  onRoleSelect: (role: AccountRoleType) => void;
  onEditPermissions?: (role: AccountRoleType) => void;
}

const roleConfigs = {
  owner: {
    label: 'Owner',
    description: 'Full access to all features and settings',
    icon: Crown,
    color: 'from-blue-600 to-blue-700',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    features: [
      'Complete system access',
      'User management',
      'Billing & subscriptions',
      'Security settings',
      'All property operations'
    ]
  },
  admin_partner: {
    label: 'Admin Partner',
    description: 'Administrative access with some restrictions',
    icon: Shield,
    color: 'from-amber-500 to-amber-600',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
    features: [
      'Property management',
      'Tenant operations',
      'Maintenance coordination',
      'Basic reporting',
      'Limited financial access'
    ]
  },
  support_assistant: {
    label: 'Support Assistant',
    description: 'Limited access focused on support tasks',
    icon: Users,
    color: 'from-slate-500 to-slate-600',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    bgColor: 'bg-slate-50',
    features: [
      'View properties & tenants',
      'Create maintenance requests',
      'Basic contact management',
      'Limited editing rights',
      'No financial access'
    ]
  }
};

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleSelect,
  onEditPermissions,
}) => {
  const roles = Object.keys(roleConfigs) as AccountRoleType[];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => {
          const config = roleConfigs[role];
          const Icon = config.icon;
          const isSelected = selectedRole === role;
          
          return (
            <Card
              key={role}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? `${config.borderColor} border-2 ${config.bgColor}` 
                  : 'border border-border hover:border-primary/50'
              }`}
              onClick={() => onRoleSelect(role)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${config.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {config.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium text-foreground">Key Features:</h4>
                  <ul className="space-y-1">
                    {config.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-current rounded-full flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {isSelected && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPermissions?.(role);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Permissions
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {selectedRole && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              {roleConfigs[selectedRole].label} Selected
            </h3>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            {roleConfigs[selectedRole].description}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditPermissions?.(selectedRole)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Permissions
            </Button>
            <Badge className={`bg-gradient-to-r ${roleConfigs[selectedRole].color} text-white`}>
              Currently Selected
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};
