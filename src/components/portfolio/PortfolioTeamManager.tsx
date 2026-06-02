
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Settings } from 'lucide-react';
import PortfolioRoleManager from './PortfolioRoleManager';
import { PortfolioRoleSelector } from '@/components/permissions/PortfolioRoleSelector';
import { PortfolioPermissionsGrid } from '@/components/permissions/PortfolioPermissionsGrid';
import { PortfolioRoleType } from '@/hooks/usePortfolioRoles';

interface PortfolioTeamManagerProps {
  portfolioId: string;
  currentUserId: string;
}

export const PortfolioTeamManager: React.FC<PortfolioTeamManagerProps> = ({
  portfolioId,
  currentUserId,
}) => {
  const [selectedRole, setSelectedRole] = useState<PortfolioRoleType | undefined>();
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);

  const handleRoleSelect = (role: PortfolioRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(false);
  };

  const handleEditPermissions = (role: PortfolioRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(true);
  };

  const handlePermissionsSave = () => {
    setIsEditingPermissions(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-amber-500 p-2 rounded-lg shadow-md">
              <Shield className="h-6 w-6 text-white" />
            </div>
            Portfolio Team Management
          </h2>
          <p className="text-blue-600 mt-2">
            Manage team members and configure role permissions for this portfolio
          </p>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-blue-50/50 border border-blue-200/50 rounded-lg p-1 h-12">
          <TabsTrigger 
            value="members" 
            className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white rounded-md transition-all h-10 text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger 
            value="permissions" 
            className="flex items-center gap-2 data-[state=active]:bg-openkey-blue data-[state=active]:text-white rounded-md transition-all h-10 text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Role Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card className="border-blue-200/50 shadow-sm bg-white/50">
            <CardHeader className="bg-gradient-to-r from-blue-600/10 to-amber-500/10">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members & Invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <PortfolioRoleManager
                portfolioId={portfolioId}
                currentUserId={currentUserId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card className="border-blue-200/50 shadow-sm bg-white/50">
            <CardHeader className="bg-gradient-to-r from-blue-600/10 to-amber-500/10">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Role Permission Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">Select Role to Configure</h3>
                  <PortfolioRoleSelector
                    selectedRole={selectedRole}
                    onRoleSelect={handleRoleSelect}
                    onEditPermissions={handleEditPermissions}
                  />
                </div>

                {selectedRole && (
                  <div className="border-t border-blue-200/50 pt-6">
                    <PortfolioPermissionsGrid
                      selectedRole={selectedRole}
                      isEditing={isEditingPermissions}
                      onEditToggle={setIsEditingPermissions}
                      onSave={handlePermissionsSave}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
