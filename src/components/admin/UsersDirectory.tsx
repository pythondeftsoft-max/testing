
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Users, Search, Filter } from 'lucide-react';
import { User } from '@/types';
import { createUsersColumns } from './users-columns';
import EnhancedUserProfile from './EnhancedUserProfile';

// Mock data for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'tenant',
    tenant_info: {
      housing_status: 'searching'
    }
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'landlord'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    role: 'tenant',
    tenant_info: {
      housing_status: 'housed'
    }
  }
];

const UsersDirectory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsProfileOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileOpen(false);
    setSelectedUser(null);
  };

  const columns = createUsersColumns({ onViewDetails: handleViewDetails });

  const filteredUsers = mockUsers.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Directory
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage and view detailed information about all users
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>

          {/* Users Table */}
          <DataTable columns={columns} data={filteredUsers} />
        </CardContent>
      </Card>

      {/* Enhanced User Profile Sheet */}
      <EnhancedUserProfile
        isOpen={isProfileOpen}
        onClose={handleCloseProfile}
        user={selectedUser}
      />
    </>
  );
};

export default UsersDirectory;
