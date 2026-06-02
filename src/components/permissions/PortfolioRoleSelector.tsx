
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Eye, Wrench } from 'lucide-react';
import { PortfolioRoleType } from '@/hooks/usePortfolioRoles';

interface PortfolioRoleSelectorProps {
  selectedRole?: PortfolioRoleType;
  onRoleSelect: (role: PortfolioRoleType) => void;
  onEditPermissions: (role: PortfolioRoleType) => void;
}

const roleConfigs = {
  admin_partner: {
    name: 'Admin Partner',
    description: 'Full access to all portfolio features and settings',
    icon: Settings,
    color: 'from-blue-600 to-blue-700',
    badgeColor: 'bg-transparent text-black border border-gray-300',
  },
  editor: {
    name: 'Editor',
    description: 'Can manage most portfolio content but not settings',
    icon: Users,
    color: 'from-yellow-500 to-yellow-600',
    badgeColor: 'bg-transparent text-black border border-gray-300',
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to portfolio content',
    icon: Eye,
    color: 'from-blue-400 to-blue-500',
    badgeColor: 'bg-transparent text-black border border-gray-300',
  },
  maintenance: {
    name: 'Maintenance',
    description: 'Limited access focused on maintenance tasks',
    icon: Wrench,
    color: 'from-yellow-400 to-yellow-500',
    badgeColor: 'bg-transparent text-black border border-gray-300',
  },
};

export const PortfolioRoleSelector: React.FC<PortfolioRoleSelectorProps> = ({
  selectedRole,
  onRoleSelect,
  onEditPermissions,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(roleConfigs).map(([roleKey, config]) => {
        const role = roleKey as PortfolioRoleType;
        const Icon = config.icon;
        const isSelected = selectedRole === role;

        return (
          <Card 
            key={role}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected 
                ? 'ring-2 ring-blue-600 bg-gradient-to-br from-blue-50 to-yellow-50/30 border-blue-600' 
                : 'hover:bg-blue-50/30 border-blue-200/50 bg-white/50'
            }`}
            onClick={() => onRoleSelect(role)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full bg-gradient-to-r ${config.color} text-white shadow-sm`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-blue-800">{config.name}</CardTitle>
                    <Badge className={`mt-1 ${config.badgeColor} hover:bg-gray-50`}>
                      {role}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-600 mb-4">
                {config.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPermissions(role);
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Permissions
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
