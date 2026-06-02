import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Mail, 
  Calendar, 
  Building, 
  UserMinus, 
  RotateCcw,
  Activity,
  Award,
  Users as UsersIcon,
  DollarSign,
  Home,
  MessageSquare,
  X,
  Settings,
  Phone
} from 'lucide-react';
import { User as UserType } from '@/types';
import { useAdminUserOverview } from '@/hooks/useAdminUserOverview';
import UserPointsSection from './UserPointsSection';
import UserReferralSection from './UserReferralSection';
import UserActivitySection from './UserActivitySection';
import TenantSpecificSection from './TenantSpecificSection';
import LandlordSpecificSection from './LandlordSpecificSection';
import AdminAccountModeOverride from './AdminAccountModeOverride';

interface EnhancedUserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  defaultTab?: string;
  onEditProfile?: () => void;
}

const EnhancedUserProfile = ({ isOpen, onClose, user, defaultTab = "overview", onEditProfile }: EnhancedUserProfileProps) => {
  if (!user) return null;

  const { data: overview, isLoading: overviewLoading } = useAdminUserOverview(user.id);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'tenant': return 'bg-blue-100 text-blue-800';
      case 'landlord': return 'bg-green-100 text-green-800';
      case 'property_manager': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMemberSince = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[800px] sm:max-w-[800px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-background sticky top-0 z-20">
          <div className="flex items-start justify-between">
            <SheetTitle className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h3 className="text-lg font-semibold truncate">{user.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={getRoleColor(user.role)} variant="secondary">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                    {user.role === 'tenant' && user.tenant_info && (
                      <Badge 
                        variant={user.tenant_info.housing_status === 'housed' ? 'default' : 'secondary'}
                        className={user.tenant_info.housing_status === 'housed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {user.tenant_info.housing_status === 'housed' ? 'Housed' : 'Searching'}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-600 truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-600">{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-600">
                      Member since {overviewLoading ? '...' : formatMemberSince(overview?.member_since || null)}
                    </span>
                  </div>
                </div>
              </div>
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Tabbed Content */}
            <Tabs defaultValue={defaultTab} className="space-y-6">
              <div className="sticky top-0 bg-background z-10 pb-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview" className="flex items-center gap-1 text-xs">
                    <Activity className="w-3 h-3" />
                    <span className="hidden sm:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="points" className="flex items-center gap-1 text-xs">
                    <Award className="w-3 h-3" />
                    <span className="hidden sm:inline">Points</span>
                  </TabsTrigger>
                  <TabsTrigger value="referrals" className="flex items-center gap-1 text-xs">
                    <UsersIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">Referrals</span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-1 text-xs">
                    <MessageSquare className="w-3 h-3" />
                    <span className="hidden sm:inline">Activity</span>
                  </TabsTrigger>
                  <TabsTrigger value="specific" className="flex items-center gap-1 text-xs">
                    {user.role === 'tenant' ? <Home className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                    <span className="hidden sm:inline">{user.role === 'tenant' ? 'Housing' : 'Properties'}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="space-y-4">
                <TabsContent value="overview" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Total Points</span>
                      </div>
                      {overviewLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <>
                          <p className="text-2xl font-bold">{(overview?.total_points || 0).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">+{overview?.points_this_month || 0} this month</p>
                        </>
                      )}
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <UsersIcon className="w-4 h-4 text-green-500" />
                        <span className="font-medium">Referrals</span>
                      </div>
                      {overviewLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <>
                          <p className="text-2xl font-bold">{overview?.total_referrals || 0}</p>
                          <p className="text-sm text-muted-foreground">{overview?.qualified_referrals || 0} qualified</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Recent Activity</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Last active</span>
                        <span className="text-muted-foreground">
                          {overviewLoading ? '...' : formatLastActive(overview?.last_active || null)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Member since</span>
                        <span className="text-muted-foreground">
                          {overviewLoading ? '...' : formatMemberSince(overview?.member_since || null)}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="points" className="mt-0">
                  <UserPointsSection userId={user.id} />
                </TabsContent>

                <TabsContent value="referrals" className="mt-0">
                  <UserReferralSection userId={user.id} />
                </TabsContent>

                <TabsContent value="activity" className="mt-0">
                  <UserActivitySection userId={user.id} />
                </TabsContent>

                <TabsContent value="specific" className="mt-0 space-y-4">
                  {user.role === 'tenant' ? (
                    <TenantSpecificSection userId={user.id} />
                  ) : user.role === 'landlord' ? (
                    <>
                      <LandlordSpecificSection userId={user.id} />
                      <AdminAccountModeOverride userId={user.id} />
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No specific information available for this user type</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <Separator />

            {/* Admin Actions */}
            <div className="space-y-4 pb-6">
              <h4 className="font-medium text-gray-900">Admin Actions</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onEditProfile && (
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={onEditProfile}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
                
                <Button variant="outline" className="justify-start">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
                
                <Button variant="outline" className="justify-start">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Suspend User
                </Button>
                
                <Button variant="outline" className="justify-start">
                  <User className="h-4 w-4 mr-2" />
                  Impersonate User
                </Button>

                <Button variant="outline" className="justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Adjust Points
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EnhancedUserProfile;
