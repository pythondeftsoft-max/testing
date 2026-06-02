import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit3, Shield, Users, Settings } from 'lucide-react';
import { AccountRoleType } from '@/hooks/useAccountRoles';

interface AccountRoleSelectorProps {
  selectedRole?: AccountRoleType;
  onRoleSelect: (role: AccountRoleType) => void;
  onEditPermissions: (role: AccountRoleType) => void;
}

const accountRoles: Array<{
  role: AccountRoleType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    role: 'owner',
    name: 'Account Owner',
    description: 'Full control over the account, billing, and all settings',
    icon: Shield,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    role: 'admin_partner',
    name: 'Admin Partner',
    description: 'Administrative access to user management and account settings',
    icon: Users,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    role: 'support_assistant',
    name: 'Support Assistant',
    description: 'Limited access to view user data and system logs for support',
    icon: Settings,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
];

export const AccountRoleSelector: React.FC<AccountRoleSelectorProps> = ({
  selectedRole,
  onRoleSelect,
  onEditPermissions,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {accountRoles.map(({ role, name, description, icon: Icon, color }) => {
        const isSelected = selectedRole === role;
        
        return (
          <Card
            key={role}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary shadow-md' : ''
            }`}
            onClick={() => onRoleSelect(role)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <Badge variant="outline" className={color}>
                    {name}
                  </Badge>
                </div>
                
                {isSelected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPermissions(role);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">{description}</p>
              
              {isSelected && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-primary font-medium">
                    Selected - Click "Edit Permissions" to configure
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};