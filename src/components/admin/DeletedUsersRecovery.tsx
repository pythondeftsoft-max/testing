import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  RotateCcw,
  Trash2,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeletedUser {
  id: string;
  original_user_id: string;
  profile_data: any; // Changed from specific type to any since it's JSON
  deleted_at: string;
  purge_at: string;
  deleted_by: string;
  restored_at?: string;
  restored_by?: string;
}

const DeletedUsersRecovery = () => {
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const fetchDeletedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('deleted_users')
        .select('*')
        .is('restored_at', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedUsers(data || []);
    } catch (error) {
      console.error('Error fetching deleted users:', error);
      toast({
        title: "Error",
        description: "Failed to load deleted users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (deletedUserId: string) => {
    if (!confirm('Are you sure you want to restore this user?')) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to perform this action",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.rpc('restore_deleted_user', {
        deleted_user_record_id: deletedUserId,
        restored_by_user_id: currentUser.id
      });

      if (error) throw error;

      toast({
        title: "User restored",
        description: "User has been successfully restored",
      });

      fetchDeletedUsers();
    } catch (error) {
      console.error('Error restoring user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore user",
        variant: "destructive"
      });
    }
  };

  const handlePermanentDelete = async (deletedUserId: string) => {
    if (!confirm('Are you sure? This will permanently delete the user data and cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('deleted_users')
        .delete()
        .eq('id', deletedUserId);

      if (error) throw error;

      toast({
        title: "User permanently deleted",
        description: "User data has been permanently removed",
        variant: "destructive"
      });

      fetchDeletedUsers();
    } catch (error) {
      console.error('Error permanently deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to permanently delete user",
        variant: "destructive"
      });
    }
  };

  const getDaysUntilPurge = (purgeAt: string) => {
    const purgeDate = new Date(purgeAt);
    const now = new Date();
    const diffTime = purgeDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPurgeStatusColor = (days: number) => {
    if (days <= 3) return 'bg-red-100 text-red-800 border-red-200';
    if (days <= 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-gray-600">Loading deleted users...</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div>
            <CardTitle className="text-xl font-semibold">Deleted Users Recovery</CardTitle>
            <CardDescription>
              Restore deleted users within 30 days or permanently remove them
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {deletedUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-2">
              <User className="h-12 w-12 mx-auto" />
            </div>
            <div className="text-lg font-medium mb-2">No deleted users</div>
            <div className="text-muted-foreground text-sm">
              All users are active or no users have been deleted recently
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead>Purge Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedUsers.map((deletedUser) => {
                  const daysUntilPurge = getDaysUntilPurge(deletedUser.purge_at);
                  return (
                    <TableRow key={deletedUser.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {deletedUser.profile_data.first_name} {deletedUser.profile_data.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {deletedUser.profile_data.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {deletedUser.profile_data.user_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(deletedUser.deleted_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={getPurgeStatusColor(daysUntilPurge)}
                        >
                          {daysUntilPurge > 0 
                            ? `${daysUntilPurge} days left`
                            : 'Expired'
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(deletedUser.id)}
                            className="flex items-center gap-2"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePermanentDelete(deletedUser.id)}
                            className="flex items-center gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Purge
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeletedUsersRecovery;