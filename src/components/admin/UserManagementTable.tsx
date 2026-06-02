import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Search, Eye, MoreHorizontal, Settings, RotateCcw, Coins, UserMinus, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useAdminUsersDirectory, useAdminUserCounts, AdminUser } from '@/hooks/useAdminUsersDirectory';
import { useDebounce } from '@/hooks/useDebounce';
import PointAdjustmentModal from './PointAdjustmentModal';
import UserSearchAutocomplete from './UserSearchAutocomplete';
import EditUserModal from './EditUserModal';
import ChangePasswordDialog from './ChangePasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUsersPmMode } from '@/hooks/useUserPmMode';

interface UserManagementTableProps {
  onViewProfile?: (user: AdminUser) => void;
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ onViewProfile }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>(''); // '', 'all', 'pm', 'listing'
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, userTypeFilter, statusFilter, modeFilter]);

  const { data: rawUsers = [], isLoading, error } = useAdminUsersDirectory({
    searchQuery: debouncedSearch,
    userTypeFilter: userTypeFilter === 'all' ? undefined : userTypeFilter || undefined,
    statusFilter: statusFilter === 'all' ? undefined : statusFilter || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize
  });

  // Bulk-fetch PM mode flags for visible landlords on this page
  const landlordIds = rawUsers.filter(u => u.user_type === 'landlord').map(u => u.id);
  const { data: pmModeMap = {} } = useUsersPmMode(landlordIds);

  // Apply client-side mode filter (only meaningful for landlords)
  const users = rawUsers.filter((u) => {
    if (!modeFilter || modeFilter === 'all') return true;
    if (u.user_type !== 'landlord') return false;
    const isPm = !!pmModeMap[u.id];
    return modeFilter === 'pm' ? isPm : !isPm;
  });

  // Get total count for pagination
  const { data: userCounts } = useAdminUserCounts();

  const handleManagePoints = (user: AdminUser) => {
    setSelectedUser(user);
    setIsPointsModalOpen(true);
  };

  const handleViewDetails = (user: AdminUser) => {
    onViewProfile?.(user);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditUser(user);
    setIsEditModalOpen(true);
  };

  const handleSetPasswordDirectly = (user: AdminUser) => {
    setPasswordResetUser(user);
    setIsPasswordDialogOpen(true);
  };

  const handleResetPassword = async (user: AdminUser) => {
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: user.email,
          redirectTo: `${window.location.origin}/auth?mode=reset-password`,
        }
      });

      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: `Password reset email sent to ${user.email}`,
      });
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email.",
        variant: "destructive",
      });
    }
  };

  const handleImpersonateUser = async (user: AdminUser) => {
    // Prevent impersonating admins
    if (user.user_type === 'admin') {
      toast({
        title: "Cannot impersonate admin",
        description: "Admin accounts cannot be impersonated for security reasons.",
        variant: "destructive",
      });
      return;
    }

    // Confirm impersonation
    const confirmed = window.confirm(
      `Are you sure you want to impersonate ${user.first_name} ${user.last_name}?\n\nYou will be logged in as this user and can perform actions on their behalf.`
    );

    if (!confirmed) return;

    try {
      // Get current admin session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active admin session');
      }

      // Call edge function to create impersonation session
      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: {
          target_user_id: user.id,
          target_user_email: user.email,
        }
      });

      if (error) throw error;

      // Store impersonation data
      const { storeImpersonationData } = await import('@/utils/impersonationUtils');
      storeImpersonationData(session, {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type,
      });

      // Sign out current admin session
      await supabase.auth.signOut();

      // Sign in as target user using the token hash (NO password change needed)
      const { error: signInError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'email',
      });

      if (signInError) throw signInError;

      toast({
        title: "Impersonation Started",
        description: `You are now logged in as ${user.first_name} ${user.last_name}`,
      });

      // Redirect based on user type
      const { getRedirectUrlForUserType } = await import('@/utils/impersonationUtils');
      const redirectUrl = getRedirectUrlForUserType(user.user_type);
      
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);

    } catch (error: any) {
      console.error('Error impersonating user:', error);
      toast({
        title: "Impersonation Failed",
        description: error.message || "Failed to impersonate user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getUserTypeVariant = (userType: string) => {
    switch (userType) {
      case 'landlord': return 'default';
      case 'tenant': return 'secondary';
      case 'admin': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'invited': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return <span className="text-muted-foreground">Never</span>;
    }
    const date = new Date(dateString);
    return (
      <div className="text-sm">
        <div>{date.toLocaleDateString()}</div>
        <div className="text-xs text-muted-foreground">
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  };

  const formatPoints = (points: number) => {
    return points.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={userTypeFilter || 'all'} onValueChange={setUserTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="User Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="landlord">Landlord</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter || 'all'} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select value={modeFilter || 'all'} onValueChange={setModeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="pm">PM mode</SelectItem>
              <SelectItem value="listing">Listing mode</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="text-destructive">
          Error loading users: {error.message}
        </div>
      )}

      {/* Pagination Controls */}
      {(() => {
        const totalUsers = userCounts?.total || 0;
        const totalPages = Math.ceil(totalUsers / pageSize);
        const startItem = totalUsers === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalUsers);

        return (
          <div className="flex items-center justify-between py-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={pageSize.toString()} onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
              <span className="text-sm text-muted-foreground ml-4">
                Showing {startItem}-{endItem} of {totalUsers} users
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })()}

      <div className="rounded-md border">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getUserTypeVariant(user.user_type)}>
                        {user.user_type}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {user.user_type === 'landlord' ? (
                        pmModeMap[user.id] ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                            PM
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Listing</Badge>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getStatusVariant(user.account_status)}>
                        {user.account_status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="font-mono">
                      {formatPoints(user.total_points)}
                    </TableCell>
                    
                    <TableCell>
                      {formatDate(user.last_sign_in_at)}
                    </TableCell>
                    
                    <TableCell>
                      {formatDate(user.created_at)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Profile
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Settings className="w-4 h-4 mr-2" />
                            Edit Profile
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleManagePoints(user)}>
                            <Coins className="w-4 h-4 mr-2" />
                            Manage Points
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleSetPasswordDirectly(user)}>
                            <KeyRound className="w-4 h-4 mr-2" />
                            Set Password Directly
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Send Password Reset
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {user.user_type !== 'admin' && (
                            <DropdownMenuItem 
                              onClick={() => handleImpersonateUser(user)}
                              className="text-blue-600 focus:text-blue-600"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Impersonate User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      {/* Points Management Modal */}
      {selectedUser && (
        <PointAdjustmentModal
          isOpen={isPointsModalOpen}
          onClose={() => {
            setIsPointsModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          currentPoints={selectedUser.total_points}
        />
      )}

      {/* Edit User Modal */}
      {editUser && (
        <EditUserModal
          user={{
            id: editUser.id,
            first_name: editUser.first_name,
            last_name: editUser.last_name,
            email: editUser.email,
            user_type: editUser.user_type,
            company_name: '',
            phone: '',
            status: editUser.account_status,
            account_status: editUser.account_status,
            housing_status: 'seeking',
          }}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditUser(null);
          }}
          onUserUpdated={() => {
            // Invalidate and refetch the admin users directory
            queryClient.invalidateQueries({ queryKey: ['admin-users-directory'] });
          }}
          onViewProfile={() => {
            if (editUser) {
              handleViewDetails(editUser);
            }
          }}
        />
      )}

      {/* Change Password Dialog */}
      {passwordResetUser && (
        <ChangePasswordDialog
          isOpen={isPasswordDialogOpen}
          onClose={() => {
            setIsPasswordDialogOpen(false);
            setPasswordResetUser(null);
          }}
          userId={passwordResetUser.id}
          userEmail={passwordResetUser.email}
          userName={`${passwordResetUser.first_name} ${passwordResetUser.last_name}`}
        />
      )}
    </div>
  );
};

export default UserManagementTable;