import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Building, 
  UserMinus, 
  RotateCcw,
  Activity
} from 'lucide-react';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  phone: string;
  created_at: string;
  email?: string;
  last_login?: string;
  properties_count?: number;
  status: string;
}

interface UserProfileSideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
}

const UserProfileSideSheet = ({ isOpen, onClose, user }: UserProfileSideSheetProps) => {
  if (!user) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'tenant': return 'bg-blue-100 text-blue-800';
      case 'landlord': return 'bg-green-100 text-green-800';
      case 'individual_owner': return 'bg-green-100 text-green-800';
      case 'property_manager': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'invited': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user.first_name} {user.last_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getRoleColor(user.user_type)} variant="secondary">
                    {user.user_type === 'individual_owner' ? 'Individual Owner' : 
                     user.user_type === 'property_manager' ? 'Property Manager' :
                     user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                  </Badge>
                  <Badge className={getStatusColor(user.status)} variant="secondary">
                    {user.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Contact Information</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-gray-600">{user.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Activity */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Account Activity</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Joined Date</p>
                  <p className="text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-sm text-gray-600">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              {(user.user_type === 'landlord' || user.user_type === 'individual_owner' || user.user_type === 'property_manager') && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Properties</p>
                    <p className="text-sm text-gray-600">{user.properties_count || 0} active listings</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {user.user_type === 'tenant' && (
            <>
              <Separator />
              
              {/* Tenant Specific Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Tenant Information</h4>
                
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Housing Status</p>
                    <p className="text-sm text-gray-600">Seeking Housing</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Applications</p>
                    <p className="text-sm text-gray-600">3 submitted</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Voucher Status</p>
                    <p className="text-sm text-gray-600">Has Voucher</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Plus Member</p>
                    <p className="text-sm text-gray-600">No</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Admin Actions */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Admin Actions</h4>
            
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
              
              <Button variant="outline" className="justify-start">
                <UserMinus className="h-4 w-4 mr-2" />
                {user.status === 'suspended' ? 'Reactivate User' : 'Suspend User'}
              </Button>
              
              <Button variant="outline" className="justify-start">
                <User className="h-4 w-4 mr-2" />
                Impersonate User
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserProfileSideSheet;