
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCog, UserCheck, Mail } from 'lucide-react';
import UserManagementHub from './UserManagementHub';
import RoleManagementTab from './RoleManagementTab';
import InvitationManagementTab from './InvitationManagementTab';

const DirectorySection = () => {
  const [activeTab, setActiveTab] = useState('user-management');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Management
        </CardTitle>
        <p className="text-sm text-gray-600">
          Manage users, roles, and permissions
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-50">
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="role-management" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Role Management
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Invite Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user-management" className="space-y-6">
            <UserManagementHub />
          </TabsContent>

          <TabsContent value="role-management" className="space-y-6">
            <RoleManagementTab />
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            <InvitationManagementTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DirectorySection;
