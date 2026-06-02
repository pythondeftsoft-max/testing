
import React, { useState } from 'react';
import UserManagementTable from './UserManagementTable';
import EnhancedUserProfile from './EnhancedUserProfile';
import { AdminUser } from '@/hooks/useAdminUsersDirectory';

const UserManagementHub = () => {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  const handleViewProfile = (user: AdminUser) => {
    setSelectedUser(user);
    setIsUserProfileOpen(true);
  };

  const handleEditProfile = () => {
    setIsUserProfileOpen(false);
  };

  return (
    <>
      <UserManagementTable onViewProfile={handleViewProfile} />
      
      {selectedUser && (
        <EnhancedUserProfile
          isOpen={isUserProfileOpen}
          onClose={() => setIsUserProfileOpen(false)}
          user={{
            id: selectedUser.id,
            name: `${selectedUser.first_name} ${selectedUser.last_name}`,
            email: selectedUser.email,
            phone: selectedUser.phone,
            role: selectedUser.user_type as any,
          }}
          onEditProfile={handleEditProfile}
        />
      )}
    </>
  );
};

export default UserManagementHub;
